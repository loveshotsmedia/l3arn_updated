#!/usr/bin/env python3
"""Database reset script — drops all tables and re-runs migrations + seed."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
MIGRATIONS_DIR = ROOT / "supabase" / "migrations"
POLICIES_DIR = ROOT / "supabase" / "policies"
SEED_DIR = ROOT / "supabase" / "seed"


def run_sql(file: Path, db_url: str) -> None:
    """Execute a SQL file against Postgres."""
    print(f"  → Running {file.name}...")
    result = subprocess.run(
        ["psql", db_url, "-f", str(file)],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"  ✗ Error: {result.stderr}")
        sys.exit(1)
    print(f"  ✓ {file.name} applied")


def main() -> None:
    import os

    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres")

    print("=" * 60)
    print("  L3ARN Platform — Database Reset")
    print("=" * 60)

    # Drop existing tables
    print("\n▸ Dropping existing tables...")
    drop_sql = """
    DROP TABLE IF EXISTS webhook_events CASCADE;
    DROP TABLE IF EXISTS audit_logs CASCADE;
    DROP TABLE IF EXISTS tenant_memberships CASCADE;
    DROP TABLE IF EXISTS profiles CASCADE;
    DROP TABLE IF EXISTS tenants CASCADE;
    """
    result = subprocess.run(
        ["psql", db_url, "-c", drop_sql],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"Warning: {result.stderr}")

    # Run migrations
    print("\n▸ Running migrations...")
    for sql_file in sorted(MIGRATIONS_DIR.glob("*.sql")):
        run_sql(sql_file, db_url)

    # Apply RLS policies
    print("\n▸ Applying RLS policies...")
    for sql_file in sorted(POLICIES_DIR.glob("*.sql")):
        run_sql(sql_file, db_url)

    # Run seed data
    print("\n▸ Applying seed data...")
    for sql_file in sorted(SEED_DIR.glob("*.sql")):
        run_sql(sql_file, db_url)

    print("\n✓ Database reset complete!")


if __name__ == "__main__":
    main()
