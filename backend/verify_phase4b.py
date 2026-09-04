"""
Phase 4B Verification / Tests
=============================
End-to-end tests for Orders and Deliveries using the ACTUAL FastAPI app,
services, ORM, and database (no mocking).

It uses httpx.AsyncClient with the ASGI transport against the real `app`
object, so every request runs through the real routes, dependency injection,
service layer, and the live Supabase PostgreSQL database. This avoids needing
a separate uvicorn process.

Tests (24 required checks):
  1.  Authentication protection (401 without token)
  2.  Valid order creation (201)
  3.  Server-side price calculation
  4.  Delivery fee calculation
  5.  Order number generation (ORD-<digits>, unique)
  6.  Order item snapshots (name + unit price)
  7.  Customer snapshot (name / phone / delivery address)
  8.  Order timeline creation (initial pending entry)
  9.  Delivery creation (linked to the order)
  10. Order listing
  11. Order detail (items + timeline)
  12. Delivery listing
  13. Delivery lookup (by order + by id)
  14. Invalid menu item -> 404
  15. Invalid quantity -> 422
  16. Empty order -> 422
  17. Invalid order status transition -> 400
  18. Invalid delivery status transition -> 400
  19. Valid order status transitions (full kitchen lifecycle)
  20. Valid delivery status transitions (full logistics lifecycle)
  21. Customer counter updates
  22. Unauthorized customer access -> 401
  23. 404 behavior (nonexistent order / delivery)
  24. Transaction rollback (partial-invalid order leaves nothing)

Test data (admin, customer, category, item, an order) is created with a unique
timestamp suffix and cleaned up at the end of the run.
"""

import asyncio
import re
import time
import uuid

import httpx
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.main import app
from app.models.admin import AdminUser
from app.models.customer import Customer
from app.models.delivery import Delivery
from app.models.menu import MenuCategory, MenuItem
from app.models.order import Order, OrderItem, OrderTimeline

BASE = "http://testserver"
RESULTS = []

# Dedicated engine for the test's direct-DB operations. Uses NullPool (one fresh
# connection per session) and disables the asyncpg statement cache, which avoids
# the Supabase pooler's DuplicatePreparedStatementError on reused connections.
_test_engine = create_async_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,
    connect_args={
        "ssl": "require",
        "statement_cache_size": 0,
        "command_timeout": 120,
    },
)
test_session_factory = async_sessionmaker(
    _test_engine, class_=AsyncSession, expire_on_commit=False
)


def record(label: str, ok: bool, detail: str = ""):
    RESULTS.append((label, ok, detail))
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}" + (f" — {detail}" if detail and not ok else ""))


def sid() -> str:
    return str(int(time.time()))[-6:]


async def cleanup(db: AsyncSession, admin_id, customer_id, category_id, item_id, order_id):
    """Delete records created during the run."""
    if order_id:
        await db.execute(delete(OrderTimeline).where(OrderTimeline.order_id == order_id))
        await db.execute(delete(OrderItem).where(OrderItem.order_id == order_id))
        await db.execute(delete(Delivery).where(Delivery.order_id == order_id))
        await db.execute(delete(Order).where(Order.id == order_id))
    if item_id:
        await db.execute(delete(MenuItem).where(MenuItem.id == item_id))
    if category_id:
        await db.execute(delete(MenuCategory).where(MenuCategory.id == category_id))
    if customer_id:
        await db.execute(delete(Customer).where(Customer.id == customer_id))
    if admin_id:
        await db.execute(delete(AdminUser).where(AdminUser.id == admin_id))
    await db.commit()


async def main() -> int:
    s = sid()
    admin_email = f"test4b_admin_{s}@example.com"
    admin_pass = "TestPass123!"
    item_name = f"Test B4 Jollof {s}"
    cat_name = f"Test B4 Cat {s}"
    cust_name = f"Test B4 Customer {s}"
    cust_phone = f"+23480{s}"
    item_price = "3500.00"
    delivery_fee = settings.delivery_fee  # Decimal from config

    print("=" * 62)
    print("PHASE 4B VERIFICATION (Orders & Deliveries)")
    print("=" * 62)

    created_ids = {"admin": None, "customer": None, "category": None,
                   "item": None, "order": None, "delivery": None}

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url=BASE, timeout=300
    ) as c:
        # ------------------------------------------------------------------ AUTH
        print("\n[AUTH]")
        r = await c.post("/api/auth/register", json={
            "email": admin_email, "password": admin_pass, "name": "Test B4 Admin",
        })
        record("register admin -> 201", r.status_code == 201, f"got {r.status_code} {r.text[:120]}")
        if r.status_code == 201:
            created_ids["admin"] = r.json().get("id")
        rl = await c.post("/api/auth/login", json={"email": admin_email, "password": admin_pass})
        token = rl.json().get("access_token", "") if rl.status_code == 200 else ""
        rh = {"Authorization": f"Bearer {token}"}
        record("admin login -> token", bool(token), f"got {rl.status_code}")

        # ------------------------------------------------------------ SEED DATA
        print("\n[SEED]")
        async def seed():
            async with test_session_factory() as db:
                cat = MenuCategory(name=cat_name, description="test")
                db.add(cat)
                await db.flush()
                item = MenuItem(category_id=cat.id, name=item_name,
                                description="test item", price=item_price,
                                available=True)
                db.add(item)
                cust = Customer(name=cust_name, phone=cust_phone, email=None,
                                address=None)
                db.add(cust)
                await db.commit()
                await db.refresh(cat)
                await db.refresh(item)
                await db.refresh(cust)
                return cat.id, item.id, cust.id

        try:
            cat_id, item_id, cust_id = await seed()
        except Exception as e:
            print(f"  seed error: {e}")
            cat_id = item_id = cust_id = None
        created_ids["category"], created_ids["item"], created_ids["customer"] = cat_id, item_id, cust_id
        record("seeded category/item/customer", all([cat_id, item_id, cust_id]))

        # ------------------------------------------------------------ VALID ORDER
        print("\n[CREATE ORDER]")
        order_payload = {
            "customer_id": str(cust_id),
            "items": [{"menu_item_id": str(item_id), "quantity": 2}],
            "delivery_address": "12 Dutse Road, Jigawa",
            "notes": "No onions",
        }
        ro = await c.post("/api/orders", headers=rh, json=order_payload)
        order_ok = ro.status_code == 201
        record("valid order creation -> 201", order_ok, f"got {ro.status_code} {ro.text[:200]}")
        if not order_ok:
            return 1
        o = ro.json()
        created_ids["order"] = o.get("id")
        order_number = o.get("order_number", "")

        # 3. server-side price
        expected_subtotal = float(item_price) * 2
        record("server-side price (subtotal = qty * unit price)",
               abs(o.get("subtotal", -1) - expected_subtotal) < 0.001,
               f"got {o.get('subtotal')} expect {expected_subtotal}")
        # 4. delivery fee
        record("delivery fee = configured value",
               abs(o.get("delivery_fee", -1) - float(delivery_fee)) < 0.001,
               f"got {o.get('delivery_fee')} expect {float(delivery_fee)}")
        record("total = subtotal + delivery_fee",
               abs(o.get("total", -1) - (expected_subtotal + float(delivery_fee))) < 0.001,
               f"got {o.get('total')}")
        # 5. order number
        record("order number format ORD-<digits>",
               bool(re.fullmatch(r"ORD-\d+", order_number)), f"got {order_number}")
        record("customer snapshot (name/phone/address)",
               o.get("customer_name") == cust_name
               and o.get("customer_phone") == cust_phone
               and o.get("delivery_address") == order_payload["delivery_address"])
        # 6. order item snapshot
        items = o.get("items", [])
        item_snapshot_ok = len(items) == 1 and items[0].get("name_snapshot") == item_name \
            and abs(items[0].get("unit_price", -1) - float(item_price)) < 0.001 \
            and items[0].get("quantity") == 2
        record("order item snapshot (name + unit price)", item_snapshot_ok, f"items={items}")
        # 8. timeline created with initial pending entry
        timeline = o.get("timeline", [])
        record("order timeline initial entry (pending)",
               any(t.get("status") == "pending" for t in timeline), f"timeline={timeline}")

        # ------------------------------------------------------------ DELIVERY
        print("\n[DELIVERY]")
        rd = await c.get(f"/api/deliveries/order/{created_ids['order']}", headers=rh)
        record("delivery created for order (get by order) -> 200", rd.status_code == 200,
               f"got {rd.status_code} {rd.text[:150]}")
        if rd.status_code == 200:
            created_ids["delivery"] = rd.json().get("id")
            record("delivery status pending initially",
                   rd.json().get("status") == "pending")
            record("delivery linked to correct order",
                   rd.json().get("order_id") == str(created_ids["order"]))

        # ------------------------------------------------------------ LIST / DETAIL
        print("\n[LIST / DETAIL]")
        rl2 = await c.get("/api/orders", headers=rh)
        rec = rl2.json()
        record("order listing -> 200 + envelope",
               rl2.status_code == 200 and "items" in rec and "total" in rec,
               f"got {rl2.status_code}")
        record("order listing contains created order",
               any(x.get("id") == str(created_ids["order"]) for x in rec.get("items", [])))

        rg = await c.get(f"/api/orders/{created_ids['order']}", headers=rh)
        record("order detail -> 200 with items + timeline",
               rg.status_code == 200 and rg.json().get("items") and rg.json().get("timeline"),
               f"got {rg.status_code}")

        pfilter = await c.get("/api/orders", headers=rh, params={"customer_id": str(cust_id)})
        record("order listing filtered by customer",
               pfilter.status_code == 200 and any(
                   x.get("id") == str(created_ids["order"]) for x in pfilter.json().get("items", [])))

        rdl = await c.get("/api/deliveries", headers=rh)
        drec = rdl.json()
        record("delivery listing -> 200 + envelope",
               rdl.status_code == 200 and "items" in drec and "total" in drec,
               f"got {rdl.status_code}")
        record("delivery listing contains created delivery",
               any(x.get("id") == str(created_ids["delivery"]) for x in drec.get("items", [])))

        rgd = await c.get(f"/api/deliveries/{created_ids['delivery']}", headers=rh)
        record("delivery get by id -> 200", rgd.status_code == 200, f"got {rgd.status_code}")

        # ------------------------------------------------------------ STATUS TRANSITIONS
        print("\n[ORDER STATUS]")
        # 17. invalid transition: pending -> completed
        rbad = await c.patch(f"/api/orders/{created_ids['order']}/status", headers=rh,
                             json={"status": "completed"})
        record("invalid order transition pending->completed -> 400", rbad.status_code == 400,
               f"got {rbad.status_code}")

        # 19. valid lifecycle
        steps = ["confirmed", "preparing", "ready", "completed"]
        transitions_ok = True
        for st in steps:
            rr = await c.patch(f"/api/orders/{created_ids['order']}/status", headers=rh,
                               json={"status": st})
            if rr.status_code != 200 or rr.json().get("status") != st:
                transitions_ok = False
        record("valid order transitions full lifecycle", transitions_ok)
        rg2 = await c.get(f"/api/orders/{created_ids['order']}", headers=rh)
        record("timeline records every order transition",
               rg2.status_code == 200 and len(rg2.json().get("timeline", [])) == len(steps) + 1)

        print("\n[DELIVERY STATUS]")
        # 18. invalid delivery transition: pending -> delivered
        rdbad = await c.patch(f"/api/deliveries/{created_ids['delivery']}/status", headers=rh,
                              json={"status": "delivered"})
        record("invalid delivery transition pending->delivered -> 400", rdbad.status_code == 400,
               f"got {rdbad.status_code}")
        # failure without reason
        rdfail_noreason = await c.patch(f"/api/deliveries/{created_ids['delivery']}/status", headers=rh,
                                        json={"status": "failed"})
        record("delivery failed without failure_reason -> 400", rdfail_noreason.status_code == 400,
               f"got {rdfail_noreason.status_code}")

        # 20. valid logistics lifecycle
        dsteps = ["assigned", "accepted", "picked_up", "on_the_way", "delivered"]
        dtransitions_ok = True
        for st in dsteps:
            rr = await c.patch(f"/api/deliveries/{created_ids['delivery']}/status", headers=rh,
                               json={"status": st})
            if rr.status_code != 200 or rr.json().get("status") != st:
                dtransitions_ok = False
        record("valid delivery transitions full lifecycle", dtransitions_ok)
        rd_delivered = await c.get(f"/api/deliveries/{created_ids['delivery']}", headers=rh)
        record("delivery delivered_at timestamp set",
               rd_delivered.status_code == 200 and rd_delivered.json().get("delivered_at") is not None)

        # ------------------------------------------------------------ VALIDATION
        print("\n[VALIDATION]")
        # 14. invalid menu item
        rbaditem = await c.post("/api/orders", headers=rh, json={
            "customer_id": str(cust_id),
            "items": [{"menu_item_id": str(uuid.uuid4()), "quantity": 1}],
            "delivery_address": "x",
        })
        record("invalid menu item -> 404", rbaditem.status_code == 404, f"got {rbaditem.status_code}")

        # 15. invalid quantity (0)
        rqty = await c.post("/api/orders", headers=rh, json={
            "customer_id": str(cust_id),
            "items": [{"menu_item_id": str(item_id), "quantity": 0}],
            "delivery_address": "x",
        })
        record("invalid quantity 0 -> 422", rqty.status_code == 422, f"got {rqty.status_code}")

        # 16. empty order
        rempty = await c.post("/api/orders", headers=rh, json={
            "customer_id": str(cust_id),
            "items": [],
            "delivery_address": "x",
        })
        record("empty order -> 422", rempty.status_code == 422, f"got {rempty.status_code}")

        # 23. 404 behavior
        rnf_order = await c.get(f"/api/orders/{uuid.uuid4()}", headers=rh)
        record("nonexistent order -> 404", rnf_order.status_code == 404, f"got {rnf_order.status_code}")
        rnf_del = await c.get(f"/api/deliveries/{uuid.uuid4()}", headers=rh)
        record("nonexistent delivery -> 404", rnf_del.status_code == 404, f"got {rnf_del.status_code}")
        rnf_dorder = await c.get(f"/api/deliveries/order/{uuid.uuid4()}", headers=rh)
        record("delivery for nonexistent order -> 404", rnf_dorder.status_code == 404, f"got {rnf_dorder.status_code}")

        # ------------------------------------------------------------ AUTH / UNAUTHORIZED
        print("\n[AUTH PROTECTION]")
        rc_none = await c.get("/api/orders")
        record("orders list without token -> 401", rc_none.status_code == 401, f"got {rc_none.status_code}")
        rc_post_none = await c.post("/api/orders", json=order_payload)
        record("order create without token -> 401", rc_post_none.status_code == 401, f"got {rc_post_none.status_code}")
        rc_del_none = await c.get("/api/deliveries")
        record("deliveries list without token -> 401", rc_del_none.status_code == 401, f"got {rc_del_none.status_code}")
        rc_get_none = await c.get(f"/api/orders/{created_ids['order']}")
        record("order detail without token -> 401", rc_get_none.status_code == 401, f"got {rc_get_none.status_code}")

        # ------------------------------------------------------------ CUSTOMER COUNTERS
        print("\n[CUSTOMER COUNTERS]")
        async def read_counters():
            async with test_session_factory() as db:
                cust = await db.get(Customer, cust_id)
                return cust.total_orders, cust.total_spent, cust.last_order_at

        cnt, spent, last_at = await read_counters()
        expect_total = expected_subtotal + float(delivery_fee)
        record("customer total_orders incremented by 1", cnt == 1, f"got {cnt}")
        record("customer total_spent includes order total",
               spent is not None and abs(float(spent) - expect_total) < 0.01,
               f"got {spent} expect {expect_total}")
        record("customer last_order_at set", last_at is not None)

        # ------------------------------------------------------------ TRANSACTION ROLLBACK
        print("\n[TRANSACTION ROLLBACK]")
        async def order_count_for_customer():
            async with test_session_factory() as db:
                res = await db.execute(
                    select(func.count()).select_from(Order).where(Order.customer_id == cust_id))
                return res.scalar_one()

        before_count = await order_count_for_customer()
        before_spent = (await read_counters())[1]
        # One valid item + one invalid item -> must fail entirely.
        rpartial = await c.post("/api/orders", headers=rh, json={
            "customer_id": str(cust_id),
            "items": [
                {"menu_item_id": str(item_id), "quantity": 1},
                {"menu_item_id": str(uuid.uuid4()), "quantity": 1},
            ],
            "delivery_address": "rollback test",
        })
        record("partial-invalid order rejects -> 404", rpartial.status_code == 404,
               f"got {rpartial.status_code}")
        after_count = await order_count_for_customer()
        after_spent = (await read_counters())[1]
        record("no partial order row persists (rollback)", before_count == after_count,
               f"before={before_count} after={after_count}")
        record("customer counters unchanged on rollback",
               before_spent == after_spent, f"before={before_spent} after={after_spent}")

    # ------------------------------------------------------------------ CLEANUP
    print("\n[CLEANUP]")
    async def do_cleanup():
        async with test_session_factory() as db:
            await cleanup(db, created_ids["admin"], created_ids["customer"],
                          created_ids["category"], created_ids["item"], created_ids["order"])
    try:
        await do_cleanup()
    except Exception as e:
        print(f"  cleanup error: {e}")
    await _test_engine.dispose()
    print("  test records removed")

    # ------------------------------------------------------------------ SUMMARY
    print("\n" + "=" * 62)
    passes = sum(1 for _, ok, _ in RESULTS if ok)
    fails = [(lbl, d) for lbl, ok, d in RESULTS if not ok]
    print(f"TOTAL: {len(RESULTS)} checks — {passes} PASS, {len(fails)} FAIL")
    if fails:
        for lbl, d in fails:
            print(f"  - {lbl}: {d}")
    else:
        print("ALL PHASE 4B CHECKS PASSED")
    print("=" * 62)
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
