// Background service worker for Nax
class BackgroundService {
  constructor() {
    this.initializeMessageListener();
    this.initializeInstallListener();
    this.mlServiceUrl = 'http://127.0.0.1:8000'; // FastAPI service URL
    this.importantMessages = new Map();
    this.processingQueue = [];
    this.isProcessing = false;
    
    // Initialize content script injection
    this.initializeContentScriptInjection();
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
        case 'chatChanged':
          console.log('Chat changed detected:', request.data);
          // Update all stored messages with new chat info
          this.updateMessagesForNewChat(request.data.newChatInfo);
          sendResponse({ success: true, message: 'Chat change handled' });
          break;
        case 'openPopup':
          console.log('Open popup requested');
          chrome.action.openPopup();
          sendResponse({ success: true, message: 'Popup opened' });
          break;
        case 'ping':
          // Respond to ping for extension context health check
          sendResponse({ success: true, message: 'pong', timestamp: Date.now() });
          break;

        case 'clearCache':
          console.log('Clearing cache...');
          this.importantMessages.clear();
          this.processingQueue = [];
          chrome.storage.local.remove(['important_messages', 'last_updated']);
          sendResponse({ success: true, message: 'Cache cleared' });
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
        console.log('Nax installed successfully');
        // Could open a welcome page here
      } else if (details.reason === 'update') {
        console.log('Nax updated to version', chrome.runtime.getManifest().version);
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
          chat_id: msg.chat_id || msg.chatId || (msg.chatInfo && msg.chatInfo.id) || 'unknown',
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
        // Store important messages with proper chat context
        const importantMessages = mlResponse.data.important.map(important => ({
          ...important,
          chat_id: important.chat_id || (messages.find(m => m.id === important.id)?.chatId) || 'unknown'
        }));
        this.storeImportantMessages(importantMessages, messages);

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
          id: msg.id || msg.messageId || this.generateId(),
          chat_id: msg.chat_id || msg.chatId || 'unknown',
          priority: priority,
          score: Math.round(score * 100) / 100,
          text: msg.text,
          originalMessage: msg,
          storedAt: Date.now(),
          chatTitle: msg.chatTitle || 'Current Chat',
          chatId: msg.chatId || msg.chat_id || 'current',
          isGroup: msg.isGroup || false
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
      
      // Store important messages immediately
      this.storeImportantMessages(important, messages);
      
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

  async storeImportantMessages(importantList, originalMessages) {
    try {
      const timestamp = Date.now();
      
      console.log(`Storing ${importantList.length} important messages`);
      
      importantList.forEach(item => {
        const originalMsg = originalMessages.find(msg => 
          msg.id === item.id || 
          msg.messageId === item.id || 
          msg.text === item.text ||
          (msg.chatId && msg.chatId === item.chat_id) ||
          (msg.chat_id && msg.chat_id === item.chat_id)
        );

        if (originalMsg) {
          const messageToStore = {
            ...item,
            originalMessage: originalMsg,
            storedAt: timestamp,
            chatTitle: originalMsg.chatTitle || originalMsg.chat_id || 'Current Chat',
            chatId: originalMsg.chatId || originalMsg.chat_id || 'current',
            isGroup: originalMsg.isGroup || false,
            messageId: originalMsg.messageId || originalMsg.id || item.id
          };
          
          this.importantMessages.set(item.id, messageToStore);
          console.log(`Stored important message: ${item.text.substring(0, 50)}...`);
        } else {
          // If no original message found, create a basic entry
          const messageToStore = {
            ...item,
            originalMessage: { text: item.text },
            storedAt: timestamp,
            chatTitle: item.chatTitle || 'Current Chat',
            chatId: item.chatId || item.chat_id || 'current',
            isGroup: item.isGroup || false,
            messageId: item.id
          };
          
          this.importantMessages.set(item.id, messageToStore);
          console.log(`Stored important message (no original): ${item.text.substring(0, 50)}...`);
        }
      });

      // Save to chrome storage
      const storageData = Array.from(this.importantMessages.values());
      await chrome.storage.local.set({ 
        important_messages: storageData,
        last_updated: timestamp 
      });

      console.log(`Stored ${importantList.length} important messages in memory and storage`);
      console.log(`Total important messages now: ${this.importantMessages.size}`);

    } catch (error) {
      console.error('Error storing important messages:', error);
    }
  }

  // Update messages for a new chat
  async updateMessagesForNewChat(newChatInfo) {
    try {
      console.log('Updating messages for new chat:', newChatInfo);
      
      // Clear old chat data
      const oldMessages = Array.from(this.importantMessages.values());
      this.importantMessages.clear();
      
      // Update messages with new chat info
      const updatedMessages = oldMessages.map(msg => ({
        ...msg,
        chatId: newChatInfo.id,
        chatTitle: newChatInfo.title,
        isGroup: newChatInfo.isGroup || false,
        lastUpdated: Date.now()
      }));
      
      // Store updated messages
      updatedMessages.forEach(msg => this.importantMessages.set(msg.id, msg));
      
      // Save to chrome storage
      const storageData = Array.from(this.importantMessages.values());
      await chrome.storage.local.set({ 
        important_messages: storageData,
        last_updated: Date.now() 
      });
      
      console.log(`Updated ${updatedMessages.length} messages for new chat: ${newChatInfo.title}`);
    } catch (error) {
      console.error('Error updating messages for new chat:', error);
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
      console.log(`Processing queue with ${this.processingQueue.length} items`);
      
      while (this.processingQueue.length > 0) {
        const batch = this.processingQueue.splice(0, 5); // Process 5 at a time
        
        for (const item of batch) {
          try {
            console.log(`Processing batch item with ${item.messages.length} messages`);
            
            // Process messages with ML service
            const result = await this.processMessagesWithML(item.messages, () => {});
            
            if (result && result.success) {
              console.log(`Successfully processed batch: ${result.totalProcessed} messages, ${result.important.length} important`);
            } else {
              console.error('Batch processing failed:', result?.error);
            }
          } catch (error) {
            console.error('Error processing batch item:', error);
          }
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
      
      // If there are more items in queue, process them
      if (this.processingQueue.length > 0) {
        setTimeout(() => this.processQueue(), 1000);
      }
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

  // Initialize content script injection for WhatsApp Web tabs
  async initializeContentScriptInjection() {
    try {
      // Do not forcibly inject; rely on manifest content_scripts.
      // Optionally ensure presence on already open tabs without duplicating.
      await this.ensureContentScriptOnWhatsAppTabs();
      // Monitor for tab updates and ensure presence only if missing
      this.monitorWhatsAppTabs();
      console.log('Content script presence monitor initialized');
    } catch (error) {
      console.error('Error initializing content script injection:', error);
    }
  }

  // Inject content script on existing WhatsApp Web tabs
  async ensureContentScriptOnWhatsAppTabs() {
    const details = [];
    try {
      const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
      console.log(`Found ${tabs.length} WhatsApp Web tabs`);
      
      for (const tab of tabs) {
        console.log(`Processing tab ${tab.id}: ${tab.url}`);
        
        // Try pinging the content script; if it responds, it's alive
        const isAlive = await new Promise(resolve => {
          try {
            chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
              resolve(!!(response && response.success));
            });
          } catch {
            resolve(false);
          }
          // Safety timeout
          setTimeout(() => resolve(false), 500);
        });

        if (isAlive) {
          console.log(`Tab ${tab.id}: Content script is alive`);
          details.push({ tabId: tab.id, status: 'alive' });
          continue;
        }

        console.log(`Tab ${tab.id}: Content script not responding, injecting...`);
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          details.push({ tabId: tab.id, status: 'injected' });
          console.log(`Content script injected into tab ${tab.id}`);
          
          // Wait a bit for the script to initialize
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify injection worked
          const verifyResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              return {
                hasNaxScript: typeof window.naxScriptLoaded !== 'undefined',
                hasMessageExtractor: typeof window.WhatsAppMessageExtractor !== 'undefined',
                hasMessageListener: typeof window.naxMessageListenerActive !== 'undefined' && window.naxMessageListenerActive === true
              };
            }
          });
          
          if (verifyResult && verifyResult[0] && verifyResult[0].result) {
            const status = verifyResult[0].result;
            console.log(`Tab ${tab.id}: Injection verification:`, status);
          }
          
        } catch (error) {
          details.push({ tabId: tab.id, status: 'failed', error: error.message });
          console.log(`Failed to inject content script into tab ${tab.id}:`, error.message);
        }
      }
      return { message: 'Checked WhatsApp tabs for content script', details };
    } catch (error) {
      console.error('Error ensuring content script on tabs:', error);
      throw error;
    }
  }

  // Monitor for new WhatsApp Web tabs
  monitorWhatsAppTabs() {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && tab.url.includes('web.whatsapp.com')) {
        // Ensure presence only if missing
        setTimeout(() => this.ensureContentScriptOnWhatsAppTabs(), 1500);
      }
    });
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
    console.log('Nax background service started');
console.log('Available actions: processAI, getExtensionInfo, newMessagesDetected, processMessagesForPriority, getImportantMessages, updateMLServiceUrl, testMLService, chatChanged');

// Optional: Add periodic health check
setInterval(() => {
  console.log('Nax background service running...');
  console.log(`Important messages stored: ${backgroundService.importantMessages.size}`);
  console.log(`Processing queue length: ${backgroundService.processingQueue.length}`);
}, 300000); // Log every 5 minutes