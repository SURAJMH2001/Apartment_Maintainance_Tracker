import os
import sys
import shutil
import warnings

# ── Suppress: "Could not find platform independent libraries <prefix>" ────────
# Python 3.14's embedded install at C:\Python314 has no Lib folder, which
# causes this warning on startup. It is cosmetic — the app works perfectly
# because all required packages live in backend/Lib/site-packages.
# We redirect that specific stderr line to /dev/null on startup.
import io as _io
_original_stderr = sys.stderr

class _WarningSuppressor(_io.TextIOWrapper):
    """Swallow the 'Could not find platform independent libraries' line only."""
    def write(self, msg):
        if "Could not find platform independent libraries" in msg:
            return len(msg)
        return _original_stderr.write(msg)

    def flush(self):
        _original_stderr.flush()

sys.stderr = _WarningSuppressor(
    _io.BytesIO(), encoding="utf-8", errors="replace"
)
# Restore stderr after imports so real errors still show
import atexit
atexit.register(lambda: setattr(sys, "stderr", _original_stderr))

# Ensure packages installed inside backend/Lib/site-packages are importable
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_site_packages = os.path.join(_backend_dir, "Lib", "site-packages")
if _site_packages not in sys.path:
    sys.path.insert(0, _site_packages)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

# Restore stderr now so uvicorn's own logs are visible
sys.stderr = _original_stderr

from app.core.database import Base, engine
import app.models  # registers all models with SQLAlchemy Base metadata
import uvicorn


def main():
    if not os.path.exists(".env") and os.path.exists(".env.example"):
        shutil.copy(".env.example", ".env")
        print("Created .env from .env.example")

    Base.metadata.create_all(bind=engine)
    print("Database tables created (if not existing)")

    print("Starting Apartment Maintenance Tracker API...")
    print("  API:   http://localhost:8000")
    print("  Docs:  http://localhost:8000/docs")
    print("  Login: admin / Admin@123")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[_backend_dir],
    )


if __name__ == "__main__":
    main()
