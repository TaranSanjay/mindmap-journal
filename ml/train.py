"""
Training script for EmotionLSTM on GoEmotions dataset.

Features:
- Xavier/He weight initialisation (in model.py)
- Cosine annealing LR scheduling with warm restart
- L2 regularisation via weight_decay in AdamW
- Dropout (defined in model)
- Full performance report: per-emotion MSE, MAE, R², overall accuracy bucket

Run: python ml/train.py
"""

import os
import json
import torch
import torch.nn as nn
import numpy as np
from torch.utils.data import Dataset, DataLoader
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingWarmRestarts
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from collections import Counter
from model import EmotionLSTM

# ── Config ──────────────────────────────────────────────────────────────────
DEVICE    = torch.device("cuda" if torch.cuda.is_available() else "cpu")
EMBED_DIM = 100
HIDDEN    = 256
LAYERS    = 2
DROPOUT   = 0.3
BATCH     = 32
EPOCHS    = 20
LR        = 3e-4
WEIGHT_DECAY = 1e-4   # L2 regularisation
T0        = 5         # Cosine annealing restart period
PAD       = "<PAD>"
UNK       = "<UNK>"
MAX_LEN   = 256
SAVE_PATH = "ml/emotion_lstm.pt"
VOCAB_PATH = "ml/vocab.json"

# GoEmotions → our 5 dimensions mapping
# Each of 28 GoEmotions labels is mapped to one of our 5 dimensions
GO_EMOTION_MAP = {
    "admiration": "joy", "amusement": "joy", "excitement": "joy",
    "gratitude": "joy", "joy": "joy", "love": "joy", "optimism": "joy",
    "pride": "joy", "relief": "joy",
    "approval": "calm", "caring": "calm", "curiosity": "calm",
    "neutral": "calm", "realization": "calm",
    "disappointment": "sadness", "grief": "sadness", "remorse": "sadness",
    "sadness": "sadness",
    "confusion": "anxiety", "embarrassment": "anxiety", "fear": "anxiety",
    "nervousness": "anxiety", "surprise": "anxiety",
    "anger": "anger", "annoyance": "anger", "disapproval": "anger",
    "disgust": "anger",
}


# ── Tokeniser ────────────────────────────────────────────────────────────────
def simple_tokenise(text: str) -> list[str]:
    import re
    return re.findall(r"\b\w+\b", text.lower())


def build_vocab(texts: list[str], min_freq: int = 2) -> dict[str, int]:
    counter: Counter = Counter()
    for t in texts:
        counter.update(simple_tokenise(t))
    vocab = {PAD: 0, UNK: 1}
    for word, freq in counter.most_common():
        if freq >= min_freq:
            vocab[word] = len(vocab)
    return vocab


def encode(text: str, vocab: dict, max_len: int = MAX_LEN) -> list[int]:
    tokens = simple_tokenise(text)[:max_len]
    return [vocab.get(t, vocab[UNK]) for t in tokens] or [vocab[PAD]]


# ── Dataset ───────────────────────────────────────────────────────────────────
class EmotionDataset(Dataset):
    def __init__(self, texts, labels, vocab):
        self.texts = [encode(t, vocab) for t in texts]
        self.labels = labels  # list of dicts {joy, calm, sadness, anxiety, anger}

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        ids = self.texts[idx]
        lbl = self.labels[idx]
        return (
            torch.tensor(ids, dtype=torch.long),
            torch.tensor(len(ids), dtype=torch.long),
            torch.tensor([lbl["joy"], lbl["calm"], lbl["sadness"],
                          lbl["anxiety"], lbl["anger"]], dtype=torch.float),
        )


def collate_fn(batch):
    ids_list, lengths, targets = zip(*batch)
    max_len = max(len(x) for x in ids_list)
    padded = torch.zeros(len(ids_list), max_len, dtype=torch.long)
    for i, ids in enumerate(ids_list):
        padded[i, :len(ids)] = ids
    return padded, torch.stack(list(lengths)), torch.stack(list(targets))


# ── Load GoEmotions ───────────────────────────────────────────────────────────
def load_data():
    """Load GoEmotions from HuggingFace datasets and convert to regression labels."""
    from datasets import load_dataset
    ds = load_dataset("go_emotions", "simplified", split="train+validation")

    emotion_names = ds.features["labels"].feature.names
    texts, labels = [], []

    for row in ds:
        text = row["text"]
        raw_labels = row["labels"]  # list of label indices

        # Convert presence/absence of each GO label to dimension scores
        scores = {"joy": 1.0, "calm": 5.0, "sadness": 1.0, "anxiety": 1.0, "anger": 1.0}
        for label_idx in raw_labels:
            go_name = emotion_names[label_idx]
            dim = GO_EMOTION_MAP.get(go_name)
            if dim:
                scores[dim] = min(10.0, scores[dim] + 2.0)

        # Normalise to 1–10
        for k in scores:
            scores[k] = float(np.clip(scores[k], 1, 10))

        texts.append(text)
        labels.append(scores)

    return texts, labels


# ── Training loop ─────────────────────────────────────────────────────────────
def train():
    print(f"Device: {DEVICE}")
    texts, labels = load_data()
    print(f"Loaded {len(texts)} samples")

    tr_texts, val_texts, tr_labels, val_labels = train_test_split(
        texts, labels, test_size=0.1, random_state=42
    )

    vocab = build_vocab(tr_texts)
    with open(VOCAB_PATH, "w") as f:
        json.dump(vocab, f)
    print(f"Vocabulary size: {len(vocab)}")

    tr_ds  = EmotionDataset(tr_texts, tr_labels, vocab)
    val_ds = EmotionDataset(val_texts, val_labels, vocab)
    tr_dl  = DataLoader(tr_ds, batch_size=BATCH, shuffle=True, collate_fn=collate_fn)
    val_dl = DataLoader(val_ds, batch_size=BATCH, collate_fn=collate_fn)

    model = EmotionLSTM(
        vocab_size=len(vocab),
        embed_dim=EMBED_DIM,
        hidden_size=HIDDEN,
        num_layers=LAYERS,
        dropout=DROPOUT,
        pad_idx=vocab[PAD],
    ).to(DEVICE)

    # AdamW = Adam + L2 regularisation (weight_decay)
    optimiser = AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    # Cosine annealing with warm restarts
    scheduler = CosineAnnealingWarmRestarts(optimiser, T_0=T0, T_mult=2, eta_min=1e-6)
    criterion = nn.MSELoss()

    DIMS = ["joy", "calm", "sadness", "anxiety", "anger"]
    best_val_loss = float("inf")

    for epoch in range(1, EPOCHS + 1):
        # ── Train ──
        model.train()
        tr_loss = 0.0
        for ids, lengths, targets in tr_dl:
            ids, lengths, targets = ids.to(DEVICE), lengths.to(DEVICE), targets.to(DEVICE)
            optimiser.zero_grad()
            preds = model(ids, lengths)
            loss = sum(
                criterion(preds[d], targets[:, i]) for i, d in enumerate(DIMS)
            )
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimiser.step()
            scheduler.step(epoch - 1 + len(tr_dl) / len(tr_dl))
            tr_loss += loss.item()

        # ── Validate ──
        model.eval()
        val_loss = 0.0
        all_preds  = {d: [] for d in DIMS}
        all_targets = {d: [] for d in DIMS}
        with torch.no_grad():
            for ids, lengths, targets in val_dl:
                ids, lengths, targets = ids.to(DEVICE), lengths.to(DEVICE), targets.to(DEVICE)
                preds = model(ids, lengths)
                val_loss += sum(
                    criterion(preds[d], targets[:, i]) for i, d in enumerate(DIMS)
                ).item()
                for i, d in enumerate(DIMS):
                    all_preds[d].extend(preds[d].cpu().numpy())
                    all_targets[d].extend(targets[:, i].cpu().numpy())

        avg_tr  = tr_loss  / len(tr_dl)
        avg_val = val_loss / len(val_dl)
        lr_now  = optimiser.param_groups[0]["lr"]
        print(f"Epoch {epoch:02d}/{EPOCHS}  train={avg_tr:.4f}  val={avg_val:.4f}  lr={lr_now:.2e}")

        if avg_val < best_val_loss:
            best_val_loss = avg_val
            torch.save(model.state_dict(), SAVE_PATH)
            print(f"  → Saved best model (val={avg_val:.4f})")

    # ── Performance Report ────────────────────────────────────────────────────
    print("\n══════ PERFORMANCE REPORT ══════")
    print(f"{'Dimension':<12} {'MSE':>7} {'MAE':>7} {'R²':>7}")
    print("-" * 36)
    for d in DIMS:
        mse = mean_squared_error(all_targets[d], all_preds[d])
        mae = mean_absolute_error(all_targets[d], all_preds[d])
        r2  = r2_score(all_targets[d], all_preds[d])
        print(f"{d:<12} {mse:>7.3f} {mae:>7.3f} {r2:>7.3f}")

    # Overall ±1 accuracy (within 1 point on 1–10 scale)
    all_p = np.concatenate(list(all_preds.values()))
    all_t = np.concatenate(list(all_targets.values()))
    within_1 = np.mean(np.abs(all_p - all_t) <= 1.0) * 100
    print(f"\nOverall ±1 accuracy: {within_1:.1f}%")
    print(f"Best validation MSE loss: {best_val_loss:.4f}")
    print("════════════════════════════════\n")


if __name__ == "__main__":
    train()
