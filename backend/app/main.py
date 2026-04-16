from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.prediction import router as prediction_router
from app.core.config import settings
from app.dependencies import http_client

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="FastAPI backend for live AQI retrieval and placeholder city-level AQI predictions.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await http_client.aclose()


app.include_router(prediction_router)
