"""
FastAPI inference service for EmotionLSTM.

Deploy to Railway. Called internally by Next.js API routes.
Protected by INTERNAL_SECRET header — never exposed publicly.
"""

import os
import json
import re
import torch
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, constr
from model import EmotionLSTM

# ── Config ────────────────────────────────────────────────────────────────────
DEVICE      = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_PATH  = os.getenv("MODEL_PATH", "ml/emotion_lstm.pt")
VOCAB_PATH  = os.getenv("VOCAB_PATH", "ml/vocab.json")
SECRET      = os.getenv("INTERNAL_SECRET", "")
MAX_LEN     = 256
PAD_IDX     = 0
UNK_IDX     = 1

# ── Load vocab + model at startup ─────────────────────────────────────────────
with open(VOCAB_PATH) as f:
    vocab: dict = json.load(f)

model = EmotionLSTM(
    vocab_size=len(vocab),
    pad_idx=vocab.get("<PAD>", 0),
)
state = torch.load(MODEL_PATH, map_location=DEVICE)
model.load_state_dict(state)
model.to(DEVICE)
model.eval()

# ── FastAPI ───────────────────────────────────────────────────────────────────
app = FastAPI(title="MindMap ML Service", docs_url=None, redoc_url=None)


def verify_secret(request: Request):
    token = request.headers.get("X-Internal-Secret", "")
    if not SECRET or token != SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


def tokenise(text: str) -> list[int]:
    tokens = re.findall(r"\b\w+\b", text.lower())[:MAX_LEN]
    return [vocab.get(t, UNK_IDX) for t in tokens] or [PAD_IDX]


class ScoreRequest(BaseModel):
    text: constr(min_length=1, max_length=5000)  # type: ignore


@app.post("/score", dependencies=[Depends(verify_secret)])
async def score_text(body: ScoreRequest):
    ids = tokenise(body.text)
    ids_t    = torch.tensor([ids], dtype=torch.long, device=DEVICE)
    lengths  = torch.tensor([len(ids)], dtype=torch.long, device=DEVICE)

    scores = model.predict(ids_t, lengths)
    return JSONResponse(content={"emotions": scores})


@app.get("/health")
async def health():
    return {"status": "ok", "vocab_size": len(vocab)}
