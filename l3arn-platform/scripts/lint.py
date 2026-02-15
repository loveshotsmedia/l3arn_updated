#!/usr/bin/env python3
"""Lint script — runs all linters across the monorepo."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent


def run(cmd: str, label: str) -> bool:
    """Run a command and return True if it succeeds."""
    print(f"\n▸ {label}")
    print(f"  → {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=ROOT)
    if result.returncode != 0:
        print(f"  ✗ {label} FAILED")
        return False
    print(f"  ✓ {label} passed")
    return True


def main() -> None:
    print("=" * 60)
    print("  L3ARN Platform — Lint All")
    print("=" * 60)

    results = []

    # Python linting
    results.append(run("ruff check apps/api/", "Python lint (ruff)"))
    results.append(run("mypy apps/api/app/", "Python typecheck (mypy)"))

    # TypeScript linting
    results.append(run("pnpm -r run lint", "TypeScript lint"))
    results.append(run("pnpm -r run typecheck", "TypeScript typecheck"))

    # Summary
    print("\n" + "=" * 60)
    if all(results):
        print("  ✓ All linters passed!")
    else:
        print("  ✗ Some linters failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
