#!/usr/bin/env python3
"""Seed script — runs seed SQL files against the database."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
SEED_DIR = ROOT / "supabase" / "seed"


def main() -> None:
    import os

    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres")

    print("▸ Running seed data...")
    for sql_file in sorted(SEED_DIR.glob("*.sql")):
        print(f"  → {sql_file.name}")
        result = subprocess.run(
            ["psql", db_url, "-f", str(sql_file)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"  ✗ Error: {result.stderr}")
            sys.exit(1)

    print("✓ Seed complete!")


if __name__ == "__main__":
    main()
