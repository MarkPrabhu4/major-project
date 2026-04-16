from __future__ import annotations

import asyncio
import logging

from app.clients.open_meteo import OpenMeteoClient
from app.schemas.prediction import CityPrediction
from app.services.model_service import ModelService

logger = logging.getLogger(__name__)


class PredictionService:
    def __init__(self, open_meteo_client: OpenMeteoClient, model_service: ModelService) -> None:
        self._open_meteo_client = open_meteo_client
        self._model_service = model_service

    async def predict_all_cities(self, cities: list[str]) -> dict[str, CityPrediction]:
        """
        Executes predictions for multiple cities sequentially with a controlled 1s delay
        to prevent Open-Meteo rate limits (429 errors).
        """
        final_results = {}
        
        for i, city in enumerate(cities):
            logger.info("Starting prediction for city: %s (%d/%d)", city, i + 1, len(cities))
            try:
                result = await self.predict_for_city(city)
                final_results[city] = result
                logger.info("Successfully predicted AQI for %s", city)
            except Exception as e:
                logger.error("Error predicting for %s: %s", city, e, exc_info=True)
                # Continue to next city
            
            # Prevent rate limit by waiting 1s between cities
            if i < len(cities) - 1:
                logger.info("Sleeping 1s before next city to respect API rate limits...")
                await asyncio.sleep(1)
        
        return final_results

    async def predict_for_city(self, city: str) -> CityPrediction:
        try:
            location = await self._open_meteo_client.geocode_city(city)
            latitude = location["latitude"]
            longitude = location["longitude"]
            timezone = location.get("timezone", "auto")

            air_quality_payload = await self._open_meteo_client.fetch_air_quality(latitude, longitude, timezone)
            weather_payload = await self._open_meteo_client.fetch_weather(latitude, longitude, timezone)
            
            # DEBUG LOGGING (Task 2)
            logger.info("DEBUG: City='%s' | Lat=%s, Lon=%s", city, latitude, longitude)
            logger.debug("DEBUG: Raw Air Quality Payload for '%s': %s", city, air_quality_payload)
            logger.debug("DEBUG: Raw Weather Payload for '%s': %s", city, weather_payload)

        except Exception as e:
            logger.error("CRITICAL: Data fetch failed for city '%s'", city, exc_info=True)
            raise e

        # Validate current AQI presence
        air_current = air_quality_payload.get("current", {})
        current_aqi = air_current.get("us_aqi")
        if current_aqi is None:
            err_msg = f"Current AQI missing from API response for '{city}'"
            logger.error(err_msg)
            raise ValueError(err_msg)

        try:
            prepared_features = self._model_service.prepare_features(city, air_quality_payload, weather_payload)
            predicted_aqi = self._model_service.predict(prepared_features)
            
            # DEBUG LOGGING (Task 2)
            logger.info("DEBUG: City='%s' | Current AQI=%s | Predicted AQI=%s", 
                        city, current_aqi, predicted_aqi)

        except Exception as e:
            logger.error("CRITICAL: Model inference/preprocessing failed for city '%s'", city, exc_info=True)
            raise e

        return CityPrediction(
            current_aqi=float(current_aqi),
            predicted_aqi=float(predicted_aqi),
            pm2_5=air_current.get("pm2_5"),
            pm10=air_current.get("pm10"),
            no2=air_current.get("nitrogen_dioxide"),
            so2=air_current.get("sulphur_dioxide"),
            o3=air_current.get("ozone"),
            co=air_current.get("carbon_monoxide"),
            temperature=weather_payload.get("current", {}).get("temperature_2m"),
        )
