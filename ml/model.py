"""
MindMap Journal — LSTM Emotion Classifier
Scores text on 5 dimensions: joy, calm, sadness, anxiety, anger (each 1–10)

Architecture:
- Embedding layer (GloVe-initialised)
- 2-layer Bidirectional LSTM with dropout
- Attention pooling
- 5 independent sigmoid output heads (one per emotion)

Training features:
- Xavier/He weight initialisation
- Cosine annealing LR scheduling
- Dropout (0.3) + L2 regularisation (weight decay 1e-4)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class AttentionPooling(nn.Module):
    """Soft attention over LSTM hidden states → single context vector."""
    def __init__(self, hidden_size: int):
        super().__init__()
        self.attn = nn.Linear(hidden_size * 2, 1)  # *2 for bidirectional

    def forward(self, lstm_out: torch.Tensor) -> torch.Tensor:
        # lstm_out: (batch, seq_len, hidden*2)
        scores = self.attn(lstm_out).squeeze(-1)          # (batch, seq_len)
        weights = F.softmax(scores, dim=-1).unsqueeze(-1)  # (batch, seq_len, 1)
        context = (lstm_out * weights).sum(dim=1)          # (batch, hidden*2)
        return context


class EmotionLSTM(nn.Module):
    def __init__(
        self,
        vocab_size: int,
        embed_dim: int = 100,
        hidden_size: int = 256,
        num_layers: int = 2,
        dropout: float = 0.3,
        pad_idx: int = 0,
    ):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=pad_idx)

        self.lstm = nn.LSTM(
            input_size=embed_dim,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )

        self.attn_pool = AttentionPooling(hidden_size)
        self.dropout = nn.Dropout(dropout)

        # 5 independent regression heads — each outputs a raw logit → sigmoid → scaled to 1–10
        feature_dim = hidden_size * 2
        self.joy_head     = nn.Linear(feature_dim, 1)
        self.calm_head    = nn.Linear(feature_dim, 1)
        self.sadness_head = nn.Linear(feature_dim, 1)
        self.anxiety_head = nn.Linear(feature_dim, 1)
        self.anger_head   = nn.Linear(feature_dim, 1)

        self._init_weights()

    def _init_weights(self):
        """Xavier uniform for linear layers; orthogonal for LSTM weights."""
        for name, param in self.named_parameters():
            if "weight_ih" in name:
                nn.init.xavier_uniform_(param.data)
            elif "weight_hh" in name:
                nn.init.orthogonal_(param.data)
            elif "bias" in name:
                nn.init.zeros_(param.data)
                # Initialise forget gate bias to 1 (helps with vanishing gradients)
                n = param.size(0)
                param.data[n // 4 : n // 2].fill_(1.0)
        # He init for linear projection layers
        for head in [self.joy_head, self.calm_head, self.sadness_head,
                     self.anxiety_head, self.anger_head]:
            nn.init.kaiming_uniform_(head.weight, nonlinearity="sigmoid")
            nn.init.zeros_(head.bias)

    def forward(self, input_ids: torch.Tensor, lengths: torch.Tensor):
        # input_ids: (batch, seq_len)
        x = self.dropout(self.embedding(input_ids))       # (batch, seq_len, embed_dim)

        packed = nn.utils.rnn.pack_padded_sequence(
            x, lengths.cpu(), batch_first=True, enforce_sorted=False
        )
        lstm_out, _ = self.lstm(packed)
        lstm_out, _ = nn.utils.rnn.pad_packed_sequence(lstm_out, batch_first=True)
        # lstm_out: (batch, seq_len, hidden*2)

        context = self.dropout(self.attn_pool(lstm_out))  # (batch, hidden*2)

        # Each head: raw logit → sigmoid → scale to [1, 10]
        def head_score(head):
            return torch.sigmoid(head(context)).squeeze(-1) * 9 + 1  # → [1, 10]

        return {
            "joy":     head_score(self.joy_head),
            "calm":    head_score(self.calm_head),
            "sadness": head_score(self.sadness_head),
            "anxiety": head_score(self.anxiety_head),
            "anger":   head_score(self.anger_head),
        }

    def predict(self, input_ids: torch.Tensor, lengths: torch.Tensor) -> dict:
        """Inference: returns emotion scores as a plain dict."""
        self.eval()
        with torch.no_grad():
            out = self.forward(input_ids, lengths)
        return {k: round(float(v.item()), 1) for k, v in out.items()}
