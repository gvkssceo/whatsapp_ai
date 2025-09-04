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
