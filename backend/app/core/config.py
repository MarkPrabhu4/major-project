from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    app_name: str = "Air Quality Prediction Backend"
    app_version: str = "0.1.0"
    default_cities: list[str] = field(
        default_factory=lambda: [
            "Delhi",
            "Mumbai",
            "Bengaluru",
            "Chennai",
            "Kolkata",
            "Hyderabad",
            "Beijing",
        ]
    )
    geocoding_base_url: str = "https://geocoding-api.open-meteo.com/v1"
    weather_base_url: str = "https://api.open-meteo.com/v1"
    air_quality_base_url: str = "https://air-quality-api.open-meteo.com/v1"
    request_timeout_seconds: float = 20.0


settings = Settings()
