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

# Initialize model and classes
model = None
CLASSES = ['P1', 'P2', 'P3']  # Default classes

# Try to load the trained model
try:
    if os.path.exists(MODEL_PATH):
        model = joblib.load(MODEL_PATH)
        CLASSES = list(model.classes_)  # Use actual classes from model
        print(f"✅ Loaded trained model with classes: {CLASSES}")
    else:
        print(f"⚠️  Model file not found at {MODEL_PATH}")
        print("   Using fallback rule-based classification")
        model = None
except Exception as e:
    print(f"❌ Error loading model: {e}")
    print("   Using fallback rule-based classification")
    model = None

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

def fallback_classification(text: str) -> tuple:
    """Fallback classification when model is not available"""
    score = 0.1  # Base score
    
    # High priority keywords
    if KW.search(text):
        score += 0.4
    
    # Money/payment related
    if MONEY.search(text):
        score += 0.3
    
    # Time sensitive
    if TIME.search(text) or DATE.search(text):
        score += 0.2
    
    # Questions/requests
    if re.search(r"\?|please|can you|need|help", text, re.I):
        score += 0.2
    
    # Business keywords
    business_keywords = ['work', 'job', 'project', 'client', 'meeting', 'deadline']
    if any(kw in text.lower() for kw in business_keywords):
        score += 0.15
    
    # Determine priority
    if score >= 0.7:
        priority = "P3"
    elif score >= 0.4:
        priority = "P2"
    else:
        priority = "P1"
    
    return priority, round(score, 2)

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
    important = []
    per_chat = {}
    
    # Use global model variable
    global model
    
    if model is not None:
        # Use trained model
        try:
            proba = model.predict_proba(texts)  # shape: [n, classes]
            idx_p3 = CLASSES.index("P3") if "P3" in CLASSES else None
            idx_p2 = CLASSES.index("P2") if "P2" in CLASSES else None

            for m, probs in zip(p.messages, proba):
                prob_p3 = float(probs[idx_p3]) if idx_p3 is not None else 0.0
                prob_p2 = float(probs[idx_p2]) if idx_p2 is not None else 0.0
                score = boost_score(prob_p3, m.text)
                priority = "P3" if score >= 0.8 else ("P2" if max(score, prob_p2) >= 0.45 else "P1")
                important.append({"id": m.id, "chat_id": m.chat_id, "priority": priority, "score": round(score,2), "text": m.text})
                per_chat.setdefault(m.chat_id or "_", []).append(m.text)
        except Exception as e:
            print(f"Model prediction failed: {e}, falling back to rule-based classification")
            model = None
    
    if model is None:
        # Use fallback classification
        for m in p.messages:
            priority, score = fallback_classification(m.text)
            important.append({"id": m.id, "chat_id": m.chat_id, "priority": priority, "score": score, "text": m.text})
            per_chat.setdefault(m.chat_id or "_", []).append(m.text)

    # produce summaries per chat if requested
    summaries = []
    if p.opts.get("return_summary", True):
        for cid, texts in per_chat.items():
            summaries.append({"chat_id": cid, "bullets": summarize_bullets(texts)})

    important.sort(key=lambda x: x["score"], reverse=True)
    top_k = int(p.opts.get("top_k", 20))
    return {"important": important[:top_k], "summaries": summaries}

@app.get("/health")
def health_check():
    global model
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "classes": CLASSES,
        "fallback_mode": model is None
    }
