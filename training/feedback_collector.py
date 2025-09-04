# User feedback collection system for improving ML model
import pandas as pd
import json
import os
from datetime import datetime

class FeedbackCollector:
    def __init__(self, feedback_file='user_feedback.csv'):
        self.feedback_file = feedback_file
        self.ensure_feedback_file_exists()
    
    def ensure_feedback_file_exists(self):
        """Create feedback file if it doesn't exist"""
        if not os.path.exists(self.feedback_file):
            df = pd.DataFrame(columns=[
                'message_id', 'message_text', 'predicted_priority', 'user_rating',
                'actual_priority', 'feedback_type', 'timestamp', 'context'
            ])
            df.to_csv(self.feedback_file, index=False)
            print(f"Created feedback file: {self.feedback_file}")
    
    def add_feedback(self, message_id, message_text, predicted_priority, user_rating, 
                    actual_priority=None, feedback_type='rating', context=None):
        """Add user feedback to the collection"""
        feedback_entry = {
            'message_id': message_id,
            'message_text': message_text,
            'predicted_priority': predicted_priority,
            'user_rating': user_rating,  # 1-5 stars or thumbs up/down
            'actual_priority': actual_priority,
            'feedback_type': feedback_type,  # 'rating', 'correction', 'validation'
            'timestamp': datetime.now().isoformat(),
            'context': json.dumps(context) if context else None
        }
        
        # Load existing feedback
        df = pd.read_csv(self.feedback_file)
        
        # Add new feedback
        new_row = pd.DataFrame([feedback_entry])
        df = pd.concat([df, new_row], ignore_index=True)
        
        # Save back to file
        df.to_csv(self.feedback_file, index=False)
        
        print(f"Added feedback for message {message_id}: {user_rating} stars")
        return feedback_entry
    
    def get_feedback_summary(self):
        """Get summary of collected feedback"""
        if not os.path.exists(self.feedback_file):
            return {"total": 0, "by_rating": {}, "by_priority": {}}
        
        df = pd.read_csv(self.feedback_file)
        
        if len(df) == 0:
            return {"total": 0, "by_rating": {}, "by_priority": {}}
        
        summary = {
            "total": len(df),
            "by_rating": df['user_rating'].value_counts().to_dict(),
            "by_priority": df['predicted_priority'].value_counts().to_dict(),
            "avg_rating": df['user_rating'].mean(),
            "recent_feedback": df.tail(5).to_dict('records')
        }
        
        return summary
    
    def generate_training_data_from_feedback(self, min_rating=3, output_file='feedback_training_data.csv'):
        """Generate training data from high-quality feedback"""
        if not os.path.exists(self.feedback_file):
            print("No feedback file found.")
            return pd.DataFrame()
        
        df = pd.read_csv(self.feedback_file)
        
        if len(df) == 0:
            print("No feedback data available.")
            return pd.DataFrame()
        
        # Filter high-quality feedback
        quality_feedback = df[df['user_rating'] >= min_rating].copy()
        
        # Create training data
        training_data = []
        
        for _, row in quality_feedback.iterrows():
            # Use actual priority if provided, otherwise use predicted if rating is high
            label = row['actual_priority'] if pd.notna(row['actual_priority']) else row['predicted_priority']
            
            training_data.append({
                'text': row['message_text'],
                'label': label,
                'source': 'user_feedback',
                'confidence': row['user_rating'] / 5.0  # Convert to 0-1 scale
            })
        
        training_df = pd.DataFrame(training_data)
        
        if len(training_df) > 0:
            training_df.to_csv(output_file, index=False)
            print(f"Generated {len(training_df)} training examples from feedback")
            print(f"Saved to: {output_file}")
        
        return training_df
    
    def analyze_model_performance(self):
        """Analyze model performance based on user feedback"""
        if not os.path.exists(self.feedback_file):
            return {}
        
        df = pd.read_csv(self.feedback_file)
        
        if len(df) == 0:
            return {}
        
        analysis = {}
        
        # Overall accuracy (rating >= 4 means correct prediction)
        correct_predictions = len(df[df['user_rating'] >= 4])
        total_predictions = len(df)
        analysis['accuracy'] = correct_predictions / total_predictions if total_predictions > 0 else 0
        
        # Performance by priority
        priority_performance = {}
        for priority in ['P1', 'P2', 'P3']:
            priority_df = df[df['predicted_priority'] == priority]
            if len(priority_df) > 0:
                correct = len(priority_df[priority_df['user_rating'] >= 4])
                priority_performance[priority] = {
                    'accuracy': correct / len(priority_df),
                    'avg_rating': priority_df['user_rating'].mean(),
                    'count': len(priority_df)
                }
        
        analysis['by_priority'] = priority_performance
        
        # Common misclassifications
        misclassified = df[df['user_rating'] < 3]
        if len(misclassified) > 0:
            analysis['common_errors'] = misclassified[['message_text', 'predicted_priority', 'user_rating']].to_dict('records')
        
        return analysis

def create_feedback_integration_script():
    """Create JavaScript for extension to collect feedback"""
    js_code = '''
// User feedback collection for WhatsApp AI Extension
class FeedbackCollector {
    constructor() {
        this.feedbackEndpoint = 'http://127.0.0.1:8000/feedback';
    }
    
    // Add thumbs up/down buttons to message cards
    addFeedbackButtons(messageElement, messageData) {
        const feedbackContainer = document.createElement('div');
        feedbackContainer.className = 'feedback-container';
        feedbackContainer.innerHTML = `
            <div class="feedback-buttons">
                <button class="feedback-btn thumbs-up" data-rating="5" title="Correct classification">
                    👍
                </button>
                <button class="feedback-btn thumbs-down" data-rating="1" title="Wrong classification">
                    👎
                </button>
                <button class="feedback-btn star-rating" data-rating="3" title="Rate classification">
                    ⭐
                </button>
            </div>
        `;
        
        // Add event listeners
        feedbackContainer.querySelectorAll('.feedback-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const rating = parseInt(e.target.dataset.rating);
                this.submitFeedback(messageData, rating);
                this.showFeedbackThankYou(feedbackContainer);
            });
        });
        
        messageElement.appendChild(feedbackContainer);
    }
    
    // Submit feedback to backend
    async submitFeedback(messageData, rating) {
        try {
            const feedback = {
                message_id: messageData.id,
                message_text: messageData.text,
                predicted_priority: messageData.priority,
                user_rating: rating,
                timestamp: Date.now(),
                context: {
                    chat_title: messageData.chatTitle,
                    score: messageData.score
                }
            };
            
            // Store locally first
            const existingFeedback = JSON.parse(localStorage.getItem('whatsapp_ai_feedback') || '[]');
            existingFeedback.push(feedback);
            localStorage.setItem('whatsapp_ai_feedback', JSON.stringify(existingFeedback));
            
            // Try to send to backend
            const response = await fetch(this.feedbackEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feedback)
            });
            
            if (response.ok) {
                console.log('Feedback submitted successfully');
            } else {
                console.log('Feedback stored locally, will retry later');
            }
            
        } catch (error) {
            console.error('Error submitting feedback:', error);
        }
    }
    
    // Show thank you message
    showFeedbackThankYou(container) {
        container.innerHTML = '<div class="feedback-thanks">Thanks for your feedback! 🙏</div>';
        setTimeout(() => {
            container.style.opacity = '0.5';
        }, 2000);
    }
    
    // Export feedback data
    exportFeedbackData() {
        const feedback = JSON.parse(localStorage.getItem('whatsapp_ai_feedback') || '[]');
        const dataStr = JSON.stringify(feedback, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'whatsapp_ai_feedback.json';
        link.click();
    }
}

// CSS for feedback buttons
const feedbackStyles = `
.feedback-container {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.feedback-buttons {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
}

.feedback-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
}

.feedback-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
}

.feedback-thanks {
    text-align: center;
    color: #4CAF50;
    font-size: 11px;
    padding: 4px;
}
`;

// Add styles to page
const styleSheet = document.createElement('style');
styleSheet.textContent = feedbackStyles;
document.head.appendChild(styleSheet);
'''
    
    # Save JavaScript file
    with open('../Extension/feedback_collector.js', 'w') as f:
        f.write(js_code)
    
    print("Created feedback collection JavaScript file: ../Extension/feedback_collector.js")

if __name__ == "__main__":
    # Initialize feedback collector
    collector = FeedbackCollector()
    
    # Create some sample feedback for testing
    print("Creating sample feedback data...")
    
    sample_feedback = [
        {
            'message_id': 'msg_001',
            'message_text': 'URGENT: Payment due today!',
            'predicted_priority': 'P3',
            'user_rating': 5,
            'actual_priority': 'P3',
            'feedback_type': 'validation'
        },
        {
            'message_id': 'msg_002', 
            'message_text': 'Good morning, how are you?',
            'predicted_priority': 'P1',
            'user_rating': 4,
            'actual_priority': 'P1',
            'feedback_type': 'validation'
        },
        {
            'message_id': 'msg_003',
            'message_text': 'Can you review this document?',
            'predicted_priority': 'P1',
            'user_rating': 2,
            'actual_priority': 'P2',
            'feedback_type': 'correction'
        }
    ]
    
    for feedback in sample_feedback:
        collector.add_feedback(**feedback)
    
    # Show summary
    summary = collector.get_feedback_summary()
    print("\nFeedback Summary:")
    print(f"Total feedback entries: {summary['total']}")
    print(f"Average rating: {summary.get('avg_rating', 0):.1f}")
    print(f"Ratings distribution: {summary['by_rating']}")
    
    # Generate training data from feedback
    training_data = collector.generate_training_data_from_feedback()
    
    # Analyze performance
    performance = collector.analyze_model_performance()
    print(f"\nModel accuracy based on feedback: {performance.get('accuracy', 0):.1%}")
    
    # Create JavaScript integration
    create_feedback_integration_script()
    
    print("\n" + "="*50)
    print("FEEDBACK SYSTEM SETUP COMPLETE!")
    print("Files created:")
    print("- user_feedback.csv (feedback database)")
    print("- feedback_training_data.csv (training data from feedback)")
    print("- ../Extension/feedback_collector.js (extension integration)")
    print("="*50)
