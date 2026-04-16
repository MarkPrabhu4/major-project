from pydantic import BaseModel, Field


class CityPrediction(BaseModel):
    current_aqi: float = Field(..., description="Current AQI fetched from the live data provider.")
    predicted_aqi: float = Field(..., description="Predicted AQI forecast from the model.")
    pm2_5: float | None = Field(None, description="PM2.5 concentration in µg/m³")
    pm10: float | None = Field(None, description="PM10 concentration in µg/m³")
    no2: float | None = Field(None, description="Nitrogen dioxide concentration in µg/m³")
    so2: float | None = Field(None, description="Sulphur dioxide concentration in µg/m³")
    stata_aqi: float | None = Field(None, description="Static AQI fallback.")
    o3: float | None = Field(None, description="Ozone concentration in µg/m³")
    co: float | None = Field(None, description="Carbon monoxide concentration in µg/m³")
    temperature: float | None = Field(None, description="Current temperature in Celsius")


PredictionResponse = dict[str, CityPrediction]
