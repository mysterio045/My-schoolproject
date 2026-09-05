"""
Phase 5B Verification / Tests
=============================
End-to-end tests for the Dashboard Summary endpoint using the ACTUAL FastAPI
app, ORM, and database (no mocking). Requests run through httpx ASGI transport
against the real app, so routes, auth dependency, the dashboard service, and
the live Supabase PostgreSQL database are all exercised.

Assertions are DELTA-based: a baseline summary is captured before seeding and
compared against the summary after seeding, so correctness holds regardless of
any pre-existing data in the database. Controlled records are seeded, verified,
then cleaned up.

Checks covered:
  1.  unauthenticated request rejected (401)
  2.  invalid/expired token rejected (401)
  3.  authenticated access succeeds (200)
  4.  response serializes the expected schema fields with correct types
  5.  total_orders reflects COUNT of orders (seed 5 -> delta +5)
  6.  total_revenue excludes cancelled orders (non-cancelled totals summed)
  7.  total_customers delta reflects seeded customers
  8.  rider status counts (available / busy / offline) match seeded riders
  9.  pending_orders matches seeded pending orders
  10. orders_today counts orders created on the DB's current calendar day
  11. revenue_today sums today's non-cancelled orders
  12. recent_orders returns newest first and includes rider_name + order_number
  13. recent_notifications (scoped to the admin) reflects seeded notifications,
      and is empty for a brand-new admin with no notifications (empty dataset)
  14. money values serialize as JSON numbers (not strings)
  15. regression: auth + ordering + schema implicit in every call above

Test records are created with unique timestamped names and removed at the end.
"""

import asyncio
import time
import uuid

import httpx
import sqlalchemy
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.main import app
from app.models.admin import AdminUser
from app.models.customer import Customer
from app.models.delivery import Delivery
from app.models.enums import NotificationRecipientType
from app.models.menu import MenuCategory, MenuItem
from app.models.notification import Notification
from app.models.order import Order, OrderItem, OrderTimeline
from app.models.rider import Rider

BASE = "http://testserver"
RESULTS = []

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


async def purge_leftovers() -> int:
    """
    Remove leftover Phase 5B test rows from previous (possibly aborted) runs so
    the seeded control set has exclusive ownership of its deltas.
    """
    async with test_session_factory() as db:
        admins = (await db.execute(
            select(AdminUser).where(AdminUser.email.like("test5b_admin_%"))
        )).scalars().all()
        customers = (await db.execute(
            select(Customer).where(Customer.name.like("5B Cust%"))
        )).scalars().all()
        categories = (await db.execute(
            select(MenuCategory).where(MenuCategory.name.like("5B Cat%"))
        )).scalars().all()
        riders = (await db.execute(
            select(Rider).where(Rider.name.like("5B Rider%"))
        )).scalars().all()
        notifications = (await db.execute(
            select(Notification).where(Notification.title.like("5B%"))
        )).scalars().all()

        admin_ids = [a.id for a in admins]

        # Orders belonging to 5B customers or created by 5B admins.
        cust_ids = [c.id for c in customers]
        orders = []
        if cust_ids:
            orders = (await db.execute(
                select(Order).where(Order.customer_id.in_(cust_ids))
            )).scalars().all()
        for o in orders:
            await db.execute(delete(OrderTimeline).where(OrderTimeline.order_id == o.id))
            await db.execute(delete(OrderItem).where(OrderItem.order_id == o.id))
            await db.execute(delete(Delivery).where(Delivery.order_id == o.id))
            await db.execute(delete(Order).where(Order.id == o.id))

        for cat in categories:
            await db.execute(delete(MenuItem).where(MenuItem.category_id == cat.id))
            await db.execute(delete(MenuCategory).where(MenuCategory.id == cat.id))
        for k in notifications:
            await db.execute(delete(Notification).where(Notification.id == k.id))
        for c in customers:
            await db.execute(delete(Customer).where(Customer.id == c.id))
        for r in riders:
            await db.execute(delete(Rider).where(Rider.id == r.id))
        for a in admins:
            await db.execute(delete(Notification).where(
                Notification.recipient_type == NotificationRecipientType.ADMIN,
                Notification.recipient_id.in_(admin_ids),
            ))
            await db.execute(delete(AdminUser).where(AdminUser.id == a.id))
        await db.commit()
        return len(riders) + len(orders) + len(notifications)


async def seed_menu_and_customer(s: str):
    """Create a category, item, and customer; return (cat_id, item_id, cust_id)."""
    async with test_session_factory() as db:
        cat = MenuCategory(name=f"5B Cat {s}", description="test")
        db.add(cat)
        await db.flush()
        item = MenuItem(category_id=cat.id, name=f"5B Jollof {s}",
                        description="test", price="3500.00", available=True)
        db.add(item)
        cust = Customer(name=f"5B Cust {s}", phone=f"+23470{s}", email=None, address=None)
        db.add(cust)
        await db.commit()
        await db.refresh(cat)
        await db.refresh(item)
        await db.refresh(cust)
        return cat.id, item.id, cust.id


async def main() -> int:
    s = sid()
    admin_email = f"test5b_admin_{s}@example.com"
    admin_pass = "TestPass123!"
    created = {
        "admin": None, "customer": None, "category": None, "item": None,
        "riders": [], "order_ids": [], "notifications": [],
    }

    print("=" * 62)
    print("PHASE 5B VERIFICATION (Dashboard Summary)")
    print("=" * 62)

    purged = await purge_leftovers()
    print(f"\n[PURGE] removed {purged} leftover Phase 5B test rows")

    # Menu item price = 3500, delivery fee = settings default 1500 -> total 5000/order.
    ITEM_TOTAL = 5000

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url=BASE, timeout=300) as c:
        # ------------------------------------------------------------------ AUTH
        print("\n[AUTH]")
        r = await c.post("/api/auth/register", json={
            "email": admin_email, "password": admin_pass, "name": "5B Admin",
        })
        record("register admin -> 201", r.status_code == 201, f"got {r.status_code}")
        if r.status_code == 201:
            created["admin"] = r.json().get("id")
        rl = await c.post("/api/auth/login", json={"email": admin_email, "password": admin_pass})
        token = rl.json().get("access_token", "") if rl.status_code == 200 else ""
        rh = {"Authorization": f"Bearer {token}"}
        record("admin login -> token", bool(token), f"got {rl.status_code}")

        # Unauthenticated + bad token.
        r_unauth = await c.get("/api/dashboard/summary")
        record("summary without token -> 401", r_unauth.status_code == 401, f"got {r_unauth.status_code}")
        r_bad = await c.get("/api/dashboard/summary", headers={"Authorization": "Bearer not-a-jwt"})
        record("summary with invalid token -> 401", r_bad.status_code == 401, f"got {r_bad.status_code}")

        # Baseline summary (authenticated).
        r_base = await c.get("/api/dashboard/summary", headers=rh)
        record("summary authenticated -> 200", r_base.status_code == 200, f"got {r_base.status_code}")
        base = r_base.json() if r_base.status_code == 200 else {}
        record("summary has schema fields", all(
            k in base for k in [
                "total_orders", "total_revenue", "total_customers", "available_riders",
                "busy_riders", "offline_riders", "pending_orders", "orders_today",
                "revenue_today", "recent_orders", "recent_notifications",
            ]
        ))

        keep_valid_keys = ["total_orders", "total_customers", "available_riders",
                           "busy_riders", "offline_riders", "pending_orders", "orders_today"]
        record("count fields are ints", all(isinstance(base.get(k), int) for k in keep_valid_keys))

        # Empty dataset check: a fresh admin has no notifications yet.
        record("recent_notifications empty for fresh admin", base.get("recent_notifications") == [])

        cat_id, item_id, cust_id = await seed_menu_and_customer(s)
        created["customer"], created["category"], created["item"] = cust_id, cat_id, item_id
        record("seeded category/item/customer", all([cat_id, item_id, cust_id]))

        # ------------------------------------------------------------------ RIDERS
        print("\n[SEED RIDERS + STATUS COUNTS]")
        # 2 available, 1 busy, 1 offline.
        rider_specs = [
            ("5B Rider A", "available"),
            ("5B Rider B", "available"),
            ("5B Rider C", "busy"),
            ("5B Rider D", "offline"),
        ]
        for name, status in rider_specs:
            rr = await c.post("/api/riders", headers=rh, json={
                "name": f"{name} {s}", "phone": f"+2349{s}", "email": None,
                "joined_at": "2026-01-01",
            })
            if rr.status_code == 201:
                rid = rr.json().get("id")
                created["riders"].append(rid)
                await c.patch(f"/api/riders/{rid}/status", headers=rh, json={"status": status})
        record("seeded 4 riders via API", len(created["riders"]) == 4)

        # ------------------------------------------------------------------ ORDERS
        print("\n[SEED ORDERS]")
        # 5 orders, all created today via the API:
        #   - 2 completed (count toward revenue)
        #   - 1 cancelled (EXCLUDED from revenue)
        #   - 2 pending (count toward revenue + pending_orders)
        statuses = ["completed", "completed", "cancelled", "pending", "pending"]
        for i, final_status in enumerate(statuses):
            ro = await c.post("/api/orders", headers=rh, json={
                "customer_id": str(cust_id),
                "items": [{"menu_item_id": str(item_id), "quantity": 1}],
                "delivery_address": f"5B addr {i}",
            })
            if ro.status_code != 201:
                record(f"create order {i} -> 201", False, f"got {ro.status_code}")
                continue
            oid = ro.json()["id"]
            created["order_ids"].append(oid)
            # Advance status through valid transitions.
            ordered = ["confirmed", "preparing", "ready", "completed"]
            for st in ordered:
                if final_status == st or (final_status == "completed" and st != "completed"):
                    rr = await c.patch(f"/api/orders/{oid}/status", headers=rh, json={"status": st})
                    if rr.status_code != 200:
                        break
                    if st == "completed":
                        break
            # cancelled: pending -> cancelled
            if final_status == "cancelled":
                rr = await c.patch(f"/api/orders/{oid}/status", headers=rh, json={"status": "cancelled"})
            if final_status == "completed" or final_status == "pending":
                pass  # already in desired state via transitions above
        record("created 5 orders via API", len(created["order_ids"]) == 5)

        # Assign a rider to the delivery of the FIRST completed order so the
        # recent-orders row exposes a rider_name (assigning via direct DB update,
        # mirroring what dispatch does at the persistence layer).
        assign_rider_id = created["riders"][0]
        async with test_session_factory() as db:
            del_row = (await db.execute(
                select(Delivery).where(Delivery.order_id == created["order_ids"][0])
            )).scalar_one()
            del_row.rider_id = assign_rider_id
            await db.commit()

        # ------------------------------------------------------------------ NOTIFICATIONS
        print("\n[SEED NOTIFICATIONS]")
        for i in range(2):
            rn = await c.post("/api/notifications", headers=rh, json={
                "recipient_type": "admin",
                "recipient_id": str(created["admin"]),
                "type": "order" if i == 0 else "rider",
                "title": f"5B Notif {i}",
                "message": f"5B notification message {i}",
            })
            if rn.status_code == 201:
                created["notifications"].append(rn.json()["id"])
        record("seeded 2 notifications", len(created["notifications"]) == 2)

        # ------------------------------------------------------------------ DELTAS
        print("\n[SUMMARY VERIFICATION]")
        ra = await c.get("/api/dashboard/summary", headers=rh)
        after = ra.json() if ra.status_code == 200 else {}

        def delta(key):
            return after.get(key) - base.get(key)

        record("total_orders delta = +5", delta("total_orders") == 5, f"got {delta('total_orders')}")
        record("total_customers delta = +1", delta("total_customers") == 1, f"got {delta('total_customers')}")

        # Non-cancelled revenue: 4 orders * 5000 (2 completed + 2 pending).
        record("total_revenue excludes cancelled (delta = +20000)",
               delta("total_revenue") == 20000, f"got {delta('total_revenue')}")

        # Rider counts.
        record("available_riders delta = +2", delta("available_riders") == 2, f"got {delta('available_riders')}")
        record("busy_riders delta = +1", delta("busy_riders") == 1, f"got {delta('busy_riders')}")
        record("offline_riders delta = +1", delta("offline_riders") == 1, f"got {delta('offline_riders')}")

        record("pending_orders delta = +2", delta("pending_orders") == 2, f"got {delta('pending_orders')}")
        record("orders_today delta = +5", delta("orders_today") == 5, f"got {delta('orders_today')}")
        record("revenue_today delta = +20000", delta("revenue_today") == 20000, f"got {delta('revenue_today')}")

        # Recent orders: all 5 seeded orders should be the newest, in desc order,
        # with rider_name populated on the assigned order.
        recent = after.get("recent_orders", [])
        rec_ok = len(recent) >= 5
        record("recent_orders contains seeded orders",
               rec_ok, f"got {len(recent)} recent rows")
        order_numbers = [o.get("order_number") for o in recent[:5]]
        seeded_orders = await _fetch_order_numbers(created["order_ids"])
        record("newest 5 recent orders are the seeded orders",
               set(order_numbers) == set(seeded_orders),
               f"got {order_numbers}")
        timestamps = [o.get("created_at") for o in recent[:5]]
        record("recent_orders newest first",
               timestamps == sorted(timestamps, reverse=True), f"got {timestamps}")
        assigned_row = next(
            (o for o in recent if o.get("id") == str(created["order_ids"][0])), None
        )
        record("assigned order exposes rider_name",
               assigned_row is not None and assigned_row.get("rider_name") is not None,
               f"got {assigned_row.get('rider_name') if assigned_row else None}")
        unassigned_row = next(
            (o for o in recent if o.get("id") == str(created["order_ids"][1])), None
        )
        record("unassigned order rider_name is None",
               unassigned_row is not None and unassigned_row.get("rider_name") is None)

        # Money serialization: revenue is a number, not a string.
        record("total_revenue is a JSON number",
               isinstance(after.get("total_revenue"), (int, float)),
               f"type={type(after.get('total_revenue')).__name__}")
        record("revenue_today is a JSON number",
               isinstance(after.get("revenue_today"), (int, float)))

        # Recent notifications for the admin.
        notifs = after.get("recent_notifications", [])
        titles = [n.get("title") for n in notifs]
        record("recent_notifications reflects seeded notifications",
               "5B Notif 0" in titles and "5B Notif 1" in titles,
               f"got {titles}")

    # ------------------------------------------------------------------ CLEANUP
    print("\n[CLEANUP]")
    try:
        async with test_session_factory() as db:
            for oid in created["order_ids"]:
                await db.execute(delete(OrderTimeline).where(OrderTimeline.order_id == oid))
                await db.execute(delete(OrderItem).where(OrderItem.order_id == oid))
                await db.execute(delete(Delivery).where(Delivery.order_id == oid))
                await db.execute(delete(Order).where(Order.id == oid))
            if created["item"]:
                await db.execute(delete(MenuItem).where(MenuItem.id == created["item"]))
            if created["category"]:
                await db.execute(delete(MenuCategory).where(MenuCategory.id == created["category"]))
            if created["customer"]:
                await db.execute(delete(Customer).where(Customer.id == created["customer"]))
            for rid in created["riders"]:
                await db.execute(delete(Rider).where(Rider.id == rid))
            if created["admin"]:
                await db.execute(delete(Notification).where(
                    Notification.recipient_type == NotificationRecipientType.ADMIN,
                    Notification.recipient_id == created["admin"],
                ))
                await db.execute(delete(AdminUser).where(AdminUser.id == created["admin"]))
            await db.commit()
        print("  test records removed")
    except Exception as e:
        print(f"  cleanup error: {e}")
    await _test_engine.dispose()

    # ------------------------------------------------------------------ SUMMARY
    print("\n" + "=" * 62)
    passes = sum(1 for _, ok, _ in RESULTS if ok)
    fails = [(lbl, d) for lbl, ok, d in RESULTS if not ok]
    print(f"TOTAL: {len(RESULTS)} checks — {passes} PASS, {len(fails)} FAIL")
    if fails:
        for lbl, d in fails:
            print(f"  - {lbl}: {d}")
        return 1
    print("ALL PHASE 5B CHECKS PASSED")
    print("=" * 62)
    return 0


async def _fetch_order_numbers(order_ids) -> list[str]:
    async with test_session_factory() as db:
        rows = (await db.execute(
            select(Order.order_number).where(Order.id.in_(order_ids))
        )).scalars().all()
        return list(rows)


async def _run_with_retries(max_attempts: int = 3) -> int:
    import asyncpg
    attempt = 0
    while True:
        attempt += 1
        try:
            return await main()
        except (asyncpg.PostgresError, OSError,
                sqlalchemy.exc.DBAPIError, sqlalchemy.exc.OperationalError) as e:
            if attempt >= max_attempts:
                print(f"\nFATAL: persistent DB error after {attempt} attempts: {type(e).__name__}: {e}")
                raise
            print(f"\n[RETRY] transient DB error ({type(e).__name__}) on attempt "
                  f"{attempt}; retrying...")
            RESULTS.clear()
            await asyncio.sleep(3)


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_run_with_retries()))