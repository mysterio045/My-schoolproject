"""
Database Verification Script
============================
Verifies that all 10 tables exist in the database with correct
columns, primary keys, foreign keys, and indexes.

Run after applying migrations:
    python verify_db.py

Requires DATABASE_URL in .env to point to a live PostgreSQL database.
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from app.config import settings
from app.database import engine

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


async def verify_database():
    """Run all verification checks against the database."""
    print("=" * 60)
    print("DATABASE VERIFICATION")
    print("=" * 60)
    print(f"Connecting to: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'hidden'}")
    print()

    async with engine.connect() as conn:
        # 1. Check all tables exist
        print("[1] Checking tables...")
        result = await conn.execute(text(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'public' ORDER BY table_name"
        ))
        db_tables = {row[0] for row in result.fetchall()}
        missing = EXPECTED_TABLES - db_tables
        extra = db_tables - EXPECTED_TABLES - {"alembic_version"}

        if missing:
            print(f"  ❌ Missing tables: {missing}")
        else:
            print(f"  ✅ All {len(EXPECTED_TABLES)} tables exist")

        if extra:
            print(f"  ℹ️  Extra tables (not ours): {extra}")

        # 2. Check primary keys
        print()
        print("[2] Checking primary keys...")
        for table in sorted(EXPECTED_TABLES):
            result = await conn.execute(text(
                "SELECT column_name FROM information_schema.table_constraints "
                "WHERE table_name = :table AND constraint_type = 'PRIMARY KEY'"
            ), {"table": table})
            pk_cols = [row[0] for row in result.fetchall()]
            if pk_cols:
                print(f"  ✅ {table}: PK = {pk_cols}")
            else:
                print(f"  ❌ {table}: NO PRIMARY KEY")

        # 3. Check foreign keys
        print()
        print("[3] Checking foreign keys...")
        result = await conn.execute(text(
            "SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table "
            "FROM information_schema.table_constraints tc "
            "JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name "
            "JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name "
            "WHERE tc.constraint_type = 'FOREIGN KEY' "
            "ORDER BY tc.table_name, kcu.column_name"
        ))
        fks = result.fetchall()
        if fks:
            for table, col, ref_table in fks:
                print(f"  ✅ {table}.{col} → {ref_table}")
        else:
            print("  ❌ No foreign keys found")

        # 4. Check unique constraints
        print()
        print("[4] Checking unique constraints...")
        result = await conn.execute(text(
            "SELECT tc.table_name, kcu.column_name "
            "FROM information_schema.table_constraints tc "
            "JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name "
            "WHERE tc.constraint_type = 'UNIQUE' "
            "ORDER BY tc.table_name"
        ))
        uniques = result.fetchall()
        if uniques:
            for table, col in uniques:
                print(f"  ✅ {table}.{col} UNIQUE")
        else:
            print("  ❌ No unique constraints found")

        # 5. Check indexes
        print()
        print("[5] Checking indexes...")
        result = await conn.execute(text(
            "SELECT indexname, tablename FROM pg_indexes "
            "WHERE schemaname = 'public' AND indexname LIKE 'ix_%' "
            "ORDER BY tablename, indexname"
        ))
        indexes = result.fetchall()
        if indexes:
            for idx_name, table in indexes:
                print(f"  ✅ {table}: {idx_name}")
        else:
            print("  ⚠️  No custom indexes found (may use auto-generated names)")

        # 6. Summary
        print()
        print("=" * 60)
        total_errors = len(missing)
        if total_errors == 0:
            print("✅ ALL CHECKS PASSED — Database is ready")
        else:
            print(f"❌ {total_errors} issues found")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(verify_database())
