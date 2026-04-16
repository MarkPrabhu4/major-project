from __future__ import annotations

from pathlib import Path

import pandas as pd


ROOT_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT_DIR / "data" / "raw"
OUTPUT_DIR = ROOT_DIR / "data" / "india"
OUTPUT_PATH = OUTPUT_DIR / "clean.csv"

REQUIRED_COLUMNS = [
    "timestamp",
    "city",
    "pm25",
    "pm10",
    "no2",
    "co",
    "o3",
    "temperature",
    "wind_speed",
    "humidity",
]

OPTIONAL_COLUMNS = ["aqi"]


def load_raw_files() -> pd.DataFrame:
    raw_files = sorted(RAW_DIR.glob("*.csv"))
    if not raw_files:
        raise FileNotFoundError(f"No CSV files found in '{RAW_DIR}'.")

    frames: list[pd.DataFrame] = []
    for file_path in raw_files:
        frame = pd.read_csv(file_path)
        frames.append(frame)

    merged = pd.concat(frames, ignore_index=True)
    return merged


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.copy()
    missing = [column for column in REQUIRED_COLUMNS if column not in normalized.columns]
    if missing:
        raise ValueError(f"Input data is missing required columns: {', '.join(missing)}")

    keep_columns = REQUIRED_COLUMNS + [column for column in OPTIONAL_COLUMNS if column in normalized.columns]
    normalized = normalized[keep_columns]
    normalized["timestamp"] = pd.to_datetime(normalized["timestamp"], errors="coerce")
    normalized["city"] = normalized["city"].astype(str).str.strip().str.lower()

    numeric_columns = [column for column in normalized.columns if column not in {"timestamp", "city"}]
    normalized[numeric_columns] = normalized[numeric_columns].apply(pd.to_numeric, errors="coerce")
    normalized = normalized.dropna(subset=["timestamp", "city"])
    normalized["timestamp"] = normalized["timestamp"].dt.floor("h")
    return normalized


def enforce_hourly_continuity(df: pd.DataFrame) -> pd.DataFrame:
    city_frames: list[pd.DataFrame] = []

    for city, city_df in df.groupby("city", sort=True):
        city_df = city_df.sort_values("timestamp")
        city_df = city_df.drop_duplicates(subset=["timestamp"], keep="last")
        city_df = city_df.set_index("timestamp")

        full_range = pd.date_range(
            start=city_df.index.min(),
            end=city_df.index.max(),
            freq="h",
        )

        city_df = city_df.reindex(full_range)
        city_df["city"] = city
        city_df = city_df.ffill()
        city_df.index.name = "timestamp"
        city_frames.append(city_df.reset_index())

    continuous = pd.concat(city_frames, ignore_index=True)
    return continuous


def build_clean_dataset() -> pd.DataFrame:
    merged = load_raw_files()
    normalized = normalize_columns(merged)
    normalized = normalized.sort_values(["city", "timestamp"]).drop_duplicates(
        subset=["city", "timestamp"],
        keep="last",
    )
    continuous = enforce_hourly_continuity(normalized)
    continuous = continuous.sort_values(["city", "timestamp"]).reset_index(drop=True)
    return continuous


def main() -> None:
    cleaned = build_clean_dataset()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    cleaned.to_csv(OUTPUT_PATH, index=False)
    print(f"Saved clean dataset to {OUTPUT_PATH}")
    print(f"Rows: {len(cleaned)}")
    print(f"Cities: {cleaned['city'].nunique()}")
    print(cleaned.head().to_string())


if __name__ == "__main__":
    main()
