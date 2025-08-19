#!/usr/bin/env python3
"""
Startup script for WhatsApp ML Helper service
"""
import uvicorn
import os
import sys

if __name__ == "__main__":
    # Add the parent directory to the path to find the training model
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    print("🚀 Starting WhatsApp ML Helper Service...")
    print("📍 Service will be available at: http://127.0.0.1:8000")
    print("📊 API Documentation: http://127.0.0.1:8000/docs")
    print("🔧 Press Ctrl+C to stop the service")
    
    try:
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
        print(f"❌ Error starting service: {e}")
        print("💡 Make sure you have installed the requirements:")
        print("   pip install -r requirements.txt")
