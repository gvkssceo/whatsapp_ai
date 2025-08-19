# training/weak_label.py
import re, pandas as pd
KW_P3 = r"(urgent|asap|today|tomorrow|deadline|interview|payment|invoice|blocker|immediately|asap)"
KW_P2 = r"(please|can you|could you|need|reminder|follow up|schedule|meeting|call|confirm|request)"

def weak_label(text: str) -> str:
    t = (text or "").lower()
    if re.search(KW_P3, t): return "P3"
    if re.search(KW_P2, t): return "P2"
    return "P1"

if __name__ == "__main__":
    df = pd.read_csv("../data/raw_messages.csv")  # replace with your unlabeled messages
    df["label"] = df["text"].apply(weak_label)
    df.to_csv("../data/messages.csv", index=False)
    print("Wrote data/messages.csv")
