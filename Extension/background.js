// Background service worker for WhatsApp AI Helper
class BackgroundService {
  constructor() {
    this.initializeMessageListener();
    this.initializeInstallListener();
    this.mlServiceUrl = 'http://127.0.0.1:8000'; // FastAPI service URL
    this.importantMessages = new Map();
    this.processingQueue = [];
    this.isProcessing = false;
  }

  initializeMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Handle different message types
      switch (request.action) {
        case "processAI":
          this.handleMLProcessing(request, sendResponse);
          break;
        case "getExtensionInfo":
          this.handleExtensionInfo(sendResponse);
          break;
        case "newMessagesDetected":
          this.handleNewMessages(request.data, sendResponse);
          break;
        case "processMessagesForPriority":
          this.processMessagesWithML(request.messages, sendResponse);
          break;
        case "getImportantMessages":
          this.getImportantMessages(request.options, sendResponse);
          break;
        case "updateMLServiceUrl":
          this.updateMLServiceUrl(request.url, sendResponse);
          break;
        case "testMLService":
          this.testMLServiceConnection(sendResponse);
          break;
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
      
      return true; // Keep message channel open for async responses
    });
  }

  initializeInstallListener() {
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        console.log('WhatsApp AI Helper installed successfully');
        // Could open a welcome page here
      } else if (details.reason === 'update') {
        console.log('WhatsApp AI Helper updated to version', chrome.runtime.getManifest().version);
      }
    });
  }

  async handleMLProcessing(request, sendResponse) {
    try {
      // Validate request
      if (!request.text || typeof request.text !== 'string') {
        sendResponse({ success: false, error: 'Invalid text content' });
        return;
      }

      // Process with ML service
      const mlResponse = await this.callMLService('/analyze', {
        messages: [{
          id: 'request_' + Date.now(),
          chat_id: 'background',
          sender: 'user',
          text: request.text,
          ts: Date.now()
        }],
        opts: { return_summary: true, top_k: 5 }
      });

      if (mlResponse.success) {
        sendResponse({ success: true, reply: mlResponse.data });
      } else {
        sendResponse({ success: false, error: mlResponse.error });
      }

    } catch (error) {
      console.error('ML processing error:', error);
      sendResponse({ 
        success: false, 
        error: `ML Processing Error: ${error.message}` 
      });
    }
  }

  async getApiKey() {
    // This method is deprecated since we no longer use OpenAI API
    return null;
  }

  async callOpenAI(text, apiKey) {
    // This method is deprecated since we no longer use OpenAI API
    throw new Error('OpenAI API is no longer supported. Please use ML service instead.');
  }

  handleExtensionInfo(sendResponse) {
    const manifest = chrome.runtime.getManifest();
    sendResponse({
      success: true,
      info: {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        permissions: manifest.permissions,
        hostPermissions: manifest.host_permissions
      }
    });
  }

  // Handle new messages detected by content script
  async handleNewMessages(data, sendResponse) {
    try {
      if (data.messages && data.messages.length > 0) {
        // Add to processing queue
        this.processingQueue.push({
          messages: data.messages,
          chatInfo: data.chatInfo,
          timestamp: Date.now()
        });

        // Process queue if not already processing
        if (!this.isProcessing) {
          this.processQueue();
        }

        sendResponse({ success: true, message: 'Messages queued for processing' });
      } else {
        sendResponse({ success: true, message: 'No messages to process' });
      }
    } catch (error) {
      console.error('Error handling new messages:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Process messages with ML service
  async processMessagesWithML(messages, sendResponse) {
    try {
      if (!messages || messages.length === 0) {
        sendResponse({ success: false, error: 'No messages provided' });
        return;
      }

      console.log(`Processing ${messages.length} messages with ML service`);

      // Prepare messages for ML service
      const mlPayload = {
        messages: messages.map(msg => ({
          id: msg.id || msg.messageId || this.generateId(),
          chat_id: msg.chat_id || msg.chatId || 'unknown',
          sender: msg.sender || 'unknown',
          text: msg.text,
          ts: this.parseTimestamp(msg.ts || msg.timestamp)
        })),
        opts: {
          return_summary: true,
          top_k: 20
        }
      };

      console.log('ML payload prepared:', mlPayload);

      // Call ML service
      const mlResponse = await this.callMLService('/analyze', mlPayload);
      
      if (mlResponse.success) {
        // Store important messages
        this.storeImportantMessages(mlResponse.data.important, messages);

        console.log(`Successfully processed ${messages.length} messages, found ${mlResponse.data.important.length} important`);

        sendResponse({
          success: true,
          important: mlResponse.data.important,
          summaries: mlResponse.data.summaries,
          totalProcessed: messages.length
        });
      } else {
        console.error('ML service failed:', mlResponse.error);
        sendResponse({ success: false, error: mlResponse.error });
      }

    } catch (error) {
      console.error('Error processing with ML:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Call ML service endpoint
  async callMLService(endpoint, payload) {
    try {
      console.log(`Calling ML service: ${this.mlServiceUrl}${endpoint}`);
      
      const response = await fetch(`${this.mlServiceUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`ML Service error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('ML service response:', data);
      return { success: true, data: data };

    } catch (error) {
      console.error('ML Service call failed:', error);
      
      // If service is not available, use fallback processing
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.log('ML service unavailable, using fallback processing');
        return this.fallbackProcessing(payload);
      }
      
      return { success: false, error: error.message };
    }
  }

  // Fallback processing when ML service is unavailable
  fallbackProcessing(payload) {
    try {
      console.log('Using fallback processing for', payload.messages.length, 'messages');
      
      const messages = payload.messages;
      const important = [];

      // Enhanced rule-based classification
      messages.forEach(msg => {
        let score = 0.1; // Base score
        let priority = 'P1';

        const text = msg.text.toLowerCase();

        // High priority keywords (urgent/important)
        if (this.hasHighPriorityKeywords(text)) {
          score += 0.4;
        }

        // Money/payment related
        if (this.hasMoneyKeywords(text)) {
          score += 0.3;
        }

        // Time sensitive
        if (this.hasTimeKeywords(text)) {
          score += 0.2;
        }

        // Questions/requests
        if (this.hasQuestionMarkers(text)) {
          score += 0.2;
        }

        // Business/career related
        if (this.hasBusinessKeywords(text)) {
          score += 0.15;
        }

        // Personal/emotional content
        if (this.hasPersonalKeywords(text)) {
          score += 0.1;
        }

        // Determine priority
        if (score >= 0.7) {
          priority = 'P3';
        } else if (score >= 0.4) {
          priority = 'P2';
        }

        important.push({
          id: msg.id,
          chat_id: msg.chat_id,
          priority: priority,
          score: Math.round(score * 100) / 100,
          text: msg.text
        });
      });

      // Sort by score
      important.sort((a, b) => b.score - a.score);

      // Generate simple summaries
      const summaries = [];
      if (payload.opts && payload.opts.return_summary) {
        const chatGroups = {};
        important.forEach(msg => {
          const chatId = msg.chat_id || '_';
          if (!chatGroups[chatId]) {
            chatGroups[chatId] = [];
          }
          chatGroups[chatId].push(msg.text);
        });

        Object.entries(chatGroups).forEach(([chatId, texts]) => {
          const topTexts = texts.slice(0, 3).map(t => t.substring(0, 100));
          summaries.push({
            chat_id: chatId,
            bullets: topTexts
          });
        });
      }

      console.log(`Fallback processing completed: ${important.length} important messages`);
      
      return {
        success: true,
        data: {
          important: important.slice(0, payload.opts?.top_k || 20),
          summaries: summaries
        }
      };

    } catch (error) {
      console.error('Fallback processing failed:', error);
      return { success: false, error: 'Fallback processing failed: ' + error.message };
    }
  }

  // Enhanced keyword detection helpers
  hasHighPriorityKeywords(text) {
    const keywords = [
      'urgent', 'asap', 'deadline', 'emergency', 'important', 'critical', 'immediately',
      'now', 'quick', 'fast', 'hurry', 'rush', 'priority', 'top priority'
    ];
    return keywords.some(keyword => text.includes(keyword));
  }

  hasMoneyKeywords(text) {
    const moneyPattern = /(\$|₹|rs\.?|rupees?|dollars?|payment|invoice|bill|money|price|cost|amount)\s*\d+/i;
    return moneyPattern.test(text) || 
           text.includes('payment') || 
           text.includes('invoice') ||
           text.includes('bill') ||
           text.includes('money');
  }

  hasTimeKeywords(text) {
    const timePattern = /(today|tomorrow|deadline|by\s+\d|within\s+\d|\d+\s*(am|pm|hours?|days?|minutes?))/i;
    return timePattern.test(text) ||
           text.includes('schedule') ||
           text.includes('appointment') ||
           text.includes('meeting');
  }

  hasQuestionMarkers(text) {
    return text.includes('?') || 
           text.includes('please') || 
           text.includes('can you') || 
           text.includes('need') ||
           text.includes('help') ||
           text.includes('advice') ||
           text.includes('suggestion');
  }

  hasBusinessKeywords(text) {
    const businessKeywords = [
      'work', 'job', 'project', 'client', 'customer', 'business', 'company',
      'meeting', 'presentation', 'report', 'deadline', 'deliverable'
    ];
    return businessKeywords.some(keyword => text.includes(keyword));
  }

  hasPersonalKeywords(text) {
    const personalKeywords = [
      'family', 'home', 'health', 'doctor', 'hospital', 'school', 'university',
      'birthday', 'anniversary', 'celebration', 'party', 'travel', 'vacation'
    ];
    return personalKeywords.some(keyword => text.includes(keyword));
  }

  // Store important messages in memory and local storage
  async storeImportantMessages(importantList, originalMessages) {
    try {
      const timestamp = Date.now();
      
      console.log(`Storing ${importantList.length} important messages`);
      
      importantList.forEach(item => {
        const originalMsg = originalMessages.find(msg => 
          msg.id === item.id || msg.messageId === item.id || msg.text === item.text
        );

        if (originalMsg) {
          this.importantMessages.set(item.id, {
            ...item,
            originalMessage: originalMsg,
            storedAt: timestamp,
            chatTitle: originalMsg.chatTitle || originalMsg.chat_id || 'Current Chat',
            chatId: originalMsg.chatId || originalMsg.chat_id || 'current',
            isGroup: originalMsg.isGroup || false
          });
        } else {
          // If no original message found, create a basic entry
          this.importantMessages.set(item.id, {
            ...item,
            originalMessage: { text: item.text },
            storedAt: timestamp,
            chatTitle: 'Current Chat',
            chatId: 'current',
            isGroup: false
          });
        }
      });

      // Save to chrome storage
      const storageData = Array.from(this.importantMessages.values());
      await chrome.storage.local.set({ 
        important_messages: storageData,
        last_updated: timestamp 
      });

      console.log(`Stored ${importantList.length} important messages in memory and storage`);

    } catch (error) {
      console.error('Error storing important messages:', error);
    }
  }

  // Get important messages
  async getImportantMessages(options = {}, sendResponse) {
    try {
      // Load from storage if memory is empty
      if (this.importantMessages.size === 0) {
        await this.loadImportantMessages();
      }

      let messages = Array.from(this.importantMessages.values());

      // Apply filters
      if (options.priority) {
        messages = messages.filter(msg => msg.priority === options.priority);
      }

      if (options.chatId) {
        messages = messages.filter(msg => msg.chatId === options.chatId);
      }

      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        messages = messages.filter(msg => 
          msg.text.toLowerCase().includes(searchTerm) ||
          msg.chatTitle.toLowerCase().includes(searchTerm)
        );
      }

      // Sort by score (highest first)
      messages.sort((a, b) => b.score - a.score);

      // Limit results
      const limit = options.limit || 50;
      messages = messages.slice(0, limit);

      sendResponse({
        success: true,
        messages: messages,
        total: this.importantMessages.size,
        filtered: messages.length
      });

    } catch (error) {
      console.error('Error getting important messages:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Load important messages from storage
  async loadImportantMessages() {
    try {
      const result = await chrome.storage.local.get(['important_messages']);
      if (result.important_messages) {
        this.importantMessages.clear();
        result.important_messages.forEach(msg => {
          this.importantMessages.set(msg.id, msg);
        });
        console.log(`Loaded ${this.importantMessages.size} important messages from storage`);
      }
    } catch (error) {
      console.error('Error loading important messages:', error);
    }
  }

  // Process queue
  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.processingQueue.length > 0) {
        const batch = this.processingQueue.splice(0, 10); // Process 10 at a time
        
        for (const item of batch) {
          await this.processMessagesWithML(item.messages, () => {}); // Silent processing
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Update ML service URL
  async updateMLServiceUrl(url, sendResponse) {
    try {
      this.mlServiceUrl = url;
      await chrome.storage.sync.set({ ml_service_url: url });
      sendResponse({ success: true, message: 'ML service URL updated' });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  // Test ML service connection
  async testMLServiceConnection(sendResponse) {
    try {
      const testPayload = {
        messages: [{
          id: 'test',
          chat_id: 'test',
          sender: 'test',
          text: 'Test message for connection',
          ts: Date.now()
        }],
        opts: { return_summary: false, top_k: 1 }
      };

      const response = await this.callMLService('/analyze', testPayload);
      
      if (response.success) {
        sendResponse({ success: true, message: 'ML service is connected and working' });
      } else {
        sendResponse({ success: false, error: `ML service test failed: ${response.error}` });
      }

    } catch (error) {
      sendResponse({ success: false, error: `Connection test failed: ${error.message}` });
    }
  }

  // Utility methods
  generateId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  parseTimestamp(timestamp) {
    if (typeof timestamp === 'number') return timestamp;
    if (!timestamp) return Date.now();
    
    try {
      return new Date(timestamp).getTime();
    } catch {
      return Date.now();
    }
  }
}

// Initialize the background service
const backgroundService = new BackgroundService();

// Load saved configuration on startup
async function initializeConfiguration() {
  try {
    const result = await chrome.storage.sync.get(['ml_service_url']);
    if (result.ml_service_url) {
      backgroundService.mlServiceUrl = result.ml_service_url;
      console.log('Loaded ML service URL:', result.ml_service_url);
    }
    
    // Load important messages from storage
    await backgroundService.loadImportantMessages();
    
  } catch (error) {
    console.error('Error loading configuration:', error);
  }
}

// Initialize configuration
initializeConfiguration();

// Handle extension startup
console.log('WhatsApp AI Helper background service started');
console.log('Available actions: processAI, getExtensionInfo, newMessagesDetected, processMessagesForPriority, getImportantMessages, updateMLServiceUrl, testMLService');

// Optional: Add periodic health check
setInterval(() => {
  console.log('WhatsApp AI Helper background service running...');
  console.log(`Important messages stored: ${backgroundService.importantMessages.size}`);
  console.log(`Processing queue length: ${backgroundService.processingQueue.length}`);
}, 300000); // Log every 5 minutes
