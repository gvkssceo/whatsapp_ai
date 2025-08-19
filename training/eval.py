# training/eval.py
import pandas as pd, joblib
from sklearn.metrics import classification_report, confusion_matrix

df = pd.read_csv("../data/messages.csv")
model = joblib.load("../training/model.joblib")
pred = model.predict(df["text"].astype(str))
print(classification_report(df["label"], pred))
print(confusion_matrix(df["label"], pred))
