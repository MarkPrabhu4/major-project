# Model

This folder contains machine-learning assets and model-development code for AQI prediction.

Current contents:

- `train_india_model.py` trains an LSTM on `data/india/combined.csv`.
- `india_model.pth` is the expected saved PyTorch model artifact after training.
- `scaler.pkl` is the expected saved `MinMaxScaler` artifact after training.

Training contract:

- Feature order is fixed to `pm25, pm10, no2, co, o3, temperature, humidity, wind`.
- The target column is `aqi`.
- The model uses sequence length `8`.
- Saved artifacts are designed to be loaded directly by the backend inference service.

Run locally:

```bash
python train_india_model.py
```

Run from inside the `model/` directory after placing the dataset at `data/india/combined.csv`.
