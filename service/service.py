# service/service.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional, Dict
import joblib, re, os
from fastapi.middleware.cors import CORSMiddleware

APP_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODEL_PATH = os.path.join(APP_ROOT, "training", "model.joblib")

app = FastAPI(title="WA Priority Service")

# Add CORS middleware to handle preflight requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# load model (saved at training/model.joblib)
model = joblib.load(MODEL_PATH)
CLASSES = list(model.classes_)  # e.g., ['P1','P2','P3']

# small rule boosters
KW = re.compile(r"(urgent|asap|today|tomorrow|deadline|invoice|payment|interview|error|issue|help|confirm|reminder)", re.I)
MONEY = re.compile(r"(\b₹|\$|rs\.?)\s?\d+", re.I)
TIME = re.compile(r"\b\d{1,2}(:\d{2})?\s*(am|pm)?\b", re.I)
DATE = re.compile(r"\b\d{1,2}[/-]\d{1,2}([/-]\d{2,4})?\b")

def boost_score(prob_p3: float, text: str) -> float:
    s = prob_p3
    if KW.search(text): s += 0.15
    if MONEY.search(text): s += 0.05
    if TIME.search(text) or DATE.search(text): s += 0.05
    return min(s, 1.0)

def summarize_bullets(texts: List[str]):
    ranked = sorted(texts, key=lambda t: (bool(re.search(r"\?|please|can you|need|by\s+\w+", t, re.I)), len(t)), reverse=True)
    return [t.strip()[:180] for t in ranked[:3]]

class Msg(BaseModel):
    id: str
    chat_id: Optional[str] = "_"
    sender: Optional[str] = None
    text: str
    ts: Optional[int] = None

class Payload(BaseModel):
    messages: List[Msg]
    opts: Optional[Dict] = {}

@app.post("/analyze")
def analyze(p: Payload):
    texts = [m.text for m in p.messages]
    proba = model.predict_proba(texts)  # shape: [n, classes]
    idx_p3 = CLASSES.index("P3") if "P3" in CLASSES else None
    idx_p2 = CLASSES.index("P2") if "P2" in CLASSES else None

    important = []
    per_chat = {}

    for m, probs in zip(p.messages, proba):
        prob_p3 = float(probs[idx_p3]) if idx_p3 is not None else 0.0
        prob_p2 = float(probs[idx_p2]) if idx_p2 is not None else 0.0
        score = boost_score(prob_p3, m.text)
        priority = "P3" if score >= 0.8 else ("P2" if max(score, prob_p2) >= 0.45 else "P1")
        important.append({"id": m.id, "chat_id": m.chat_id, "priority": priority, "score": round(score,2), "text": m.text})
        per_chat.setdefault(m.chat_id or "_", []).append(m.text)

    # produce summaries per chat if requested
    summaries = []
    if p.opts.get("return_summary", True):
        for cid, texts in per_chat.items():
            summaries.append({"chat_id": cid, "bullets": summarize_bullets(texts)})

    important.sort(key=lambda x: x["score"], reverse=True)
    top_k = int(p.opts.get("top_k", 20))
    return {"important": important[:top_k], "summaries": summaries}
