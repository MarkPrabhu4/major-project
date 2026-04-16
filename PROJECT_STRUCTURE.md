# Air Quality Prediction System Structure

This repository is organized into the following main areas:

- `backend/`: FastAPI service layer providing real-time AQI and model predictions.
- `frontend/`: React + Vite user interface for the interactive dashboard.
- `model/`: Serialized PyTorch models (`india_model.pth`) and model-related code.
- `data/`: Directory for datasets (raw and processed).
- `scripts/`: Repeatable data collection and preprocessing scripts.
- `notebooks/`: Research and experimentation notebooks.

## Tech Stack

- **Backend**: FastAPI, Uvicorn, HTTPX, PyTorch, NumPy.
- **Frontend**: React, Recharts, TailwindCSS, Vite.
- **Model**: LSTM-based time-series prediction (PyTorch).

## Deployment

- **Environment Variables**:
  - `VITE_API_URL`: The full URL of the backend (e.g., `https://api.yourdomain.com`).
- **Backend Entry Point**: `backend.app.main:app`
- **Frontend Build**: `npm run build` in the `frontend` directory.
