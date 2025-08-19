# training/train.py
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report
import joblib

df = pd.read_csv("../data/messages.csv").dropna(subset=["text","label"])
X = df["text"].astype(str)
y = df["label"].astype(str)

if len(df) < 30:
    # Tiny dataset: just train on all data (no test split)
    X_train, y_train = X, y
    X_test, y_test = X, y
else:
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

pipe = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1,2), min_df=2, max_features=50000)),
    ("clf", LogisticRegression(max_iter=400, class_weight="balanced"))
])

pipe.fit(X_train, y_train)
pred = pipe.predict(X_test)
print(classification_report(y_test, pred))

joblib.dump(pipe, "../training/model.joblib")
print("Saved model to training/model.joblib")
