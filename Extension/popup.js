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
  // Wait for DOM to be ready
  static async waitForDOM() {
    return new Promise((resolve) => {
      if (this.isDOMReady()) {
        resolve();
      } else {
        const checkDOM = () => {
          if (this.isDOMReady()) {
            resolve();
          } else {
            setTimeout(checkDOM, 100);
          }
        };
        checkDOM();
      }
    });
  }

  // Check if DOM is ready
  static isDOMReady() {
    try {
      // Consider the popup ready when core UI mounts
      const mustExistIds = ['messages-list', 'mlServiceUrl'];
      const hasCore = mustExistIds.every(id => document.getElementById(id));
      // Also allow readiness if the filters are present
      const hasFilters = !!document.getElementById('priority-filter');
      return hasCore || hasFilters;
    } catch (error) {
      return false;
    }
  }

  // Check if content script is ready before communication
  static async isContentScriptReady(tabId) {
    try {
      // First check if the tab exists and is accessible
      const tab = await chrome.tabs.get(tabId);
      if (!tab || !tab.url || !tab.url.includes('web.whatsapp.com')) {
        console.log('Tab not accessible or not WhatsApp Web');
        return false;
      }

      // Try to send a ping message
      const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });
      return response && response.success;
    } catch (error) {
      console.log('Content script not ready:', error.message);
      return false;
    }
  }

  // Wait for content script to be ready with timeout
  static async waitForContentScript(tabId, maxWaitTime = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const isReady = await this.isContentScriptReady(tabId);
        if (isReady) {
          console.log('Content script is now ready!');
          return true;
        }
        
        // Wait 200ms before next check
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.log('Still waiting for content script...');
      }
    }
    
    console.log('Content script not ready after timeout');
    return false;
  }

  // Check if WhatsApp Web page is fully loaded
  static async isWhatsAppWebReady(tabId) {
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          // Check if WhatsApp Web is fully loaded
          const isLoaded = document.readyState === 'complete' && 
                          document.querySelector('#main') !== null &&
                          document.querySelector('[data-testid="conversation-panel-wrapper"]') !== null;
          return isLoaded;
        }
      });
      
      return result && result[0] && result[0].result === true;
    } catch (error) {
      console.log('Error checking WhatsApp Web readiness:', error);
      return false;
    }
  }

  // Show connection status to user
  static showConnectionStatus(status, message) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status ${status}`;
      statusEl.classList.remove('hidden');
      
      // Auto-hide after 3 seconds for info messages
      if (status === 'info') {
        setTimeout(() => {
          statusEl.classList.add('hidden');
        }, 3000);
      }
    }
  }

  // Send message with retry mechanism for content script communication
  static async sendMessageWithRetry(tabId, message, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await chrome.tabs.sendMessage(tabId, message);
        return response;
      } catch (error) {
        if (error.message.includes('Could not establish connection') && attempt < maxRetries) {
          console.log(`Attempt ${attempt} failed, retrying in ${attempt * 500}ms...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 500));
          continue;
        }
        throw error;
      }
    }
  }

  // Check content script health and provide status
  static async checkContentScriptHealth(tabId) {
    try {
      const isReady = await this.isContentScriptReady(tabId);
      if (isReady) {
        return { status: 'healthy', message: 'Content script is ready' };
      } else {
        return { status: 'unhealthy', message: 'Content script not responding' };
      }
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }

  // Check monitoring status
  static async checkMonitoringStatus(tabId) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'getMonitoringStatus' });
      return response && response.isMonitoring;
    } catch (error) {
      console.log('Could not check monitoring status:', error.message);
      return false;
    }
  }

  // Force refresh content script when it's not responding
  static async forceRefreshContentScript(tabId) {
    try {
      console.log('Force refreshing content script...');
      
      // Send message to background to refresh content script
      const response = await chrome.runtime.sendMessage({ 
        action: 'refreshContentScript' 
      });
      
      if (response && response.success) {
        console.log('Content script refresh initiated');
        
        // Wait a bit for the refresh to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // First verify the injection
        const isInjected = await this.verifyContentScriptInjection(tabId);
        if (!isInjected) {
          console.log('Content script injection verification failed');
          return false;
        }
        
        // Then check if it's responding
        const isReady = await this.waitForContentScript(tabId, 3000);
        return isReady;
      } else {
        console.log('Failed to refresh content script');
        return false;
      }
    } catch (error) {
      console.error('Error refreshing content script:', error);
      return false;
    }
  }

  // Verify content script injection by checking for global variables
  static async verifyContentScriptInjection(tabId) {
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          // Check if our content script global variables exist
          return {
            hasNaxScript: typeof window.naxScriptLoaded !== 'undefined',
            hasNaxInitialized: typeof window.naxInitialized !== 'undefined',
            hasMessageExtractor: typeof window.WhatsAppMessageExtractor !== 'undefined',
            hasMessageListener: typeof window.naxMessageListenerActive !== 'undefined' && window.naxMessageListenerActive === true,
            documentReady: document.readyState
          };
        }
      });
      
      if (result && result[0] && result[0].result) {
        const status = result[0].result;
        console.log('Content script injection status:', status);
        return status.hasNaxScript && status.hasMessageExtractor && status.hasMessageListener;
      }
      
      return false;
    } catch (error) {
      console.log('Error verifying content script injection:', error);
      return false;
    }
  }

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

  // Show loading indicator
  static showLoading() {
    try {
      const loadingElement = document.getElementById('loading-indicator');
      if (loadingElement) {
        loadingElement.style.display = 'block';
      }
      
      // Also show loading in status
      this.showStatus('Processing...', 'info');
    } catch (error) {
      console.error('Error showing loading:', error);
    }
  }

  // Hide loading indicator
  static hideLoading() {
    try {
      const loadingElement = document.getElementById('loading-indicator');
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
    } catch (error) {
      console.error('Error hiding loading:', error);
    }
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

  // Update stats display
  static updateStats(stats) {
    try {
      // Map incoming stats to actual DOM ids used in popup.html
      const total = stats.total ?? stats.totalMessages ?? 0;
      const p3 = stats.p3 ?? stats.highPriority ?? 0;
      const p2 = stats.p2 ?? stats.mediumPriority ?? 0;
      const chats = stats.chats ?? stats.chatCount ?? 0;

      const totalEl = document.getElementById('total-messages');
      if (totalEl) totalEl.textContent = String(total);

      const p3El = document.getElementById('p3-messages');
      if (p3El) p3El.textContent = String(p3);

      const p2El = document.getElementById('p2-messages');
      if (p2El) p2El.textContent = String(p2);

      const chatsEl = document.getElementById('total-chats');
      if (chatsEl) chatsEl.textContent = String(chats);

      console.log('Stats updated:', stats);
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  // Render messages in the UI
  static renderMessages(messages) {
    try {
      const messagesList = document.getElementById('messages-list');
      if (!messagesList) {
        console.warn('Messages list element not found');
        return;
      }
      
      // Debug: Log the messages being rendered
      console.log('=== RENDERING MESSAGES ===');
      console.log('Messages to render:', messages);
      if (messages && messages.length > 0) {
        console.log('First message structure:', messages[0]);
        console.log('Available properties:', Object.keys(messages[0]));
      }
      
      // Clear existing messages
      messagesList.innerHTML = '';
      
      if (!messages || messages.length === 0) {
        messagesList.innerHTML = `
          <div class="empty-state" id="empty-state">
            <div class="empty-state-icon">&#128237;</div>
            <div>No important messages found</div>
            <div style="font-size: 10px; margin-top: 8px; opacity: 0.6;">
              Navigate to WhatsApp Web and start chatting to see important messages here
            </div>
          </div>
        `;
        return;
      }
      
      // Render each message
      messages.forEach((message, index) => {
        // Debug: Log each message being processed
        console.log(`Processing message ${index}:`, message);
        
        const messageElement = document.createElement('div');
        messageElement.className = `message-card priority-${message.priority || 'P1'}`;
        
        // Determine priority color
        const priorityColor = message.priority === 'P3' ? '#f44336' : 
                             message.priority === 'P2' ? '#ff9800' : '#4caf50';
        
        messageElement.innerHTML = `
          <div class="message-header">
            <div class="priority-badge ${message.priority || 'P1'}">${message.priority || 'P1'}</div>
            <div class="score">Score: ${message.score || '0.0'}</div>
          </div>
          <div class="chat-info">${message.chatTitle || 'Unknown Chat'}</div>
          <div class="message-text">${this.escapeHtml(message.text || '')}</div>
          <div class="message-meta">
            <span>${this.formatTime(message.timestamp || message.ts)}</span>
            <span>${message.sender || 'Unknown'}</span>
          </div>
        `;
        
        messagesList.appendChild(messageElement);
      });
      
      console.log(`Rendered ${messages.length} messages`);
      
      // Update chat filter after rendering
      this.populateChatFilter(messages);
      
    } catch (error) {
      console.error('Error rendering messages:', error);
    }
  }

  // Populate chat filter dropdown
  static populateChatFilter(messages) {
    try {
      const chatFilter = document.getElementById('chat-filter');
      if (!chatFilter) {
        console.warn('Chat filter element not found');
        return;
      }
      
      // Clear existing options
      chatFilter.innerHTML = '<option value="">All Chats</option>';
      
      if (!messages || messages.length === 0) {
        return;
      }
      
      // Get unique chat titles
      const chatTitles = [...new Set(messages.map(m => m.chatTitle).filter(Boolean))];
      
      // Add options for each chat
      chatTitles.forEach(title => {
        const option = document.createElement('option');
        option.value = title;
        option.textContent = title;
        chatFilter.appendChild(option);
      });
      
      console.log(`Populated chat filter with ${chatTitles.length} chats`);
    } catch (error) {
      console.error('Error populating chat filter:', error);
    }
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

  // Update chat info display
  static updateChatInfo(chatInfo) {
    try {
      if (chatInfo && chatInfo.title) {
        // Update chat title in the UI
        const chatTitleElement = document.getElementById('chat-title');
        if (chatTitleElement) {
          chatTitleElement.textContent = chatInfo.title;
          chatTitleElement.title = `Chat: ${chatInfo.title}`;
        }
        
        // Update chat info in the status
        this.showStatus(`Current chat: ${chatInfo.title}`, 'success');
        
        console.log('Chat info updated:', chatInfo);
      }
    } catch (error) {
      console.error('Error updating chat info:', error);
    }
  }

  // Render important messages
  static renderImportantMessages(importantMessages) {
    try {
      console.log('Rendering important messages:', importantMessages);
      
      if (!importantMessages || importantMessages.length === 0) {
        this.showStatus('No important messages found', 'info');
        
        // Clear the messages list
        const listElement = document.getElementById('messages-list');
        if (listElement) {
          listElement.innerHTML = '<div class="empty-state">No important messages found</div>';
        }
        
        // Update the important messages count
        const countElement = document.getElementById('important-count');
        if (countElement) {
          countElement.textContent = '0';
        }
        
        return;
      }
      
      // Update the important messages count
      const countElement = document.getElementById('important-count');
      if (countElement) {
        countElement.textContent = importantMessages.length;
      }
      
      // Update the messages list
      const listElement = document.getElementById('messages-list');
      if (listElement) {
        listElement.innerHTML = '';
        
        importantMessages.slice(0, 20).forEach((msg, index) => {
          const msgElement = document.createElement('div');
          msgElement.className = `message-card priority-${msg.priority || 'P1'}`;
          
          const priorityText = msg.priority || 'P1';
          const priorityClass = priorityText === 'P3' ? 'P3' : (priorityText === 'P2' ? 'P2' : 'P1');
          
          msgElement.innerHTML = `
            <div class="message-header">
              <div class="chat-info">${msg.chatTitle || 'Unknown Chat'}</div>
              <span class="priority-badge ${priorityClass}">${priorityText}</span>
            </div>
            <div class="message-text">${this.escapeHtml(msg.text)}</div>
            <div class="message-meta">
              <span class="score">Score: ${msg.score || 0}</span>
              <span class="time">${this.formatTime(msg.storedAt)}</span>
            </div>
          `;
          
          listElement.appendChild(msgElement);
        });
        
        // Add "show more" if there are more messages
        if (importantMessages.length > 20) {
          const showMoreElement = document.createElement('div');
          showMoreElement.className = 'message-card';
          showMoreElement.innerHTML = `
            <div class="message-text" style="text-align: center; opacity: 0.7;">
              ... and ${importantMessages.length - 20} more messages
            </div>
          `;
          listElement.appendChild(showMoreElement);
        }
      }
      
      this.showStatus(`Displaying ${importantMessages.length} important messages`, 'success');
      
    } catch (error) {
      console.error('Error rendering important messages:', error);
      this.showStatus(`Error rendering messages: ${error.message}`, 'error');
    }
  }

  // Display all important messages
  static async displayAllImportantMessages() {
    try {
      console.log('Displaying all important messages...');
      
      // Get all important messages from background
      const response = await chrome.runtime.sendMessage({ 
        action: 'getImportantMessages',
        options: { limit: 100 } // Get up to 100 messages
      });
      
      console.log('All important messages response:', response);
      
      if (!response || !response.success) {
        console.error('Failed to get all important messages:', response?.error);
        UIManager.showStatus('Failed to get important messages', 'error');
        return;
      }
      
      if (response.messages && response.messages.length > 0) {
        this.importantMessages = response.messages;
        
        // Update the UI
        UIManager.renderMessages(this.importantMessages);
        
        // Update stats
        const stats = {
          total: response.total || response.messages.length,
          filtered: response.filtered || response.messages.length
        };
        
        UIManager.updateStats(stats);
        
        console.log(`Displaying ${this.importantMessages.length} important messages`);
        UIManager.showStatus(`Displaying ${this.importantMessages.length} important messages`, 'success');
      } else {
        console.log('No important messages found');
        UIManager.showStatus('No important messages found', 'info');
        
        // Clear the display if no messages
        UIManager.renderMessages([]);
      }
      
    } catch (error) {
      console.error('Error displaying all important messages:', error);
      UIManager.showStatus(`Error displaying important messages: ${error.message}`, 'error');
    }
  }

  // Show output text
  static showOutput(text) {
    try {
      const outputElement = document.getElementById('output-area');
      if (outputElement) {
        outputElement.textContent = text;
        outputElement.style.display = 'block';
        
        // Scroll to output
        outputElement.scrollIntoView({ behavior: 'smooth' });
      }
      
      console.log('Output displayed:', text.substring(0, 100) + '...');
    } catch (error) {
      console.error('Error showing output:', error);
    }
  }

  // Hide output
  static hideOutput() {
    try {
      const outputElement = document.getElementById('output-area');
      if (outputElement) {
        outputElement.style.display = 'none';
      }
    } catch (error) {
      console.error('Error hiding output:', error);
    }
  }



  // Show message when no chat is active
  static showNoChatMessage(message) {
    try {
      const messagesList = document.getElementById('messages-list');
      if (messagesList) {
        messagesList.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <div style="font-size: 14px; margin-bottom: 8px;">No Active Chat</div>
            <div style="font-size: 11px; opacity: 0.7; text-align: center; line-height: 1.4;">
              ${message}<br>
              <br>
              <strong>To get started:</strong><br>
              1. Navigate to any WhatsApp conversation<br>
              2. Wait for the chat to load completely<br>
              3. Click "🔄 Refresh Messages" button
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error showing no chat message:', error);
    }
  }
  
  // Show message when in a chat but no messages
  static showEmptyChatMessage(chatTitle) {
    try {
      const messagesList = document.getElementById('messages-list');
      if (messagesList) {
        messagesList.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📱</div>
            <div style="font-size: 14px; margin-bottom: 8px;">Chat: ${chatTitle}</div>
            <div style="font-size: 11px; opacity: 0.7; text-align: center; line-height: 1.4;">
              No messages found in this conversation.<br>
              <br>
              <strong>This might be:</strong><br>
              • A new conversation with no messages yet<br>
              • A chat that's still loading<br>
              • A conversation with only media/voice messages<br>
              <br>
              Try sending a message or wait for the chat to load completely.
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error showing empty chat message:', error);
    }
  }
  
  // Show error message in the UI
  static showErrorMessage(message) {
    try {
      const messagesList = document.getElementById('messages-list');
      if (messagesList) {
        messagesList.innerHTML = `
          <div class="empty-state" style="border-left: 4px solid #dc3545;">
            <div class="empty-state-icon" style="color: #dc3545;">⚠️</div>
            <div style="font-size: 14px; margin-bottom: 8px; color: #dc3545;">Error</div>
            <div style="font-size: 11px; opacity: 0.8; text-align: center; line-height: 1.4;">
              ${message}<br>
              <br>
              <strong>Troubleshooting:</strong><br>
              • Refresh the WhatsApp Web page<br>
              • Make sure you're in an active conversation<br>
              • Check if the extension is properly loaded<br>
              • Try the "🔄 Refresh Messages" button
            </div>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error showing error message:', error);
    }
  }
}

// Message processing
class MessageProcessor {
  static isProcessing = false;
  static lastProcessedChat = null;
  static processingTimeout = null;
  static messages = [];
  static importantMessages = [];

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
    // Prevent multiple simultaneous processing
    if (this.isProcessing) {
      console.log('Already processing chat, skipping...');
      return;
    }

    try {
      this.isProcessing = true;
      UIManager.showStatus('Processing current chat...', 'info');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        throw new Error('Please navigate to WhatsApp Web first');
      }

      console.log('Processing current chat...');

      // Get the chat messages and chat info in one call
      const chatResponse = await chrome.tabs.sendMessage(tab.id, { action: "getChats" });
      
      console.log('Chat response:', chatResponse);
      
      if (!chatResponse.success || !chatResponse.chats || chatResponse.chats.length === 0) {
        throw new Error('No messages found in current chat');
      }

      console.log(`Found ${chatResponse.chats.length} messages in current chat`);

      // Get chat title from chat info or use a default
      const chatTitle = chatResponse.chatInfo?.title || 'Current Chat';
      const chatId = chatResponse.chatInfo?.id || 'current_chat';
      
      console.log('Using chat info:', { title: chatTitle, id: chatId });

      // Check if we've already processed this chat recently
      const chatKey = `${chatId}_${chatResponse.chats.length}`;
      if (this.lastProcessedChat === chatKey) {
        console.log('Chat already processed recently, skipping...');
        UIManager.showStatus('Chat already processed recently', 'info');
        return;
      }

      // Convert the simple text messages to the format expected by ML service
      const messages = chatResponse.chats.map((text, index) => ({
        id: `msg_${index}_${Date.now()}`,
        chat_id: chatId,
        chatTitle: chatTitle,
        chatId: chatId,
        sender: 'user',
        text: text,
        ts: Date.now(),
        isGroup: chatResponse.chatInfo?.isGroup || false
      }));

      console.log('Prepared messages for ML:', messages);

      // Send to background for ML processing
      const mlResponse = await chrome.runtime.sendMessage({
        action: 'processMessagesForPriority',
        messages: messages
      });

      console.log('ML response:', mlResponse);

      if (mlResponse.success) {
        this.lastProcessedChat = chatKey;
        UIManager.showStatus(`Processed ${mlResponse.totalProcessed} messages from ${chatTitle}`, 'success');
        
        // Wait a bit for background processing to complete
        setTimeout(async () => {
          await MessageProcessor.refreshImportantMessages();
        }, 1000);
      } else {
        throw new Error(mlResponse.error || 'Failed to process messages');
      }

    } catch (error) {
      console.error('Error processing chat:', error);
      UIManager.showStatus('Error: ' + error.message, 'error');
      
      // Clear processing state on error
      MessageProcessor.clearProcessingState();
    } finally {
      this.isProcessing = false;
    }
  }

  // Refresh messages and update chat info
  static async refreshMessages() {
    try {
      console.log('=== REFRESHING MESSAGES ===');
      
      UIManager.showStatus('Refreshing messages...', 'info');
      
      // Get fresh chat data
      const chatData = await AIProcessor.getChatData();
      
      console.log('Fresh chat data received:', chatData);
      
      // Check if we have valid data
      if (!chatData) {
        throw new Error('No chat data received');
      }
      
      // Handle case where we're not in a chat
      if (!chatData.success && chatData.warning) {
        UIManager.showStatus(chatData.warning, 'warning');
        // Show helpful message in the UI
        UIManager.showNoChatMessage(chatData.warning);
        return;
      }
      
      // Handle case where we're in a chat but no messages yet
      if (chatData.warning && chatData.warning.includes('No messages found in current chat')) {
        UIManager.showStatus(chatData.warning, 'info');
        // Show chat info but no messages
        if (chatData.chatInfo && chatData.chatInfo.title) {
          UIManager.updateChatInfo(chatData.chatInfo);
          UIManager.showEmptyChatMessage(chatData.chatInfo.title);
        }
        return;
      }
      
      // Check if we have messages
      if (!chatData.messages || chatData.messages.length === 0) {
        UIManager.showStatus('No messages found to refresh', 'warning');
        return;
      }
      
      console.log(`Refreshing ${chatData.messages.length} messages`);
      
      // Clear old messages
      MessageProcessor.clearMessages();
      
      // Add new messages (use provided messageId to avoid duplicates)
      const seen = new Set();
      chatData.messages.forEach((message, index) => {
        const id = message.messageId || message.id || `msg_${index}`;
        if (!seen.has(id)) {
          seen.add(id);
          MessageProcessor.addMessage({ ...message, id }, index);
        }
      });

      // Immediately render raw messages in the UI
      UIManager.renderMessages(MessageProcessor.messages);
      // Populate chat filter options
      UIManager.populateChatFilter(MessageProcessor.messages);
      
      // Update chat info display
      if (chatData.chatInfo && chatData.chatInfo.title) {
        UIManager.updateChatInfo(chatData.chatInfo);
      }
      
      // Compute simple stats for header
      const rawStats = {
        total: chatData.messages.length,
        p3: 0,
        p2: 0,
        chats: 1
      };
      UIManager.updateStats(rawStats);
      UIManager.showStatus(`Refreshed ${chatData.messages.length} messages`, 'success');
      
      // Only refresh important messages if we don't have current chat context
      // This prevents overwriting current chat messages with stored "unknown" chat messages
      if (!chatData.messages || chatData.messages.length === 0) {
        setTimeout(() => {
          MessageProcessor.refreshImportantMessages();
        }, 500);
      } else {
        console.log('Keeping current chat messages visible - not refreshing important messages');
      }
      
    } catch (error) {
      console.error('Error refreshing messages:', error);
      
      // Handle connection errors specifically
      if (error.message.includes('Could not establish connection') || 
          error.message.includes('Content script not responding')) {
        
        UIManager.showStatus('Content script not ready. Please wait a moment and try again.', 'warning');
        
        // Show helpful message in the UI with refresh button
        UIManager.showErrorMessage(`
          Content script connection failed. This usually means:
          • The WhatsApp Web page is still loading
          • The extension needs a moment to initialize
          • The page needs to be refreshed
          
          <button id="fix-connection" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; margin-top: 10px; cursor: pointer;">
            🔧 Fix Connection
          </button>
        `);
        
        // Add event listener to the fix connection button
        setTimeout(() => {
          const fixButton = document.getElementById('fix-connection');
          if (fixButton) {
            fixButton.addEventListener('click', async () => {
              try {
                UIManager.showStatus('Fixing connection...', 'info');
                
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.url.includes('web.whatsapp.com')) {
                  const isFixed = await UIManager.forceRefreshContentScript(tab.id);
                  if (isFixed) {
                    UIManager.showStatus('Connection fixed! Refreshing messages...', 'success');
                    setTimeout(() => {
                      MessageProcessor.refreshMessages();
                    }, 1000);
                  } else {
                    UIManager.showStatus('Connection fix failed. Please refresh the page manually.', 'error');
                  }
                }
              } catch (error) {
                UIManager.showStatus('Error fixing connection: ' + error.message, 'error');
              }
            });
          }
        }, 100);
        
        return;
      }
      
      UIManager.showStatus(`Refresh failed: ${error.message}`, 'error');
      
      // Show helpful error message in the UI
      if (error.message.includes('No active chat found') || error.message.includes('Please open a WhatsApp conversation')) {
        UIManager.showNoChatMessage('Please open a WhatsApp conversation to see messages');
      } else {
        UIManager.showErrorMessage(`Error: ${error.message}`);
      }
    }
  }

  // Clear all messages
  static clearMessages() {
    try {
      this.messages = [];
      this.importantMessages = [];
      console.log('Messages cleared');
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
  }

  // Add a message to the list
  static addMessage(message, index) {
    try {
      if (message && message.text) {
        this.messages.push({
          ...message,
          index: index,
          id: message.id || `msg_${index}_${Date.now()}`
        });
      }
    } catch (error) {
      console.error('Error adding message:', error);
    }
  }

  // Refresh important messages display
  static async refreshImportantMessages() {
    try {
      console.log('Refreshing important messages display...');
      
      // Get fresh important messages from background
      const response = await chrome.runtime.sendMessage({ action: 'getImportantMessages' });
      
      console.log('Important messages response:', response);
      
      if (!response) {
        console.warn('No response from background service');
        return;
      }
      
      if (!response.success) {
        console.error('Failed to get important messages:', response.error);
        UIManager.showStatus(`Failed to get important messages: ${response.error}`, 'error');
        return;
      }
      
      if (response.messages && response.messages.length > 0) {
        this.importantMessages = response.messages;
        
        // IMPORTANT: Only show important messages if we don't have current chat context
        // If we have current chat messages, keep showing those instead
        if (this.messages && this.messages.length > 0) {
          console.log('Keeping current chat messages visible instead of overwriting with stored messages');
          UIManager.showStatus(`Showing current chat (${this.messages.length} messages)`, 'info');
          return;
        }
        
        // Update the UI to show new important messages
        UIManager.renderMessages(this.importantMessages);
        
        console.log(`Refreshed ${this.importantMessages.length} important messages`);
        UIManager.showStatus(`Found ${this.importantMessages.length} important messages`, 'success');
      } else {
        console.log('No important messages found');
        UIManager.showStatus('No important messages found', 'info');
        
        // Clear the display if no messages
        UIManager.renderMessages([]);
      }
      
    } catch (error) {
      console.error('Error refreshing important messages:', error);
      UIManager.showStatus(`Error refreshing important messages: ${error.message}`, 'error');
    }
  }

  // Display all important messages
  static async displayAllImportantMessages() {
    try {
      console.log('Displaying all important messages...');
      
      // Get all important messages from background
      const response = await chrome.runtime.sendMessage({ 
        action: 'getImportantMessages',
        options: { limit: 100 } // Get up to 100 messages
      });
      
      console.log('All important messages response:', response);
      
      if (!response || !response.success) {
        console.error('Failed to get all important messages:', response?.error);
        UIManager.showStatus('Failed to get important messages', 'error');
        return;
      }
      
      if (response.messages && response.messages.length > 0) {
        this.importantMessages = response.messages;
        
        // Update the UI
        UIManager.renderMessages(this.importantMessages);
        
        // Update stats
        const stats = {
          total: response.total || response.messages.length,
          filtered: response.filtered || response.messages.length
        };
        
        UIManager.updateStats(stats);
        
        console.log(`Displaying ${this.importantMessages.length} important messages`);
        UIManager.showStatus(`Displaying ${this.importantMessages.length} important messages`, 'success');
      } else {
        console.log('No important messages found');
        UIManager.showStatus('No important messages found', 'info');
        
        // Clear the display if no messages
        UIManager.renderMessages([]);
      }
      
    } catch (error) {
      console.error('Error displaying all important messages:', error);
      UIManager.showStatus(`Error displaying important messages: ${error.message}`, 'error');
    }
  }

  static clearProcessingState() {
    this.isProcessing = false;
    this.lastProcessedChat = null;
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
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
      console.log('=== PROCESSING WITH ML SERVICE ===');
      console.log('Text length:', text.length);
      console.log('Prompt type:', prompt);
      console.log('ML Service URL:', mlServiceUrl);
      
      // Split text into chunks if too long
      const maxLength = 1000;
      const textChunks = this.splitTextIntoChunks(text, maxLength);
      console.log(`Split text into ${textChunks.length} chunks`);
      
      const messages = textChunks.map((chunk, index) => ({
        id: `chunk_${index}`,
        chat_id: 'current_chat',
        sender: 'user',
        text: chunk,
        ts: Date.now()
      }));

      console.log('Prepared messages for ML service:', messages);

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

      console.log('ML service response status:', response.status);
      console.log('ML service response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ML service error response:', errorText);
        throw new Error(`ML Service Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('ML service response data:', data);
      
      // Generate response based on the prompt type
      if (prompt.includes('summary')) {
        return this.generateSummaryResponse(data, text);
      } else if (prompt.includes('sentiment')) {
        return this.generateSentimentResponse(data, text);
      } else {
        return this.generateAnalysisResponse(data, text);
      }
    } catch (error) {
      console.error('ML processing error:', error);
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
    
    if (summaries && summaries.length > 0) {
      response += '📝 **Key Points:**\n';
      summaries.forEach(summary => {
        if (summary.bullets && Array.isArray(summary.bullets)) {
          summary.bullets.forEach(bullet => {
            response += `• ${bullet}\n`;
          });
        }
      });
    }
    
    // If no summaries from ML service, create basic summary from important messages
    if (!summaries || summaries.length === 0) {
      response += '📝 **Key Points:**\n';
      if (importantMessages.length > 0) {
        importantMessages.slice(0, 3).forEach(msg => {
          response += `• ${msg.text.substring(0, 80)}${msg.text.length > 80 ? '...' : ''}\n`;
        });
      } else {
        response += '• No specific key points identified\n';
      }
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
    } else {
      response += '🎯 **Key Emotional Indicators:**\n';
      response += '• No specific emotional indicators identified\n';
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
      console.log('=== GETTING CHAT DATA ===');
      
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        throw new Error('Please navigate to WhatsApp Web first');
      }

      console.log('Tab found:', tab.url);

      // First check if WhatsApp Web is fully loaded
      UIManager.showConnectionStatus('info', 'Checking WhatsApp Web status...');
      const isWhatsAppReady = await UIManager.isWhatsAppWebReady(tab.id);
      if (!isWhatsAppReady) {
        console.log('WhatsApp Web not fully loaded, waiting...');
        UIManager.showConnectionStatus('info', 'WhatsApp Web still loading, please wait...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Wait for content script to be ready with timeout
      UIManager.showConnectionStatus('info', 'Establishing connection with WhatsApp...');
      let isReady = await UIManager.waitForContentScript(tab.id, 5000);
      if (!isReady) {
        console.log('Content script not ready, attempting force refresh...');
        UIManager.showConnectionStatus('warning', 'Connection failed, attempting to fix...');
        
        // Try to force refresh the content script
        isReady = await UIManager.forceRefreshContentScript(tab.id);
        
        if (!isReady) {
          // Try one more verification to see what's wrong
          const injectionStatus = await UIManager.verifyContentScriptInjection(tab.id);
          console.log('Final injection verification:', injectionStatus);
          
          if (!injectionStatus) {
            throw new Error('Content script injection failed. Please refresh the WhatsApp Web page and try again.');
          } else {
            throw new Error('Content script injected but not responding. Please refresh the WhatsApp Web page manually.');
          }
        }
      }
      
      UIManager.showConnectionStatus('success', 'Connection established successfully!');

      const response = await UIManager.sendMessageWithRetry(tab.id, { action: "getChats" });
      console.log('Chat response from content script:', response);
      
      if (!response) {
        throw new Error('No response from WhatsApp page');
      }
      
      // Handle case where we're not in a chat
      if (!response.success && response.error) {
        if (response.error.includes('No active chat found')) {
          return {
            success: false,
            error: 'Please open a WhatsApp conversation first. Navigate to any chat to see messages.',
            messages: [],
            chatInfo: response.chatInfo || {},
            messageCount: 0,
            warning: 'No active chat detected'
          };
        }
        throw new Error(response.error);
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get response from WhatsApp page');
      }
      
      // Handle case where we're in a chat but no messages yet
      if (response.warning && response.warning.includes('No messages found in current chat')) {
        return {
          success: true,
          messages: [],
          chatInfo: response.chatInfo || {},
          messageCount: 0,
          warning: response.warning,
          chatTitle: response.chatInfo?.title || 'Current Chat'
        };
      }
      
      if (!response.chats || response.chats.length === 0) {
        // Check if we have chat info but no messages
        if (response.chatInfo && response.chatInfo.title && response.chatInfo.title !== 'Unknown Chat') {
          return {
            success: true,
            messages: [],
            chatInfo: response.chatInfo,
            messageCount: 0,
            warning: 'No messages found in current chat. This might be a new conversation.',
            chatTitle: response.chatInfo.title
          };
        }
        throw new Error('No chat messages found. Make sure you\'re in a conversation.');
      }

      // Get chat info
      const chatInfo = response.chatInfo || {};
      console.log('Chat info:', chatInfo);

      // Normalize and deduplicate messages (supports object or string formats)
      const seenIds = new Set();
      const seenTexts = new Set();
      const nowTs = Date.now();
      const source = Array.isArray(response.chats) ? response.chats : [];

      const validMessages = source
        .map((item, index) => {
          if (item && typeof item === 'object') {
            const id = item.messageId || item.id || `msg_${index}`;
            const text = (item.text || '').trim();
            if (!text) return null;
            return {
              id,
              messageId: id,
              text,
              index,
              timestamp: item.timestamp || item.ts || nowTs,
              chatId: item.chatId || item.chat_id || chatInfo.id || 'unknown',
              chatTitle: item.chatTitle || chatInfo.title || 'Unknown Chat',
              isGroup: item.isGroup || chatInfo.isGroup || false,
              type: item.type || 'text'
            };
          } else if (typeof item === 'string') {
            const text = item.trim();
            if (!text) return null;
            return {
              id: `msg_${index}_${nowTs}`,
              messageId: `msg_${index}_${nowTs}`,
              text,
              index,
              timestamp: nowTs,
              chatId: chatInfo.id || 'unknown',
              chatTitle: chatInfo.title || 'Unknown Chat',
              isGroup: chatInfo.isGroup || false,
              type: 'text'
            };
          }
          return null;
        })
        .filter(Boolean)
        .filter(msg => {
          // Deduplicate by messageId first, then by text
          if (msg.messageId && !seenIds.has(msg.messageId)) {
            seenIds.add(msg.messageId);
            return true;
          }
          const key = msg.text.toLowerCase();
          if (!seenTexts.has(key)) {
            seenTexts.add(key);
            return true;
          }
          return false;
        });

      console.log(`Filtered ${validMessages.length} valid messages from ${response.chats.length} total`);

      return {
        success: true,
        messages: validMessages,
        chatInfo: chatInfo,
        messageCount: validMessages.length,
        stats: response.stats || {},
        formatted: response.formatted || ''
      };

    } catch (error) {
      console.error('Error getting chat data:', error);
      return {
        success: false,
        error: error.message,
        messages: [],
        chatInfo: {},
        messageCount: 0
      };
    }
  }
}

// Main application logic
class WhatsAppAIHelper {
  constructor() {
    this.initializeEventListeners();
    this.loadSavedConfig();
    
    // Clear any previous processing state
    MessageProcessor.clearProcessingState();
    
    // Wait for DOM to be ready, then refresh messages with a small delay
    UIManager.waitForDOM().then(() => {
      if (UIManager.isDOMReady()) {
        // Add a small delay to ensure content script is ready
        setTimeout(async () => {
          try {
            // Check content script health before proceeding
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url.includes('web.whatsapp.com')) {
              const health = await UIManager.checkContentScriptHealth(tab.id);
              if (health.status === 'healthy') {
        MessageProcessor.refreshMessages();
              } else {
                console.log('Content script not ready, will retry on user action');
                UIManager.showStatus('Content script initializing... Please wait a moment.', 'info');
              }
            } else {
              MessageProcessor.refreshMessages();
            }
          } catch (error) {
            console.log('Error checking content script health:', error);
            MessageProcessor.refreshMessages();
          }
        }, 1000); // Increased delay to 1 second
      }
    });
    
    // Handle popup focus events to prevent duplicate processing
    this.handlePopupFocus();
  }

  handlePopupFocus() {
    // Clear processing state when popup gains focus
    window.addEventListener('focus', () => {
      MessageProcessor.clearProcessingState();
    });
    
    // Also clear when popup is shown
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        MessageProcessor.clearProcessingState();
      }
    });
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
    
    // Message management events
    document.getElementById('refresh-messages').addEventListener('click', () => MessageProcessor.refreshMessages());
    
    document.getElementById('startMonitoring').addEventListener('click', () => this.startMonitoring());
    document.getElementById('stopMonitoring').addEventListener('click', () => this.stopMonitoring());
    document.getElementById('testConnection').addEventListener('click', () => this.testConnection());
    document.getElementById('fetchAllChats').addEventListener('click', () => this.fetchAllChats());
    document.getElementById('showAvailableChats').addEventListener('click', () => this.showAvailableChats());
    document.getElementById('autoFetchAll').addEventListener('click', () => this.autoFetchAllChatsAndMessages());
    document.getElementById('forceRefreshPage').addEventListener('click', () => this.forceRefreshPage());
    
    // Filter events
    document.getElementById('priority-filter').addEventListener('change', MessageProcessor.filterMessages);
    document.getElementById('chat-filter').addEventListener('change', MessageProcessor.filterMessages);
    document.getElementById('search-input').addEventListener('input', MessageProcessor.filterMessages);
    
    // Load saved ML service URL on input focus
    document.getElementById('mlServiceUrl').addEventListener('focus', () => this.loadSavedConfig());

    // Remove duplicate/incorrect refresh binding (handled above)


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
      console.log('=== STARTING MONITORING ===');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        UIManager.showStatus('Please navigate to WhatsApp Web first', 'error');
        return;
      }

      // First check if content script is ready
      UIManager.showStatus('Checking content script connection...', 'info');
      const isReady = await UIManager.waitForContentScript(tab.id, 10000);
      
      if (!isReady) {
        UIManager.showStatus('Content script not ready. Please wait a moment and try again.', 'warning');
        
        // Show helpful guidance
        UIManager.showErrorMessage(`
          Content script connection failed. This usually means:
          • The WhatsApp Web page is still loading
          • The extension needs a moment to initialize
          • The page needs to be refreshed
          
          <button id="retry-monitoring" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; margin-top: 10px; cursor: pointer;">
            🔄 Retry Monitoring
          </button>
        `);
        
        // Add retry button event listener
        setTimeout(() => {
          const retryButton = document.getElementById('retry-monitoring');
          if (retryButton) {
            retryButton.addEventListener('click', () => {
              this.startMonitoring();
            });
          }
        }, 100);
        
        return;
      }

      // Check if monitoring is already running
      try {
        const statusResponse = await chrome.tabs.sendMessage(tab.id, { action: "getMonitoringStatus" });
        if (statusResponse && statusResponse.isMonitoring) {
          UIManager.showStatus('Monitoring is already running!', 'info');
          return;
        }
      } catch (error) {
        console.log('Could not check monitoring status, proceeding...');
      }

      UIManager.showStatus('Starting monitoring...', 'info');
      const response = await chrome.tabs.sendMessage(tab.id, { action: "startMonitoring" });
      
      if (response && response.success) {
        UIManager.showStatus('Monitoring started successfully!', 'success');
        console.log('Monitoring started:', response);
      } else {
        UIManager.showStatus('Failed to start monitoring: ' + (response?.error || 'Unknown error'), 'error');
        console.error('Failed to start monitoring:', response);
      }
    } catch (error) {
      console.error('Error starting monitoring:', error);
      UIManager.showStatus('Error starting monitoring: ' + error.message, 'error');
    }
  }

  async stopMonitoring() {
    try {
      console.log('=== STOPPING MONITORING ===');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        UIManager.showStatus('Please navigate to WhatsApp Web first', 'error');
        return;
      }

      // Check if content script is ready
      const isReady = await UIManager.isContentScriptReady(tab.id);
      if (!isReady) {
        UIManager.showStatus('Content script not responding. Monitoring may already be stopped.', 'warning');
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: "stopMonitoring" });
      
      if (response && response.success) {
        UIManager.showStatus('Monitoring stopped successfully!', 'success');
        console.log('Monitoring stopped:', response);
      } else {
        UIManager.showStatus('Failed to stop monitoring: ' + (response?.error || 'Unknown error'), 'error');
        console.error('Failed to stop monitoring:', response);
      }
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      UIManager.showStatus('Error stopping monitoring: ' + error.message, 'error');
    }
  }

    async testConnection() {
    try {
      console.log('=== TESTING CONNECTION ===');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        UIManager.showStatus('Please navigate to WhatsApp Web first', 'error');
        return;
      }

      UIManager.showStatus('Testing connection to content script...', 'info');
      
      // Test basic ping
      const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: "ping" });
      if (pingResponse && pingResponse.success) {
        UIManager.showStatus('✅ Ping successful! Content script is responding.', 'success');
        console.log('Ping response:', pingResponse);
        
        // Test custom test action
        const testResponse = await chrome.tabs.sendMessage(tab.id, { action: "test" });
        if (testResponse && testResponse.success) {
          UIManager.showStatus('✅ Test action successful! Content script is fully functional.', 'success');
          console.log('Test response:', testResponse);
        } else {
          UIManager.showStatus('⚠️ Ping works but test action failed. Content script may have issues.', 'warning');
        }
      } else {
        UIManager.showStatus('❌ Ping failed. Content script is not responding.', 'error');
        console.error('Ping failed:', pingResponse);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      UIManager.showStatus('❌ Connection test failed: ' + error.message, 'error');
    }
  }

  async fetchAllChats() {
    try {
      console.log('=== FETCHING ALL CHATS ===');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        UIManager.showStatus('Please navigate to WhatsApp Web first', 'error');
        return;
      }

      UIManager.showStatus('Fetching messages from all chats...', 'info');
      
      // Send fetch request to content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: "fetchAllChats" });
      
      if (response && response.success) {
        UIManager.showStatus(`✅ Successfully fetched data from ${response.totalChats} chats!`, 'success');
        console.log('All chats response:', response);
        
        // Show summary
        const summary = `📱 Fetched ${response.totalChats} chats\n`;
        UIManager.showStatus(summary, 'success');
        
      } else {
        UIManager.showStatus('❌ Failed to fetch all chats: ' + (response?.error || 'Unknown error'), 'error');
        console.error('Failed to fetch all chats:', response);
      }
    } catch (error) {
      console.error('Error fetching all chats:', error);
      UIManager.showStatus('❌ Error fetching all chats: ' + error.message, 'error');
    }
  }

  async showAvailableChats() {
    try {
      console.log('=== SHOWING AVAILABLE CHATS ===');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        UIManager.showStatus('Please navigate to WhatsApp Web first', 'error');
        return;
      }

      UIManager.showStatus('Getting available chats...', 'info');
      
      // Send request to content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: "getAvailableChats" });
      
      if (response && response.success) {
        const chatList = response.availableChats.map((chat, index) => 
          `${index + 1}. ${chat.title}`
        ).join('\n');
        
        UIManager.showStatus(`📋 Available Chats (${response.totalChats}):\n${chatList}`, 'success');
        console.log('Available chats:', response.availableChats);
        
        // Show guidance
        UIManager.showStatus('💡 To extract messages:\n1. Click on any chat from the list above\n2. Wait for conversation to load\n3. Use "Refresh Messages" button', 'info');
        
      } else {
        UIManager.showStatus('❌ Failed to get chats: ' + (response?.error || 'Unknown error'), 'error');
        console.error('Failed to get chats:', response);
      }
    } catch (error) {
      console.error('Error showing available chats:', error);
      UIManager.showStatus('❌ Error getting chats: ' + error.message, 'error');
    }
  }

  async autoFetchAllChatsAndMessages() {
    try {
      console.log('=== AUTO-FETCHING ALL CHATS AND MESSAGES ===');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        UIManager.showStatus('Please navigate to WhatsApp Web first', 'error');
        return;
      }

      UIManager.showStatus('🚀 Auto-fetching messages from all chats...', 'info');
      
      // Step 1: Get available chats
      const chatsResponse = await chrome.tabs.sendMessage(tab.id, { action: "getAvailableChats" });
      
      if (!chatsResponse || !chatsResponse.success) {
        UIManager.showStatus('❌ Failed to get available chats', 'error');
        return;
      }

      const availableChats = chatsResponse.availableChats;
      console.log(`Found ${availableChats.length} available chats:`, availableChats);
      
      if (availableChats.length === 0) {
        UIManager.showStatus('ℹ️ No chats found. Please ensure WhatsApp Web is loaded with chat list visible.', 'info');
        return;
      }

      UIManager.showStatus(`📱 Found ${availableChats.length} chats. Starting bulk message extraction...`, 'info');
      
      // Step 2: Fetch messages from all chats
      const allMessagesResponse = await chrome.tabs.sendMessage(tab.id, { 
        action: "fetchAllChatsBulk",
        chats: availableChats
      });
      
      if (allMessagesResponse && allMessagesResponse.success) {
        const totalMessages = allMessagesResponse.totalMessages || 0;
        const processedChats = allMessagesResponse.processedChats || 0;
        
        UIManager.showStatus(`✅ Successfully extracted ${totalMessages} messages from ${processedChats} chats!`, 'success');
        
        // Step 3: Get and display all extracted messages
        setTimeout(async () => {
          await this.displayAllExtractedMessages();
        }, 1000);
        
      } else {
        UIManager.showStatus('❌ Failed to fetch messages: ' + (allMessagesResponse?.error || 'Unknown error'), 'error');
        console.error('Failed to fetch messages:', allMessagesResponse);
      }
      
    } catch (error) {
      console.error('Error auto-fetching all chats:', error);
      UIManager.showStatus('❌ Error auto-fetching: ' + error.message, 'error');
    }
  }

  async displayAllExtractedMessages() {
    try {
      console.log('=== DISPLAYING ALL EXTRACTED MESSAGES ===');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        UIManager.showStatus('Please navigate to WhatsApp Web first', 'error');
        return;
      }

      // Get all extracted messages from content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: "getAllExtractedMessages" });
      
      if (response && response.success) {
        const messages = response.messages || [];
        console.log(`Displaying ${messages.length} extracted messages:`, messages);
        
        if (messages.length > 0) {
          // Display messages in the UI
          this.displayExtractedMessages(messages);
          UIManager.showStatus(`📱 Displaying ${messages.length} messages from all chats!`, 'success');
        } else {
          UIManager.showStatus('ℹ️ No messages were extracted from the chats.', 'info');
        }
        
      } else {
        UIManager.showStatus('❌ Failed to get extracted messages: ' + (response?.error || 'Unknown error'), 'error');
        console.error('Failed to get extracted messages:', response);
      }
      
    } catch (error) {
      console.error('Error displaying extracted messages:', error);
      UIManager.showStatus('❌ Error displaying messages: ' + error.message, 'error');
    }
  }

  displayExtractedMessages(messages) {
    try {
      console.log('=== DISPLAYING EXTRACTED MESSAGES ===');
      
      // Group messages by chat
      const messagesByChat = {};
      messages.forEach(msg => {
        const chatTitle = msg.chatTitle || 'Unknown Chat';
        if (!messagesByChat[chatTitle]) {
          messagesByChat[chatTitle] = [];
        }
        messagesByChat[chatTitle].push(msg);
      });
      
      // Update stats
      const totalMessages = messages.length;
      const totalChats = Object.keys(messagesByChat).length;
      
      // Update UI stats
      document.getElementById('total-messages').textContent = totalMessages;
      document.getElementById('chats-monitored').textContent = totalChats;
      
      // Display messages in the messages list
      const messagesList = document.getElementById('messages-list');
      const emptyState = document.getElementById('empty-state');
      
      if (totalMessages === 0) {
        emptyState.style.display = 'block';
        return;
      }
      
      emptyState.style.display = 'none';
      
      // Clear existing messages
      const existingMessages = messagesList.querySelectorAll('.message-card');
      existingMessages.forEach(msg => msg.remove());
      
      // Add new messages
      messages.forEach((msg, index) => {
        const messageCard = this.createMessageCard(msg, index);
        messagesList.appendChild(messageCard);
      });
      
      console.log(`✅ Displayed ${totalMessages} messages from ${totalChats} chats`);
      
    } catch (error) {
      console.error('Error displaying extracted messages:', error);
      UIManager.showStatus('❌ Error displaying messages: ' + error.message, 'error');
    }
  }

  createMessageCard(message, index) {
    try {
      const card = document.createElement('div');
      card.className = 'message-card';
      
      const priority = message.priority || 'P1';
      card.classList.add(`priority-${priority}`);
      
      card.innerHTML = `
        <div class="message-header">
          <div class="chat-info">${message.chatTitle || 'Unknown Chat'}</div>
          <div class="priority-badge ${priority}">${priority}</div>
        </div>
        <div class="message-text">${message.text || 'No text'}</div>
        <div class="message-meta">
          <span>${message.type || 'unknown'}</span>
          <span>${message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'Unknown time'}</span>
        </div>
      `;
      
      return card;
    } catch (error) {
      console.error('Error creating message card:', error);
      return document.createElement('div');
    }
  }

  async forceRefreshPage() {
    try {
      console.log('=== FORCE REFRESHING PAGE ===');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('web.whatsapp.com')) {
        UIManager.showStatus('Please navigate to WhatsApp Web first', 'error');
        return;
      }

      UIManager.showStatus('🔄 Force refreshing WhatsApp Web page...', 'info');
      
      // Reload the page
      await chrome.tabs.reload(tab.id);
      
      // Wait a bit for the page to start loading
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      UIManager.showStatus('✅ Page refreshed! Waiting for WhatsApp to load...', 'success');
      
      // Wait for WhatsApp to be ready
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds
      
      while (attempts < maxAttempts) {
        try {
          // Check if content script is ready
          const response = await chrome.tabs.sendMessage(tab.id, { action: "ping" });
          if (response && response.success) {
            console.log('Content script is ready after refresh');
            break;
          }
        } catch (error) {
          // Content script not ready yet
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (attempts >= maxAttempts) {
        UIManager.showStatus('❌ WhatsApp took too long to load after refresh', 'error');
        return;
      }
      
      UIManager.showStatus('✅ WhatsApp loaded! Now auto-fetching all chats...', 'success');
      
      // Now try to auto-fetch all chats
      setTimeout(async () => {
        await this.autoFetchAllChatsAndMessages();
      }, 3000);
      
    } catch (error) {
      console.error('Error force refreshing page:', error);
      UIManager.showStatus('❌ Error refreshing page: ' + error.message, 'error');
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






   








   async summarizeChat() {
     await this.processChat('summarize', 'Please provide a comprehensive summary of this WhatsApp conversation. Include key topics discussed, important decisions made, and any action items mentioned.');
   }

   async analyzeSentiment() {
     await this.processChat('analyze', 'Please analyze the sentiment and tone of this WhatsApp conversation. Identify the overall mood, any emotional patterns, and provide insights about the communication dynamics.');
   }

   async processChat(action, prompt) {
     try {
       console.log(`=== PROCESSING CHAT: ${action.toUpperCase()} ===`);
       
       // Validate configuration
       const mlServiceUrl = await ConfigManager.getMlServiceUrl();
       if (!mlServiceUrl) {
         UIManager.showStatus('Please configure your ML service URL first', 'error');
         return;
       }

       console.log('ML service URL configured:', mlServiceUrl);

       // Get chat data
       UIManager.showStatus('Extracting chat messages...', 'info');
       const chatData = await AIProcessor.getChatData();
       
       console.log('Chat data retrieved:', {
         messageCount: chatData.messageCount,
         hasChatInfo: !!chatData.chatInfo,
         chatTitle: chatData.chatInfo?.title || 'Unknown'
       });
       
       // Prepare text for ML processing
       let chatText;
       if (Array.isArray(chatData.messages)) {
         chatText = chatData.messages.map(msg => {
           if (typeof msg === 'string') {
             return msg;
           } else if (typeof msg === 'object' && msg.text) {
             return msg.text;
           }
           return '';
         }).filter(text => text.trim().length > 0).join('\n\n');
       } else {
         throw new Error('Invalid message format received');
       }
       
       console.log('Prepared chat text length:', chatText.length);
       
       if (chatText.length === 0) {
         throw new Error('No valid message content found');
       }
       
       if (chatText.length > 4000) {
         UIManager.showStatus('Chat was very long, analyzing first 4000 characters', 'info');
         chatText = chatText.substring(0, 4000);
       }

       // Process with ML service
       UIManager.showLoading();
       UIManager.showStatus('Processing with AI...', 'info');
       
       console.log('Sending to ML service...');
       const mlResponse = await AIProcessor.processWithML(chatText, prompt, mlServiceUrl);

       // Display results
       UIManager.hideLoading();
       UIManager.showOutput(mlResponse);

       UIManager.showStatus(`${action === 'summarize' ? 'Summary' : 'Analysis'} completed successfully`, 'success');

     } catch (error) {
       console.error('Error processing chat:', error);
       UIManager.hideLoading();
       
       // Provide more specific error messages
       let errorMessage = error.message;
       if (error.message.includes('Failed to fetch')) {
         errorMessage = 'ML service is not accessible. Please check if the service is running and the URL is correct.';
       } else if (error.message.includes('No chat messages found')) {
         errorMessage = 'No messages found. Make sure you are in a WhatsApp conversation and there are visible messages.';
       } else if (error.message.includes('No valid message content')) {
         errorMessage = 'The messages found could not be processed. Try refreshing the page or switching to a different conversation.';
       }
       
       UIManager.showStatus(errorMessage, 'error');
     }
   }

  // Refresh messages from WhatsApp Web
  async refreshMessages() {
    console.log('=== REFRESHING MESSAGES ===');
    try {
      const chatData = await this.getChatData();
      console.log('Fresh chat data received:', chatData);
      
      if (chatData.success && chatData.chats && chatData.chats.length > 0) {
        this.displayMessages(chatData.chats);
        this.updateStats(chatData.stats);
      } else {
        console.log('No new messages found');
      }
    } catch (error) {
      console.error('Error refreshing messages:', error);
    }
  }


  

  

  

  
  // Refresh different chat

  


  // Add event listeners



  // Show notification message
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      max-width: 300px;
      animation: slideIn 0.3s ease;
    `;
    
    // Set background color based on type
    switch (type) {
      case 'success':
        notification.style.background = '#28a745';
        break;
      case 'error':
        notification.style.background = '#dc3545';
        break;
      default:
        notification.style.background = '#17a2b8';
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);
    
    // Add CSS animations
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit more to ensure all elements are fully loaded
  setTimeout(async () => {
    try {
      const helper = new WhatsAppAIHelper();
      console.log('Nax initialized successfully');
      
      // Automatically load important messages to debug
      setTimeout(async () => {
        try {
          console.log('Auto-loading important messages for debugging...');
          console.log('MessageProcessor methods:', Object.getOwnPropertyNames(MessageProcessor));
          console.log('displayAllImportantMessages exists:', typeof MessageProcessor.displayAllImportantMessages);
          
          if (typeof MessageProcessor.displayAllImportantMessages === 'function') {
            await MessageProcessor.displayAllImportantMessages();
          } else {
            console.error('displayAllImportantMessages method not found on MessageProcessor');
            UIManager.showStatus('Error: Method not found', 'error');
          }
        } catch (error) {
          console.error('Error auto-loading important messages:', error);
          UIManager.showStatus(`Auto-load error: ${error.message}`, 'error');
        }
      }, 1000);

      // Auto-fetch all chats and messages when extension opens
      setTimeout(async () => {
        try {
          console.log('Auto-fetching all chats and messages...');
          await helper.autoFetchAllChatsAndMessages();
        } catch (error) {
          console.error('Error auto-fetching all chats:', error);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error initializing WhatsApp AI Helper:', error);
    }
  }, 100);
});

// Also try to initialize if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => {
    try {
      new WhatsAppAIHelper();
              console.log('Nax initialized successfully (DOM already loaded)');
    } catch (error) {
      console.error('Error initializing WhatsApp AI Helper:', error);
    }
  }, 100);
}