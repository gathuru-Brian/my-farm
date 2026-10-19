"""Start the designated Laravel application for local development."""

from pathlib import Path
import shutil
import subprocess
import sys


LARAVEL_DIR = Path(__file__).resolve().parent / "laravel"


def main() -> int:
    php = shutil.which("php")
    if php is None:
        print(
            "PHP 8.3 or later is required to run Modern Farms. "
            "The Flask fallback is available explicitly with `python backend/run.py`.",
            file=sys.stderr,
        )
        return 1

    return subprocess.call(
        [php, "artisan", "serve", *sys.argv[1:]],
        cwd=LARAVEL_DIR,
    )


if __name__ == "__main__":
    raise SystemExit(main())
