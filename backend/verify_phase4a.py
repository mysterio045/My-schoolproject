"""
Phase 4A Verification / Tests
=============================
End-to-end tests for Authentication, Menu, and Customer read endpoints.

Runs against a LIVE running server (http://127.0.0.1:8000) via httpx.

Tests:
  AUTH:
    - register valid admin (201, no password_hash leaked)
    - duplicate email -> 409
    - login success -> token
    - login wrong password -> 401
    - /me without token -> 401
    - /me with token -> 200 (correct profile)
    - protected endpoint without token -> 401
  MENU:
    - list menu (empty / after seeding)
    - get item
    - nonexistent item -> 404
    - create item (auth)
    - invalid price -> 422
    - update item
    - toggle availability
    - invalid category -> 404
  CUSTOMERS:
    - list customers
    - pagination
    - search
    - get customer
    - nonexistent customer -> 404

Test data (a category, a menu item, an admin, a customer) is created with a
unique timestamp suffix and cleaned up at the end of the run.
"""

import asyncio
import time
import uuid

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.admin import AdminUser
from app.models.customer import Customer
from app.models.menu import MenuCategory, MenuItem

BASE = "http://127.0.0.1:8000"
RESULTS = []


def record(label: str, ok: bool, detail: str = ""):
    RESULTS.append((label, ok, detail))
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}" + (f" — {detail}" if detail and not ok else ""))


def sid() -> str:
    return str(int(time.time()))[-6:]


async def cleanup(db: AsyncSession, *ids):
    """Delete test records created during the run."""
    for obj_id in ids:
        if obj_id:
            await db.execute(delete(MenuItem).where(MenuItem.id == obj_id))
            await db.execute(delete(MenuCategory).where(MenuCategory.id == obj_id))
    await db.execute(delete(Customer).where(Customer.name.like("Test Customer%")))
    await db.execute(delete(AdminUser).where(AdminUser.email.like("test_admin_%@%example.com")))
    await db.commit()


async def with_retry(fn, attempts=8, wait=4.0):
    """Run an async fn that uses its own session; retry on pooler flakiness."""
    last = None
    for i in range(attempts):
        try:
            return await fn()
        except Exception as e:  # noqa: BLE001
            last = e
            print(f"    retry {i+1}/{attempts}: {type(e).__name__}: {e}")
            await asyncio.sleep(wait)
    raise last


async def main() -> int:
    s = sid()
    admin_email = f"test_admin_{s}@example.com"
    admin_pass = "TestPass123!"
    item_name = f"Test Jollof {s}"
    cat_name = f"Test Cat {s}"
    cust_name = f"Test Customer {s}"
    cust_phone = f"+23480{s}"

    print("=" * 62)
    print("PHASE 4A VERIFICATION")
    print("=" * 62)

    # Track created records for cleanup
    created_ids = {"admin": None, "category": None, "item": None, "customer": None}

    with httpx.Client(base_url=BASE, timeout=30) as c:
        # ------------------------------------------------------------------ AUTH
        print("\n[AUTH]")
        r = c.post("/api/auth/register", json={
            "email": admin_email, "password": admin_pass, "name": "Test Admin",
        })
        record("register new admin -> 201", r.status_code == 201,
                f"got {r.status_code} {r.text[:120]}")
        record("response excludes password_hash",
               r.status_code == 201 and "password_hash" not in r.text)
        if r.status_code == 201:
            created_ids["admin"] = r.json().get("id")

        r2 = c.post("/api/auth/register", json={
            "email": admin_email, "password": admin_pass, "name": "Dup",
        })
        record("duplicate email -> 409", r2.status_code == 409,
                f"got {r2.status_code}")

        rbad = c.post("/api/auth/register", json={
            "email": "bad", "password": admin_pass, "name": "X",
        })
        record("invalid email -> 422", rbad.status_code == 422,
                f"got {rbad.status_code}")

        # login
        rl = c.post("/api/auth/login", json={"email": admin_email, "password": admin_pass})
        token = rl.json().get("access_token", "") if rl.status_code == 200 else ""
        record("login success -> 200 + token", rl.status_code == 200 and bool(token),
                f"got {rl.status_code}")
        rh = {"Authorization": f"Bearer {token}"}

        rw = c.post("/api/auth/login", json={"email": admin_email, "password": "WrongPass!"})
        record("login wrong password -> 401", rw.status_code == 401,
                f"got {rw.status_code}")

        # /me
        rme_none = c.get("/api/auth/me")
        record("/me without token -> 401", rme_none.status_code == 401,
                f"got {rme_none.status_code}")
        rme = c.get("/api/auth/me", headers=rh)
        record("/me with token -> 200 + email match",
               rme.status_code == 200 and rme.json().get("email") == admin_email,
               f"got {rme.status_code}")

        # protected endpoint without token
        rc_none = c.get("/api/customers")
        record("protected endpoint without token -> 401", rc_none.status_code == 401,
                f"got {rc_none.status_code}")

        # ---------------------------------------------------------------- MENU
        print("\n[MENU]")
        # create category
        rcat = c.post("/api/menu/categories", headers=rh,
                      json={"name": cat_name, "description": "test"})
        record("create category -> 201", rcat.status_code == 201,
                f"got {rcat.status_code} {rcat.text[:120]}")
        if rcat.status_code == 201:
            created_ids["category"] = rcat.json().get("id")
        invalid_cat = str(uuid.uuid4())

        # invalid category
        rbadcat = c.post("/api/menu", headers=rh, json={
            "category_id": invalid_cat, "name": "X", "price": 100,
        })
        record("create item w/ invalid category -> 404", rbadcat.status_code == 404,
                f"got {rbadcat.status_code}")

        # create item
        item_payload = {
            "category_id": created_ids["category"] or invalid_cat,
            "name": item_name, "description": "test item", "price": 3500.00,
        }
        ri = c.post("/api/menu", headers=rh, json=item_payload)
        item_id = ri.json().get("id") if ri.status_code == 201 else None
        created_ids["item"] = item_id
        record("create item -> 201", ri.status_code == 201, f"got {ri.status_code}")

        # create item without token -> 401
        rnotok = c.post("/api/menu", json=item_payload)
        record("create item without token -> 401", rnotok.status_code == 401,
                f"got {rnotok.status_code}")

        # invalid price
        rprice = c.post("/api/menu", headers=rh, json={
            "category_id": created_ids["category"], "name": "Neg", "price": -5,
        })
        record("invalid (negative) price -> 422", rprice.status_code == 422,
                f"got {rprice.status_code}")

        # list menu
        rlist = c.get("/api/menu")
        list_ok = rlist.status_code == 200 and "items" in rlist.json()
        record("list menu -> 200 + envelope", list_ok, f"got {rlist.status_code}")
        # availability filter
        ra = c.get("/api/menu", params={"available": "true"})
        record("list menu availability filter", ra.status_code == 200,
                f"got {ra.status_code}")
        # category filter
        if created_ids["category"]:
            rc = c.get("/api/menu", params={"category_id": created_ids["category"]})
            record("list menu category filter", rc.status_code == 200,
                    f"got {rc.status_code}")

        # get item (404 + found)
        if item_id:
            rg = c.get(f"/api/menu/{item_id}")
            record("get item -> 200 + name match",
                   rg.status_code == 200 and rg.json().get("name") == item_name,
                   f"got {rg.status_code}")
        rnf = c.get(f"/api/menu/{str(uuid.uuid4())}")
        record("get nonexistent item -> 404", rnf.status_code == 404,
                f"got {rnf.status_code}")

        # update item
        if item_id:
            ru = c.patch(f"/api/menu/{item_id}", headers=rh,
                         json={"price": 4000.00, "description": "updated"})
            upd_ok = ru.status_code == 200 and ru.json().get("price") == 4000.0
            record("update item -> 200 + new price", upd_ok, f"got {ru.status_code}")

        # toggle availability
        if item_id:
            rt = c.patch(f"/api/menu/{item_id}/toggle", headers=rh)
            toggled = rt.status_code == 200 and rt.json().get("available") is False
            record("toggle availability -> False", toggled, f"got {rt.status_code}")
            rt2 = c.patch(f"/api/menu/{item_id}/toggle", headers=rh)
            record("toggle availability -> True",
                   rt2.status_code == 200 and rt2.json().get("available") is True,
                   f"got {rt2.status_code}")

        # ------------------------------------------------------------ CUSTOMERS
        print("\n[CUSTOMERS]")
        # create a customer via service (no public create endpoint in Phase 4A)
        async def seed_customer():
            async with async_session_factory() as db:
                cust = Customer(name=cust_name, phone=cust_phone, email=None, address=None)
                db.add(cust)
                await db.commit()
                await db.refresh(cust)
                return cust.id

        async def get_seeded_id():
            async with async_session_factory() as db:
                res = await db.execute(
                    select(Customer.id).where(Customer.name == cust_name)
                )
                return res.scalar_one_or_none()

        await with_retry(seed_customer)
        cust_id = await with_retry(get_seeded_id)
        created_ids["customer"] = cust_id

        rl2 = c.get("/api/customers", headers=rh)
        rec = rl2.json()
        record("list customers -> 200 + envelope",
               rl2.status_code == 200 and "items" in rec and "total" in rec,
               f"got {rl2.status_code}")
        if created_ids["customer"] and rl2.status_code == 200:
            found = any(x.get("id") == str(cust_id) for x in rec.get("items", []))
            record("list customers contains seeded customer", found)

        # pagination
        rp = c.get("/api/customers", headers=rh, params={"page": 1, "page_size": 2})
        pag = rp.json()
        record("pagination page_size=2", rp.status_code == 200
               and len(pag.get("items", [])) <= 2
               and pag.get("page_size") == 2, f"got {rp.status_code}")

        # search
        rs = c.get("/api/customers", headers=rh, params={"search": s})
        if rs.status_code == 200:
            matched = any(x.get("name") == cust_name for x in rs.json().get("items", []))
            record("search finds seeded customer", matched)
        else:
            record("search finds seeded customer", False, f"got {rs.status_code}")

        # get customer + detail
        rcust = c.get(f"/api/customers/{cust_id}", headers=rh)
        record("get customer -> 200 + name", rcust.status_code == 200
               and rcust.json().get("name") == cust_name, f"got {rcust.status_code}")
        record("customer detail includes orders", rcust.status_code == 200
               and "orders" in rcust.json())

        rcust404 = c.get(f"/api/customers/{str(uuid.uuid4())}", headers=rh)
        record("get nonexistent customer -> 404", rcust404.status_code == 404,
                f"got {rcust404.status_code}")

    # ------------------------------------------------------------------ CLEANUP
    print("\n[CLEANUP]")
    async def do_cleanup():
        async with async_session_factory() as db:
            await cleanup(
                db,
                created_ids["item"],
                created_ids["category"],
                created_ids["admin"],
                created_ids["customer"],
            )
    await with_retry(do_cleanup, attempts=6, wait=3.0)
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
        print("ALL PHASE 4A CHECKS PASSED")
    print("=" * 62)
    return 1 if fails else 0


if __name__ == "__main__":
    import asyncio

    raise SystemExit(asyncio.run(main()))
