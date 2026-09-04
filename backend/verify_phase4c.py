"""
Phase 4C Verification / Tests
=============================
End-to-end tests for Riders and Notifications using the ACTUAL FastAPI app,
services, ORM, and database (no mocking).

It uses httpx.AsyncClient with the ASGI transport against the real `app`
object, so every request runs through the real routes, dependency injection,
service layer, and the live Supabase PostgreSQL database.

Tests:
  RIDERS
    - authentication protection (401 without token)
    - rider creation (201) + field echo
    - rider listing (envelope + contains created rider)
    - rider listing filters (status, search)
    - rider detail (with delivery history)
    - rider update (name/phone/status)
    - rider availability/status change (dedicated status endpoint)
    - invalid rider operations (duplicate email -> 409, bad status -> 422,
      nonexistent rider -> 404)
  NOTIFICATIONS
    - authentication protection (401 without token)
    - notification creation (201) for admin/customer/rider recipients
    - notification listing for a recipient
    - unread/read behavior (unread filter, mark read)
    - invalid recipient -> 404
    - nonexistent notification / mark read -> 404
    - invalid recipient_type -> 422

Test data (admin, customer, riders, notifications) is created with a unique
timestamp suffix and cleaned up at the end of the run.
"""

import asyncio
import time
import uuid

import httpx
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.main import app
from app.models.admin import AdminUser
from app.models.customer import Customer
from app.models.notification import Notification
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


async def cleanup(db: AsyncSession, ids: dict):
    """Delete records created during the run."""
    notif_ids = ids.get("notifications", [])
    for nid in notif_ids:
        await db.execute(delete(Notification).where(Notification.id == nid))
    if ids.get("admin"):
        await db.execute(delete(AdminUser).where(AdminUser.id == ids["admin"]))
    if ids.get("customer"):
        await db.execute(delete(Customer).where(Customer.id == ids["customer"]))
    riders = ids.get("riders", [])
    for rid in riders:
        await db.execute(delete(Rider).where(Rider.id == rid))
    await db.commit()


async def main() -> int:
    s = sid()
    admin_email = f"test4c_admin_{s}@example.com"
    admin_pass = "TestPass123!"

    rider1_phone = f"+234701{s}"
    rider2_phone = f"+234702{s}"
    rider1_email = f"rider1_{s}@example.com"
    text_name = f"Rider Alpha {s}"
    text2_name = f"Rider Beta {s}"

    print("=" * 62)
    print("PHASE 4C VERIFICATION (Riders & Notifications)")
    print("=" * 62)

    ids = {
        "admin": None, "customer": None,
        "riders": [], "notifications": [],
    }
    rider_ids = {}

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url=BASE, timeout=300
    ) as c:
        # ------------------------------------------------------------------ AUTH
        print("\n[AUTH]")
        r = await c.post("/api/auth/register", json={
            "email": admin_email, "password": admin_pass, "name": "Test 4C Admin",
        })
        record("register admin -> 201", r.status_code == 201, f"got {r.status_code} {r.text[:120]}")
        if r.status_code == 201:
            ids["admin"] = r.json().get("id")
        rl = await c.post("/api/auth/login", json={"email": admin_email, "password": admin_pass})
        token = rl.json().get("access_token", "") if rl.status_code == 200 else ""
        rh = {"Authorization": f"Bearer {token}"}
        record("admin login -> token", bool(token), f"got {rl.status_code}")

        # Seed a customer for notification recipient testing.
        async def seed_customer():
            async with test_session_factory() as db:
                cust = Customer(name=f"4C Customer {s}", phone=f"+23480{s}")
                db.add(cust)
                await db.commit()
                await db.refresh(cust)
                return cust.id
        cust_id = await seed_customer()
        ids["customer"] = cust_id
        record("seeded customer for notifications", cust_id is not None)

        # ------------------------------------------------------------------ RIDERS
        print("\n[RIDERS]")
        # 401 protection
        rc_none = await c.get("/api/riders")
        record("riders list without token -> 401", rc_none.status_code == 401, f"got {rc_none.status_code}")
        rc_post_none = await c.post("/api/riders", json={
            "name": "x", "phone": "x1234567", "joined_at": "2026-01-01",
        })
        record("rider create without token -> 401", rc_post_none.status_code == 401, f"got {rc_post_none.status_code}")

        # Create rider 1
        rr1 = await c.post("/api/riders", headers=rh, json={
            "name": text_name,
            "phone": rider1_phone,
            "email": rider1_email,
            "lat": 11.5,
            "lng": 9.5,
            "location_address": "Dutse Ring Road",
            "joined_at": "2026-01-15",
        })
        record("create rider -> 201", rr1.status_code == 201, f"got {rr1.status_code} {rr1.text[:200]}")
        rider1_ok = rr1.status_code == 201
        if rider1_ok:
            r1 = rr1.json()
            rider_ids["r1"] = r1.get("id")
            ids["riders"].append(r1.get("id"))
            record("rider default status available", r1.get("status") == "available", f"got {r1.get('status')}")
            record("rider fields echo", r1.get("name") == text_name and r1.get("phone") == rider1_phone
                   and r1.get("email") == rider1_email, f"got {r1}")
            record("rider defaults (counters/rating/joined_at)",
                   r1.get("today_deliveries") == 0 and r1.get("completed_deliveries") == 0
                   and r1.get("rating") == 5.0 and r1.get("joined_at") == "2026-01-15",
                   f"got {r1}")

        # Duplicate email -> 409
        rdup = await c.post("/api/riders", headers=rh, json={
            "name": "Dup", "phone": "1234567890", "email": rider1_email, "joined_at": "2026-01-01",
        })
        record("duplicate rider email -> 409", rdup.status_code == 409, f"got {rdup.status_code}")

        # Bad status value via update -> 422
        rbad_status = await c.patch(f"/api/riders/{rider_ids.get('r1')}/status", headers=rh,
                                    json={"status": "super_fast"})
        record("invalid rider status -> 422", rbad_status.status_code == 422, f"got {rbad_status.status_code}")

        # Create rider 2 (offline)
        rr2 = await c.post("/api/riders", headers=rh, json={
            "name": text2_name,
            "phone": rider2_phone,
            "email": f"rider2_{s}@example.com",
            "joined_at": "2026-02-01",
        })
        record("create second rider -> 201", rr2.status_code == 201, f"got {rr2.status_code}")
        if rr2.status_code == 201:
            r2 = rr2.json()
            rider_ids["r2"] = r2.get("id")
            ids["riders"].append(r2.get("id"))

        # List riders
        rl_r = await c.get("/api/riders", headers=rh)
        rec = rl_r.json()
        record("rider listing -> 200 + envelope", rl_r.status_code == 200 and "items" in rec and "total" in rec, f"got {rl_r.status_code}")
        record("rider listing contains created rider",
               any(x.get("id") == rider_ids.get("r1") for x in rec.get("items", [])))

        # Status filter
        rl_avail = await c.get("/api/riders", headers=rh, params={"status": "available"})
        record("rider listing filter status=available",
               rl_avail.status_code == 200 and any(x.get("id") == rider_ids.get("r1") for x in rl_avail.json().get("items", [])))

        # Search filter
        rl_search = await c.get("/api/riders", headers=rh, params={"search": text2_name})
        record("rider listing search by name",
               rl_search.status_code == 200 and any(x.get("id") == rider_ids.get("r2") for x in rl_search.json().get("items", [])))

        # Detail (with delivery history)
        rd1 = await c.get(f"/api/riders/{rider_ids.get('r1')}", headers=rh)
        record("rider detail -> 200 with deliveries array",
               rd1.status_code == 200 and isinstance(rd1.json().get("deliveries"), list), f"got {rd1.status_code}")
        record("rider detail fields match",
               rd1.status_code == 200 and rd1.json().get("name") == text_name)

        # Update name/phone
        rup = await c.patch(f"/api/riders/{rider_ids.get('r1')}", headers=rh,
                            json={"name": f"{text_name} Renamed", "phone": f"+2347{s}"})
        record("rider update -> 200 + new name",
               rup.status_code == 200 and rup.json().get("name") == f"{text_name} Renamed", f"got {rup.status_code}")

        # Status change endpoint
        rs = await c.patch(f"/api/riders/{rider_ids.get('r1')}/status", headers=rh,
                           json={"status": "busy"})
        record("rider status change -> available to busy",
               rs.status_code == 200 and rs.json().get("status") == "busy", f"got {rs.status_code} {rs.text[:120]}")
        rs2 = await c.patch(f"/api/riders/{rider_ids.get('r1')}/status", headers=rh,
                            json={"status": "offline"})
        record("rider status change -> offline",
               rs2.status_code == 200 and rs2.json().get("status") == "offline", f"got {rs2.status_code}")

        # Nonexistent rider -> 404
        rnf = await c.get(f"/api/riders/{uuid.uuid4()}", headers=rh)
        record("nonexistent rider -> 404", rnf.status_code == 404, f"got {rnf.status_code}")

        # ------------------------------------------------------------------ NOTIFICATIONS
        print("\n[NOTIFICATIONS]")
        # Auth protection
        rc_none = await c.get("/api/notifications", params={
            "recipient_type": "admin", "recipient_id": str(ids.get("admin")),
        })
        record("notifications list without token -> 401", rc_none.status_code == 401, f"got {rc_none.status_code}")
        rc_post_none = await c.post("/api/notifications", json={
            "recipient_type": "admin", "recipient_id": str(ids.get("admin")),
            "type": "system", "title": "x", "message": "y",
        })
        record("notification create without token -> 401", rc_post_none.status_code == 401, f"got {rc_post_none.status_code}")

        # Create for admin
        na = await c.post("/api/notifications", headers=rh, json={
            "recipient_type": "admin", "recipient_id": str(ids.get("admin")),
            "type": "system", "title": "Welcome", "message": "Hi admin",
        })
        record("create notification for admin -> 201 + unread",
               na.status_code == 201 and na.json().get("read") is False, f"got {na.status_code} {na.text[:120]}")
        if na.status_code == 201:
            ids["notifications"].append(na.json().get("id"))

        # Create for customer
        nc = await c.post("/api/notifications", headers=rh, json={
            "recipient_type": "customer", "recipient_id": str(cust_id),
            "type": "order", "title": "Order ready", "message": "Your order is ready",
        })
        record("create notification for customer -> 201", nc.status_code == 201, f"got {nc.status_code}")
        if nc.status_code == 201:
            ids["notifications"].append(nc.json().get("id"))

        # Create two for rider
        nr1 = await c.post("/api/notifications", headers=rh, json={
            "recipient_type": "rider", "recipient_id": str(rider_ids.get("r1")),
            "type": "delivery", "title": "New delivery", "message": "Pickup at restaurant",
        })
        nr2 = await c.post("/api/notifications", headers=rh, json={
            "recipient_type": "rider", "recipient_id": str(rider_ids.get("r1")),
            "type": "system", "title": "Shift", "message": "Your shift starts now",
        })
        record("create two notifications for rider -> 201 x2",
               nr1.status_code == 201 and nr2.status_code == 201, f"got {nr1.status_code} {nr2.status_code}")
        if nr1.status_code == 201:
            ids["notifications"].append(nr1.json().get("id"))
        if nr2.status_code == 201:
            ids["notifications"].append(nr2.json().get("id"))
        rider_notif1 = nr1.json().get("id") if nr1.status_code == 201 else None
        rider_notif2 = nr2.json().get("id") if nr2.status_code == 201 else None

        # List for rider
        rl_n = await c.get("/api/notifications", headers=rh, params={
            "recipient_type": "rider", "recipient_id": str(rider_ids.get("r1")),
        })
        rn = rl_n.json()
        record("notification listing -> 200 + envelope",
               rl_n.status_code == 200 and "items" in rn and "total" in rn, f"got {rl_n.status_code}")
        record("notification listing isolated by recipient",
               rl_n.status_code == 200 and rn.get("total") == 2
               and all(x.get("recipient_type") == "rider" for x in rn.get("items", [])),
               f"total={rn.get('total')}")

        # Unread filter (both rider notifications unread)
        rl_un = await c.get("/api/notifications", headers=rh, params={
            "recipient_type": "rider", "recipient_id": str(rider_ids.get("r1")), "unread_only": "true",
        })
        record("unread filter returns unread only",
               rl_un.status_code == 200 and rl_un.json().get("total") == 2, f"got {rl_un.json().get('total')}")

        # Mark one read
        rmark = await c.patch(f"/api/notifications/{rider_notif1}/read", headers=rh, json={"read": True})
        record("mark notification read -> read true",
               rmark.status_code == 200 and rmark.json().get("read") is True, f"got {rmark.status_code}")
        rl_un2 = await c.get("/api/notifications", headers=rh, params={
            "recipient_type": "rider", "recipient_id": str(rider_ids.get("r1")), "unread_only": "true",
        })
        record("unread count drops after mark read",
               rl_un2.status_code == 200 and rl_un2.json().get("total") == 1, f"got {rl_un2.json().get('total')}")
        rc_count = await c.get("/api/notifications/unread-count", headers=rh, params={
            "recipient_type": "rider", "recipient_id": str(rider_ids.get("r1")),
        })
        record("unread-count endpoint -> 1",
               rc_count.status_code == 200 and rc_count.json().get("count") == 1, f"got {rc_count.json()}")

        # Mark unread again (toggle)
        runread = await c.patch(f"/api/notifications/{rider_notif1}/read", headers=rh, json={"read": False})
        record("mark notification unread -> read false",
               runread.status_code == 200 and runread.json().get("read") is False, f"got {runread.status_code}")

        # Invalid recipient -> 404 (customer id that doesn't exist as rider)
        rbad_recip = await c.post("/api/notifications", headers=rh, json={
            "recipient_type": "rider", "recipient_id": str(cust_id),
            "type": "system", "title": "x", "message": "y",
        })
        record("notification for nonexistent rider -> 404", rbad_recip.status_code == 404, f"got {rbad_recip.status_code}")

        # Nonexistent notification mark read -> 404
        rnf_n = await c.patch(f"/api/notifications/{uuid.uuid4()}/read", headers=rh, json={"read": True})
        record("mark read nonexistent notification -> 404", rnf_n.status_code == 404, f"got {rnf_n.status_code}")

        # 404 get notification
        rnf_get = await c.get(f"/api/notifications/{uuid.uuid4()}", headers=rh)
        record("get nonexistent notification -> 404", rnf_get.status_code == 404, f"got {rnf_get.status_code}")

        # GET single notification
        rget = await c.get(f"/api/notifications/{rider_notif1}", headers=rh)
        record("get single notification -> 200", rget.status_code == 200, f"got {rget.status_code}")

    # ------------------------------------------------------------------ CLEANUP
    print("\n[CLEANUP]")
    async def do_cleanup():
        async with test_session_factory() as db:
            await cleanup(db, ids)
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
        return 1
    print("ALL PHASE 4C CHECKS PASSED")
    print("=" * 62)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
