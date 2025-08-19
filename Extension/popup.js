// Configuration management
class ConfigManager {
  static async getMlServiceUrl() {
    const result = await chrome.storage.sync.get(['ml_service_url']);
    return result.ml_service_url || 'http://127.0.0.1:8000';
  }

  static async saveMlServiceUrl(url) {
    await chrome.storage.sync.set({ ml_service_url: url });
  }

  static async testMlService(url) {
    try {
      const response = await fetch(`${url}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{
            id: 'test',
            chat_id: 'test',
            sender: 'test',
            text: 'This is a test message to verify ML service connection.',
            ts: Date.now()
          }],
          opts: { return_summary: false, top_k: 1 }
        })
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// UI management
class UIManager {
  static showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 5000);
  }

  static showLoading(elementId = 'analysis-loading') {
    document.getElementById(elementId).classList.remove('hidden');
    const outputEl = document.getElementById('analysis-output');
    if (outputEl) outputEl.classList.add('hidden');
  }

  static hideLoading(elementId = 'analysis-loading') {
    document.getElementById(elementId).classList.add('hidden');
  }

  static showOutput(content, elementId = 'analysis-output') {
    const outputEl = document.getElementById(elementId);
    outputEl.textContent = content;
    outputEl.classList.remove('hidden');
  }

  static switchTab(tabName) {
    // Hide all tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    
    // Remove active class from all nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Show selected tab panel
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Add active class to selected nav tab
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  }

  static updateStats(stats) {
    document.getElementById('total-messages').textContent = stats.total || 0;
    document.getElementById('p3-messages').textContent = stats.p3 || 0;
    document.getElementById('p2-messages').textContent = stats.p2 || 0;
    document.getElementById('chats-monitored').textContent = stats.chats || 0;
  }

  static renderMessages(messages) {
    const messagesList = document.getElementById('messages-list');
    const emptyState = document.getElementById('empty-state');
    
    if (!messages || messages.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    
    emptyState.style.display = 'none';
    
    const messagesHTML = messages.map(msg => `
      <div class="message-card priority-${msg.priority}">
        <div class="message-header">
          <span class="priority-badge ${msg.priority}">${msg.priority}</span>
          <span class="score">Score: ${msg.score}</span>
        </div>
        <div class="chat-info">${msg.chatTitle || 'Unknown Chat'}</div>
        <div class="message-text">${this.escapeHtml(msg.text)}</div>
        <div class="message-meta">
          <span>${msg.originalMessage?.sender || 'Unknown'}</span>
          <span>${this.formatTime(msg.storedAt)}</span>
        </div>
      </div>
    `).join('');
    
    messagesList.innerHTML = messagesHTML;
  }

  static populateChatFilter(messages) {
    const chatFilter = document.getElementById('chat-filter');
    const chats = [...new Set(messages.map(msg => msg.chatTitle).filter(Boolean))];
    
    // Clear existing options except "All Chats"
    chatFilter.innerHTML = '<option value="">All Chats</option>';
    
    chats.forEach(chat => {
      const option = document.createElement('option');
      option.value = chat;
      option.textContent = chat;
      chatFilter.appendChild(option);
    });
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }
}

// Message processing
class MessageProcessor {
  static async getAllMessages() {
    try {
      console.log('Getting all messages from background service...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'getImportantMessages',
        options: {}
      });
      
      console.log('Background service response:', response);
      
      if (response.success) {
        console.log(`Retrieved ${response.messages.length} messages from background service`);
        return response.messages;
      } else {
        throw new Error(response.error || 'Failed to get messages');
      }
    } catch (error) {
      console.error('Error getting messages:', error);
      UIManager.showStatus('Error loading messages: ' + error.message, 'error');
      return [];
    }
  }

  static async processCurrentChat() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        throw new Error('Please navigate to WhatsApp Web first');
      }

      console.log('Processing current chat...');

      // First, get the chat messages
      const chatResponse = await chrome.tabs.sendMessage(tab.id, { action: "getChats" });
      
      console.log('Chat response:', chatResponse);
      
      if (!chatResponse.success || !chatResponse.chats || chatResponse.chats.length === 0) {
        throw new Error('No messages found in current chat');
      }

      console.log(`Found ${chatResponse.chats.length} messages in current chat`);

      // Convert the simple text messages to the format expected by ML service
      const messages = chatResponse.chats.map((text, index) => ({
        id: `msg_${index}_${Date.now()}`,
        chat_id: 'current_chat',
        sender: 'user',
        text: text,
        ts: Date.now()
      }));

      console.log('Prepared messages for ML:', messages);

      // Send to background for ML processing
      const mlResponse = await chrome.runtime.sendMessage({
        action: 'processMessagesForPriority',
        messages: messages
      });

      console.log('ML response:', mlResponse);

      if (mlResponse.success) {
        UIManager.showStatus(`Processed ${mlResponse.totalProcessed} messages`, 'success');
        await MessageProcessor.refreshMessages();
      } else {
        throw new Error(mlResponse.error || 'Failed to process messages');
      }

    } catch (error) {
      console.error('Error processing chat:', error);
      UIManager.showStatus('Error: ' + error.message, 'error');
    }
  }

  static async refreshMessages() {
    const messages = await MessageProcessor.getAllMessages();
    UIManager.renderMessages(messages);
    UIManager.populateChatFilter(messages);
    
    // Update stats
    const stats = {
      total: messages.length,
      p3: messages.filter(m => m.priority === 'P3').length,
      p2: messages.filter(m => m.priority === 'P2').length,
      chats: [...new Set(messages.map(m => m.chatTitle).filter(Boolean))].length
    };
    UIManager.updateStats(stats);
  }

  static filterMessages() {
    const priorityFilter = document.getElementById('priority-filter').value;
    const chatFilter = document.getElementById('chat-filter').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();

    MessageProcessor.getAllMessages().then(messages => {
      let filtered = messages;

      if (priorityFilter) {
        filtered = filtered.filter(msg => msg.priority === priorityFilter);
      }

      if (chatFilter) {
        filtered = filtered.filter(msg => msg.chatTitle === chatFilter);
      }

      if (searchTerm) {
        filtered = filtered.filter(msg => 
          msg.text.toLowerCase().includes(searchTerm) ||
          (msg.chatTitle && msg.chatTitle.toLowerCase().includes(searchTerm))
        );
      }

      UIManager.renderMessages(filtered);
    });
  }
}

// AI processing
class AIProcessor {
  static async processWithML(text, prompt, mlServiceUrl) {
    try {
      // Split text into chunks if too long
      const maxLength = 1000;
      const textChunks = this.splitTextIntoChunks(text, maxLength);
      
      const messages = textChunks.map((chunk, index) => ({
        id: `chunk_${index}`,
        chat_id: 'current_chat',
        sender: 'user',
        text: chunk,
        ts: Date.now()
      }));

      const response = await fetch(`${mlServiceUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages,
          opts: { 
            return_summary: true, 
            top_k: 10 
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ML Service Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Generate response based on the prompt type
      if (prompt.includes('summary')) {
        return this.generateSummaryResponse(data, text);
      } else if (prompt.includes('sentiment')) {
        return this.generateSentimentResponse(data, text);
      } else {
        return this.generateAnalysisResponse(data, text);
      }
    } catch (error) {
      throw new Error(`ML Processing Error: ${error.message}`);
    }
  }

  static splitTextIntoChunks(text, maxLength) {
    const chunks = [];
    let currentChunk = '';
    
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.length > 0 ? chunks : [text];
  }

  static generateSummaryResponse(data, originalText) {
    const importantMessages = data.important || [];
    const summaries = data.summaries || [];
    
    let response = '📋 **Chat Summary**\n\n';
    
    if (importantMessages.length > 0) {
      response += '🔴 **High Priority Messages:**\n';
      importantMessages.slice(0, 5).forEach(msg => {
        response += `• ${msg.text.substring(0, 100)}${msg.text.length > 100 ? '...' : ''}\n`;
      });
      response += '\n';
    }
    
    if (summaries.length > 0) {
      response += '📝 **Key Points:**\n';
      summaries.forEach(summary => {
        summary.bullets.forEach(bullet => {
          response += `• ${bullet}\n`;
        });
      });
    }
    
    response += `\n📊 **Total Messages Analyzed:** ${originalText.split('\n').length}`;
    return response;
  }

  static generateSentimentResponse(data, originalText) {
    const importantMessages = data.important || [];
    
    let response = '😊 **Sentiment Analysis**\n\n';
    
    // Analyze message patterns
    const urgentCount = importantMessages.filter(msg => msg.priority === 'P3').length;
    const questionsCount = (originalText.match(/\?/g) || []).length;
    const exclamationCount = (originalText.match(/!/g) || []).length;
    
    response += `🔴 **Urgent Messages:** ${urgentCount}\n`;
    response += `❓ **Questions Asked:** ${questionsCount}\n`;
    response += `💥 **Exclamations:** ${exclamationCount}\n\n`;
    
    if (importantMessages.length > 0) {
      response += '🎯 **Key Emotional Indicators:**\n';
      importantMessages.slice(0, 3).forEach(msg => {
        response += `• ${msg.text.substring(0, 80)}${msg.text.length > 80 ? '...' : ''}\n`;
      });
    }
    
    return response;
  }

  static generateAnalysisResponse(data, originalText) {
    const importantMessages = data.important || [];
    
    let response = '🔍 **Chat Analysis**\n\n';
    
    // Priority distribution
    const p3Count = importantMessages.filter(msg => msg.priority === 'P3').length;
    const p2Count = importantMessages.filter(msg => msg.priority === 'P2').length;
    const p1Count = importantMessages.filter(msg => msg.priority === 'P1').length;
    
    response += `📊 **Priority Distribution:**\n`;
    response += `• P3 (High): ${p3Count}\n`;
    response += `• P2 (Medium): ${p2Count}\n`;
    response += `• P1 (Low): ${p1Count}\n\n`;
    
    if (importantMessages.length > 0) {
      response += '⭐ **Most Important Messages:**\n';
      importantMessages.slice(0, 5).forEach((msg, index) => {
        response += `${index + 1}. [${msg.priority}] ${msg.text.substring(0, 100)}${msg.text.length > 100 ? '...' : ''}\n`;
      });
    }
    
    return response;
  }

  static async getChatData() {
    try {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        throw new Error('Please navigate to WhatsApp Web first');
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: "getChats" });
      
      if (!response || !response.chats || response.chats.length === 0) {
        throw new Error('No chat messages found. Make sure you\'re in a conversation.');
      }

      return {
        messages: response.chats,
        messageCount: response.chats.length,
        tabId: tab.id
      };
    } catch (error) {
      throw new Error(`Failed to get chat data: ${error.message}`);
    }
  }
}

// Main application logic
class WhatsAppAIHelper {
  constructor() {
    this.initializeEventListeners();
    this.loadSavedConfig();
    this.initializeApp();
  }

  initializeEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.getAttribute('data-tab');
        UIManager.switchTab(tabName);
        
        if (tabName === 'important') {
          MessageProcessor.refreshMessages();
        }
      });
    });

    // Configuration events
    document.getElementById('saveMlConfig').addEventListener('click', () => this.saveMlConfig());
    document.getElementById('testMlConfig').addEventListener('click', () => this.testMlConfig());
    
    // AI processing events
    document.getElementById('summarize').addEventListener('click', () => this.summarizeChat());
    document.getElementById('analyze').addEventListener('click', () => this.analyzeSentiment());
    document.getElementById('process-all').addEventListener('click', () => this.processAllMessages());
    document.getElementById('test-ml').addEventListener('click', () => this.testMLService());
    
    // Debug events
    document.getElementById('debug-extraction').addEventListener('click', () => this.debugExtraction());
    document.getElementById('validate-selectors').addEventListener('click', () => this.validateSelectors());
    
    // Message management events
    document.getElementById('refresh-messages').addEventListener('click', () => MessageProcessor.refreshMessages());
    document.getElementById('startMonitoring').addEventListener('click', () => this.startMonitoring());
    document.getElementById('stopMonitoring').addEventListener('click', () => this.stopMonitoring());
    
    // Filter events
    document.getElementById('priority-filter').addEventListener('change', MessageProcessor.filterMessages);
    document.getElementById('chat-filter').addEventListener('change', MessageProcessor.filterMessages);
    document.getElementById('search-input').addEventListener('input', MessageProcessor.filterMessages);
    
    // Load saved ML service URL on input focus
    document.getElementById('mlServiceUrl').addEventListener('focus', () => this.loadSavedConfig());
  }

  async initializeApp() {
    // Load important messages on startup
    await MessageProcessor.refreshMessages();
  }

  async loadSavedConfig() {
    const mlServiceUrl = await ConfigManager.getMlServiceUrl();
    
    if (mlServiceUrl) {
      document.getElementById('mlServiceUrl').value = mlServiceUrl;
    }
  }

  async saveConfig() {
    // This method is now deprecated since we don't use OpenAI API
    UIManager.showStatus('OpenAI API is no longer used. Please use ML service instead.', 'info');
  }

  async saveMlConfig() {
    const mlServiceUrl = document.getElementById('mlServiceUrl').value.trim();
    
    if (!mlServiceUrl) {
      UIManager.showStatus('Please enter ML service URL', 'error');
      return;
    }

    await ConfigManager.saveMlServiceUrl(mlServiceUrl);
    
    // Update background service
    chrome.runtime.sendMessage({
      action: 'updateMLServiceUrl',
      url: mlServiceUrl
    });

    UIManager.showStatus('ML service configuration saved', 'success');
  }

  async testConfig() {
    // This method is now deprecated since we don't use OpenAI API
    UIManager.showStatus('OpenAI API is no longer used. Please test ML service instead.', 'info');
  }

  async testMlConfig() {
    const mlServiceUrl = document.getElementById('mlServiceUrl').value.trim();
    
    if (!mlServiceUrl) {
      UIManager.showStatus('Please enter ML service URL first', 'error');
      return;
    }

    UIManager.showStatus('Testing ML service connection...', 'info');
    
    try {
      const isValid = await ConfigManager.testMlService(mlServiceUrl);
      if (isValid) {
        UIManager.showStatus('ML service is connected!', 'success');
      } else {
        UIManager.showStatus('ML service connection failed', 'error');
      }
    } catch (error) {
      UIManager.showStatus('Error testing ML service: ' + error.message, 'error');
    }
  }

  async startMonitoring() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        UIManager.showStatus('Please navigate to WhatsApp Web first', 'error');
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: "startMonitoring" });
      
      if (response.success) {
        UIManager.showStatus('Monitoring started successfully', 'success');
      } else {
        UIManager.showStatus('Failed to start monitoring', 'error');
      }
    } catch (error) {
      UIManager.showStatus('Error starting monitoring: ' + error.message, 'error');
    }
  }

  async stopMonitoring() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        UIManager.showStatus('Please navigate to WhatsApp Web first', 'error');
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: "stopMonitoring" });
      
      if (response.success) {
        UIManager.showStatus('Monitoring stopped', 'success');
      } else {
        UIManager.showStatus('Failed to stop monitoring', 'error');
      }
    } catch (error) {
      UIManager.showStatus('Error stopping monitoring: ' + error.message, 'error');
    }
  }

  async processAllMessages() {
    UIManager.showLoading();
    UIManager.showStatus('Processing all messages with AI...', 'info');
    
    try {
      await MessageProcessor.processCurrentChat();
    } catch (error) {
      UIManager.showStatus('Error processing messages: ' + error.message, 'error');
    } finally {
      UIManager.hideLoading();
    }
  }

  async testMLService() {
    await this.testMlConfig();
  }

  async debugExtraction() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        UIManager.showStatus('Please navigate to WhatsApp Web first', 'error');
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: "debugExtraction" });
      
      if (response.success) {
        UIManager.showStatus('Debug information logged to console (F12)', 'success');
        UIManager.showOutput('Debug information has been logged to the browser console.\n\nTo view it:\n1. Press F12 to open Developer Tools\n2. Go to the Console tab\n3. Look for "=== DEBUGGING MESSAGE EXTRACTION ===" messages');
      } else {
        UIManager.showStatus('Debug failed: ' + response.error, 'error');
      }
    } catch (error) {
      UIManager.showStatus('Error running debug: ' + error.message, 'error');
    }
  }

  async validateSelectors() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        UIManager.showStatus('Please navigate to WhatsApp Web first', 'error');
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: "validateSelectors" });
      
      if (response.success) {
        const workingCount = response.workingSelectors.length;
        const totalCount = response.totalSelectors;
        const successRate = Math.round((workingCount / totalCount) * 100);
        
        UIManager.showStatus(`Selector validation complete: ${workingCount}/${totalCount} working (${successRate}%)`, 'success');
        
        const output = `Selector Validation Results:\n\n` +
                      `Working Selectors: ${workingCount}/${totalCount} (${successRate}%)\n\n` +
                      `Working Selectors:\n${response.workingSelectors.map(s => `✓ ${s}`).join('\n')}\n\n` +
                      `Failed Selectors:\n${response.totalSelectors - workingCount} selectors are not working`;
        
        UIManager.showOutput(output);
      } else {
        UIManager.showStatus('Validation failed: ' + response.error, 'error');
      }
    } catch (error) {
      UIManager.showStatus('Error validating selectors: ' + error.message, 'error');
    }
  }

  async summarizeChat() {
    await this.processChat('summarize', 'Please provide a comprehensive summary of this WhatsApp conversation. Include key topics discussed, important decisions made, and any action items mentioned.');
  }

  async analyzeSentiment() {
    await this.processChat('analyze', 'Please analyze the sentiment and tone of this WhatsApp conversation. Identify the overall mood, any emotional patterns, and provide insights about the communication dynamics.');
  }

  async processChat(action, prompt) {
    try {
      // Validate configuration
      const mlServiceUrl = await ConfigManager.getMlServiceUrl();
      if (!mlServiceUrl) {
        UIManager.showStatus('Please configure your ML service URL first', 'error');
        return;
      }

      // Get chat data
      UIManager.showStatus('Extracting chat messages...', 'info');
      const chatData = await AIProcessor.getChatData();
      
      // Prepare text for ML processing
      const chatText = chatData.messages.map(msg => msg.text).join('\n\n');
      
      if (chatText.length > 4000) {
        UIManager.showStatus('Chat was very long, analyzing first 4000 characters', 'info');
      }

      // Process with ML service
      UIManager.showLoading();
      
      const mlResponse = await AIProcessor.processWithML(
        chatText.length > 4000 ? chatText.substring(0, 4000) : chatText,
        prompt,
        mlServiceUrl
      );

      // Display results
      UIManager.hideLoading();
      UIManager.showOutput(mlResponse);

      UIManager.showStatus(`${action === 'summarize' ? 'Summary' : 'Analysis'} completed successfully`, 'success');

    } catch (error) {
      UIManager.hideLoading();
      UIManager.showStatus(error.message, 'error');
      console.error('Error processing chat:', error);
    }
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new WhatsAppAIHelper();
});
