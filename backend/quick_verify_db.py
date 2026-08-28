"""
Quick Database Verification (raw asyncpg, no SQLAlchemy echo)
=============================================================
Checks all 10 tables exist with correct schema.

Run:
    python quick_verify_db.py
"""

import asyncio
import asyncpg

HOST = "aws-0-eu-west-2.pooler.supabase.com"
PORT = 6543
USER = "postgres.iciotzlmszdxemhfmyiq"
PASSWORD = "QoMKxhi17kTkLn2L"
DATABASE = "postgres"

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


async def main():
    conn = await asyncpg.connect(
        host=HOST, port=PORT, user=USER, password=PASSWORD,
        database=DATABASE, ssl="require",
    )
    print("Connected to Supabase\n")

    print("=== 1. TABLES ===")
    rows = await conn.fetch(
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema='public' ORDER BY table_name"
    )
    db_tables = {r["table_name"] for r in rows}
    for t in sorted(EXPECTED_TABLES):
        status = "OK" if t in db_tables else "MISSING"
        print(f"  [{status}] {t}")
    missing = EXPECTED_TABLES - db_tables
    print(f"\n  All 10 tables present: {not missing}")

    print("\n=== 2. COLUMN COUNT PER TABLE ===")
    rows = await conn.fetch(
        "SELECT table_name, count(*) AS n "
        "FROM information_schema.columns "
        "WHERE table_schema='public' "
        "GROUP BY table_name ORDER BY table_name"
    )
    for r in rows:
        if r["table_name"] in EXPECTED_TABLES:
            print(f"  {r['table_name']}: {r['n']} columns")

    print("\n=== 3. FOREIGN KEYS ===")
    rows = await conn.fetch(
        "SELECT tc.table_name, kcu.column_name, "
        "       ccu.table_name AS ref_table "
        "FROM information_schema.table_constraints tc "
        "JOIN information_schema.key_column_usage kcu "
        "  ON tc.constraint_name = kcu.constraint_name "
        "JOIN information_schema.constraint_column_usage ccu "
        "  ON tc.constraint_name = ccu.constraint_name "
        "WHERE tc.constraint_type='FOREIGN KEY' "
        "ORDER BY tc.table_name"
    )
    for r in rows:
        print(f"  {r['table_name']}.{r['column_name']} -> {r['ref_table']}")

    await conn.close()
    print("\n=== DONE ===")


if __name__ == "__main__":
    asyncio.run(main())
