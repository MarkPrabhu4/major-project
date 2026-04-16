from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class OpenMeteoClient:
    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def geocode_city(self, city: str) -> dict[str, Any]:
        response = await self._get_with_retry(
            f"{settings.geocoding_base_url}/search",
            params={"name": city, "count": 1, "language": "en", "format": "json"},
        )
        response.raise_for_status()
        payload = response.json()
        results = payload.get("results") or []
        if not results:
            raise ValueError(f"City '{city}' could not be resolved by the geocoding API.")
        return results[0]

    async def fetch_air_quality(self, latitude: float, longitude: float, timezone: str) -> dict[str, Any]:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "timezone": timezone,
            "past_hours": 24,
            "current": ",".join(
                [
                    "us_aqi",
                    "pm2_5",
                    "pm10",
                    "carbon_monoxide",
                    "nitrogen_dioxide",
                    "sulphur_dioxide",
                    "ozone",
                ]
            ),
            "hourly": ",".join(
                [
                    "pm2_5",
                    "pm10",
                    "carbon_monoxide",
                    "nitrogen_dioxide",
                    "ozone",
                ]
            ),
        }
        
        response = await self._get_with_retry(f"{settings.air_quality_base_url}/air-quality", params)
        response.raise_for_status()
        payload = response.json()

        current = payload.get("current") or {}
        if not current:
            err_msg = f"Open-Meteo air quality response has no 'current' data for lat={latitude} lon={longitude}"
            logger.error(err_msg)
            raise ValueError(err_msg)

        if current.get("us_aqi") is None:
            computed_aqi = self._compute_aqi_from_pm25(current.get("pm2_5"))
            if computed_aqi is not None:
                current["us_aqi"] = computed_aqi
                logger.info("Open-Meteo AQI missing; computed from PM2.5: %s", computed_aqi)
            else:
                err_msg = f"AQI and PM2.5 both missing from Open-Meteo for lat={latitude} lon={longitude}"
                logger.error(err_msg)
                raise ValueError(err_msg)

        payload["current"] = current
        return payload

    async def fetch_weather(self, latitude: float, longitude: float, timezone: str) -> dict[str, Any]:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "timezone": timezone,
            "past_hours": 24,
            "current": ",".join(
                [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "surface_pressure",
                    "wind_speed_10m",
                ]
            ),
            "hourly": ",".join(
                [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "wind_speed_10m",
                ]
            ),
        }
        response = await self._get_with_retry(f"{settings.weather_base_url}/forecast", params)
        response.raise_for_status()
        return response.json()

    async def _get_with_retry(self, url: str, params: dict[str, Any], max_retries: int = 3) -> httpx.Response:
        for attempt in range(max_retries + 1):
            try:
                response = await self._client.get(url, params=params)
                if response.status_code != 429:
                    return response
                
                logger.warning("Open-Meteo rate limited (429). Attempt %s/%s", attempt + 1, max_retries + 1)
            except httpx.RequestError as exc:
                if attempt == max_retries:
                    raise exc
                logger.warning("Request error during API call: %s. Attempt %s/%s", exc, attempt + 1, max_retries + 1)

            if attempt < max_retries:
                wait_time = 2  # Fixed 2 seconds wait as requested
                logger.info("Waiting %ss before retry...", wait_time)
                await asyncio.sleep(wait_time)
        
        return response

    @classmethod
    def _compute_aqi_from_pm25(cls, pm25_value: Any) -> float | None:
        try:
            concentration = float(pm25_value)
        except (TypeError, ValueError):
            return None

        breakpoints = [
            (0.0, 12.0, 0, 50),
            (12.1, 35.4, 51, 100),
            (35.5, 55.4, 101, 150),
            (55.5, 150.4, 151, 200),
            (150.5, 250.4, 201, 300),
            (250.5, 350.4, 301, 400),
            (350.5, 500.4, 401, 500),
        ]

        capped = min(max(concentration, 0.0), 500.4)
        for c_low, c_high, i_low, i_high in breakpoints:
            if c_low <= capped <= c_high:
                aqi = ((i_high - i_low) / (c_high - c_low)) * (capped - c_low) + i_low
                return round(aqi, 2)

        return None
