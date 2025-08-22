#!/usr/bin/env python3
"""
Startup script for WhatsApp AI Helper ML Service
This script ensures the service can run even without the trained model file
"""

import os
import sys
import uvicorn
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are available"""
    try:
        import fastapi
        import pydantic
        print("✅ FastAPI and Pydantic available")
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install with: pip install fastapi uvicorn pydantic")
        return False
    
    try:
        import joblib
        print("✅ Joblib available")
    except ImportError as e:
        print(f"⚠️  Joblib not available: {e}")
        print("   Service will run in fallback mode only")
    
    return True

def check_model_file():
    """Check if the trained model file exists"""
    app_root = Path(__file__).parent.parent
    model_path = app_root / "training" / "model.joblib"
    
    if model_path.exists():
        print(f"✅ Trained model found: {model_path}")
        return True
    else:
        print(f"⚠️  Trained model not found: {model_path}")
        print("   Service will run in fallback mode with rule-based classification")
        return False

def create_fallback_model():
    """Create a simple fallback model if none exists"""
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.feature_extraction.text import TfidfVectorizer
        import pickle
        
        print("Creating fallback model...")
        
        # Simple training data
        texts = [
            "urgent meeting tomorrow",
            "payment due today",
            "deadline approaching",
            "can you help me?",
            "please confirm",
            "good morning",
            "thanks for the info",
            "see you later"
        ]
        
        labels = ['P3', 'P3', 'P3', 'P2', 'P2', 'P1', 'P1', 'P1']
        
        # Create and train a simple model
        vectorizer = TfidfVectorizer(max_features=100)
        X = vectorizer.fit_transform(texts)
        
        model = RandomForestClassifier(n_estimators=10, random_state=42)
        model.fit(X, labels)
        
        # Save the fallback model
        app_root = Path(__file__).parent.parent
        fallback_path = app_root / "training" / "fallback_model.pkl"
        fallback_path.parent.mkdir(exist_ok=True)
        
        with open(fallback_path, 'wb') as f:
            pickle.dump((vectorizer, model), f)
        
        print(f"✅ Fallback model created: {fallback_path}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create fallback model: {e}")
        return False

def main():
    """Main startup function"""
    print("🚀 Starting WhatsApp AI Helper ML Service...")
    print("=" * 50)
    
    # Check dependencies
    if not check_dependencies():
        print("❌ Cannot start service due to missing dependencies")
        sys.exit(1)
    
    # Check model file
    has_model = check_model_file()
    
    # Create fallback model if needed
    if not has_model:
        create_fallback_model()
    
    print("=" * 50)
    print("🎯 Service will start with:")
    if has_model:
        print("   - Trained ML model (if available)")
    print("   - Rule-based fallback classification")
    print("   - FastAPI web interface")
    print("=" * 50)
    
    # Start the service
    try:
        print("🌐 Starting service on http://127.0.0.1:8000")
        print("📊 Health check: http://127.0.0.1:8000/health")
        print("🔍 API docs: http://127.0.0.1:8000/docs")
        print("=" * 50)
        
        uvicorn.run(
            "service:app",
            host="127.0.0.1",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
    except Exception as e:
        print(f"❌ Service failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
