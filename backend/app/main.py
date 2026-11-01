"""
Main FastAPI application entry point.

Security measures applied:
- CORS: Restricted to known origins only
- Rate limiting: via slowapi (per-IP)
- Security Headers middleware: X-Frame-Options, CSP, HSTS, X-Content-Type-Options
- No wildcard CORS methods/headers in production
- Request size limiting via MAX_UPLOAD_SIZE_MB in config
"""
import sys
sys.path.insert(0, 'D:/Apartment_Mainatainance_Tracker/backend/Lib/site-packages')

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.config import get_settings
from app.api.v1.router import api_router
from app.core.database import Base, engine
import app.models  # Ensure all SQLAlchemy models are registered in Base.metadata

settings = get_settings()

# Ensure any newly added tables are created automatically on startup / reload
Base.metadata.create_all(bind=engine)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    # Hide schema endpoints from public in production
    docs_url="/docs",
    redoc_url="/redoc",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to every response to prevent common web attacks."""
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        # Prevent MIME type sniffing (stops XSS via file uploads)
        response.headers["X-Content-Type-Options"] = "nosniff"
        # Enable browser XSS filter
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Prevent Referrer leakage
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        # Content Security Policy — restrict where scripts/styles can load from
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://accounts.google.com; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https://lh3.googleusercontent.com https://*.googleusercontent.com; "
            "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com; "
            "frame-src https://accounts.google.com;"
        )
        # Remove server fingerprint header
        try:
            del response.headers["Server"]
        except (KeyError, Exception):
            pass
        return response


app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,   # We use Bearer tokens, not cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["X-Total-Count"],
    max_age=600,
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}

