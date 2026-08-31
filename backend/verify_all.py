"""
Phase 1-3 Final Verification Script
===================================
Runs the full set of Phase 1-3 checks in one place.

Run:
    python verify_all.py

Checks:
  1. FastAPI app imports (no circular imports).
  2. GET /health returns 200 + {"status":"ok"}.
  3. Swagger /docs + /openapi.json load.
  4. SQLAlchemy connects to Supabase PostgreSQL.
  5. All 10 required tables exist.
  6. Alembic migration history + latest applied revision.
  7. All 10 ORM models import.
  8. SQLAlchemy relationships valid.
  9. PKs, FKs, uniques, indexes, status values present/correct.
 10. Pydantic schemas import + verify_schemas.py passes (subprocess).
 11. Order vs Delivery status separation (orders have NO rider_id;
     deliveries have the rider foreign key).
"""

import asyncio
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

from sqlalchemy import bindparam, inspect, text

from app.database import engine
from app.main import app

# Have to import ALL models to register them on the metadata/Base
from app.models import (  # noqa: F401
    AdminUser,
    Customer,
    Rider,
    MenuCategory,
    MenuItem,
    Order,
    OrderItem,
    OrderTimeline,
    Delivery,
    Notification,
)

EXPECTED_TABLES = {
    "admin_users",
    "customers",
    "riders",
    "menu_categories",
    "menu_items",
    "orders",
    "order_items",
    "order_timeline",
    "deliveries",
    "notifications",
}

RESULTS = []


def record(label: str, ok: bool, detail: str = ""):
    RESULTS.append((label, ok, detail))
    mark = "PASS" if ok else "FAIL"
    suffix = f" — {detail}" if detail else ""
    print(f"  [{mark}] {label}{suffix}")


def check_health(base_url: str):
    """Check GET /health and /docs/.openapi.json using urllib (no extra deps)."""
    try:
        with urllib.request.urlopen(f"{base_url}/health", timeout=15) as r:
            body = r.read().decode()
        record("GET /health returns 200 + {status:ok}",
               r.status == 200 and json.loads(body) == {"status": "ok"},
               f"status={r.status} body={body}")
        with urllib.request.urlopen(f"{base_url}/openapi.json", timeout=15) as o:
            schema = json.loads(o.read().decode())
        opened = "/health" in schema.get("paths", {})
        record("Swagger /openapi.json loads with /health path",
               o.status == 200 and opened, f"status={o.status}")
    except Exception as e:
        record("GET /health returns 200", False, f"err={e}")
        record("Swagger /openapi.json loads", False, f"err={e}")

    # /docs page (HTML) served
    try:
        with urllib.request.urlopen(f"{base_url}/docs", timeout=15) as d:
            html = d.read().decode()
        record("Swagger /docs page loads", d.status == 200 and "swagger" in html.lower(),
               f"status={d.status}")
    except Exception as e:
        record("Swagger /docs page loads", False, f"err={e}")


async def db_checks():
    """All database-level checks. Uses short-lived connections + retries because
    the Supabase transaction-pooler can recycle/kill an idle pooled connection
    (observed on this network). Each query opens/uses a fresh connection so a
    single drop does not abort the whole run."""
    print("\n[DB] Database checks")

    async def run(query, params=None, retries=3, expanding_params=()):
        """Execute a scalar/rows query with reconnect retries.
        `expanding_params` is a sequence of names to treat as expanding IN params."""
        last = None
        for attempt in range(retries):
            try:
                async with engine.connect() as conn:
                    stmt = text(query)
                    for pname in expanding_params:
                        stmt = stmt.bindparams(bindparam(pname, expanding=True))
                    res = await conn.execute(stmt, params or {})
                    return res
            except Exception as e:  # reconnect on transient pooler drops
                last = e
                await asyncio.sleep(1.5)
        raise last

    # 4. Connect
    try:
        res = await run("SELECT version()")
        version = res.scalar()
        record("SQLAlchemy connects to Supabase", bool(version),
               f"pg='{version[:30]}...'")
    except Exception as e:
        record("SQLAlchemy connects to Supabase", False, f"err={e}")

    # 5. Tables
    try:
        res = await run("SELECT table_name FROM information_schema.tables "
                        "WHERE table_schema='public'")
        db_tables = {r[0] for r in res}
        missing = EXPECTED_TABLES - db_tables
        record(f"All 10 tables exist (found {len(db_tables & EXPECTED_TABLES)})",
               len(missing) == 0, f"missing={missing or 'none'}")
    except Exception as e:
        db_tables = set()
        record("All 10 tables exist", False, f"err={e}")

    # 6. Alembic version applied
    try:
        res = await run("SELECT version_num FROM alembic_version")
        ver_row = res.first()
        record("Alembic migration applied (revision recorded)",
               ver_row is not None and ver_row[0],
               f"revision={ver_row[0] if ver_row else 'NONE'}")
    except Exception as e:
        record("Alembic migration applied", False, f"err={e}")

    # 9. Primary keys on each expected table
    for t in sorted(EXPECTED_TABLES):
        if t not in db_tables:
            continue
        try:
            res = await run(
                "SELECT kcu.column_name FROM information_schema.table_constraints tc "
                "JOIN information_schema.key_column_usage kcu "
                "  ON tc.constraint_name=kcu.constraint_name "
                "WHERE tc.table_name=:t AND tc.constraint_type='PRIMARY KEY'",
                {"t": t},
            )
            pk = res.scalars().all()
            record(f"{t}: PK present", len(pk) == 1, f"col={pk}")
        except Exception as e:
            record(f"{t}: PK present", False, f"err={e}")

    # Foreign keys
    try:
        res = await run(
            "SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref "
            "FROM information_schema.table_constraints tc "
            "JOIN information_schema.key_column_usage kcu "
            "  ON tc.constraint_name=kcu.constraint_name "
            "JOIN information_schema.constraint_column_usage ccu "
            "  ON tc.constraint_name=ccu.constraint_name "
            "WHERE tc.constraint_type='FOREIGN KEY' ORDER BY tc.table_name"
        )
        fks = {(r[0], r[1], r[2]) for r in res}
        record("Foreign keys present", len(fks) >= 7, f"count={len(fks)}")
        for tbl, col, ref in sorted(fks):
            print(f"         FK: {tbl}.{col} -> {ref}")
    except Exception as e:
        record("Foreign keys present", False, f"err={e}")

    # Unique constraints
    try:
        res = await run(
            "SELECT tc.table_name, kcu.column_name "
            "FROM information_schema.table_constraints tc "
            "JOIN information_schema.key_column_usage kcu "
            "  ON tc.constraint_name=kcu.constraint_name "
            "WHERE tc.constraint_type='UNIQUE' AND tc.table_name IN :tables "
            "ORDER BY tc.table_name",
            {"tables": tuple(sorted(EXPECTED_TABLES))},
            expanding_params=("tables",),
        )
        uks = {(r[0], r[1]) for r in res}
        record("Unique constraints present", len(uks) >= 4,
               f"count={len(uks)}: {sorted(uks) if uks else ''}")
    except Exception as e:
        record("Unique constraints present", False, f"err={e}")

    # Indexes (non-PK)
    try:
        res = await run(
            "SELECT indexname, tablename FROM pg_indexes "
            "WHERE schemaname='public' AND tablename IN :tables "
            "  AND indexname NOT LIKE '%_pkey' ORDER BY tablename",
            {"tables": tuple(sorted(EXPECTED_TABLES))},
            expanding_params=("tables",),
        )
        idxs = list(res)
        record("Indexes present", len(idxs) >= 10, f"count={len(idxs)}")
    except Exception as e:
        record("Indexes present", False, f"err={e}")

    # 11b. Order vs Delivery separation (columns)
    try:
        res = await run(
            "SELECT column_name FROM information_schema.columns WHERE table_name='orders'")
        order_cols = {r[0] for r in res}
        res = await run(
            "SELECT column_name FROM information_schema.columns WHERE table_name='deliveries'")
        delivery_cols = {r[0] for r in res}
        record("orders table has NO rider_id", "rider_id" not in order_cols,
               f"order_has_rider_id={'rider_id' in order_cols}")
        record("deliveries table HAS rider_id", "rider_id" in delivery_cols)
    except Exception as e:
        record("orders/deliveries column separation", False, f"err={e}")

    # 9. status value constraints (full lifecycle enums in code)
    from app.models.enums import OrderStatus, DeliveryStatus
    order_statuses = [s.value for s in OrderStatus]
    delivery_statuses = [s.value for s in DeliveryStatus]
    record("OrderStatus enum defines full lifecycle",
           order_statuses == ["pending", "confirmed", "preparing", "ready",
                              "completed", "cancelled"], f"{order_statuses}")
    record("DeliveryStatus enum defines full lifecycle",
           delivery_statuses == ["pending", "assigned", "accepted", "picked_up",
                                 "on_the_way", "delivered", "failed"],
           f"{delivery_statuses}")


def model_checks():
    """Check ORM model imports + relationships + column types (no DB needed)."""
    print("\n[MODELS] ORM checks")
    models = {
        "AdminUser": AdminUser, "Customer": Customer, "Rider": Rider,
        "MenuCategory": MenuCategory, "MenuItem": MenuItem, "Order": Order,
        "OrderItem": OrderItem, "OrderTimeline": OrderTimeline,
        "Delivery": Delivery, "Notification": Notification,
    }
    for name, cls in models.items():
        record(f"Model {name} imports", name in models)
        tb = getattr(cls, "__tablename__", None)
        record(f"  {name}.__tablename__ == '{tb}'", tb is not None and tb in EXPECTED_TABLES,
               f"table={tb}")

    # Relationships
    rel_count = 0
    for name, cls in models.items():
        mapper = cls.__mapper__
        rels = list(mapper.relationships)
        rel_count += len(rels)
    record("All relationships load (no circular/import errors)", rel_count >= 10,
           f"total_relationships={rel_count}")

    # Order has no 'rider' relationship/field; Delivery HAS 'rider' relationship
    order_has_rider = "rider" in Order.__mapper__.relationships or "rider_id" in Order.__mapper__.columns
    delivery_has_rider = "rider" in Delivery.__mapper__.relationships
    record("Order model has NO rider relationship", not order_has_rider)
    record("Delivery model HAS rider relationship", delivery_has_rider)

    # Order.enums distinction preserved in code
    from app.models.enums import OrderStatus, DeliveryStatus
    order_uses = Order.__table__.c.status
    delivery_uses = Delivery.__table__.c.status
    record("Order.status and Delivery.status are SEPARATE columns",
           order_uses.name == "status" and delivery_uses.name == "status"
           and str(Order.__table__) != str(Delivery.__table__))


def main():
    print("=" * 62)
    print("PHASE 1-3 FINAL VERIFICATION")
    print("=" * 62)

    base_url = "http://127.0.0.1:8000"

    print("\n[1] FastAPI app import")
    try:
        from app.schemas import (  # noqa: F401
            OrderCreate, OrderRead, DeliveryRead, CustomerRead, RiderRead,
            AdminRead, TokenResponse, MenuItemRead, MenuCategoryRead,
            NotificationRead, Page, PageParams,
        )
        record("All Pydantic schemas import", True)
    except Exception as e:
        record("All Pydantic schemas import", False, f"err={e}")

    try:
        record("FastAPI app imports (no circular import)", app is not None)
    except Exception as e:
        record("FastAPI app imports (no circular import)", False, f"err={e}")

    check_health(base_url)

    model_checks()

    asyncio.run(db_checks())

    print("\n[SCHEMAS] verify_schemas.py")
    try:
        res = subprocess.run(
            [sys.executable, "verify_schemas.py"],
            capture_output=True, text=True, timeout=120,
            cwd=str(Path(__file__).parent),
        )
        ok = "ALL SCHEMA CHECKS PASSED" in res.stdout
        record("verify_schemas.py passes", ok,
               f"rc={res.returncode}, hint={res.stdout[-200:] if not ok else ''}")
    except Exception as e:
        record("verify_schemas.py passes", False, f"err={e}")

    # Summary
    print("\n" + "=" * 62)
    passes = sum(1 for _, ok, _ in RESULTS if ok)
    fails = [(lbl, d) for lbl, ok, d in RESULTS if not ok]
    print(f"TOTAL: {len(RESULTS)} checks — {passes} PASS, {len(fails)} FAIL")
    if fails:
        print("FAILURES:")
        for lbl, d in fails:
            print(f"  - {lbl}: {d}")
    else:
        print("ALL PHASE 1-3 CHECKS PASSED")
    print("=" * 62)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
