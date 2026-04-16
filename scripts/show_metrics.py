
import torch
import numpy as np
import pandas as pd
from pathlib import Path
import os
import tensorflow as tf
from sklearn.metrics import mean_absolute_error, mean_squared_error

# Setup paths
ROOT_DIR = Path(__file__).resolve().parents[1]
INDIA_MODEL_PATH = ROOT_DIR / "model" / "india_model.pth"
X_PATH = ROOT_DIR / "model" / "X.npy"
Y_PATH = ROOT_DIR / "model" / "y.npy"

BEIJING_MODEL_PATH = ROOT_DIR / "model.h5"
BEIJING_DATA_PATH = ROOT_DIR / "beijing_air_quality.csv"

def calculate_smape(y_true, y_pred):
    return 100 * np.mean(2 * np.abs(y_pred - y_true) / (np.abs(y_true) + np.abs(y_pred) + 1e-8))

def evaluate_india():
    print("\n--- Evaluating India Model (PyTorch) ---")
    if not (INDIA_MODEL_PATH.exists() and X_PATH.exists() and Y_PATH.exists()):
        print("Missing files for India model evaluation.")
        return

    try:
        X = np.load(X_PATH).astype(np.float32)
        y = np.load(Y_PATH).astype(np.float32).flatten()
        
        split_idx = int(0.8 * len(X))
        X_test = torch.from_numpy(X[split_idx:])
        y_test = y[split_idx:]

        # Load model (supporting different formats)
        try:
            model = torch.load(str(INDIA_MODEL_PATH), map_location="cpu", weights_only=False)
            if isinstance(model, dict) and "model" in model:
                model = model["model"]
        except:
            model = torch.jit.load(str(INDIA_MODEL_PATH), map_location="cpu")
        
        model.eval()
        with torch.no_grad():
            predictions = model(X_test).numpy().flatten()

        mae = mean_absolute_error(y_test, predictions)
        rmse = np.sqrt(mean_squared_error(y_test, predictions))
        smape_val = calculate_smape(y_test, predictions)

        print(f"MAE:   {mae:.4f}")
        print(f"RMSE:  {rmse:.4f}")
        print(f"SMAPE: {smape_val:.2f}%")
    except Exception as e:
        print(f"Error: {e}")

def evaluate_beijing():
    print("\n--- Evaluating Beijing Model (TensorFlow) ---")
    if not (BEIJING_MODEL_PATH.exists() and BEIJING_DATA_PATH.exists()):
        print("Missing files for Beijing model evaluation.")
        return

    try:
        # Load data (minimal version of main.py logic)
        df = pd.read_csv(BEIJING_DATA_PATH)
        df = df[df["station"] == "Wanshouxigong"].copy()
        cols = ["PM2.5", "PM10", "SO2", "NO2", "CO", "O3", "TEMP", "PRES", "DEWP", "RAIN", "WSPM"]
        df = df[cols].apply(pd.to_numeric, errors="coerce").interpolate()
        
        from sklearn.preprocessing import MinMaxScaler
        scaler = MinMaxScaler()
        data_scaled = scaler.fit_transform(df)
        
        WINDOW = 24
        target_idx = 0 # PM2.5
        X, y = [], []
        for i in range(len(data_scaled) - WINDOW):
            X.append(data_scaled[i:i + WINDOW])
            y.append(data_scaled[i + WINDOW, target_idx])
        X, y = np.array(X), np.array(y)
        
        split = int(0.8 * len(X))
        X_test, y_test = X[split:], y[split:]
        
        model = tf.keras.models.load_model(BEIJING_MODEL_PATH, compile=False)
        y_pred = model.predict(X_test, verbose=0).flatten()
        
        # Inverse scale for metrics
        actual = y_test * (scaler.data_max_[0] - scaler.data_min_[0]) + scaler.data_min_[0]
        predicted = y_pred * (scaler.data_max_[0] - scaler.data_min_[0]) + scaler.data_min_[0]
        
        mae = mean_absolute_error(actual, predicted)
        rmse = np.sqrt(mean_squared_error(actual, predicted))
        smape_val = calculate_smape(actual, predicted)

        print(f"MAE:   {mae:.4f}")
        print(f"RMSE:  {rmse:.4f}")
        print(f"SMAPE: {smape_val:.2f}%")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    evaluate_india()
    evaluate_beijing()
