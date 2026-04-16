from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
INPUT_PATH = ROOT_DIR / "data" / "india" / "clean.csv"
MODEL_DIR = ROOT_DIR / "model"
X_PATH = MODEL_DIR / "X.npy"
Y_PATH = MODEL_DIR / "y.npy"

SEQUENCE_LENGTH = 8
FEATURE_COLUMNS = [
    "pm25",
    "pm10",
    "no2",
    "co",
    "o3",
    "temperature",
    "wind_speed",
    "humidity",
]
TARGET_COLUMN = "aqi"
CITY_ID_MAP = {
    "delhi": 0,
    "mumbai": 1,
    "hyderabad": 2,
    "bangalore": 3,
    "kolkata": 4,
    "chennai": 5,
}


def load_clean_dataset() -> pd.DataFrame:
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"Clean dataset not found at '{INPUT_PATH}'.")

    df = pd.read_csv(INPUT_PATH, parse_dates=["timestamp"])
    required_columns = ["timestamp", "city", *FEATURE_COLUMNS, TARGET_COLUMN]
    missing = [column for column in required_columns if column not in df.columns]
    if missing:
        raise ValueError(f"Clean dataset is missing required columns: {', '.join(missing)}")

    df = df[required_columns].copy()
    df["city"] = df["city"].astype(str).str.strip().str.lower()
    df = df[df["city"].isin(CITY_ID_MAP)]
    df = df.sort_values(["city", "timestamp"]).reset_index(drop=True)
    return df


def build_sequences(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    X_sequences: list[np.ndarray] = []
    y_targets: list[float] = []

    for city, city_df in df.groupby("city", sort=False):
        city_df = city_df.sort_values("timestamp").reset_index(drop=True)
        city_id = float(CITY_ID_MAP[city])

        feature_values = city_df[FEATURE_COLUMNS].to_numpy(dtype=np.float32)
        city_column = np.full((len(city_df), 1), city_id, dtype=np.float32)
        feature_matrix = np.concatenate([feature_values, city_column], axis=1)
        targets = city_df[TARGET_COLUMN].to_numpy(dtype=np.float32)

        for index in range(SEQUENCE_LENGTH, len(city_df)):
            X_sequences.append(feature_matrix[index - SEQUENCE_LENGTH : index])
            y_targets.append(float(targets[index]))

    if not X_sequences:
        raise ValueError("No sequences were generated. Check that each city has more than 8 rows.")

    X = np.asarray(X_sequences, dtype=np.float32)
    y = np.asarray(y_targets, dtype=np.float32)
    return X, y


def main() -> None:
    df = load_clean_dataset()
    X, y = build_sequences(df)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    np.save(X_PATH, X)
    np.save(Y_PATH, y)

    print(f"Saved X to {X_PATH} with shape {X.shape}")
    print(f"Saved y to {Y_PATH} with shape {y.shape}")
    print(f"Cities included: {sorted(df['city'].unique().tolist())}")


if __name__ == "__main__":
    main()
