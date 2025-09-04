// CSV-based ML service for message importance classification
class CSVMLService {
  constructor() {
    this.trainingData = null;
    this.loadTrainingData();
  }

  async loadTrainingData() {
    try {
      // Load the CSV data from the data folder
      const response = await fetch(chrome.runtime.getURL('data/messages.csv'));
      const csvText = await response.text();
      this.trainingData = this.parseCSV(csvText);
      console.log('✅ Loaded CSV training data:', this.trainingData.length, 'samples');
    } catch (error) {
      console.error('❌ Error loading CSV data:', error);
      this.trainingData = [];
    }
  }

  parseCSV(csvText) {
    const lines = csvText.split('\n');
    const data = [];
    
    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim();
      if (line) {
        const [text, label] = line.split(',').map(item => item.replace(/"/g, '').trim());
        if (text && label) {
          data.push({ text: text.toLowerCase(), label });
        }
      }
    }
    
    return data;
  }

  // Classify message importance based on CSV patterns
  classifyMessage(text) {
    if (!this.trainingData || this.trainingData.length === 0) {
      return this.fallbackClassification(text);
    }

    const lowerText = text.toLowerCase();
    
    // Find exact matches first
    const exactMatch = this.trainingData.find(item => 
      item.text === lowerText || lowerText.includes(item.text)
    );
    
    if (exactMatch) {
      return {
        priority: exactMatch.label,
        score: this.getScoreForPriority(exactMatch.label),
        confidence: 0.9
      };
    }

    // Find partial matches
    const partialMatches = this.trainingData.filter(item => 
      this.calculateSimilarity(lowerText, item.text) > 0.6
    );

    if (partialMatches.length > 0) {
      // Get the most similar match
      const bestMatch = partialMatches.reduce((best, current) => 
        this.calculateSimilarity(lowerText, current.text) > 
        this.calculateSimilarity(lowerText, best.text) ? current : best
      );
      
      return {
        priority: bestMatch.label,
        score: this.getScoreForPriority(bestMatch.label) * 0.8,
        confidence: 0.7
      };
    }

    // Fallback to keyword-based classification
    return this.fallbackClassification(text);
  }

  calculateSimilarity(text1, text2) {
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    return intersection.length / union.length;
  }

  getScoreForPriority(priority) {
    switch (priority) {
      case 'P3': return 0.8;
      case 'P2': return 0.5;
      case 'P1': return 0.2;
      default: return 0.1;
    }
  }

  fallbackClassification(text) {
    const lowerText = text.toLowerCase();
    
    // P3 - High priority keywords
    if (this.hasHighPriorityKeywords(lowerText)) {
      return { priority: 'P3', score: 0.8, confidence: 0.6 };
    }
    
    // P2 - Medium priority keywords
    if (this.hasMediumPriorityKeywords(lowerText)) {
      return { priority: 'P2', score: 0.5, confidence: 0.6 };
    }
    
    // P1 - Low priority (default)
    return { priority: 'P1', score: 0.2, confidence: 0.4 };
  }

  hasHighPriorityKeywords(text) {
    const keywords = [
      'urgent', 'asap', 'deadline', 'emergency', 'important', 'critical',
      'payment', 'invoice', 'bill', 'money', 'salary', 'ctc', 'lpa',
      'job', 'recruitment', 'hiring', 'interview', 'career', 'opportunity',
      'error', 'failed', 'down', 'broken', 'fix', 'immediate'
    ];
    return keywords.some(keyword => text.includes(keyword));
  }

  hasMediumPriorityKeywords(text) {
    const keywords = [
      'meeting', 'schedule', 'appointment', 'tomorrow', 'today',
      'please', 'need', 'help', 'request', 'update', 'status',
      'project', 'work', 'business', 'client', 'customer'
    ];
    return keywords.some(keyword => text.includes(keyword));
  }

  // Process multiple messages
  processMessages(messages) {
    const results = messages.map(msg => {
      const classification = this.classifyMessage(msg.text);
      return {
        id: msg.id || msg.messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chat_id: msg.chat_id || msg.chatId || 'unknown',
        priority: classification.priority,
        score: classification.score,
        confidence: classification.confidence,
        text: msg.text,
        originalMessage: msg,
        storedAt: Date.now(),
                 chatTitle: msg.chatTitle || 'Current Chat',
        chatId: msg.chatId || msg.chat_id || 'current',
        isGroup: msg.isGroup || false
      };
    });

    // Filter out low-priority messages
    const important = results.filter(msg => 
      msg.priority === 'P3' || msg.priority === 'P2' || 
      (msg.priority === 'P1' && msg.score > 0.3)
    );

    // Sort by score
    important.sort((a, b) => b.score - a.score);

    return {
      success: true,
      data: {
        important: important,
        summaries: this.generateSummaries(important)
      }
    };
  }

  generateSummaries(importantMessages) {
    const chatGroups = {};
    importantMessages.forEach(msg => {
      const chatId = msg.chat_id || '_';
      if (!chatGroups[chatId]) {
        chatGroups[chatId] = [];
      }
      chatGroups[chatId].push(msg.text);
    });

    return Object.entries(chatGroups).map(([chatId, texts]) => ({
      chat_id: chatId,
      bullets: texts.slice(0, 3).map(t => t.substring(0, 100))
    }));
  }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CSVMLService;
} else {
  window.CSVMLService = CSVMLService;
}
