from __future__ import annotations

import logging
import __main__
from pathlib import Path
from typing import Any

import numpy as np
import torch
from torch import nn

logger = logging.getLogger(__name__)


class IndiaAQILSTM(nn.Module):
    def __init__(self, input_size: int, hidden_size: int, num_layers: int, dropout: float) -> None:
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout if num_layers > 1 else 0.0,
            batch_first=True,
        )
        self.head = nn.Sequential(
            nn.Linear(hidden_size, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        output, _ = self.lstm(x)
        last_hidden = output[:, -1, :]
        prediction = self.head(last_hidden)
        return prediction.squeeze(-1)


class ModelService:
    MODEL_PATH = Path(__file__).resolve().parents[3] / "model" / "india_model.pth"
    FEATURE_ORDER = [
        "pm25",
        "pm10",
        "no2",
        "co",
        "o3",
        "temperature",
        "wind_speed",
        "humidity",
        "city_id",
    ]
    CITY_ID_MAP = {
        "delhi": 0,
        "mumbai": 1,
        "hyderabad": 2,
        "bangalore": 3,
        "kolkata": 4,
        "chennai": 5,
        "beijing": 6,
    }
    CITY_ALIASES = {
        "bengaluru": "bangalore",
    }

    _model: Any = None

    def prepare_features(self, city: str, air_quality_payload: dict[str, Any], weather_payload: dict[str, Any]) -> dict[str, Any]:
        logger.info("PREPARING FEATURES: City='%s'", city)
        air_current = air_quality_payload.get("current", {})
        weather_current = weather_payload.get("current", {})
        city_key = self._normalize_city_name(city)
        
        fallback_row = [
            self._to_float(air_current.get("pm2_5")),
            self._to_float(air_current.get("pm10")),
            self._to_float(air_current.get("nitrogen_dioxide")),
            self._to_float(air_current.get("carbon_monoxide")),
            self._to_float(air_current.get("ozone")),
            self._to_float(weather_current.get("temperature_2m")),
            self._to_float(weather_current.get("wind_speed_10m")),
            self._to_float(weather_current.get("relative_humidity_2m")),
            self._city_id_for(city_key),
        ]
        
        logger.debug("Fallback row for '%s': %s", city, fallback_row)
        
        sequence = self._build_sequence_from_payloads(city, city_key, air_quality_payload, weather_payload, fallback_row)
        self._validate_sequence(sequence, city)
        
        current_features = sequence[-1]
        features = dict(zip(self.FEATURE_ORDER, current_features.tolist(), strict=True))
        
        logger.info("Processed features for '%s': %s", city, features)

        return {
            "city": city,
            "aqi": self._to_float(air_current.get("us_aqi")),
            "features": features,
            "sequence": sequence,
        }

    def predict(self, prepared_features: dict[str, Any]) -> float:
        self._ensure_artifacts_loaded()

        feature_row = np.asarray(prepared_features["sequence"], dtype=np.float32)
        logger.info("Model inference feature order: %s", self.FEATURE_ORDER)
        logger.info("Model inference features: %s", prepared_features["features"])
        logger.info("Model inference sequence input shape: %s", (1, *feature_row.shape))
        logger.info("Model inference raw input: %s", feature_row.tolist())

        try:
            prediction = self._run_inference(feature_row)
        except Exception:
            logger.exception("Model inference failed for city '%s'", prepared_features.get("city"))
            raise

        return float(prediction)

    @classmethod
    def _ensure_artifacts_loaded(cls) -> None:
        if cls._model is None:
            logger.info("Loading model from %s", cls.MODEL_PATH)
            cls._model = cls._load_model()

    @classmethod
    def _load_model(cls) -> Any:
        if not cls.MODEL_PATH.exists():
            logger.error("Model file missing at %s", cls.MODEL_PATH)
            raise FileNotFoundError(f"Model file not found at '{cls.MODEL_PATH}'.")

        try:
            model = torch.jit.load(str(cls.MODEL_PATH), map_location="cpu")
            model.eval()
            return model
        except Exception:
            setattr(__main__, "IndiaAQILSTM", IndiaAQILSTM)
            loaded = torch.load(str(cls.MODEL_PATH), map_location="cpu", weights_only=False)

        if isinstance(loaded, nn.Module):
            loaded.eval()
            return loaded

        if isinstance(loaded, dict) and isinstance(loaded.get("model"), nn.Module):
            model = loaded["model"]
            model.eval()
            return model

        raise TypeError(
            "Unsupported model format in 'india_model.pth'. "
            "Expected a TorchScript model or a serialized torch.nn.Module."
        )

    @classmethod
    def _run_inference(cls, feature_row: np.ndarray) -> float:
        model = cls._model
        # VALIDATE INPUT (Task 3 & 6)
        if feature_row.shape != (8, 9):
             raise ValueError(f"Input feature row must be (8, 9), got {feature_row.shape}")
        
        sequence_tensor = torch.as_tensor(feature_row[np.newaxis, :, :], dtype=torch.float32)
        
        logger.info("INFERENCE: City input tensor shape: %s", tuple(sequence_tensor.shape))
        logger.debug("INFERENCE: Input tensor values: %s", sequence_tensor.tolist())

        with torch.inference_mode():
            prediction = cls._call_model(model, sequence_tensor)

        if prediction is None:
            raise RuntimeError("Model inference failed for the sequence-shaped input.")

        if isinstance(prediction, torch.Tensor):
            prediction_array = prediction.detach().cpu().numpy()
        else:
            prediction_array = np.asarray(prediction)

        final_prediction = float(np.squeeze(prediction_array))
        logger.info("INFERENCE RESULT: %s", final_prediction)
        return final_prediction

    @staticmethod
    def _call_model(model: Any, tensor: torch.Tensor) -> Any | None:
        try:
            return model(tensor)
        except Exception:
            logger.exception("PyTorch model call failed for tensor shape %s", tuple(tensor.shape))
            return None

    @staticmethod
    def _to_float(value: Any) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @classmethod
    def _normalize_city_name(cls, city: str) -> str:
        normalized = city.strip().lower()
        return cls.CITY_ALIASES.get(normalized, normalized)

    @classmethod
    def _city_id_for(cls, city: str) -> float:
        if city not in cls.CITY_ID_MAP:
            raise ValueError(f"Unsupported city for model inference: '{city}'.")
        return float(cls.CITY_ID_MAP[city])

    def _build_sequence_from_payloads(
        self,
        city: str,
        city_key: str,
        air_quality_payload: dict[str, Any],
        weather_payload: dict[str, Any],
        fallback_row: list[float | None],
    ) -> np.ndarray:
        air_hourly = air_quality_payload.get("hourly") or {}
        weather_hourly = weather_payload.get("hourly") or {}

        air_times = air_hourly.get("time") or []
        weather_times = weather_hourly.get("time") or []
        if not air_times or not weather_times:
            raise ValueError(f"Hourly history is unavailable for '{city}'. Check API response.")

        air_index_map = {timestamp: index for index, timestamp in enumerate(air_times)}
        weather_index = {timestamp: index for index, timestamp in enumerate(weather_times)}
        
        # Chronological matching
        common_times = sorted([timestamp for timestamp in air_times if timestamp in weather_index])
        logger.info("Found %s common hourly timestamps for '%s'", len(common_times), city)

        if not common_times:
             raise ValueError(f"No overlapping hourly data found for '{city}' between Air Quality and Weather APIs")

        selected_times = common_times[-8:]
        if len(selected_times) < 8:
            logger.warning("Only %s history points found for '%s'. Padding with oldest record.", len(selected_times), city)
            while len(selected_times) < 8:
                selected_times.insert(0, selected_times[0])

        sequence_rows: list[list[float]] = []
        city_id = self._city_id_for(city_key)
        
        for timestamp in selected_times:
            air_index = air_index_map.get(timestamp, -1)
            weather_idx = weather_index.get(timestamp, -1)
            row = [
                self._value_at(air_hourly.get("pm2_5"), air_index),
                self._value_at(air_hourly.get("pm10"), air_index),
                self._value_at(air_hourly.get("nitrogen_dioxide"), air_index),
                self._value_at(air_hourly.get("carbon_monoxide"), air_index),
                self._value_at(air_hourly.get("ozone"), air_index),
                self._value_at(weather_hourly.get("temperature_2m"), weather_idx),
                self._value_at(weather_hourly.get("wind_speed_10m"), weather_idx),
                self._value_at(weather_hourly.get("relative_humidity_2m"), weather_idx),
                city_id,
            ]
            sequence_rows.append(row)

        filled_rows = self._fill_missing_sequence_values(sequence_rows, fallback_row, city)
        sequence_array = np.asarray(filled_rows, dtype=np.float32)
        
        # VALIDATION (Task 3)
        if np.isnan(sequence_array).any():
             logger.warning("NaNs detected in sequence for '%s' after fill. Applying final zero-fill.", city)
             sequence_array = np.nan_to_num(sequence_array)
             
        return sequence_array

    def _fill_missing_sequence_values(
        self,
        sequence_rows: list[list[float | None]],
        fallback_row: list[float | None],
        city: str,
    ) -> list[list[float]]:
        filled_rows = [row[:] for row in sequence_rows]

        for feature_index, feature_name in enumerate(self.FEATURE_ORDER):
            fallback_value = fallback_row[feature_index]
            if fallback_value is None:
                fallback_value = 0.0

            last_valid = fallback_value
            for row in filled_rows:
                value = row[feature_index]
                # Safe check for None or NaN
                is_invalid = value is None or (isinstance(value, (float, np.floating)) and np.isnan(value))
                if is_invalid:
                    row[feature_index] = float(last_valid)
                else:
                    last_valid = float(value)
                    row[feature_index] = float(value)

            next_valid = fallback_value
            for row in reversed(filled_rows):
                value = row[feature_index]
                is_invalid = value is None or (isinstance(value, (float, np.floating)) and np.isnan(value))
                if is_invalid:
                    row[feature_index] = float(next_valid)
                else:
                    next_valid = float(value)

        logger.debug("Filled model sequence for '%s'", city)
        return [[float(value) for value in row] for row in filled_rows]

    def _validate_sequence(self, sequence: np.ndarray, city: str) -> None:
        if sequence.shape != (8, 9):
            raise ValueError(f"Invalid sequence shape for '{city}': expected (8, 9), got {sequence.shape}.")
        if np.isnan(sequence).any():
            raise ValueError(f"Sequence for '{city}' contains NaN values after filling.")
        logger.info("Validated model sequence for '%s' with shape %s", city, sequence.shape)

    @staticmethod
    def _value_at(values: Any, index: int) -> float | None:
        if values is None or index < 0 or index >= len(values):
            return None
        value = values[index]
        return ModelService._to_float(value)
