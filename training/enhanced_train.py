# Enhanced training pipeline with multiple data sources and advanced features
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.preprocessing import StandardScaler
import joblib
import re
import os
from datetime import datetime

class EnhancedMessageClassifier:
    def __init__(self):
        self.models = {}
        self.vectorizers = {}
        self.feature_extractors = []
        
    def load_all_data_sources(self):
        """Load data from multiple sources"""
        data_sources = []
        
        # Original data
        if os.path.exists("../data/messages.csv"):
            original_df = pd.read_csv("../data/messages.csv")
            original_df['source'] = 'original'
            data_sources.append(original_df)
            print(f"Loaded original data: {len(original_df)} messages")
        
        # Expanded synthetic data
        if os.path.exists("combined_messages.csv"):
            expanded_df = pd.read_csv("combined_messages.csv")
            expanded_df['source'] = 'synthetic'
            data_sources.append(expanded_df)
            print(f"Loaded expanded data: {len(expanded_df)} messages")
        
        # User feedback data
        if os.path.exists("feedback_training_data.csv"):
            feedback_df = pd.read_csv("feedback_training_data.csv")
            feedback_df['source'] = 'feedback'
            data_sources.append(feedback_df)
            print(f"Loaded feedback data: {len(feedback_df)} messages")
        
        if not data_sources:
            raise FileNotFoundError("No training data found. Run data_expansion.py first.")
        
        # Combine all data sources
        combined_df = pd.concat(data_sources, ignore_index=True)
        
        # Remove duplicates
        initial_count = len(combined_df)
        combined_df = combined_df.drop_duplicates(subset=['text'], keep='first')
        final_count = len(combined_df)
        
        print(f"Combined dataset: {final_count} messages (removed {initial_count - final_count} duplicates)")
        
        return combined_df
    
    def extract_advanced_features(self, texts):
        """Extract advanced features from text"""
        features = []
        
        for text in texts:
            text = str(text).lower()
            
            feature_vector = {
                # Length features
                'char_count': len(text),
                'word_count': len(text.split()),
                'avg_word_length': np.mean([len(word) for word in text.split()]) if text.split() else 0,
                
                # Punctuation features
                'exclamation_count': text.count('!'),
                'question_count': text.count('?'),
                'caps_ratio': sum(1 for c in text if c.isupper()) / len(text) if text else 0,
                
                # Urgency indicators
                'has_urgent_keywords': int(bool(re.search(r'\b(urgent|asap|immediately|critical|emergency)\b', text))),
                'has_deadline_keywords': int(bool(re.search(r'\b(today|tomorrow|deadline|due)\b', text))),
                'has_money_keywords': int(bool(re.search(r'\$|₹|rs\.?|payment|invoice|amount', text))),
                'has_time_keywords': int(bool(re.search(r'\b\d{1,2}(:\d{2})?\s*(am|pm)?\b', text))),
                
                # Business indicators
                'has_business_keywords': int(bool(re.search(r'\b(meeting|project|client|contract|proposal)\b', text))),
                'has_request_keywords': int(bool(re.search(r'\b(please|can you|could you|need|require)\b', text))),
                
                # Communication patterns
                'has_greeting': int(bool(re.search(r'\b(hi|hello|good morning|good evening)\b', text))),
                'has_thanks': int(bool(re.search(r'\b(thanks|thank you|appreciate)\b', text))),
                'has_confirmation': int(bool(re.search(r'\b(ok|okay|sure|will do|got it)\b', text))),
                
                # Emotional indicators
                'has_positive_words': int(bool(re.search(r'\b(great|awesome|perfect|excellent|good)\b', text))),
                'has_negative_words': int(bool(re.search(r'\b(problem|issue|error|failed|wrong)\b', text))),
            }
            
            features.append(feature_vector)
        
        return pd.DataFrame(features)
    
    def create_ensemble_pipeline(self, X_train, y_train):
        """Create an ensemble of multiple models"""
        
        # Text-based pipeline with TF-IDF
        text_pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(
                ngram_range=(1, 3),
                min_df=2,
                max_features=10000,
                stop_words='english'
            )),
            ('scaler', StandardScaler(with_mean=False)),
            ('classifier', LogisticRegression(
                max_iter=1000,
                class_weight='balanced',
                random_state=42
            ))
        ])
        
        # Feature-based pipeline
        feature_pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('classifier', RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                class_weight='balanced',
                random_state=42
            ))
        ])
        
        return text_pipeline, feature_pipeline
    
    def train_model(self, use_grid_search=True):
        """Train the enhanced model"""
        print("="*50)
        print("ENHANCED MESSAGE CLASSIFIER TRAINING")
        print("="*50)
        
        # Load data
        df = self.load_all_data_sources()
        df = df.dropna(subset=['text', 'label'])
        
        # Prepare features
        X_text = df['text'].astype(str)
        X_features = self.extract_advanced_features(X_text)
        y = df['label'].astype(str)
        
        print(f"\nDataset statistics:")
        print(f"Total samples: {len(df)}")
        print(f"Label distribution:")
        print(y.value_counts())
        print(f"Features extracted: {X_features.shape[1]} features")
        
        # Split data
        if len(df) < 50:
            # Small dataset: use all data for training
            X_text_train, X_text_test = X_text, X_text
            X_feat_train, X_feat_test = X_features, X_features
            y_train, y_test = y, y
            print("Using all data for training (small dataset)")
        else:
            (X_text_train, X_text_test, 
             X_feat_train, X_feat_test, 
             y_train, y_test) = train_test_split(
                X_text, X_features, y,
                test_size=0.2, 
                stratify=y, 
                random_state=42
            )
            print(f"Train set: {len(X_text_train)}, Test set: {len(X_text_test)}")
        
        # Create pipelines
        text_pipeline, feature_pipeline = self.create_ensemble_pipeline(X_text_train, y_train)
        
        # Train text-based model
        print("\nTraining text-based model...")
        if use_grid_search and len(df) > 100:
            text_params = {
                'tfidf__max_features': [5000, 10000],
                'tfidf__ngram_range': [(1,2), (1,3)],
                'classifier__C': [0.1, 1.0, 10.0]
            }
            text_grid = GridSearchCV(text_pipeline, text_params, cv=3, scoring='f1_weighted')
            text_grid.fit(X_text_train, y_train)
            text_model = text_grid.best_estimator_
            print(f"Best text model params: {text_grid.best_params_}")
        else:
            text_model = text_pipeline
            text_model.fit(X_text_train, y_train)
        
        # Train feature-based model
        print("Training feature-based model...")
        if use_grid_search and len(df) > 100:
            feature_params = {
                'classifier__n_estimators': [50, 100],
                'classifier__max_depth': [5, 10, None]
            }
            feature_grid = GridSearchCV(feature_pipeline, feature_params, cv=3, scoring='f1_weighted')
            feature_grid.fit(X_feat_train, y_train)
            feature_model = feature_grid.best_estimator_
            print(f"Best feature model params: {feature_grid.best_params_}")
        else:
            feature_model = feature_pipeline
            feature_model.fit(X_feat_train, y_train)
        
        # Create ensemble
        ensemble = VotingClassifier([
            ('text_model', text_model),
            ('feature_model', feature_model)
        ], voting='soft')
        
        # For ensemble, we need to combine predictions manually since we have different input types
        # We'll use the text model as primary and feature model as secondary
        
        # Evaluate models
        print("\n" + "="*30)
        print("MODEL EVALUATION")
        print("="*30)
        
        # Text model evaluation
        text_pred = text_model.predict(X_text_test)
        print("\nText-based model performance:")
        print(classification_report(y_test, text_pred))
        
        # Feature model evaluation
        feature_pred = feature_model.predict(X_feat_test)
        print("\nFeature-based model performance:")
        print(classification_report(y_test, feature_pred))
        
        # Simple ensemble (average probabilities)
        text_proba = text_model.predict_proba(X_text_test)
        feature_proba = feature_model.predict_proba(X_feat_test)
        
        # Weighted ensemble (text model gets more weight)
        ensemble_proba = 0.7 * text_proba + 0.3 * feature_proba
        ensemble_pred = text_model.classes_[np.argmax(ensemble_proba, axis=1)]
        
        print("\nEnsemble model performance:")
        print(classification_report(y_test, ensemble_pred))
        
        # Save models
        models_to_save = {
            'text_model': text_model,
            'feature_model': feature_model,
            'feature_columns': list(X_features.columns)
        }
        
        joblib.dump(models_to_save, 'enhanced_model.joblib')
        
        # Also save the primary text model for backward compatibility
        joblib.dump(text_model, 'model.joblib')
        
        print(f"\nModels saved:")
        print(f"- enhanced_model.joblib (complete ensemble)")
        print(f"- model.joblib (primary text model)")
        
        # Feature importance analysis
        if hasattr(feature_model.named_steps['classifier'], 'feature_importances_'):
            feature_importance = pd.DataFrame({
                'feature': X_features.columns,
                'importance': feature_model.named_steps['classifier'].feature_importances_
            }).sort_values('importance', ascending=False)
            
            print(f"\nTop 10 Most Important Features:")
            print(feature_importance.head(10))
        
        return text_model, feature_model, models_to_save

def run_training_with_data_expansion():
    """Complete training pipeline with data expansion"""
    print("Starting enhanced training pipeline...")
    
    # Check if expanded data exists, if not create it
    if not os.path.exists("combined_messages.csv"):
        print("Expanded data not found. Creating it...")
        os.system("python data_expansion.py")
    
    # Check if feedback data exists
    if not os.path.exists("feedback_training_data.csv"):
        print("Feedback data not found. Creating sample feedback...")
        os.system("python feedback_collector.py")
    
    # Train the model
    classifier = EnhancedMessageClassifier()
    text_model, feature_model, ensemble = classifier.train_model()
    
    print("\n" + "="*50)
    print("TRAINING COMPLETE!")
    print("="*50)
    print("Next steps:")
    print("1. Test the model with: python predict.py 'your test message'")
    print("2. Evaluate on test data with: python eval.py")
    print("3. Update the service to use the enhanced model")
    print("="*50)

if __name__ == "__main__":
    run_training_with_data_expansion()
