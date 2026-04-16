# Backend

This folder now contains the first working FastAPI backend scaffold for the air-quality system.

Current contents:

- `app/main.py` boots the FastAPI application.
- `app/api/routes/prediction.py` exposes `/predict-all-cities`.
- `app/clients/open_meteo.py` handles Open-Meteo API calls.
- `app/services/prediction_service.py` orchestrates city-level data fetching.
- `app/services/model_service.py` prepares placeholder model inputs and returns a temporary prediction.
- `app/core/config.py` stores basic runtime settings.
- `app/schemas/prediction.py` defines the response model.

Behavior:

- Resolves each city to coordinates using Open-Meteo geocoding.
- Fetches live AQI and pollutant data.
- Fetches live weather data.
- Builds placeholder model features.
- Returns current and placeholder predicted AQI for each city.

Run locally:

```bash
uvicorn app.main:app --reload
```

Run from inside the `backend/` directory after installing `requirements.txt`.
