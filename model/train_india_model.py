from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch
from sklearn.model_selection import train_test_split
from torch import nn
from torch.utils.data import DataLoader, TensorDataset


ROOT_DIR = Path(__file__).resolve().parents[1]
X_PATH = ROOT_DIR / "model" / "X.npy"
Y_PATH = ROOT_DIR / "model" / "y.npy"
MODEL_PATH = ROOT_DIR / "model" / "india_model.pth"


@dataclass
class TrainingConfig:
    batch_size: int = 32
    epochs: int = 60
    learning_rate: float = 1e-3
    hidden_size: int = 128
    num_layers: int = 2
    dropout: float = 0.2
    test_size: float = 0.2
    random_state: int = 42


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


def load_arrays() -> tuple[np.ndarray, np.ndarray]:
    if not X_PATH.exists():
        raise FileNotFoundError(f"Feature array not found at '{X_PATH}'.")
    if not Y_PATH.exists():
        raise FileNotFoundError(f"Target array not found at '{Y_PATH}'.")

    X = np.load(X_PATH)
    y = np.load(Y_PATH)

    print(f"X shape: {X.shape}")
    print(f"y shape: {y.shape}")

    if X.ndim != 3:
        raise ValueError(f"Expected X to be 3D (samples, timesteps, features), got shape {X.shape}.")
    if y.ndim != 1:
        y = np.reshape(y, (-1,))
    if len(X) != len(y):
        raise ValueError(f"X and y sample counts do not match: {len(X)} vs {len(y)}.")

    return X.astype(np.float32), y.astype(np.float32)


def create_dataloaders(
    X: np.ndarray,
    y: np.ndarray,
    config: TrainingConfig,
) -> tuple[DataLoader, DataLoader]:
    X_train, X_val, y_train, y_val = train_test_split(
        X,
        y,
        test_size=config.test_size,
        random_state=config.random_state,
        shuffle=True,
    )

    train_dataset = TensorDataset(torch.from_numpy(X_train), torch.from_numpy(y_train))
    val_dataset = TensorDataset(torch.from_numpy(X_val), torch.from_numpy(y_val))

    train_loader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=config.batch_size, shuffle=False)
    return train_loader, val_loader


def evaluate(model: nn.Module, loader: DataLoader, loss_fn: nn.Module, device: torch.device) -> float:
    model.eval()
    total_loss = 0.0
    total_samples = 0

    with torch.inference_mode():
        for X_batch, y_batch in loader:
            X_batch = X_batch.to(device)
            y_batch = y_batch.to(device)
            predictions = model(X_batch)
            loss = loss_fn(predictions, y_batch)
            batch_size = X_batch.size(0)
            total_loss += loss.item() * batch_size
            total_samples += batch_size

    return total_loss / max(total_samples, 1)


def train_model(train_loader: DataLoader, val_loader: DataLoader, input_size: int, config: TrainingConfig) -> IndiaAQILSTM:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = IndiaAQILSTM(
        input_size=input_size,
        hidden_size=config.hidden_size,
        num_layers=config.num_layers,
        dropout=config.dropout,
    ).to(device)

    optimizer = torch.optim.Adam(model.parameters(), lr=config.learning_rate)
    loss_fn = nn.MSELoss()

    for epoch in range(1, config.epochs + 1):
        model.train()
        running_loss = 0.0
        sample_count = 0

        for X_batch, y_batch in train_loader:
            X_batch = X_batch.to(device)
            y_batch = y_batch.to(device)

            optimizer.zero_grad()
            predictions = model(X_batch)
            loss = loss_fn(predictions, y_batch)
            loss.backward()
            optimizer.step()

            batch_size = X_batch.size(0)
            running_loss += loss.item() * batch_size
            sample_count += batch_size

        train_loss = running_loss / max(sample_count, 1)
        val_loss = evaluate(model, val_loader, loss_fn, device)
        print(f"Epoch {epoch:02d}/{config.epochs} - train_loss: {train_loss:.6f} - val_loss: {val_loss:.6f}")

    model.cpu()
    model.eval()
    return model


def main() -> None:
    config = TrainingConfig()
    X, y = load_arrays()
    train_loader, val_loader = create_dataloaders(X, y, config)
    model = train_model(train_loader, val_loader, input_size=X.shape[2], config=config)

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    torch.save(model, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
