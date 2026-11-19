import secrets

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import (
    brand_assets, brand_documents, dashboard, findings, github_webhook, health,
    knowledge_items, organisations, public, retrieval, sharing, submissions,
)
from app.core.auth import require_role
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Caraxes API", version="0.1.0")


# Optional passcode for public demos. Added BEFORE the CORS middleware so that CORS
# wraps it, which means the 401 reply still carries the CORS headers the browser needs.
@app.middleware("http")
async def demo_passcode(request: Request, call_next):
    expected = settings.demo_passcode
    exempt = request.url.path.startswith(("/health", "/public", "/webhooks"))  # /public and /webhooks are exempt
    if expected and request.method != "OPTIONS" and not exempt:
        supplied = request.headers.get("x-demo-key", "")
        if not secrets.compare_digest(supplied.encode(), expected.encode()):
            return JSONResponse({"detail": "Demo passcode required"}, status_code=401)
    return await call_next(request)


# FRONTEND_ORIGIN may hold several addresses separated by commas
origins = [o.strip().rstrip("/") for o in settings.frontend_origin.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

admin_only = [Depends(require_role("admin"))]

app.include_router(health.router)
app.include_router(public.router)
app.include_router(organisations.router)
app.include_router(brand_documents.router, dependencies=admin_only)
app.include_router(brand_assets.router, dependencies=admin_only)
app.include_router(knowledge_items.router, dependencies=admin_only)
app.include_router(retrieval.router, dependencies=admin_only)
app.include_router(submissions.router)
app.include_router(sharing.router)
app.include_router(findings.router)
app.include_router(dashboard.router)
app.include_router(github_webhook.router)