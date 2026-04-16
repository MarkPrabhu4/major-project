from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from app.core.config import settings
from app.dependencies import get_prediction_service
from app.schemas.prediction import PredictionResponse

router = APIRouter(tags=["predictions"])
logger = logging.getLogger(__name__)


@router.get("/predict-all-cities", response_model=PredictionResponse)
async def predict_all_cities(cities: list[str] | None = Query(default=None)) -> PredictionResponse:
    selected_cities = cities or settings.default_cities
    prediction_service = get_prediction_service()
    response = await prediction_service.predict_all_cities(selected_cities)

    if not response:
        raise HTTPException(status_code=502, detail="Unable to fetch AQI data for any requested city.")

    return response
