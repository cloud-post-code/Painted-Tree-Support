from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1 import (
    admin_manage,
    auth,
    cashflow_routes,
    community_routes,
    cron_routes,
    donations,
    downloads_routes,
    guides_routes,
    health,
    legal_public,
    listings_routes,
    site,
    stripe_webhook,
    supporters_public,
    toolkit_public,
    triage_routes,
    vendors_public,
)
from app.core.config import get_settings
from app.core.logging import configure_logging, new_request_id, request_id_ctx
from app.limiter import limiter


@asynccontextmanager
async def lifespan(_app: FastAPI):
    configure_logging()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        rid = new_request_id()
        request_id_ctx.set(rid)
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api = APIRouter(prefix=settings.api_v1_prefix)
    api.include_router(health.router)
    api.include_router(auth.router)
    api.include_router(site.router)
    api.include_router(triage_routes.router)
    api.include_router(downloads_routes.router)
    api.include_router(cashflow_routes.router)
    api.include_router(guides_routes.router)
    api.include_router(listings_routes.router)
    api.include_router(community_routes.router)
    api.include_router(vendors_public.router)
    api.include_router(legal_public.router)
    api.include_router(toolkit_public.router)
    api.include_router(supporters_public.router)
    api.include_router(donations.router)
    api.include_router(stripe_webhook.router)
    api.include_router(admin_manage.router)
    api.include_router(cron_routes.router)
    app.include_router(api)

    import os

    static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
    if os.path.isdir(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    return app


app = create_app()
