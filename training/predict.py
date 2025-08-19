# training/predict.py
import joblib, sys
model = joblib.load("model.joblib")
txt = " ".join(sys.argv[1:]) or "Please send the invoice today"
pred = model.predict([txt])[0]
proba = model.predict_proba([txt])[0]
print("PRED:", pred)
print("PROB:", proba)
