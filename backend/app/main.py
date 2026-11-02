import os
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.core.database import database_ready
from app.modules.dashboard.api import router as dashboard_router
from app.modules.identity.api import me_router
from app.modules.identity.api import router as identity_router
from app.modules.movements.api import router as movements_router


def create_app() -> FastAPI:
    app = FastAPI(title="Finza API", version="0.1.0")
    app.include_router(identity_router)
    app.include_router(me_router)
    app.include_router(movements_router)
    app.include_router(dashboard_router)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # Never echo input values, passwords or validator contexts.
        return JSONResponse(
            status_code=422,
            content={
                "code": "validation_error",
                "message": "Revisa los campos indicados",
                "field_errors": {str(e["loc"][-1]): e["msg"] for e in exc.errors()},
                "request_id": request.state.request_id,
            },
        )

    @app.middleware("http")
    async def request_id(request: Request, call_next):
        request.state.request_id = str(uuid4())
        response = await call_next(request)
        response.headers["x-request-id"] = request.state.request_id
        if request.url.path.startswith("/api/v1/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            headers=exc.headers,
            content={
                "code": "http_error",
                "message": str(exc.detail),
                "field_errors": {},
                "request_id": request.state.request_id,
            },
        )

    @app.get("/health/live")
    def live() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/health/ready")
    def ready(request: Request):
        if database_ready(os.getenv("DATABASE_URL")):
            return {"status": "ready"}
        return JSONResponse(
            status_code=503,
            content={
                "code": "database_unavailable",
                "message": "Servicio temporalmente no disponible",
                "field_errors": {},
                "request_id": request.state.request_id,
            },
        )

    return app


app = create_app()
