# AI Air Quality Prediction Dashboard

A modern, full-stack application for real-time air quality monitoring and prediction for major cities including Delhi, Mumbai, Hyderabad, Bangalore, Kolkata, Chennai, and Beijing.

## Features

- **Real-time Monitoring**: Fetches live AQI and meteorological data from Open-Meteo API.
- **AI Predictions**: Uses a PyTorch-based LSTM model to forecast AQI trends for the next interval.
- **Interactive Dashboard**: Premium glassmorphism UI with dynamic charts and city-level comparisons.
- **Responsive Design**: Fully responsive interface built with React and TailwindCSS.

## Getting Started

### Backend

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the development server:
   ```bash
   uvicorn backend.app.main:app --reload
   ```

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

- Root `Procfile` is provided for backend deployment.
- Root `requirements.txt` contains all backend dependencies.
- Frontend should be built and served, ensuring `VITE_API_URL` environment variable points to your live backend.

## Acknowledgments

- Data provided by [Open-Meteo](https://open-meteo.com/).
- Built as part of a Major Project on Air Quality Intelligence.
