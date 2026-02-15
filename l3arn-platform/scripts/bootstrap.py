#!/usr/bin/env python3
"""Bootstrap script — sets up the full development environment."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent


def run(cmd: str, cwd: Path = ROOT) -> None:
    """Run a shell command and exit on failure."""
    print(f"\n→ {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        print(f"✗ Command failed: {cmd}")
        sys.exit(1)


def main() -> None:
    print("=" * 60)
    print("  L3ARN Platform — Bootstrap")
    print("=" * 60)

    # 1. Install Node dependencies
    print("\n▸ Installing Node dependencies...")
    run("pnpm install")

    # 2. Install Python dependencies
    print("\n▸ Installing Python dependencies...")
    api_dir = ROOT / "apps" / "api"
    run(f"{sys.executable} -m pip install -r requirements.txt", cwd=api_dir)

    # 3. Copy .env if it doesn't exist
    env_file = ROOT / ".env"
    env_example = ROOT / ".env.example"
    if not env_file.exists() and env_example.exists():
        print("\n▸ Creating .env from .env.example...")
        import shutil
        shutil.copy(env_example, env_file)
        print("  ⚠ Remember to fill in real values in .env")

    # 4. Start Docker services
    print("\n▸ Starting Docker services...")
    run("docker compose up -d")

    print("\n" + "=" * 60)
    print("  ✓ Bootstrap complete!")
    print("  → Frontend: http://localhost:5173")
    print("  → API:      http://localhost:8000")
    print("  → Health:   http://localhost:8000/health")
    print("=" * 60)


if __name__ == "__main__":
    main()
