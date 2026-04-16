from __future__ import annotations

import httpx

from app.clients.open_meteo import OpenMeteoClient
from app.core.config import settings
from app.services.model_service import ModelService
from app.services.prediction_service import PredictionService

http_client = httpx.AsyncClient(timeout=settings.request_timeout_seconds)


def get_prediction_service() -> PredictionService:
    return PredictionService(
        open_meteo_client=OpenMeteoClient(http_client),
        model_service=ModelService(),
    )
