// Enhanced WhatsApp message extraction with multi-chat support
class WhatsAppMessageExtractor {
  constructor() {
    this.messageSelectors = [
      // Modern WhatsApp Web selectors (2024)
      'div[data-testid="msg-container"] span[dir="ltr"]',
      'div[data-testid="conversation-message"] span[dir="ltr"]',
      'div[data-testid="msg-meta"] + div span',
      'div[data-testid="msg-bubble"] span',
      'div[data-testid="msg-text"]',
      'div[data-testid="conversation-message"] div[dir="ltr"]',
      
      // Legacy selectors
      'div.message-in span.selectable-text span',
      'div.message-out span.selectable-text span',
      'div.message-in div.copyable-text span',
      'div.message-out div.copyable-text span',
      
      // Alternative selectors
      'div[data-testid*="message"] span[dir="ltr"]',
      'div[data-testid*="bubble"] span[dir="ltr"]',
      'div[data-testid*="conversation"] span[dir="ltr"]',
      
      // Generic text selectors
      'span[dir="ltr"]',
      'div[dir="ltr"]',
      'span.selectable-text',
      'div.copyable-text'
    ];
    
    this.mediaSelectors = [
      'div[data-testid="media-canvas"]',
      'div[data-testid="image-canvas"]',
      'div[data-testid="video-canvas"]',
      'div[data-testid="audio-canvas"]',
      'div[data-testid="document-canvas"]',
      'div[data-testid="sticker-canvas"]',
      'div[data-testid="ptt-canvas"]'
    ];
    
    this.reactionSelectors = [
      'span[data-testid="reaction"]',
      'div[data-testid="reaction"]'
    ];

    this.chatSelectors = [
      'div[data-testid="conversation-header"]',
      'div[data-testid="cell-frame-container"]',
      'div[data-testid="chat-list-item"]',
      'span[data-testid="conversation-title"]'
    ];

    this.processedMessages = new Set();
    this.allChatsData = new Map();
    this.currentChatId = null;
  }

  // Extract all chat messages with enhanced parsing
  getChatMessages() {
    try {
      const messages = [];
      const messageElements = this.getAllMessageElements();
      
      console.log(`Found ${messageElements.length} message elements to process`);
      
      if (messageElements.length === 0) {
        console.warn('No message elements found. Trying alternative detection...');
        // Try one more time with broader selectors
        this.tryAlternativeSelectors();
        const retryElements = this.getAllMessageElements();
        console.log(`Retry found ${retryElements.length} elements`);
        if (retryElements.length > 0) {
          messageElements.push(...retryElements);
        }
      }
      
      messageElements.forEach((element, index) => {
        try {
          const messageData = this.extractMessageData(element, index);
          if (messageData && messageData.text) {
            messages.push(messageData);
            console.log(`Successfully extracted message ${index + 1}:`, messageData.text.substring(0, 50));
          } else {
            console.log(`Failed to extract message ${index + 1} from element:`, element);
          }
        } catch (error) {
          console.error(`Error extracting message ${index + 1}:`, error);
        }
      });

      console.log(`Successfully extracted ${messages.length} messages out of ${messageElements.length} elements`);
      
      // If still no messages, log more debug info
      if (messages.length === 0) {
        console.error('No messages could be extracted. DOM structure may have changed significantly.');
        this.debugMessageExtraction();
      }
      
      return messages;
    } catch (error) {
      console.error('Error extracting messages:', error);
      return [];
    }
  }

  // Get all message elements using multiple selectors
  getAllMessageElements() {
    const elements = [];
    
    console.log('Starting message extraction...');
    
    // First, try to find the main conversation container
    const conversationContainer = this.findConversationContainer();
    if (!conversationContainer) {
      console.warn('Could not find conversation container');
      return elements;
    }
    
    // Try different selectors to find messages
    this.messageSelectors.forEach((selector, index) => {
      try {
        const found = conversationContainer.querySelectorAll(selector);
        console.log(`Selector ${index + 1} (${selector}): found ${found.length} elements`);
        
        if (found.length > 0) {
          found.forEach(el => {
            if (el.textContent && el.textContent.trim().length > 0 && !elements.includes(el)) {
              elements.push(el);
            }
          });
        }
      } catch (error) {
        console.warn(`Error with selector ${selector}:`, error);
      }
    });

    // If no messages found with text selectors, try container selectors
    if (elements.length === 0) {
      console.log('No text elements found, trying container selectors...');
      const containers = conversationContainer.querySelectorAll('div[data-testid*="message"], div[data-testid*="bubble"], div.message-in, div.message-out');
      console.log(`Found ${containers.length} message containers`);
      
      containers.forEach(container => {
        const textElement = this.findTextInContainer(container);
        if (textElement && textElement.textContent && textElement.textContent.trim().length > 0) {
          elements.push(textElement);
        }
      });
    }

    // If still no messages, try to find any text elements that look like messages
    if (elements.length === 0) {
      console.log('Trying broader text element search...');
      const allTextElements = conversationContainer.querySelectorAll('span[dir="ltr"], div[dir="ltr"]');
      console.log(`Found ${allTextElements.length} text elements`);
      
      allTextElements.forEach(el => {
        if (el.textContent && 
            el.textContent.trim().length > 5 && 
            el.textContent.trim().length < 500 &&
            !elements.includes(el) &&
            this.looksLikeMessageElement(el)) {
          elements.push(el);
        }
      });
    }
    
    // Last resort: look for any text elements that might be messages
    if (elements.length === 0) {
      console.log('Trying last resort message detection...');
      const allElements = conversationContainer.querySelectorAll('span, div');
      console.log(`Found ${allElements.length} total elements`);
      
      allElements.forEach(el => {
        if (el.textContent && 
            el.textContent.trim().length > 5 && 
            el.textContent.trim().length < 500 &&
            !elements.includes(el) &&
            this.looksLikeMessageElement(el)) {
          elements.push(el);
        }
      });
    }

    console.log(`Total message elements found: ${elements.length}`);
    return elements;
  }

  // Validate which selectors are currently working
  validateSelectors() {
    const workingSelectors = [];
    this.messageSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        workingSelectors.push(selector);
      }
    });
    
    if (workingSelectors.length === 0) {
      console.warn('No working message selectors found. WhatsApp DOM may have changed.');
      // Try alternative selectors
      this.tryAlternativeSelectors();
      return this.messageSelectors; // Return all selectors as fallback
    }
    
    return workingSelectors;
  }

  // Try alternative selectors when primary ones fail
  tryAlternativeSelectors() {
    console.log('Trying alternative selectors...');
    
    const alternativeSelectors = [
      'div[data-testid*="conversation"] span',
      'div[data-testid*="chat"] span',
      'div[role="textbox"] span',
      'div[dir="ltr"] span',
      'span[dir="ltr"]',
      'div[class*="message"] span',
      'div[class*="chat"] span',
      // Add specific selectors for current WhatsApp structure
      'span[dir="ltr"]._ao3e',
      'span[dir="ltr"].selectable-text',
      'span[dir="ltr"].copyable-text',
      'span[dir="ltr"].x1iyjqo2',
      'span[dir="ltr"].x6ikm8r',
      'span[dir="ltr"].x10wlt62'
    ];
    
    // Add alternative selectors to the main list
    alternativeSelectors.forEach(selector => {
      if (!this.messageSelectors.includes(selector)) {
        this.messageSelectors.push(selector);
      }
    });
  }

  // Find text content within a message container
  findTextInContainer(container) {
    // Look for text in various locations within the container
    const textSelectors = [
      'span.selectable-text span',
      'div.copyable-text span',
      '[data-testid="message-text"]',
      'div[dir="ltr"]',
      'span[dir="ltr"]'
    ];

    for (const selector of textSelectors) {
      const element = container.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element;
      }
    }

    return null;
  }

  // Extract comprehensive message data
  extractMessageData(element, index) {
    try {
      // Try multiple approaches to find message container
      let container = element.closest('div[data-testid*="message"], div[data-testid*="bubble"]');
      
      if (!container) {
        // Try legacy selectors
        container = element.closest('div.message-in, div.message-out');
      }
      
      if (!container) {
        // Try to find container by walking up the DOM tree
        container = this.findMessageContainer(element);
      }
      
      // If still no container, try to create a virtual container from the element itself
      if (!container) {
        container = this.createVirtualContainer(element);
      }
      
      // If all else fails, treat the element itself as the container
      if (!container) {
        console.log('Using element as container:', element);
        container = element;
      }

      const isOutgoing = this.isOutgoingMessage(container);
      const text = this.cleanText(element.textContent);
      
      if (!text || text.length < 2) {
        console.log(`Skipping element with insufficient text: "${text}"`);
        return null;
      }

      const messageData = {
        text: text,
        type: isOutgoing ? 'outgoing' : 'incoming',
        index: index,
        timestamp: this.extractTimestamp(container),
        hasMedia: this.hasMedia(container),
        hasReactions: this.hasReactions(container),
        sender: this.extractSender(container, isOutgoing),
        messageType: this.detectMessageType(container),
        mediaInfo: this.extractMediaInfo(container),
        messageId: this.generateMessageId(container, text, index)
      };

      return messageData;
    } catch (error) {
      console.error('Error extracting message data:', error);
      return null;
    }
  }

  // Detect the type of message
  detectMessageType(container) {
    try {
      // Check for different media types
      if (container.querySelector('[data-testid="image-canvas"]')) return 'image';
      if (container.querySelector('[data-testid="video-canvas"]')) return 'video';
      if (container.querySelector('[data-testid="audio-canvas"]')) return 'audio';
      if (container.querySelector('[data-testid="document-canvas"]')) return 'document';
      if (container.querySelector('[data-testid="sticker-canvas"]')) return 'sticker';
      if (container.querySelector('[data-testid="ptt-canvas"]')) return 'voice_note';
      
      // Check for text messages
      if (container.querySelector('[data-testid="message-text"]') || 
          container.querySelector('span.selectable-text') ||
          container.querySelector('div.copyable-text')) {
        return 'text';
      }
      
      // Check for system messages
      if (container.querySelector('[data-testid="system-message"]') ||
          container.querySelector('[data-testid="revoked-message"]')) {
        return 'system';
      }
      
      return 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  // Extract media information
  extractMediaInfo(container) {
    try {
      const mediaInfo = {
        type: null,
        caption: null,
        duration: null,
        filename: null
      };

      // Get caption if available
      const captionElement = container.querySelector('[data-testid="media-caption"]') ||
                           container.querySelector('[data-testid="image-caption"]') ||
                           container.querySelector('[data-testid="video-caption"]');
      
      if (captionElement) {
        mediaInfo.caption = this.cleanText(captionElement.textContent);
      }

      // Get duration for audio/video
      const durationElement = container.querySelector('[data-testid="media-duration"]') ||
                            container.querySelector('[data-testid="audio-duration"]') ||
                            container.querySelector('[data-testid="video-duration"]');
      
      if (durationElement) {
        mediaInfo.duration = durationElement.textContent.trim();
      }

      // Get filename for documents
      const filenameElement = container.querySelector('[data-testid="document-name"]') ||
                            container.querySelector('[data-testid="media-name"]');
      
      if (filenameElement) {
        mediaInfo.filename = filenameElement.textContent.trim();
      }

      return mediaInfo;
    } catch (error) {
      return { type: null, caption: null, duration: null, filename: null };
    }
  }

  // Find message container by walking up the DOM tree
  findMessageContainer(element) {
    let current = element;
    const maxDepth = 10; // Prevent infinite loops
    let depth = 0;
    
    while (current && depth < maxDepth) {
      // Check if current element looks like a message container
      if (this.looksLikeMessageContainer(current)) {
        return current;
      }
      
      current = current.parentElement;
      depth++;
    }
    
    return null;
  }

  // Check if an element looks like a message container
  looksLikeMessageContainer(element) {
    if (!element || !element.classList) return false;
    
    const className = element.className || '';
    const testId = element.getAttribute('data-testid') || '';
    
    // Check for message-related classes or attributes
    const messageIndicators = [
      'message-in', 'message-out', 'message',
      'bubble', 'chat', 'conversation'
    ];
    
    return messageIndicators.some(indicator => 
      className.includes(indicator) || testId.includes(indicator)
    );
  }

  // Create a virtual container when real container can't be found
  createVirtualContainer(element) {
    try {
      // Check if the element itself looks like a message
      if (this.looksLikeMessageElement(element)) {
        // Create a virtual container div
        const virtualContainer = document.createElement('div');
        virtualContainer.className = 'virtual-message-container';
        virtualContainer.appendChild(element.cloneNode(true));
        
        // Try to determine if it's outgoing or incoming
        const isOutgoing = this.isOutgoingMessage(element);
        if (isOutgoing) {
          virtualContainer.classList.add('message-out');
        } else {
          virtualContainer.classList.add('message-in');
        }
        
        return virtualContainer;
      }
      
      return null;
    } catch (error) {
      console.error('Error creating virtual container:', error);
      return null;
    }
  }

  // Check if an element looks like a message element
  looksLikeMessageElement(element) {
    if (!element || !element.textContent) return false;
    
    const text = element.textContent.trim();
    if (text.length < 2 || text.length > 2000) return false;
    
    // Check for common message patterns - be more lenient
    const messagePatterns = [
      /^[^\x00-\x1F\x7F]+$/, // No control characters
      /^(?!.*(?:http|www|\.com|\.org|\.net)).*$/i // Not just a URL
    ];
    
    // Allow more characters including emojis and special characters
    const hasReasonableContent = text.length > 2 && 
                                text.length < 2000 && 
                                !text.match(/^[\s\.,!?]+$/); // Not just punctuation
    
    return hasReasonableContent && messagePatterns.every(pattern => pattern.test(text));
  }

  // Determine if message is outgoing
  isOutgoingMessage(container) {
    try {
      // Check multiple indicators
      if (container.classList.contains('message-out')) return true;
      if (container.classList.contains('message-in')) return false;
      
      // Check for newer WhatsApp indicators
      const isOutgoing = container.querySelector('[data-testid*="outgoing"]') !== null ||
                        container.querySelector('[aria-label*="outgoing"]') !== null ||
                        container.querySelector('[data-testid*="sent"]') !== null;
      
      // Check for virtual container
      if (container.classList.contains('virtual-message-container')) {
        // For virtual containers, try to determine based on position or other indicators
        const element = container.querySelector('span[dir="ltr"]');
        if (element) {
          // Check if the element is positioned on the right side (outgoing) or left side (incoming)
          const rect = element.getBoundingClientRect();
          const parentRect = container.parentElement ? container.parentElement.getBoundingClientRect() : rect;
          const isRightAligned = rect.left > (parentRect.left + parentRect.width / 2);
          return isRightAligned;
        }
      }
      
      // Default to incoming if we can't determine
      return isOutgoing || false;
    } catch (error) {
      console.error('Error determining message direction:', error);
      return false; // Default to incoming
    }
  }

  // Clean and normalize text content
  cleanText(text) {
    if (!text) return '';
    
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
      .substring(0, 1000); // Limit length
  }

  // Extract timestamp if available
  extractTimestamp(container) {
    try {
      const timeSelectors = [
        'span[data-testid="message-time"]',
        'span[data-pre-plain-text]',
        'span[data-testid="msg-meta"]',
        'div[data-testid="msg-meta"] span',
        'span[title*=":"]', // Fallback for time in title attribute
        'span[data-testid="conversation-message-time"]',
        'div[data-testid="msg-meta"] div[title*=":"]'
      ];
      
      for (const selector of timeSelectors) {
        const timeElement = container.querySelector(selector);
        if (timeElement) {
          const timeText = timeElement.textContent || 
                          timeElement.getAttribute('data-pre-plain-text') ||
                          timeElement.getAttribute('title');
          if (timeText) {
            return timeText.replace(/[\[\]]/g, '').trim();
          }
        }
      }
    } catch (error) {
      // Ignore timestamp extraction errors
    }
    return '';
  }

  // Check if message has media
  hasMedia(container) {
    const mediaSelectors = [
      ...this.mediaSelectors,
      'div[data-testid="media-canvas"]',
      'img[data-testid="media-canvas"]',
      'div[data-testid="image-canvas"]',
      'div[data-testid="video-canvas"]',
      'div[data-testid="audio-canvas"]',
      'div[data-testid="document-canvas"]',
      'div[data-testid="sticker-canvas"]',
      'div[data-testid="ptt-canvas"]',
      'div[aria-label*="image"]',
      'div[aria-label*="video"]',
      'div[aria-label*="audio"]',
      'div[aria-label*="document"]'
    ];
    
    return mediaSelectors.some(selector => 
      container.querySelector(selector) !== null
    );
  }

  // Check if message has reactions
  hasReactions(container) {
    const reactionSelectors = [
      ...this.reactionSelectors,
      'span[data-testid="reaction"]',
      'div[data-testid="reaction"]',
      'span[data-testid="reaction-emoji"]',
      'div[data-testid="reaction-emoji"]',
      'span[aria-label*="reaction"]',
      'div[aria-label*="reaction"]'
    ];
    
    return reactionSelectors.some(selector => 
      container.querySelector(selector) !== null
    );
  }

  // Extract sender information
  extractSender(container, isOutgoing) {
    if (isOutgoing) {
      return 'You';
    }
    
    try {
      // Try to find sender name in group chats
      const senderElement = container.querySelector('span[data-testid="conversation-title"], span[dir="ltr"]');
      if (senderElement && senderElement.textContent.trim()) {
        return senderElement.textContent.trim();
      }
    } catch (error) {
      // Ignore sender extraction errors
    }
    
    return 'Unknown';
  }

  // Get chat statistics
  getChatStats() {
    const messages = this.getChatMessages();
    const stats = {
      totalMessages: messages.length,
      outgoingMessages: messages.filter(m => m.type === 'outgoing').length,
      incomingMessages: messages.filter(m => m.type === 'incoming').length,
      messagesWithMedia: messages.filter(m => m.hasMedia).length,
      messagesWithReactions: messages.filter(m => m.hasReactions).length,
      uniqueSenders: [...new Set(messages.map(m => m.sender))].length
    };
    
    return stats;
  }

  // Get formatted chat text for AI processing
  getFormattedChatText() {
    const messages = this.getChatMessages();
    
    return messages.map(msg => {
      let formatted = `[${msg.type.toUpperCase()}] ${msg.sender}: ${msg.text}`;
      
      if (msg.hasMedia) {
        formatted += ' [MEDIA]';
      }
      
      if (msg.hasReactions) {
        formatted += ' [REACTIONS]';
      }
      
      if (msg.timestamp) {
        formatted += ` (${msg.timestamp})`;
      }
      
      return formatted;
    }).join('\n\n');
  }

  // Get current chat information
  getCurrentChatInfo() {
    try {
      const chatHeader = document.querySelector('div[data-testid="conversation-header"]');
      if (!chatHeader) return null;

      const titleElement = chatHeader.querySelector('span[data-testid="conversation-title"]');
      const chatTitle = titleElement ? titleElement.textContent.trim() : 'Unknown Chat';
      
      // Generate a unique chat ID based on title and URL
      const chatId = this.generateChatId(chatTitle);
      this.currentChatId = chatId;

      return {
        id: chatId,
        title: chatTitle,
        isGroup: this.isGroupChat(),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting chat info:', error);
      return null;
    }
  }

  // Generate unique chat ID
  generateChatId(chatTitle) {
    // Create a simple hash of the chat title
    let hash = 0;
    for (let i = 0; i < chatTitle.length; i++) {
      const char = chatTitle.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `chat_${Math.abs(hash)}`;
  }

  // Check if current chat is a group
  isGroupChat() {
    try {
      const groupIndicators = [
        'div[data-testid="group-info"]',
        'span[data-testid="group-members"]',
        'div[aria-label*="group"]',
        'div[data-testid="group-header"]',
        'span[data-testid="group-title"]',
        'div[role="button"][aria-label*="group"]',
        'div[data-testid="group-participants"]',
        'div[aria-label*="participants"]',
        'span[data-testid="group-participants-count"]'
      ];
      
      return groupIndicators.some(selector => 
        document.querySelector(selector) !== null
      );
    } catch (error) {
      return false;
    }
  }

  // Get all available chats from chat list
  getAllAvailableChats() {
    try {
      const chatElements = document.querySelectorAll('div[data-testid="cell-frame-container"]');
      const chats = [];

      chatElements.forEach((element, index) => {
        try {
          const titleElement = element.querySelector('span[data-testid="conversation-title"]');
          const lastMessageElement = element.querySelector('span[title]');
          
          if (titleElement) {
            const title = titleElement.textContent.trim();
            const lastMessage = lastMessageElement ? lastMessageElement.textContent.trim() : '';
            const chatId = this.generateChatId(title);

            chats.push({
              id: chatId,
              title: title,
              lastMessage: lastMessage,
              element: element,
              index: index
            });
          }
        } catch (error) {
          console.error('Error processing chat element:', error);
        }
      });

      return chats;
    } catch (error) {
      console.error('Error getting available chats:', error);
      return [];
    }
  }

  // Process messages with chat context
  processMessagesWithContext() {
    const currentChat = this.getCurrentChatInfo();
    if (!currentChat) return { messages: [], chatInfo: null };

    const messages = this.getChatMessages();
    
    // Add chat context to each message
    const messagesWithContext = messages.map(msg => ({
      ...msg,
      chatId: currentChat.id,
      chatTitle: currentChat.title,
      isGroup: currentChat.isGroup,
      messageId: this.generateMessageId(msg.messageId, msg.text, msg.index)
    }));

    // Store in chat data map
    this.allChatsData.set(currentChat.id, {
      chatInfo: currentChat,
      messages: messagesWithContext,
      lastUpdated: Date.now()
    });

    return {
      messages: messagesWithContext,
      chatInfo: currentChat,
      totalChats: this.allChatsData.size
    };
  }

  // Generate unique message ID
  generateMessageId(container, text, index) {
    try {
      // Try to find existing message ID
      const messageId = container.getAttribute('data-id') || 
                       container.getAttribute('id') ||
                       container.querySelector('[data-id]')?.getAttribute('data-id');
      
      if (messageId) {
        return messageId;
      }
      
      // Generate ID based on content and position
      const hash = this.simpleHash(text + index);
      return `msg_${hash}_${index}`;
    } catch (error) {
      return `msg_${index}_${Date.now()}`;
    }
  }

  // Get all processed messages from all chats
  getAllProcessedMessages() {
    const allMessages = [];
    
    this.allChatsData.forEach((chatData, chatId) => {
      allMessages.push(...chatData.messages);
    });

    // Sort by timestamp (most recent first)
    return allMessages.sort((a, b) => {
      const timeA = this.parseTimestamp(a.timestamp);
      const timeB = this.parseTimestamp(b.timestamp);
      return timeB - timeA;
    });
  }

  // Parse timestamp for sorting
  parseTimestamp(timestamp) {
    if (!timestamp) return 0;
    
    try {
      // Handle different timestamp formats
      if (typeof timestamp === 'number') return timestamp;
      
      // Parse time string (e.g., "14:30", "2:30 PM")
      const timeMatch = timestamp.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const isPM = timeMatch[3] && timeMatch[3].toLowerCase() === 'pm';
        
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        const today = new Date();
        today.setHours(hours, minutes, 0, 0);
        return today.getTime();
      }
    } catch (error) {
      // Ignore parsing errors
    }
    
    return Date.now();
  }

  // Start monitoring for new messages
  startMessageMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
    }

    const targetNode = document.querySelector('#main') || document.body;
    
    this.observer = new MutationObserver((mutations) => {
      let hasNewMessages = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              // Check if new message was added
              const hasMessageContent = node.querySelector && 
                this.messageSelectors.some(selector => node.querySelector(selector));
              
              if (hasMessageContent) {
                hasNewMessages = true;
              }
            }
          });
        }
      });

      if (hasNewMessages) {
        // Debounce message processing
        clearTimeout(this.processingTimeout);
        this.processingTimeout = setTimeout(() => {
          this.handleNewMessages();
        }, 500);
      }
    });

    this.observer.observe(targetNode, {
      childList: true,
      subtree: true
    });

    // Start DOM change detection
    this.startDOMChangeDetection();

    console.log('WhatsApp message monitoring started');
  }

  // Detect DOM changes and adapt selectors
  startDOMChangeDetection() {
    // Check for DOM changes every 30 seconds
    setInterval(() => {
      this.detectDOMChanges();
    }, 30000);
    
    // Initial check
    this.detectDOMChanges();
  }

  // Detect if WhatsApp has updated their DOM structure
  detectDOMChanges() {
    try {
      // Check if old structure still exists
      const oldSelectors = ['div.message-in', 'div.message-out'];
      const newSelectors = ['div[data-testid*="message"]', 'div[data-testid*="bubble"]'];
      
      const hasOldStructure = oldSelectors.some(s => document.querySelector(s));
      const hasNewStructure = newSelectors.some(s => document.querySelector(s));
      
      if (!hasOldStructure && hasNewStructure) {
        console.log('WhatsApp DOM structure changed, updating selectors...');
        this.updateSelectorsForNewVersion();
      }
      
      // Check if current selectors are still working
      const workingCount = this.validateSelectors().length;
      if (workingCount < 3) { // If less than 3 selectors work
        console.warn('Many selectors are failing, WhatsApp may have updated');
        this.adaptToNewStructure();
      }
      
    } catch (error) {
      console.error('Error detecting DOM changes:', error);
    }
  }

  // Update selectors for new WhatsApp version
  updateSelectorsForNewVersion() {
    const newSelectors = [
      'div[data-testid="conversation-message"] span[dir="ltr"]',
      'div[data-testid="msg-container"] span[dir="ltr"]',
      'div[data-testid="msg-text"]',
      'div[data-testid="conversation-message"] span'
    ];
    
    // Add new selectors to the beginning for priority
    newSelectors.forEach(selector => {
      if (!this.messageSelectors.includes(selector)) {
        this.messageSelectors.unshift(selector);
      }
    });
    
    console.log('Updated selectors for new WhatsApp version');
  }

  // Adapt to completely new structure
  adaptToNewStructure() {
    console.log('Adapting to new WhatsApp structure...');
    
    // Try to find any text elements that might be messages
    const allTextElements = document.querySelectorAll('span[dir="ltr"], div[dir="ltr"]');
    const potentialMessages = Array.from(allTextElements).filter(el => {
      const text = el.textContent.trim();
      return text.length > 5 && text.length < 1000; // Reasonable message length
    });
    
    if (potentialMessages.length > 0) {
      console.log(`Found ${potentialMessages.length} potential message elements`);
      // Add generic selectors and prioritize them
      this.messageSelectors = [
        'span[dir="ltr"]',
        'div[dir="ltr"]',
        ...this.messageSelectors.filter(s => !s.includes('dir="ltr"'))
      ];
      
      // Also add more specific selectors for the current structure
      this.messageSelectors.unshift(
        'span[dir="ltr"]._ao3e',
        'span[dir="ltr"].selectable-text',
        'span[dir="ltr"].copyable-text'
      );
    }
  }

  // Detect WhatsApp Web version and adapt selectors
  detectWhatsAppVersion() {
    try {
      console.log('Detecting WhatsApp Web version...');
      
      // Check for different versions
      const versionChecks = {
        'legacy': () => document.querySelector('div.message-in, div.message-out') !== null,
        'modern': () => document.querySelector('div[data-testid*="message"], div[data-testid*="bubble"]') !== null,
        'latest': () => document.querySelector('div[data-testid="conversation-message"], div[data-testid="msg-container"]') !== null
      };

      let detectedVersion = 'unknown';
      for (const [version, check] of Object.entries(versionChecks)) {
        if (check()) {
          detectedVersion = version;
          break;
        }
      }

      // Check for current WhatsApp structure with specific classes
      if (detectedVersion === 'unknown' || detectedVersion === 'legacy') {
        const hasCurrentStructure = document.querySelector('span[dir="ltr"]._ao3e, span[dir="ltr"].x1iyjqo2') !== null;
        if (hasCurrentStructure) {
          detectedVersion = 'current';
          console.log('Detected current WhatsApp structure with specific classes');
        }
      }

      console.log(`Detected WhatsApp Web version: ${detectedVersion}`);
      
      // Adapt selectors based on version
      this.adaptSelectorsForVersion(detectedVersion);
      
    } catch (error) {
      console.error('Error detecting WhatsApp version:', error);
    }
  }

  // Adapt selectors for specific WhatsApp version
  adaptSelectorsForVersion(version) {
    try {
      switch (version) {
        case 'legacy':
          // Use traditional selectors
          this.messageSelectors = [
            'div.message-in span.selectable-text span',
            'div.message-out span.selectable-text span',
            'div.message-in div.copyable-text span',
            'div.message-out div.copyable-text span'
          ];
          break;
          
        case 'modern':
          // Use modern selectors
          this.messageSelectors = [
            'div[data-testid*="message"] span[dir="ltr"]',
            'div[data-testid*="bubble"] span[dir="ltr"]',
            'div[data-testid="message-text"]',
            'div[data-testid="msg-text"]'
          ];
          break;
          
        case 'latest':
          // Use latest selectors
          this.messageSelectors = [
            'div[data-testid="conversation-message"] span[dir="ltr"]',
            'div[data-testid="msg-container"] span[dir="ltr"]',
            'div[data-testid="msg-text"]',
            'div[data-testid="conversation-message"] span'
          ];
          break;
          
        case 'current':
          // Use current WhatsApp structure selectors
          this.messageSelectors = [
            'span[dir="ltr"]._ao3e',
            'span[dir="ltr"].selectable-text',
            'span[dir="ltr"].copyable-text',
            'span[dir="ltr"].x1iyjqo2',
            'span[dir="ltr"].x6ikm8r',
            'span[dir="ltr"].x10wlt62',
            'span[dir="ltr"]',
            'div[dir="ltr"]'
          ];
          break;
          
        default:
          // Use all selectors as fallback
          console.log('Using fallback selectors for unknown version');
      }
      
      console.log(`Adapted selectors for ${version} version:`, this.messageSelectors);
      
    } catch (error) {
      console.error('Error adapting selectors for version:', error);
    }
  }

  // Handle new messages
  handleNewMessages() {
    const result = this.processMessagesWithContext();
    
    // Send new messages to background for AI processing
    if (result.messages.length > 0) {
      chrome.runtime.sendMessage({
        action: 'newMessagesDetected',
        data: result
      });
    }
  }

  // Stop monitoring
  stopMessageMonitoring() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }
    
    console.log('WhatsApp message monitoring stopped');
  }

  // Debug message extraction
  debugMessageExtraction() {
    console.log('=== DEBUGGING MESSAGE EXTRACTION ===');
    
    // Check all possible selectors
    this.messageSelectors.forEach((selector, index) => {
      const elements = document.querySelectorAll(selector);
      console.log(`Selector ${index}: "${selector}" → Found ${elements.length} elements`);
      
      if (elements.length > 0) {
        console.log('Sample element:', elements[0]);
        console.log('Text content:', elements[0].textContent);
      }
    });
    
    // Check for any message containers
    const allDivs = document.querySelectorAll('div');
    const messageDivs = Array.from(allDivs).filter(div => 
      div.textContent && div.textContent.length > 10 && 
      (div.textContent.includes('am') || div.textContent.includes('pm'))
    );
    
    console.log(`Found ${messageDivs.length} potential message divs`);
    messageDivs.slice(0, 3).forEach((div, i) => {
      console.log(`Message div ${i}:`, div.textContent.substring(0, 100));
    });

    // Check for WhatsApp specific elements
    const whatsappElements = document.querySelectorAll('[data-testid*="message"], [data-testid*="chat"], [data-testid*="conversation"]');
    console.log(`Found ${whatsappElements.length} WhatsApp-specific elements`);
    if (whatsappElements.length > 0) {
      const elementsArray = Array.from(whatsappElements);
      elementsArray.slice(0, 5).forEach((el, i) => {
        console.log(`WhatsApp element ${i}:`, el.getAttribute('data-testid'), el.textContent.substring(0, 50));
      });
    }

    // Check current chat info
    const chatHeader = document.querySelector('div[data-testid="conversation-header"]');
    if (chatHeader) {
      console.log('Chat header found:', chatHeader.textContent);
    } else {
      console.log('No chat header found');
    }

    // Check for message bubbles
    const messageBubbles = document.querySelectorAll('div[data-testid*="bubble"], div[class*="message"], div[class*="chat"]');
    console.log(`Found ${messageBubbles.length} potential message bubbles`);
    messageBubbles.slice(0, 3).forEach((bubble, i) => {
      console.log(`Bubble ${i}:`, bubble.className, bubble.textContent.substring(0, 100));
    });

    // Check selector validation
    console.log('=== SELECTOR VALIDATION ===');
    const workingSelectors = this.validateSelectors();
    console.log(`Working selectors: ${workingSelectors.length}/${this.messageSelectors.length}`);
    console.log('Working selectors:', workingSelectors);

    // Check DOM structure
    console.log('=== DOM STRUCTURE ANALYSIS ===');
    this.analyzeDOMStructure();
  }

  // Analyze current DOM structure
  analyzeDOMStructure() {
    try {
      // Check for different WhatsApp versions
      const versionIndicators = {
        'old': ['div.message-in', 'div.message-out'],
        'new': ['div[data-testid*="message"]', 'div[data-testid*="bubble"]'],
        'modern': ['div[data-testid="conversation-message"]', 'div[data-testid="msg-container"]']
      };

      Object.entries(versionIndicators).forEach(([version, selectors]) => {
        const found = selectors.some(s => document.querySelector(s) !== null);
        console.log(`WhatsApp ${version} structure: ${found ? 'Found' : 'Not found'}`);
      });

      // Check for common elements
      const commonElements = [
        'div[data-testid="conversation-header"]',
        'div[data-testid="chat-list"]',
        'div[data-testid="main"]',
        'div[data-testid="conversation-panel-wrapper"]'
      ];

      commonElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`Found: ${selector}`);
        }
      });

    } catch (error) {
      console.error('Error analyzing DOM structure:', error);
    }
  }
}

// Initialize the message extractor
const messageExtractor = new WhatsAppMessageExtractor();

// Listen for requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    switch (request.action) {
      case "getChats":
        const messages = messageExtractor.getChatMessages();
        sendResponse({ 
          success: true, 
          chats: messages.map(m => m.text),
          stats: messageExtractor.getChatStats(),
          formatted: messageExtractor.getFormattedChatText()
        });
        break;
        
      case "getChatStats":
        const stats = messageExtractor.getChatStats();
        sendResponse({ success: true, stats: stats });
        break;
        
      case "getFormattedChat":
        const formatted = messageExtractor.getFormattedChatText();
        sendResponse({ success: true, formatted: formatted });
        break;

      case "getAllChatsData":
        const allChatsResult = messageExtractor.processMessagesWithContext();
        const allMessages = messageExtractor.getAllProcessedMessages();
        const availableChats = messageExtractor.getAllAvailableChats();
        
        sendResponse({ 
          success: true, 
          currentChat: allChatsResult,
          allMessages: allMessages,
          availableChats: availableChats,
          totalChats: messageExtractor.allChatsData.size
        });
        break;

      case "startMonitoring":
        messageExtractor.startMessageMonitoring();
        sendResponse({ success: true, message: 'Monitoring started' });
        break;

      case "stopMonitoring":
        messageExtractor.stopMessageMonitoring();
        sendResponse({ success: true, message: 'Monitoring stopped' });
        break;

      case "getCurrentChatInfo":
        const chatInfo = messageExtractor.getCurrentChatInfo();
        sendResponse({ success: true, chatInfo: chatInfo });
        break;

      case "processForAI":
        const contextResult = messageExtractor.processMessagesWithContext();
        sendResponse({ 
          success: true, 
          data: contextResult
        });
        break;

      case "debugExtraction":
        messageExtractor.debugMessageExtraction();
        sendResponse({ success: true, message: 'Debug information logged to console' });
        break;

      case "validateSelectors":
        const workingSelectors = messageExtractor.validateSelectors();
        sendResponse({ 
          success: true, 
          workingSelectors: workingSelectors,
          totalSelectors: messageExtractor.messageSelectors.length
        });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // Keep message channel open for async responses
});

// Auto-start monitoring when page is ready
function initializeWhenReady() {
  const checkReady = () => {
    const mainElement = document.querySelector('#main') || 
                       document.querySelector('[data-testid="main"]') ||
                       document.querySelector('[data-testid="conversation-panel-wrapper"]');
    
    if (mainElement) {
      // Detect WhatsApp version and adapt
      messageExtractor.detectWhatsAppVersion();
      
      // Start monitoring automatically
      messageExtractor.startMessageMonitoring();
      console.log('WhatsApp AI Helper content script loaded and monitoring started');
    } else {
      // Check again in 1 second
      setTimeout(checkReady, 1000);
    }
  };

  // Start checking
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkReady);
  } else {
    checkReady();
  }
}

// Initialize when ready
initializeWhenReady();

// Notify when content script is loaded
console.log('WhatsApp AI Helper content script loaded successfully');
