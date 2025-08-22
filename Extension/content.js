// Enhanced WhatsApp message extraction with multi-chat support
// Prevent duplicate script execution using IIFE pattern
(function() {
  'use strict';
  
  // Prevent duplicate script execution
  if (window.naxScriptLoaded) {
    console.log('Nax script already loaded, checking if message listener is active...');
    
    // Re-register message listener if needed (sometimes it gets lost)
    if (!window.naxMessageListenerActive) {
      console.log('Message listener not active, re-registering...');
      // Don't return, continue to re-register the message listener
    } else {
      console.log('Script already fully loaded and active, exiting...');
      return;
    }
  }

  // Mark this script as loaded
  window.naxScriptLoaded = true;
  console.log('=== NAX SCRIPT LOADING ===');

  // Global flag to prevent duplicate initialization
  if (typeof window.naxInitialized === 'undefined') {
    window.naxInitialized = false;
  }

  // Check if class already exists to prevent duplicate declaration
  if (typeof window.WhatsAppMessageExtractor !== 'undefined') {
    console.log('WhatsAppMessageExtractor class already exists, skipping...');
    return;
  }

  // Declare class in global scope to prevent duplicates
  window.WhatsAppMessageExtractor = class WhatsAppMessageExtractor {
    constructor() {
      // Add error handling for WhatsApp Web compatibility
      try {
        this.messageSelectors = [
          // 2025 WhatsApp Web primary selectors
          'div[data-testid="msg-container"] span[dir="ltr"]',
          'div[data-testid="conversation-message"] span[dir="ltr"]',
          'div[data-testid="message-text"]',
          'div[data-testid="msg-text"]',
          'div[data-testid="bubble-text"]',
          
          // Alternative message containers
          'div[data-testid="msg-meta"] + div span',
          'div[data-testid="msg-bubble"] span',
          'div[data-testid="conversation-message"] div[dir="ltr"]',
          
          // Generic message selectors
          'div[data-testid*="message"] span[dir="ltr"]',
          'div[data-testid*="bubble"] span[dir="ltr"]',
          'div[data-testid*="conversation"] span[dir="ltr"]',
          'div[data-testid*="text"] span[dir="ltr"]',
          
          // Legacy selectors (fallback)
          'div.message-in span.selectable-text span',
          'div.message-out span.selectable-text span',
          'div.message-in div.copyable-text span',
          'div.message-out div.copyable-text span',
          
          // Generic text selectors
          'span[dir="ltr"]',
          'div[dir="ltr"]',
          'span.selectable-text',
          'div.copyable-text',
          
          // WhatsApp Web 2025 specific patterns
          'span[dir="ltr"][class*="text"]',
          'div[class*="message"] span[dir="ltr"]',
          'div[class*="bubble"] span[dir="ltr"]',
          'div[class*="conversation"] span[dir="ltr"]',
          
          // Alternative text detection
          'span[data-testid*="text"]',
          'div[data-testid*="text"]',
          'span[aria-label*="message"]',
          'div[aria-label*="message"]'
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
        this.monitoringActive = false;
        this.monitoringInterval = null;
        
        console.log('✅ WhatsAppMessageExtractor initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing WhatsAppMessageExtractor:', error);
      }
    }

    // Ensure floating icon is always visible - DISABLED
    /*
    ensureFloatingIconVisible() {
      try {
        // Check if icon exists
        const existingIcon = document.getElementById('whatsapp-ai-helperIcon');
        if (!existingIcon) {
          // Recreate icon if it doesn't exist
          createFallbackFloatingIcon();
        }
        
        // Ensure icon is visible and properly positioned
        if (existingIcon) {
          existingIcon.style.display = 'flex';
          existingIcon.style.zIndex = '10000';
        }
      } catch (error) {
        console.error('Error ensuring floating icon visibility:', error);
      }
    }
    */

    // Handle page visibility changes
    handlePageVisibilityChange() {
      if (!document.hidden) {
        // Page became visible, ensure icon is visible - DISABLED
        /*
        setTimeout(() => {
          this.ensureFloatingIconVisible();
        }, 500);
        */
      }
    }

    // Start page visibility monitoring - DISABLED
    /*
    startPageVisibilityMonitoring() {
      document.addEventListener('visibilitychange', () => {
        this.handlePageVisibilityChange();
      });
    }
    */

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

        // Deduplicate messages by messageId or text
        const seenIds = new Set();
        const seenTexts = new Set();
        const uniqueMessages = [];
        for (const m of messages) {
          const candidateId = m.messageId || String(this.simpleHash(`${m.text}|${m.type}|${m.timestamp || ''}`));
          const keyText = (m.text || '').trim();
          if (candidateId && !seenIds.has(candidateId) && keyText && !seenTexts.has(keyText)) {
            seenIds.add(candidateId);
            seenTexts.add(keyText);
            uniqueMessages.push({ ...m, messageId: candidateId });
          }
        }

        console.log(`Successfully extracted ${uniqueMessages.length} unique messages out of ${messageElements.length} elements`);
        
        // If still no messages, log more debug info
        if (uniqueMessages.length === 0) {
          console.error('No messages could be extracted. DOM structure may have changed significantly.');
          this.debugMessageExtraction();
        }
        
        return uniqueMessages;
      } catch (error) {
        console.error('Error extracting messages:', error);
        return [];
      }
    }

    // Find the conversation container using multiple selectors
    findConversationContainer() {
      const containerSelectors = [
        // Modern WhatsApp Web 2024 selectors
        'div[data-testid="conversation-panel-wrapper"]',
        'div[data-testid="conversation-panel"]',
        'div[data-testid="conversation-container"]',
        'div[data-testid="msg-container"]',
        'div[data-testid="conversation-message"]',
        
        // Alternative modern selectors
        'div[aria-label*="Messages"]',
        'div[aria-label*="conversation"]',
        'div[aria-label*="Chat"]',
        
        // Main container selectors
        '#main div[data-testid*="conversation"]',
        '#main div[role="application"]',
        '#main .copyable-area',
        '#main div[data-testid*="message"]',
        '#main div[data-testid*="bubble"]',
        
        // Fallback to main
        '#main'
      ];
      
      for (const selector of containerSelectors) {
        try {
          const container = document.querySelector(selector);
          if (container) {
            console.log(`Found conversation container with selector: ${selector}`);
            return container;
          }
        } catch (error) {
          console.log(`Error trying selector ${selector}:`, error);
        }
      }
      
      console.warn('Could not find conversation container with any selector');
      return document; // Fallback to document if no container found
    }

    // Get all message elements using multiple selectors
    getAllMessageElements() {
      const elements = [];
      
      console.log('Starting message extraction...');
      
      // Check if we're in an active chat conversation
      if (!this.isInActiveChat()) {
        console.log('Not in an active chat conversation - on main page or chat list');
        console.log('💡 To extract messages, please:');
        console.log('   1. Click on any chat from the left sidebar');
        console.log('   2. Wait for the conversation to load');
        console.log('   3. Then try extracting messages again');
        return elements;
      }
      
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
              if (el.textContent && 
                  el.textContent.trim().length > 0 && 
                  !elements.includes(el) &&
                  this.isValidMessageText(el.textContent.trim())) {
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
          if (textElement && 
              textElement.textContent && 
              textElement.textContent.trim().length > 0 &&
              this.isValidMessageText(textElement.textContent.trim())) {
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
              this.looksLikeMessageElement(el) &&
              this.isValidMessageText(el.textContent.trim())) {
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
              this.looksLikeMessageElement(el) &&
              this.isValidMessageText(el.textContent.trim())) {
            elements.push(el);
          }
        });
      }

      // Final validation: remove any elements that don't look like real messages
      const validElements = elements.filter(el => {
        const text = el.textContent.trim();
        return this.isValidMessageText(text);
      });

      console.log(`Total message elements found: ${elements.length}, valid messages: ${validElements.length}`);
      return validElements;
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

        // Additional validation: check if this looks like a real message
        if (!this.isValidMessageText(text)) {
          console.log(`Skipping element with invalid message text: "${text}"`);
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
          messageId: this.generateMessageId(text, this.extractTimestamp(container))
        };

        return messageData;
      } catch (error) {
        console.error('Error extracting message data:', error.message || error);
        console.error('Error details:', error);
        console.error('Element that caused error:', element);
        console.error('Container found:', container);
        return null;
      }
    }

    // Validate if text looks like a real message
    isValidMessageText(text) {
      if (!text || text.length < 2) return false;
      
      // Skip system messages, notifications, etc.
      const systemPatterns = [
        /^[📱📞📷🎵📄��👤🔒🔓]/,
        /^(You|You were|You are|You have)/i,
        /^(Messages|Chat|Group|Contact)/i,
        /^(Read|Delivered|Sent|Received)/i,
        /^(Today|Yesterday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i,
        /^\d{1,2}:\d{2}\s*(AM|PM)?$/i,
        /^[\s\.,!?]+$/,
        /^[^\w\s\.,!?]+$/ // Only special characters
      ];
      
      for (const pattern of systemPatterns) {
        if (pattern.test(text.trim())) {
          return false;
        }
      }
      
      // Must have some alphanumeric content
      const hasAlphanumeric = /[a-zA-Z0-9]/.test(text);
      if (!hasAlphanumeric && text.length < 10) {
        return false;
      }
      
      return true;
    }

    // Find message container by walking up DOM tree
    findMessageContainer(element) {
      let current = element;
      let depth = 0;
      const maxDepth = 5;
      
      while (current && depth < maxDepth) {
        if (current.classList && (
          current.classList.contains('message-in') ||
          current.classList.contains('message-out') ||
          current.getAttribute('data-testid')?.includes('message') ||
          current.getAttribute('data-testid')?.includes('bubble')
        )) {
          return current;
        }
        current = current.parentElement;
        depth++;
      }
      return null;
    }

    // Create virtual container for elements without proper containers
    createVirtualContainer(element) {
      const div = document.createElement('div');
      div.appendChild(element.cloneNode(true));
      div.setAttribute('data-testid', 'virtual-message-container');
      return div;
    }

    // Check if message is outgoing
    isOutgoingMessage(container) {
      try {
        return container.classList.contains('message-out') ||
               container.getAttribute('data-testid')?.includes('outgoing') ||
               container.querySelector('.message-out') !== null;
      } catch (error) {
        return false;
      }
    }

    // Clean text content
    cleanText(text) {
      if (!text) return '';
      return text.trim()
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, ' ')
        .replace(/^\s+|\s+$/g, '');
    }

    // Extract timestamp from message container
    extractTimestamp(container) {
      try {
        const timeElement = container.querySelector('[data-testid="msg-meta"] time') ||
                           container.querySelector('time') ||
                           container.querySelector('.copyable-text time');
        
        if (timeElement) {
          const datetime = timeElement.getAttribute('datetime') || timeElement.textContent;
          return new Date(datetime).getTime() || Date.now();
        }
        
        return Date.now();
      } catch (error) {
        return Date.now();
      }
    }

    // Check if message has media
    hasMedia(container) {
      try {
        return container.querySelector('[data-testid*="canvas"]') !== null ||
               container.querySelector('img') !== null ||
               container.querySelector('video') !== null ||
               container.querySelector('audio') !== null;
      } catch (error) {
        return false;
      }
    }

    // Check if message has reactions
    hasReactions(container) {
      try {
        return container.querySelector('[data-testid="reaction"]') !== null ||
               container.querySelector('.reaction') !== null;
      } catch (error) {
        return false;
      }
    }

    // Extract sender information
    extractSender(container, isOutgoing) {
      try {
        if (isOutgoing) {
          return 'You';
        }
        
        const senderElement = container.querySelector('[data-testid="msg-meta"] span') ||
                             container.querySelector('.copyable-text span');
        
        return senderElement ? senderElement.textContent.trim() : 'Unknown';
      } catch (error) {
        return isOutgoing ? 'You' : 'Unknown';
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
    async getCurrentChatInfo() {
      try {
        console.log('=== EXTRACTING CURRENT CHAT INFO ===');
        
        // Use the comprehensive extraction method first
        console.log('=== USING COMPREHENSIVE CHAT TITLE EXTRACTION ===');
        let autoChatTitle = await this.extractChatTitleComprehensive();
        
        // If comprehensive method fails, try individual methods
        if (!autoChatTitle) {
          console.log('Comprehensive method failed, trying individual methods...');
          
          // PRIORITY 1: Extract chat title from WhatsApp Web header automatically
          console.log('=== PRIORITY 1: Extracting chat title from WhatsApp Web ===');
          autoChatTitle = this.extractChatTitleFromWhatsApp();
          if (!autoChatTitle) {
            await new Promise(r => setTimeout(r, 300));
            autoChatTitle = this.extractChatTitleFromWhatsApp();
          }
        }
        
        if (autoChatTitle) {
          const chatId = this.generateChatId(autoChatTitle);
          this.currentChatId = chatId;
          
          console.log('Successfully extracted chat title:', { id: chatId, title: autoChatTitle });
          
          return {
            id: chatId,
            title: autoChatTitle,
            isGroup: this.isGroupChat(),
            timestamp: Date.now(),
            isAutoExtracted: true
          };
        }

        // PRIORITY 2: Try page title extraction
        console.log('=== PRIORITY 2: Trying page title extraction ===');
        const pageTitle = document.title;
        if (pageTitle && pageTitle.includes(' - ')) {
          const extractedTitle = pageTitle.split(' - ')[0].trim();
          if (extractedTitle && extractedTitle !== 'WhatsApp' && extractedTitle.length > 2) {
            const chatId = this.generateChatId(extractedTitle);
            this.currentChatId = chatId;
            
            console.log('Extracted chat title from page title:', { id: chatId, title: extractedTitle });
            
            return {
              id: chatId,
              title: extractedTitle,
              isGroup: this.isGroupChat(),
              timestamp: Date.now(),
              isAutoExtracted: true
            };
          }
        }

        // PRIORITY 3: Try URL path extraction
        console.log('=== PRIORITY 3: Trying URL path extraction ===');
        const url = window.location.href;
        if (url.includes('/chat/')) {
          const chatPart = url.split('/chat/')[1];
          if (chatPart) {
            const extractedTitle = decodeURIComponent(chatPart.split('/')[0]);
            if (extractedTitle && extractedTitle.length > 2) {
              const chatId = this.generateChatId(extractedTitle);
              this.currentChatId = chatId;
              
              console.log('Extracted chat title from URL:', { id: chatId, title: extractedTitle });
              
              return {
                id: chatId,
                title: extractedTitle,
                isGroup: this.isGroupChat(),
                timestamp: Date.now(),
                isAutoExtracted: true
              };
            }
          }
        }

        // PRIORITY 4: Try to find any visible chat title text
        console.log('=== PRIORITY 4: Looking for visible chat title text ===');
        const visibleTitle = this.findVisibleChatTitle();
        if (visibleTitle) {
          const chatId = this.generateChatId(visibleTitle);
          this.currentChatId = chatId;
          
          console.log('Found visible chat title:', { id: chatId, title: visibleTitle });
          
          return {
            id: chatId,
            title: visibleTitle,
            isGroup: this.isGroupChat(),
            timestamp: Date.now(),
            isAutoExtracted: true
          };
        }

        // If all automatic methods fail, try selected chat in list (left pane)
        console.log('=== PRIORITY 5: Checking selected chat item ===');
        const selected = document.querySelector('[aria-selected="true"][role="row"], div[role="gridcell"][data-selected="true"], div[tabindex="0"][data-testid="cell-frame-container"]');
        if (selected) {
          const titleEl = selected.querySelector('span[data-testid="conversation-title"], span[title], h3, h2');
          const text = (titleEl && (titleEl.getAttribute('title') || (titleEl.textContent || '').trim())) || '';
          if (text && text.length > 1 && text !== 'WhatsApp') {
            const chatId = this.generateChatId(text);
            this.currentChatId = chatId;
            return {
              id: chatId,
              title: text,
              isGroup: this.isGroupChat(),
              timestamp: Date.now(),
              isAutoExtracted: true
            };
          }
        }

        // Final fallback: Try to extract from any visible text that looks like a chat name
        console.log('=== FINAL FALLBACK: Looking for any chat-like text ===');
        const fallbackTitle = this.findAnyChatLikeText();
        if (fallbackTitle) {
          const chatId = this.generateChatId(fallbackTitle);
          this.currentChatId = chatId;
          
          console.log('Found fallback chat title:', { id: chatId, title: fallbackTitle });
          
          return {
            id: chatId,
            title: fallbackTitle,
            isGroup: this.isGroupChat(),
            timestamp: Date.now(),
            isAutoExtracted: false
          };
        }

        // Ultimate fallback to Unknown Chat
        console.warn('All chat title extraction methods failed');
        const chatId = this.generateChatId('Unknown Chat');
        this.currentChatId = chatId;

        return {
          id: chatId,
          title: 'Unknown Chat',
          isGroup: this.isGroupChat(),
          timestamp: Date.now(),
          isAutoExtracted: false
        };
      } catch (error) {
        console.error('Error getting chat info:', error);
        return {
          id: 'unknown_chat',
          title: 'Unknown Chat',
          isGroup: false,
          timestamp: Date.now(),
          isAutoExtracted: false
        };
      }
    }

    // Enhanced chat title extraction with dynamic detection
    extractChatTitleFromWhatsApp() {
      try {
        console.log('=== ENHANCED CHAT TITLE EXTRACTION ===');
        
        // Method 1: Try to find the currently active/selected chat in the sidebar
        const activeChatTitle = this.findActiveChatTitle();
        if (activeChatTitle) {
          console.log('✅ Found active chat title from sidebar:', activeChatTitle);
          return activeChatTitle;
        }
        
        // Method 2: Try to find the header title of the current conversation
        const headerTitle = this.findHeaderTitle();
        if (headerTitle) {
          console.log('✅ Found header title:', headerTitle);
          return headerTitle;
        }
        
        // Method 3: Try to find the most relevant title based on current messages
        const messageBasedTitle = this.findMessageBasedTitle();
        if (messageBasedTitle) {
          console.log('✅ Found message-based title:', messageBasedTitle);
          return messageBasedTitle;
        }
        
        // Method 4: Try URL-based extraction for newer WhatsApp versions
        const urlBasedTitle = this.extractTitleFromURL();
        if (urlBasedTitle) {
          console.log('✅ Found URL-based title:', urlBasedTitle);
          return urlBasedTitle;
        }
        
        // Method 5: Try page title extraction
        const pageTitle = this.extractTitleFromPageTitle();
        if (pageTitle) {
          console.log('✅ Found page title:', pageTitle);
          return pageTitle;
        }
        
        console.log('❌ No chat title found using any method');
        return null;
        
      } catch (error) {
        console.error('Error in enhanced chat title extraction:', error);
        return null;
      }
    }
    
    // Find the currently active/selected chat in the sidebar
    findActiveChatTitle() {
      try {
        console.log('🔍 Looking for active chat in sidebar...');
        
        // Updated selectors for current WhatsApp Web version
        const selectors = [
          // Primary selectors for selected chat
          '[data-testid="cell-frame-container"][aria-selected="true"] [data-testid="conversation-title"]',
          '[data-testid="cell-frame-container"][aria-selected="true"] span[title]',
          '[data-testid="cell-frame-container"][aria-selected="true"] ._ao3e',
          '[data-testid="cell-frame-container"][aria-selected="true"] h3',
          '[data-testid="cell-frame-container"][aria-selected="true"] h2',
          
          // Alternative selectors for highlighted/active chat
          '[data-testid="cell-frame-container"]:has([data-testid="conversation-title"])',
          '[data-testid="cell-frame-container"]:has(span[title])',
          
          // Legacy selectors
          '.chat-list-item.selected .chat-title',
          '.chat-list-item.active .chat-title',
          '.chat-item.selected .chat-title',
          '.chat-item.active .chat-title'
        ];
        
        for (const selector of selectors) {
          try {
            const elements = document.querySelectorAll(selector);
            console.log(`Selector "${selector}" found ${elements.length} elements`);
            
            for (const element of elements) {
              if (element && element.textContent && element.textContent.trim()) {
                const title = element.textContent.trim();
                if (title && title !== 'WhatsApp' && title.length > 1) {
                  console.log('Found selected chat title:', title);
                  return title;
                }
              }
            }
          } catch (e) {
            console.log(`Selector "${selector}" failed:`, e.message);
          }
        }
        
        // Fallback: Look for any highlighted chat by visual indicators
        const allChats = document.querySelectorAll('[data-testid="cell-frame-container"]');
        for (const chat of allChats) {
          try {
            const computedStyle = window.getComputedStyle(chat);
            const backgroundColor = computedStyle.backgroundColor;
            const borderColor = computedStyle.borderColor;
            
            // Check if this chat appears to be selected/highlighted
            if (backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                backgroundColor !== 'transparent' &&
                backgroundColor !== 'rgb(255, 255, 255)' &&
                backgroundColor !== '#ffffff') {
              
              const titleElement = chat.querySelector('[data-testid="conversation-title"], span[title], ._ao3e, h3, h2');
              if (titleElement && titleElement.textContent.trim()) {
                const title = titleElement.textContent.trim();
                if (title && title !== 'WhatsApp' && title.length > 1) {
                  console.log('Found highlighted chat title by CSS:', title);
                  return title;
                }
              }
            }
          } catch (e) {
            console.log('Error checking chat highlight:', e.message);
          }
        }
        
        return null;
      } catch (error) {
        console.error('Error finding active chat title:', error);
        return null;
      }
    }
    
    // Find the header title of the current conversation
    findHeaderTitle() {
      try {
        console.log('🔍 Looking for header title...');
        
        // Updated selectors for current WhatsApp Web header
        const headerSelectors = [
          // Primary header selectors
          '[data-testid="conversation-title"]',
          '[data-testid="conversation-info-header"] [data-testid="conversation-title"]',
          '[data-testid="conversation-info-header"] span',
          '[data-testid="chat-header"] [data-testid="conversation-title"]',
          '[data-testid="chat-header"] span',
          
          // Alternative header selectors
          'header [data-testid="conversation-title"]',
          'header span[title]',
          'header h1',
          'header h2',
          'header h3',
          
          // Legacy selectors
          '.conversation-header span',
          '.chat-header span',
          '.header-title',
          '.conversation-title'
        ];
        
        for (const selector of headerSelectors) {
          try {
            const element = document.querySelector(selector);
            if (element && element.textContent && element.textContent.trim()) {
              const title = element.textContent.trim();
              if (title && title !== 'WhatsApp' && title.length > 1) {
                console.log('Found header title with selector', selector, ':', title);
                return title;
              }
            }
          } catch (e) {
            console.log(`Header selector "${selector}" failed:`, e.message);
          }
        }
        
        // Try to find any text in the header area that looks like a chat title
        const headerArea = document.querySelector('header, [data-testid="conversation-info-header"], .conversation-header, .chat-header');
        if (headerArea) {
          const textElements = headerArea.querySelectorAll('span, h1, h2, h3, div');
          for (const element of textElements) {
            if (element && element.textContent && element.textContent.trim()) {
              const text = element.textContent.trim();
              if (text && text !== 'WhatsApp' && text.length > 1 && text.length < 100) {
                // Check if this looks like a chat title (not a button, status, etc.)
                const isLikelyTitle = !text.includes('•') && 
                                    !text.includes('online') && 
                                    !text.includes('last seen') &&
                                    !text.includes('typing') &&
                                    !text.includes('recording') &&
                                    !text.includes('📷') &&
                                    !text.includes('🎤');
                
                if (isLikelyTitle) {
                  console.log('Found likely header title:', text);
                  return text;
                }
              }
            }
          }
        }
        
        return null;
      } catch (error) {
        console.error('Error finding header title:', error);
        return null;
      }
    }
    
    // Extract title from URL (for newer WhatsApp versions)
    extractTitleFromURL() {
      try {
        console.log('🔍 Looking for title in URL...');
        const url = window.location.href;
        
        // Check for chat ID in URL
        if (url.includes('/chat/')) {
          const chatPart = url.split('/chat/')[1];
          if (chatPart) {
            const chatId = chatPart.split('/')[0];
            if (chatId && chatId.length > 5) { // Likely a phone number or chat ID
              console.log('Found chat ID in URL:', chatId);
              return `Chat ${chatId}`;
            }
          }
        }
        
        // Check for phone number in URL
        const phoneMatch = url.match(/(\d{10,})/);
        if (phoneMatch) {
          const phone = phoneMatch[1];
          console.log('Found phone number in URL:', phone);
          return `+${phone}`;
        }
        
        return null;
      } catch (error) {
        console.error('Error extracting title from URL:', error);
        return null;
      }
    }
    
    // Extract title from page title
    extractTitleFromPageTitle() {
      try {
        console.log('🔍 Looking for title in page title...');
        const pageTitle = document.title;
        
        if (pageTitle && pageTitle.includes(' - ')) {
          const parts = pageTitle.split(' - ');
          if (parts.length >= 2) {
            const firstPart = parts[0].trim();
            if (firstPart && firstPart !== 'WhatsApp' && firstPart.length > 1) {
              console.log('Found title in page title:', firstPart);
              return firstPart;
            }
          }
        }
        
        // Check if page title itself is a chat name
        if (pageTitle && pageTitle !== 'WhatsApp' && pageTitle.length > 1 && pageTitle.length < 100) {
          console.log('Page title itself is chat name:', pageTitle);
          return pageTitle;
        }
        
        return null;
      } catch (error) {
        console.error('Error extracting title from page title:', error);
        return null;
      }
    }
    
    // Find title based on current messages context
    findMessageBasedTitle() {
      try {
        console.log('🔍 Looking for message-based title...');
        
        // Get current messages to understand context
        const messages = this.extractMessages();
        if (!messages || messages.length === 0) return null;
        
        // Look for sender names in group chats or specific patterns
        const senderElements = document.querySelectorAll('[data-testid="author"], .message-author, .sender-name');
        const senders = new Set();
        
        senderElements.forEach(element => {
          if (element.textContent.trim()) {
            senders.add(element.textContent.trim());
          }
        });
        
        // If we found senders, use the first one as potential chat title
        if (senders.size > 0) {
          const firstSender = Array.from(senders)[0];
          console.log('Found sender-based title:', firstSender);
          return firstSender;
        }
        
        // Look for any unique text that might be a chat identifier
        const uniqueTexts = new Set();
        messages.forEach(msg => {
          if (msg.text && msg.text.length > 3 && msg.text.length < 50) {
            uniqueTexts.add(msg.text);
          }
        });
        
        // Return the most recent unique text as potential title
        if (uniqueTexts.size > 0) {
          const recentText = Array.from(uniqueTexts).pop();
          console.log('Found text-based title:', recentText);
          return recentText;
        }
        
        return null;
      } catch (error) {
        console.error('Error finding message-based title:', error);
        return null;
      }
    }
    
    // Comprehensive chat title extraction with multiple fallbacks
    async extractChatTitleComprehensive() {
      try {
        console.log('=== COMPREHENSIVE CHAT TITLE EXTRACTION ===');
        
        // Wait a bit for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try multiple extraction methods in order of reliability
        const methods = [
          () => this.findActiveChatTitle(),
          () => this.findHeaderTitle(),
          () => this.extractTitleFromURL(),
          () => this.extractTitleFromPageTitle(),
          () => this.findMessageBasedTitle(),
          () => this.findChatTitleFromDOM(),
          () => this.findChatTitleFromNavigation()
        ];
        
        for (let i = 0; i < methods.length; i++) {
          try {
            console.log(`Trying method ${i + 1}...`);
            const title = methods[i]();
            if (title && title !== 'WhatsApp' && title.length > 1) {
              console.log(`✅ Method ${i + 1} succeeded:`, title);
              return title;
            }
          } catch (error) {
            console.log(`Method ${i + 1} failed:`, error.message);
          }
        }
        
        console.log('❌ All methods failed');
        return null;
        
      } catch (error) {
        console.error('Error in comprehensive chat title extraction:', error);
        return null;
      }
    }
    
    // Find chat title by examining DOM structure
    findChatTitleFromDOM() {
      try {
        console.log('🔍 Looking for chat title in DOM structure...');
        
        // Look for any element that might contain a chat title
        const possibleSelectors = [
          '[data-testid*="title"]',
          '[data-testid*="name"]',
          '[data-testid*="header"]',
          '[class*="title"]',
          '[class*="name"]',
          '[class*="header"]',
          'h1', 'h2', 'h3', 'h4',
          'span[title]',
          'div[title]'
        ];
        
        for (const selector of possibleSelectors) {
          try {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
              if (element && element.textContent && element.textContent.trim()) {
                const text = element.textContent.trim();
                if (text && text !== 'WhatsApp' && text.length > 1 && text.length < 100) {
                  // Check if this looks like a chat title
                  const isLikelyTitle = !text.includes('•') && 
                                      !text.includes('online') && 
                                      !text.includes('last seen') &&
                                      !text.includes('typing') &&
                                      !text.includes('recording') &&
                                      !text.includes('📷') &&
                                      !text.includes('🎤') &&
                                      !text.includes('WhatsApp') &&
                                      !text.includes('Web') &&
                                      !text.includes('Settings') &&
                                      !text.includes('Search');
                  
                  if (isLikelyTitle) {
                    console.log('Found likely title in DOM:', text);
                    return text;
                  }
                }
              }
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        return null;
      } catch (error) {
        console.error('Error finding chat title from DOM:', error);
        return null;
      }
    }
    
    // Find chat title from navigation elements
    findChatTitleFromNavigation() {
      try {
        console.log('🔍 Looking for chat title in navigation...');
        
        // Look for breadcrumbs or navigation elements
        const navSelectors = [
          '[data-testid="breadcrumb"]',
          '.breadcrumb',
          '.navigation',
          '.nav-item',
          '[role="navigation"]'
        ];
        
        for (const selector of navSelectors) {
          try {
            const element = document.querySelector(selector);
            if (element && element.textContent && element.textContent.trim()) {
              const text = element.textContent.trim();
              if (text && text !== 'WhatsApp' && text.length > 1 && text.length < 100) {
                console.log('Found title in navigation:', text);
                return text;
              }
            }
          } catch (e) {
            // Continue to next selector
          }
        }
        
        return null;
      } catch (error) {
        console.error('Error finding chat title from navigation:', error);
        return null;
      }
    }
    
    // Find any text that looks like it could be a chat name
    findAnyChatLikeText() {
      try {
        console.log('🔍 Looking for any chat-like text on the page...');
        
        // Look for any text elements that might contain a chat name
        const textElements = document.querySelectorAll('span, div, h1, h2, h3, h4, p, a');
        const potentialTitles = [];
        
        for (const element of textElements) {
          try {
            if (element && element.textContent && element.textContent.trim()) {
              const text = element.textContent.trim();
              
              // Check if this text looks like it could be a chat name
              if (text && 
                  text !== 'WhatsApp' && 
                  text !== 'Web' &&
                  text.length > 2 && 
                  text.length < 50 &&
                  !text.includes('•') &&
                  !text.includes('online') &&
                  !text.includes('last seen') &&
                  !text.includes('typing') &&
                  !text.includes('recording') &&
                  !text.includes('📷') &&
                  !text.includes('🎤') &&
                  !text.includes('Settings') &&
                  !text.includes('Search') &&
                  !text.includes('Menu') &&
                  !text.includes('More') &&
                  !text.includes('Close') &&
                  !text.includes('Send') &&
                  !text.includes('Type a message') &&
                  !text.includes('Search or start new chat') &&
                  !text.match(/^\d+$/) && // Not just numbers
                  !text.match(/^[^\w\s]+$/) && // Not just symbols
                  text.match(/^[a-zA-Z\s\u00C0-\u017F\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]+$/) // Contains letters
                  ) {
                
                potentialTitles.push({
                  text: text,
                  element: element,
                  score: this.scoreChatTitle(text)
                });
              }
            }
          } catch (e) {
            // Continue to next element
          }
        }
        
        // Sort by score and return the best candidate
        if (potentialTitles.length > 0) {
          potentialTitles.sort((a, b) => b.score - a.score);
          const bestTitle = potentialTitles[0];
          console.log('Found potential chat title:', bestTitle.text, 'with score:', bestTitle.score);
          return bestTitle.text;
        }
        
        return null;
      } catch (error) {
        console.error('Error finding any chat-like text:', error);
        return null;
      }
    }
    
    // Score a potential chat title based on likelihood
    scoreChatTitle(text) {
      let score = 0;
      
      // Higher score for shorter names (more likely to be chat names)
      if (text.length <= 20) score += 5;
      else if (text.length <= 30) score += 3;
      else score += 1;
      
      // Higher score for names that look like real names
      if (text.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/)) score += 10; // First Last
      if (text.match(/^[A-Z][a-z]+$/)) score += 8; // Single name
      if (text.match(/^[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+$/)) score += 6; // First Middle Last
      
      // Lower score for names that look like system text
      if (text.match(/^(Chat|Group|Channel|Broadcast)$/i)) score -= 5;
      if (text.match(/^(New|Create|Add|Edit|Delete)$/i)) score -= 3;
      
      // Higher score for names with proper capitalization
      if (text.match(/^[A-Z]/)) score += 2;
      
      // Lower score for names that are too generic
      if (text.match(/^(Hello|Hi|Hey|Good|Morning|Afternoon|Evening|Night)$/i)) score -= 8;
      
      return score;
    }

    // Manual chat title refresh for different chat
    refreshChatTitleForDifferentChat() {
      try {
        console.log('=== MANUAL CHAT TITLE REFRESH FOR DIFFERENT CHAT ===');
        
        // Clear all cached data
        this.clearChatCache();
        
        // Wait for DOM to settle
        setTimeout(() => {
          // Try to extract new chat title using enhanced method
          const newTitle = this.extractChatTitleFromWhatsApp();
          
          if (newTitle && newTitle !== 'Python ppt') {
            console.log('✅ Successfully refreshed chat title:', newTitle);
            
            // Update current chat info
            this.currentChatTitle = newTitle;
            this.currentChatId = this.generateChatId(newTitle);
            this.lastKnownChatTitle = newTitle;
            
            // Update message fingerprint
            const currentMessages = this.extractMessages();
            if (currentMessages && currentMessages.length > 0) {
              this.lastMessageFingerprint = this.createMessageFingerprint(currentMessages);
              this.lastMessageCount = currentMessages.length;
            }
            
            // Notify background service
            chrome.runtime.sendMessage({
              action: 'chatChanged',
              data: {
                oldChatId: null,
                newChatInfo: {
                  id: this.currentChatId,
                  title: newTitle,
                  isGroup: this.isGroupChat(),
                  timestamp: Date.now()
                },
                timestamp: Date.now()
              }
            });
            
            return newTitle;
          } else {
            console.log('❌ Failed to refresh chat title or got same title');
            return null;
          }
        }, 2000);
        
      } catch (error) {
        console.error('Error in manual chat title refresh:', error);
        return null;
      }
    }

    // Enhanced chat change monitoring
    startChatChangeMonitoring() {
      console.log('=== STARTING ENHANCED CHAT CHANGE MONITORING ===');
      
      // Monitor URL changes
      let lastUrl = window.location.href;
      
      const checkUrlChange = () => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
          console.log('URL changed, possible chat switch detected');
          lastUrl = currentUrl;
          
          // Wait for DOM to update, then check for chat change
          setTimeout(() => {
            this.handleChatChange();
          }, 2000);
        }
      };
      
      // Check URL every 3 seconds
      setInterval(checkUrlChange, 3000);
      
      // Monitor for navigation events
      window.addEventListener('popstate', () => {
        setTimeout(() => {
          this.handleChatChange();
        }, 1000);
      });
      
      // Monitor DOM changes in conversation area
      this.startDOMChangeMonitoring();
      
      // Monitor message content changes
      this.startMessageContentMonitoring();
      
      console.log('Enhanced chat change monitoring started');
    }
    
    // Monitor message content changes
    startMessageContentMonitoring() {
      try {
        console.log('Starting message content monitoring...');
        
        // Check for chat changes every 5 seconds
        setInterval(() => {
          const chatChanged = this.detectChatChangeByMessages();
          if (chatChanged) {
            console.log('Chat change detected by message monitoring!');
            this.handleChatChange();
          }
        }, 5000);
        
      } catch (error) {
        console.error('Error starting message content monitoring:', error);
      }
    }
    
    // Create a fingerprint of messages for change detection
    createMessageFingerprint(messages) {
      try {
        if (!messages || messages.length === 0) return '';
        
        // Take first few and last few messages to create fingerprint
        const firstMessages = messages.slice(0, 3).map(m => m.text || '').join('|');
        const lastMessages = messages.slice(-3).map(m => m.text || '').join('|');
        const messageCount = messages.length;
        
        return `${firstMessages}|${lastMessages}|${messageCount}`;
      } catch (error) {
        console.error('Error creating message fingerprint:', error);
        return '';
      }
    }
    
    // Check if messages have significantly changed
    hasMessagesSignificantlyChanged(oldFingerprint, newFingerprint, oldCount, newCount) {
      try {
        // If message count changed significantly
        if (Math.abs(newCount - oldCount) > 5) {
          console.log('Message count changed significantly:', oldCount, '->', newCount);
          return true;
        }
        
        // If fingerprint is completely different
        if (oldFingerprint && newFingerprint && oldFingerprint !== newFingerprint) {
          // Check if it's just a few new messages or a completely different chat
          const oldParts = oldFingerprint.split('|');
          const newParts = newFingerprint.split('|');
          
          // If first messages are completely different, it's likely a different chat
          if (oldParts[0] && newParts[0] && oldParts[0] !== newParts[0]) {
            console.log('First messages changed, likely different chat');
            return true;
          }
        }
        
        return false;
      } catch (error) {
        console.error('Error checking message change:', error);
        return false;
      }
    }

    // Global function to test enhanced chat title detection
    testEnhancedChatTitleDetection() {
      try {
        console.log('=== TESTING ENHANCED CHAT TITLE DETECTION ===');
        
        console.log('🔍 Method 1: Active chat in sidebar');
        const activeTitle = this.findActiveChatTitle();
        console.log('Result:', activeTitle);
        
        console.log('🔍 Method 2: Header title');
        const headerTitle = this.findHeaderTitle();
        console.log('Result:', headerTitle);
        
        console.log('🔍 Method 3: Message-based title');
        const messageTitle = this.findMessageBasedTitle();
        console.log('Result:', messageTitle);
        
        console.log('🔍 Method 4: Overall enhanced extraction');
        const overallTitle = this.extractChatTitleFromWhatsApp();
        console.log('Result:', overallTitle);
        
        // Show current message fingerprint
        const currentMessages = this.extractMessages();
        if (currentMessages && currentMessages.length > 0) {
          const fingerprint = this.createMessageFingerprint(currentMessages);
          console.log('Current message fingerprint:', fingerprint);
          console.log('Message count:', currentMessages.length);
        }
        
        return {
          activeTitle,
          headerTitle,
          messageTitle,
          overallTitle
        };
        
      } catch (error) {
        console.error('Error in test enhanced chat title detection:', error);
        return null;
      }
    }

    // Make functions globally accessible for debugging
    makeFunctionsGlobal() {
      try {
        // Make the main instance globally accessible
        window.messageExtractor = this;
        
        // Make individual functions globally accessible
        window.testEnhancedChatTitleDetection = () => this.testEnhancedChatTitleDetection();
        window.refreshChatTitleForDifferentChat = () => this.refreshChatTitleForDifferentChat();
        window.clearChatCache = () => this.clearChatCache();
        window.extractChatTitleFromWhatsApp = () => this.extractChatTitleFromWhatsApp();
        window.findActiveChatTitle = () => this.findActiveChatTitle();
        window.findHeaderTitle = () => this.findHeaderTitle();
        window.findMessageBasedTitle = () => this.findMessageBasedTitle();
        
        console.log('✅ Debug functions made globally accessible');
        console.log('Available functions:');
        console.log('- testEnhancedChatTitleDetection()');
        console.log('- refreshChatTitleForDifferentChat()');
        console.log('- clearChatCache()');
        console.log('- extractChatTitleFromWhatsApp()');
        console.log('- findActiveChatTitle()');
        console.log('- findHeaderTitle()');
        console.log('- findMessageBasedTitle()');
        
      } catch (error) {
        console.error('Error making functions global:', error);
      }
    }

    // Initialize the message extractor
    init() {
      try {
        console.log('=== INITIALIZING ENHANCED MESSAGE EXTRACTOR ===');
        
        // Make debug functions globally accessible
        this.makeFunctionsGlobal();
        
        // Start monitoring
        this.startChatChangeMonitoring();
        this.startWhatsAppMessageMonitoring();
        this.startAggressiveChatMonitoring();
        
        console.log('✅ Enhanced message extractor initialized successfully');
        
      } catch (error) {
        console.error('Error initializing enhanced message extractor:', error);
      }
    }

    // Generate a stable chat ID from chat title
    generateChatId(chatTitle) {
      if (!chatTitle || chatTitle === 'Unknown Chat' || chatTitle === 'WhatsApp') {
        return 'unknown_chat_' + Date.now();
      }
      
      // Create a stable ID from the chat title
      return 'chat_' + chatTitle.toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    }

    // Generate a stable message ID
    generateMessageId(text, timestamp = Date.now()) {
      if (!text || text.trim().length === 0) {
        return 'msg_' + timestamp + '_' + Math.random().toString(36).substr(2, 9);
      }
      
      // Create a stable ID from the message text and timestamp
      const textHash = this.simpleHash(text.trim());
      return 'msg_' + timestamp + '_' + textHash;
    }

    // Simple hash function for text
    simpleHash(str) {
      let hash = 0;
      if (str.length === 0) return hash.toString();
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(36);
    }

    // Check if we're in an active chat conversation (2025 WhatsApp Web)
    isInActiveChat() {
      try {
        console.log('=== CHECKING IF IN ACTIVE CHAT (2025) ===');
        
        // Look for conversation-specific elements
        const conversationContainer = this.findConversationContainer();
        if (!conversationContainer) {
          console.log('❌ No conversation container found');
          return false;
        }
        
        // Check if we're in a conversation (not on main page)
        const backButton = document.querySelector('[data-testid="back-button"]') ||
                          document.querySelector('.back-button') ||
                          document.querySelector('[aria-label*="Back"]') ||
                          document.querySelector('[aria-label*="back"]');
        
        const isInConversation = !!backButton;
        
        // Check for message input field
        const messageInput = document.querySelector('[data-testid="conversation-compose-box-input"]') ||
                           document.querySelector('[data-testid="compose-box-input"]') ||
                           document.querySelector('[data-testid="input"]') ||
                           document.querySelector('[contenteditable="true"]') ||
                           document.querySelector('div[role="textbox"]') ||
                           document.querySelector('div[contenteditable]');
        
        const hasMessageInput = !!messageInput;
        
        // Check for conversation header
        const conversationHeader = document.querySelector('[data-testid="conversation-header"]') ||
                                 document.querySelector('[data-testid="chat-header"]') ||
                                 document.querySelector('header') ||
                                 document.querySelector('[role="banner"]');
        
        const hasConversationHeader = !!conversationHeader;
        
        // Check for message bubbles
        const messageBubbles = document.querySelectorAll('[data-testid*="message"], [data-testid*="bubble"], [data-testid*="conversation"]');
        const hasMessageBubbles = messageBubbles.length > 0;
        
        // Check if we're not on the main chat list page
        const isOnMainPage = document.querySelector('[data-testid="chat-list"]') ||
                            document.querySelector('[data-testid="conversation-list"]') ||
                            document.querySelector('[data-testid="main-panel"]');
        
        const notOnMainPage = !isOnMainPage;
        
        console.log('Active chat check results:', {
          hasConversationContainer: !!conversationContainer,
          hasBackButton: isInConversation,
          hasMessageInput: hasMessageInput,
          hasConversationHeader: hasConversationHeader,
          hasMessageBubbles: hasMessageBubbles,
          notOnMainPage: notOnMainPage
        });
        
        // Multiple indicators that we're in an active chat
        const indicators = [
          isInConversation,
          hasMessageInput,
          hasConversationHeader,
          hasMessageBubbles,
          notOnMainPage
        ];
        
        const activeChatScore = indicators.filter(Boolean).length;
        console.log(`Active chat score: ${activeChatScore}/${indicators.length}`);
        
        // Need at least 2 indicators to be confident we're in an active chat
        return activeChatScore >= 2;
        
      } catch (error) {
        console.error('Error checking if in active chat:', error);
        return false;
      }
    }

    // Check if current chat is a group chat
    isGroupChat() {
      try {
        // Look for group indicators in the chat
        const groupIndicators = [
          '[data-testid="group-info-drawer"]',
          '[data-testid="group-info"]',
          '[data-testid="group-header"]',
          '.group-info',
          '.group-header'
        ];
        
        for (const selector of groupIndicators) {
          if (document.querySelector(selector)) {
            return true;
          }
        }
        
        // Check if chat title contains group indicators
        if (this.currentChatTitle && (
          this.currentChatTitle.includes('Group') ||
          this.currentChatTitle.includes('group') ||
          this.currentChatTitle.includes('Broadcast')
        )) {
          return true;
        }
        
        return false;
      } catch (error) {
        console.log('Error checking if group chat:', error);
        return false;
      }
    }

    // Debug message extraction (2025 WhatsApp Web)
    debugMessageExtraction() {
      try {
        console.log('=== DEBUGGING MESSAGE EXTRACTION (2025) ===');
        
        // Check conversation container
        const container = this.findConversationContainer();
        console.log('Conversation container:', container);
        
        // Check all message selectors
        this.messageSelectors.forEach((selector, index) => {
          try {
            const elements = container.querySelectorAll(selector);
            console.log(`Selector ${index + 1} (${selector}): found ${elements.length} elements`);
            if (elements.length > 0) {
              console.log('Sample element:', elements[0]);
            }
          } catch (error) {
            console.log(`Error with selector ${selector}:`, error);
          }
        });
        
        // Check DOM structure
        console.log('Document ready state:', document.readyState);
        console.log('Main container exists:', !!document.querySelector('#main'));
        console.log('Conversation panel exists:', !!document.querySelector('[data-testid="conversation-panel-wrapper"]'));
        
        // Additional 2025 WhatsApp Web debugging
        this.debugWhatsAppStructure();
        
      } catch (error) {
        console.error('Error in debugMessageExtraction:', error);
      }
    }

    // Debug WhatsApp Web structure for 2025
    debugWhatsAppStructure() {
      try {
        console.log('=== DEBUGGING WHATSAPP STRUCTURE (2025) ===');
        
        // Check for main containers
        const main = document.querySelector('#main');
        const mainPanel = document.querySelector('[data-testid="main-panel"]');
        const chatList = document.querySelector('[data-testid="chat-list"]');
        const conversationPanel = document.querySelector('[data-testid="conversation-panel-wrapper"]');
        
        console.log('Main containers:', {
          main: !!main,
          mainPanel: !!mainPanel,
          chatList: !!chatList,
          conversationPanel: !!conversationPanel
        });
        
        // Check for any elements with data-testid
        const allTestIds = document.querySelectorAll('[data-testid]');
        const testIdCounts = {};
        
        allTestIds.forEach(element => {
          const testId = element.getAttribute('data-testid');
          testIdCounts[testId] = (testIdCounts[testId] || 0) + 1;
        });
        
        console.log('Data-testid elements found:', testIdCounts);
        
        // Check for any text content
        const allTextElements = document.querySelectorAll('span, div, p, h1, h2, h3, h4');
        const textElements = Array.from(allTextElements).filter(el => 
          el.textContent && el.textContent.trim().length > 0
        );
        
        console.log(`Text elements found: ${textElements.length}`);
        
        // Show first few text elements
        textElements.slice(0, 10).forEach((el, index) => {
          const text = el.textContent.trim().substring(0, 50);
          const testId = el.getAttribute('data-testid') || 'none';
          const className = el.className || 'none';
          console.log(`Text ${index + 1}: "${text}" (testid: ${testId}, class: ${className})`);
        });
        
        // Check for any clickable elements
        const clickableElements = document.querySelectorAll('[onclick], [role="button"], [tabindex], [aria-label*="Chat"]');
        console.log(`Clickable elements found: ${clickableElements.length}`);
        
        // Check for any message-like elements
        const messageElements = document.querySelectorAll('[data-testid*="message"], [data-testid*="bubble"], [data-testid*="conversation"]');
        console.log(`Message elements found: ${messageElements.length}`);
        
      } catch (error) {
        console.error('Error debugging WhatsApp structure:', error);
      }
    }

    // Force refresh chat title (useful for debugging)
    async forceRefreshChatTitle() {
      try {
        console.log('=== FORCE REFRESHING CHAT TITLE ===');
        
        // Clear any cached data
        this.currentChatId = null;
        this.currentChatTitle = null;
        
        // Wait a bit for DOM to settle
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to extract new chat title
        const newTitle = await this.extractChatTitleComprehensive();
        
        if (newTitle && newTitle !== 'Unknown Chat') {
          console.log('✅ Successfully refreshed chat title:', newTitle);
          
          // Update current chat info
          this.currentChatTitle = newTitle;
          this.currentChatId = this.generateChatId(newTitle);
          
          // Notify background service
          chrome.runtime.sendMessage({
            action: 'chatChanged',
            data: {
              oldChatId: null,
              newChatInfo: {
                id: this.currentChatId,
                title: newTitle,
                isGroup: this.isGroupChat(),
                timestamp: Date.now()
              },
              timestamp: Date.now()
            }
          });
          
          return newTitle;
        } else {
          console.log('❌ Failed to refresh chat title');
          return null;
        }
        
      } catch (error) {
        console.error('Error in force refresh chat title:', error);
        return null;
      }
    }
    
    // Enhanced chat change detection
    detectChatChangeByMessages() {
      try {
        const currentMessages = this.extractMessages();
        if (!currentMessages || currentMessages.length === 0) return false;
        
        const currentFingerprint = this.createMessageFingerprint(currentMessages);
        const currentCount = currentMessages.length;
        
        // Check if messages have changed significantly
        if (this.lastMessageFingerprint && 
            this.lastMessageFingerprint !== currentFingerprint &&
            Math.abs(currentCount - this.lastMessageCount) > 2) {
          
          console.log('Chat change detected by message fingerprint change');
          console.log('Old fingerprint:', this.lastMessageFingerprint);
          console.log('New fingerprint:', currentFingerprint);
          console.log('Old count:', this.lastMessageCount);
          console.log('New count:', currentCount);
          
          return true;
        }
        
        // Update stored values
        this.lastMessageFingerprint = currentFingerprint;
        this.lastMessageCount = currentCount;
        
        return false;
      } catch (error) {
        console.error('Error detecting chat change by messages:', error);
        return false;
      }
    }
    
    // Start message monitoring
    startMessageMonitoring() {
      try {
        if (this.monitoringActive) {
          console.log('Monitoring already active');
          return { success: true, message: 'Monitoring already active' };
        }
        
        console.log('Starting message monitoring...');
        this.monitoringActive = true;
        this.startAggressiveChatMonitoring();
        
        return { success: true, message: 'Message monitoring started' };
      } catch (error) {
        console.error('Error starting message monitoring:', error);
        return { success: false, error: error.message };
      }
    }

    // Stop message monitoring
    stopMessageMonitoring() {
      try {
        console.log('Stopping message monitoring...');
        this.monitoringActive = false;
        
        // Clear any monitoring intervals if they exist
        if (this.monitoringInterval) {
          clearInterval(this.monitoringInterval);
          this.monitoringInterval = null;
        }
        
        return { success: true, message: 'Message monitoring stopped' };
      } catch (error) {
        console.error('Error stopping message monitoring:', error);
        return { success: false, error: error.message };
      }
    }

    // Check monitoring status
    getMonitoringStatus() {
      return {
        isMonitoring: this.monitoringActive || false,
        timestamp: Date.now()
      };
    }

    // Monitor for chat changes more aggressively
    startAggressiveChatMonitoring() {
      try {
        console.log('Starting aggressive chat monitoring...');
        
        // Check for chat changes every 2 seconds
        this.monitoringInterval = setInterval(async () => {
          try {
            const currentTitle = await this.extractChatTitleComprehensive();
            
            if (currentTitle && 
                currentTitle !== this.currentChatTitle && 
                currentTitle !== 'Unknown Chat') {
              
              console.log('Chat title changed from', this.currentChatTitle, 'to', currentTitle);
              
              // Update current chat info
              this.currentChatTitle = currentTitle;
              this.currentChatId = this.generateChatId(currentTitle);
              
              // Notify background service
              chrome.runtime.sendMessage({
                action: 'chatChanged',
                data: {
                  oldChatId: null,
                  newChatInfo: {
                    id: this.currentChatId,
                    title: currentTitle,
                    isGroup: this.isGroupChat(),
                    timestamp: Date.now()
                  },
                  timestamp: Date.now()
                }
              });
            }
          } catch (error) {
            console.log('Error in aggressive chat monitoring:', error.message);
          }
        }, 2000);
        
      } catch (error) {
        console.error('Error starting aggressive chat monitoring:', error);
      }
    }

    // Fetch messages from all available chats
    async fetchAllChatMessages() {
      try {
        console.log('=== FETCHING ALL CHAT MESSAGES ===');
        
        // Wait for WhatsApp to fully load
        await this.waitForWhatsAppReady();
        
        // Get all chat list items
        const chatItems = this.getAllChatItems();
        console.log(`Found ${chatItems.length} chat items`);
        
        const allChatsData = new Map();
        
        // Process each chat
        for (let i = 0; i < Math.min(chatItems.length, 10); i++) { // Limit to first 10 chats
          try {
            const chatItem = chatItems[i];
            const chatTitle = this.extractChatTitleFromItem(chatItem);
            
            if (chatTitle && chatTitle !== 'Unknown Chat') {
              console.log(`Processing chat ${i + 1}: ${chatTitle}`);
              
              // Click on the chat to open it
              chatItem.click();
              
              // Wait for chat to load
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Extract messages from this chat
              const messages = this.getChatMessages();
              if (messages.length > 0) {
                allChatsData.set(chatTitle, {
                  title: chatTitle,
                  messages: messages,
                  messageCount: messages.length,
                  lastUpdated: Date.now()
                });
                console.log(`✅ Extracted ${messages.length} messages from ${chatTitle}`);
              }
              
              // Go back to chat list
              await this.goBackToChatList();
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          } catch (error) {
            console.error(`Error processing chat ${i + 1}:`, error);
          }
        }
        
        // Store all chat data
        this.allChatsData = allChatsData;
        console.log(`✅ Successfully extracted data from ${allChatsData.size} chats`);
        
        return allChatsData;
      } catch (error) {
        console.error('Error fetching all chat messages:', error);
        return new Map();
      }
    }

    // Get all chat list items with 2025 WhatsApp Web selectors
    getAllChatItems() {
      console.log('=== GETTING ALL CHAT ITEMS (2025 WhatsApp Web) ===');
      
      // 2025 WhatsApp Web selectors - updated based on current structure
      const selectors = [
        // Primary selectors for chat list items
        '[data-testid="cell-frame-container"]',
        '[data-testid="chat-list-item"]',
        '[data-testid="conversation-item"]',
        
        // Alternative chat item selectors
        'div[role="row"]',
        'div[role="listitem"]',
        'div[aria-label*="Chat"]',
        'div[aria-label*="chat"]',
        
        // WhatsApp Web 2025 specific patterns
        'div[data-testid*="cell"]',
        'div[data-testid*="chat"]',
        'div[data-testid*="conversation"]',
        
        // Generic chat-like containers
        'div[class*="chat"]',
        'div[class*="conversation"]',
        'div[class*="message"]'
      ];
      
      let allItems = [];
      
      // First, try to find the main chat list container
      const chatListContainer = this.findChatListContainer();
      if (chatListContainer) {
        console.log('✅ Found chat list container:', chatListContainer);
        
        // Look for chat items within the container
        for (const selector of selectors) {
          try {
            const items = chatListContainer.querySelectorAll(selector);
            console.log(`Selector "${selector}" in container: found ${items.length} items`);
            
            if (items.length > 0) {
              // Filter for actual chat items
              const chatItems = Array.from(items).filter(item => {
                return this.isValidChatItem(item);
              });
              
              console.log(`Filtered "${selector}": ${chatItems.length} valid chat items`);
              
              if (chatItems.length > 0) {
                allItems = chatItems;
                break;
              }
            }
          } catch (error) {
            console.log(`Error with selector "${selector}":`, error);
          }
        }
      }
      
      // If still no items, try scanning the entire page
      if (allItems.length === 0) {
        console.log('No items found in container, scanning entire page...');
        
        for (const selector of selectors) {
          try {
            const items = document.querySelectorAll(selector);
            console.log(`Selector "${selector}" (page-wide): found ${items.length} items`);
            
            if (items.length > 0) {
              const chatItems = Array.from(items).filter(item => {
                return this.isValidChatItem(item);
              });
              
              console.log(`Filtered "${selector}" (page-wide): ${chatItems.length} valid chat items`);
              
              if (chatItems.length > 0) {
                allItems = chatItems;
                break;
              }
            }
          } catch (error) {
            console.log(`Error with selector "${selector}":`, error);
          }
        }
      }
      
      // Final fallback: look for any elements that might be chats
      if (allItems.length === 0) {
        console.log('Using fallback chat detection...');
        allItems = this.fallbackChatDetection();
      }
      
      console.log(`Total chat items found: ${allItems.length}`);
      return allItems;
    }

    // Find the main chat list container
    findChatListContainer() {
      const containerSelectors = [
        '[data-testid="chat-list"]',
        '[data-testid="conversation-list"]',
        '[data-testid="main"]',
        '#main',
        'div[role="main"]',
        'div[aria-label*="Chat"]',
        'div[aria-label*="chat"]'
      ];
      
      for (const selector of containerSelectors) {
        const container = document.querySelector(selector);
        if (container) {
          console.log(`✅ Found container with selector: ${selector}`);
          return container;
        }
      }
      
      // Look for any large container that might hold chats
      const allDivs = document.querySelectorAll('div');
      const largeContainers = Array.from(allDivs).filter(div => {
        return div.children.length > 10 && 
               div.offsetHeight > 300 &&
               (div.querySelector('span') || div.querySelector('[title]'));
      });
      
      if (largeContainers.length > 0) {
        console.log(`✅ Found potential container with ${largeContainers[0].children.length} children`);
        return largeContainers[0];
      }
      
      console.log('❌ No chat list container found');
      return null;
    }

    // Check if an element is a valid chat item
    isValidChatItem(item) {
      try {
        // Must have some text content
        const hasText = item.textContent && item.textContent.trim().length > 0;
        
        // Must be clickable or have chat-like attributes
        const isClickable = item.onclick || 
                           item.getAttribute('role') === 'button' ||
                           item.getAttribute('tabindex') !== null ||
                           item.getAttribute('aria-label')?.includes('Chat') ||
                           item.getAttribute('aria-label')?.includes('chat');
        
        // Must have reasonable size
        const reasonableSize = item.offsetHeight > 30 && item.offsetHeight < 150;
        
        // Must not be the main header or navigation
        const notHeader = !item.querySelector('header') && 
                         !item.querySelector('[data-testid*="header"]') &&
                         !item.querySelector('[role="banner"]');
        
        // Must have some child elements
        const hasChildren = item.children.length > 0;
        
        const isValid = hasText && (isClickable || reasonableSize) && notHeader && hasChildren;
        
        if (isValid) {
          console.log(`✅ Valid chat item: "${item.textContent.trim().substring(0, 50)}..."`);
        }
        
        return isValid;
      } catch (error) {
        return false;
      }
    }

    // Fallback chat detection when selectors fail
    fallbackChatDetection() {
      console.log('=== FALLBACK CHAT DETECTION ===');
      
      const potentialChats = [];
      
      // Look for any clickable divs with text that might be chats
      const allDivs = document.querySelectorAll('div');
      
      for (const div of allDivs) {
        try {
          // Check if this looks like a chat item
          const hasText = div.textContent && div.textContent.trim().length > 0;
          const hasClickable = div.onclick || 
                              div.getAttribute('role') === 'button' ||
                              div.getAttribute('tabindex') !== null ||
                              div.getAttribute('aria-label')?.includes('Chat');
          const reasonableSize = div.offsetHeight > 30 && div.offsetHeight < 150;
          const notEmpty = div.children.length > 0;
          
          if (hasText && (hasClickable || reasonableSize) && notEmpty) {
            // Additional check: must not be a system element
            const text = div.textContent.trim();
            const isSystemElement = text.includes('WhatsApp') || 
                                  text.includes('web.whatsapp.com') ||
                                  text.includes('wa-wordmark') ||
                                  text.length < 3;
            
            if (!isSystemElement) {
              potentialChats.push(div);
              console.log(`Fallback found: "${text.substring(0, 30)}..."`);
            }
          }
        } catch (error) {
          // Skip this element
        }
      }
      
      console.log(`Fallback detection found ${potentialChats.length} potential chats`);
      return potentialChats.slice(0, 20); // Limit to first 20
    }

    // Get available chats for navigation
    getAvailableChats() {
      try {
        const chatItems = this.getAllChatItems();
        const availableChats = [];
        
        chatItems.forEach((item, index) => {
          try {
            const title = this.extractChatTitleFromItem(item);
            if (title && title !== 'Unknown Chat') {
              availableChats.push({
                index: index,
                title: title,
                element: item
              });
            }
          } catch (error) {
            console.log(`Error processing chat item ${index}:`, error);
          }
        });
        
        console.log(`Found ${availableChats.length} available chats:`, availableChats.map(c => c.title));
        return availableChats;
      } catch (error) {
        console.error('Error getting available chats:', error);
        return [];
      }
    }

    // Extract chat title from chat list item (2025 WhatsApp Web)
    extractChatTitleFromItem(chatItem) {
      try {
        console.log('=== EXTRACTING CHAT TITLE (2025) ===');
        
        // 2025 WhatsApp Web title selectors - updated based on current structure
        const titleSelectors = [
          // Primary title selectors
          '[data-testid="conversation-title"]',
          '[data-testid="chat-title"]',
          '[data-testid="title"]',
          '[data-testid="cell-title"]',
          
          // Alternative title selectors
          'span[title]',
          'span[aria-label]',
          'div[title]',
          'div[aria-label]',
          
          // Generic text elements
          'span',
          'div[role="text"]',
          'p',
          'h1', 'h2', 'h3', 'h4'
        ];
        
        // First, try to find the most specific title element
        for (const selector of titleSelectors) {
          try {
            const elements = chatItem.querySelectorAll(selector);
            console.log(`Selector "${selector}": found ${elements.length} elements`);
            
            for (const element of elements) {
              if (element && element.textContent) {
                const text = element.textContent.trim();
                if (this.isValidChatTitle(text)) {
                  console.log(`✅ Found title: "${text}" with selector "${selector}"`);
                  return text;
                }
              }
            }
          } catch (error) {
            console.log(`Error with selector "${selector}":`, error);
          }
        }
        
        // If no specific title found, try to get any meaningful text
        console.log('No specific title found, looking for meaningful text...');
        const allTextElements = chatItem.querySelectorAll('*');
        
        for (const element of allTextElements) {
          if (element && element.textContent && element.children.length === 0) {
            const text = element.textContent.trim();
            if (this.isValidChatTitle(text)) {
              console.log(`✅ Found fallback title: "${text}"`);
              return text;
            }
          }
        }
        
        // Last resort: get the first non-empty text from the chat item
        const directText = chatItem.textContent.trim();
        if (this.isValidChatTitle(directText)) {
          console.log(`✅ Found direct text title: "${directText}"`);
          return directText;
        }
        
        console.log('❌ No valid title found, returning "Unknown Chat"');
        return 'Unknown Chat';
      } catch (error) {
        console.error('Error extracting chat title:', error);
        return 'Unknown Chat';
      }
    }

    // Check if text is a valid chat title
    isValidChatTitle(text) {
      if (!text || text.length === 0 || text.length > 100) {
        return false;
      }
      
      // Must not be system text
      const systemTexts = [
        'WhatsApp',
        'web.whatsapp.com',
        'wa-wordmark',
        'wa-wordmark-refreshed',
        'Chat',
        'Messages',
        'Status',
        'Calls',
        'Camera',
        'Search',
        'Menu',
        'Settings',
        'Help',
        'About'
      ];
      
      for (const systemText of systemTexts) {
        if (text.toLowerCase().includes(systemText.toLowerCase())) {
          return false;
        }
      }
      
      // Must have reasonable length
      if (text.length < 2) {
        return false;
      }
      
      // Must not be just numbers or special characters
      if (/^[0-9\s\-_\.]+$/.test(text)) {
        return false;
      }
      
      return true;
    }

    // Wait for WhatsApp to be ready (2025 WhatsApp Web)
    async waitForWhatsAppReady() {
      const maxWait = 20000; // 20 seconds
      const startTime = Date.now();
      
      console.log('=== WAITING FOR WHATSAPP TO BE READY (2025) ===');
      
      while (Date.now() - startTime < maxWait) {
        try {
          // Check for main container
          const main = document.querySelector('#main');
          const chatList = document.querySelector('[data-testid="chat-list"]');
          const conversationPanel = document.querySelector('[data-testid="conversation-panel-wrapper"]');
          const mainPanel = document.querySelector('[data-testid="main-panel"]');
          
          if (main) {
            console.log('✅ Main container found');
            
            // Check if we're on the main page (chat list visible)
            if (chatList || conversationPanel || mainPanel) {
              console.log('✅ Chat list, conversation panel, or main panel found');
              return true;
            }
            
            // Alternative: check if we can see any chat-like elements
            const chatElements = document.querySelectorAll('[data-testid*="chat"], [data-testid*="conversation"], [aria-label*="Chat"], [aria-label*="chat"]');
            if (chatElements.length > 0) {
              console.log(`✅ Found ${chatElements.length} chat-related elements`);
              return true;
            }
            
            // Check if we're in a conversation (back button visible)
            const backButton = document.querySelector('[data-testid="back-button"], .back-button, [aria-label*="Back"], [aria-label*="back"]');
            if (backButton) {
              console.log('✅ Back button found - in conversation');
              return true;
            }
            
            // Check for any content that indicates WhatsApp is loaded
            const hasContent = main.children.length > 0;
            const hasText = main.textContent && main.textContent.trim().length > 0;
            
            if (hasContent && hasText) {
              console.log('✅ Main container has content and text');
              
              // Look for any elements that suggest WhatsApp is ready
              const anyElements = main.querySelectorAll('*');
              if (anyElements.length > 10) {
                console.log(`✅ Main container has ${anyElements.length} child elements - WhatsApp appears ready`);
                return true;
              }
            }
          }
          
          // Check if we're on a different WhatsApp page structure
          const alternativeMain = document.querySelector('[data-testid="main"], [role="main"], main');
          if (alternativeMain) {
            console.log('✅ Alternative main container found');
            
            // Check if it has content
            const hasContent = alternativeMain.children.length > 0;
            if (hasContent) {
              console.log('✅ Alternative main has content - WhatsApp appears ready');
              return true;
            }
          }
          
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`Waiting... (${elapsed}s) - WhatsApp still loading...`);
          
          // Wait before next check
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.log('Error during ready check:', error);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('❌ WhatsApp not ready after timeout');
      
      // Even if timeout, check if we can at least find some elements
      const anyElements = document.querySelectorAll('*');
      if (anyElements.length > 50) {
        console.log(`⚠️ Timeout but found ${anyElements.length} elements - proceeding anyway`);
        return true;
      }
      
      throw new Error('WhatsApp not ready after timeout');
    }

    // Go back to chat list
    async goBackToChatList() {
      try {
        // Look for back button or try to navigate back
        const backButton = document.querySelector('[data-testid="back-button"]') ||
                          document.querySelector('.back-button') ||
                          document.querySelector('[aria-label*="Back"]');
        
        if (backButton) {
          backButton.click();
        } else {
          // Try to go back using browser history
          window.history.back();
        }
      } catch (error) {
        console.log('Error going back to chat list:', error);
      }
    }

    // Detect WhatsApp version and adapt selectors
    detectWhatsAppVersion() {
      try {
        // Check for modern WhatsApp Web features
        const hasModernFeatures = document.querySelector('[data-testid="msg-container"]') !== null ||
                                 document.querySelector('[data-testid="conversation-message"]') !== null;
        
        if (hasModernFeatures) {
          console.log('✅ Detected modern WhatsApp Web interface');
          // Use modern selectors (already configured)
        } else {
          console.log('ℹ️ Using legacy WhatsApp Web selectors');
        }
      } catch (error) {
        console.log('Error detecting WhatsApp version:', error);
      }
    }

    // Debug page structure to understand what's available
    debugPageStructure() {
      try {
        console.log('=== DEBUGGING PAGE STRUCTURE ===');
        
        // Check main containers
        const main = document.querySelector('#main');
        const chatList = document.querySelector('[data-testid="chat-list"]');
        const conversationPanel = document.querySelector('[data-testid="conversation-panel-wrapper"]');
        
        console.log('Main container:', main ? 'Found' : 'Not found');
        console.log('Chat list:', chatList ? 'Found' : 'Not found');
        console.log('Conversation panel:', conversationPanel ? 'Found' : 'Not found');
        
        // Check for any elements with chat-related attributes
        const chatElements = document.querySelectorAll('[data-testid*="chat"], [data-testid*="conversation"], [aria-label*="Chat"], [aria-label*="chat"]');
        console.log(`Chat-related elements: ${chatElements.length}`);
        
        // Check for any clickable elements
        const clickableElements = document.querySelectorAll('[onclick], [role="button"], [tabindex]');
        console.log(`Clickable elements: ${clickableElements.length}`);
        
        // Check for any text elements that might be chat titles
        const textElements = document.querySelectorAll('span, h1, h2, h3, div[title]');
        console.log(`Text elements: ${textElements.length}`);
        
        // Show first few examples of each type
        if (chatElements.length > 0) {
          console.log('Sample chat elements:', Array.from(chatElements.slice(0, 3)).map(el => ({
            tagName: el.tagName,
            testid: el.getAttribute('data-testid'),
            ariaLabel: el.getAttribute('aria-label'),
            className: el.className
          })));
        }
        
        if (clickableElements.length > 0) {
          console.log('Sample clickable elements:', Array.from(clickableElements.slice(0, 3)).map(el => ({
            tagName: el.tagName,
            onclick: !!el.onclick,
            role: el.getAttribute('role'),
            tabindex: el.getAttribute('tabindex')
          })));
        }
        
        // Check if we're on the main page or in a chat
        const isInChat = this.isInActiveChat();
        console.log('Currently in active chat:', isInChat);
        
        // If not in chat, show what's on the main page
        if (!isInChat) {
          console.log('On main page - checking for chat list...');
          
          // Look for any container that might hold chats
          const containers = document.querySelectorAll('div');
          const chatContainers = Array.from(containers).filter(div => {
            return div.children.length > 5 && 
                   (div.querySelector('span') || div.querySelector('[title]')) &&
                   div.offsetHeight > 200;
          });
          
          console.log(`Potential chat containers: ${chatContainers.length}`);
          if (chatContainers.length > 0) {
            console.log('Sample container:', chatContainers[0]);
          }
        }
        
        console.log('=== END PAGE STRUCTURE DEBUG ===');
        
      } catch (error) {
        console.error('Error debugging page structure:', error);
      }
    }
  }

  // Initialize the message extractor
  const messageExtractor = new WhatsAppMessageExtractor();
  
  // Make it globally accessible for debugging and popup script
  window.messageExtractor = messageExtractor;

  // Check if already initialized to prevent duplicates
  if (window.naxInitialized) {
    console.log('Nax already initialized, skipping...');
    return;
  }

  window.naxInitialized = true;
  console.log('=== NAX INITIALIZED SUCCESSFULLY ===');

  // Listen for requests from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received in content script:', request.action);
    
    // Mark message listener as active
    window.naxMessageListenerActive = true;
    
    try {
      switch (request.action) {
        case "getChats":
          (async () => {
            const messages = messageExtractor.getChatMessages();
            let currentChatInfo = await messageExtractor.getCurrentChatInfo();

            console.log('=== GETCHATS ACTION ===');
            console.log('Messages found:', messages.length);
            console.log('Current chat info:', currentChatInfo);

            // Ensure we have valid chat info; retry once after a short delay
            if (!currentChatInfo || !currentChatInfo.title || currentChatInfo.title === 'Unknown Chat') {
              console.warn('Chat info is invalid, retrying shortly...');
              await new Promise(r => setTimeout(r, 300));
              const freshChatInfo = await messageExtractor.getCurrentChatInfo();
              if (freshChatInfo && freshChatInfo.title && freshChatInfo.title !== 'Unknown Chat') {
                currentChatInfo = freshChatInfo;
              }
            }

                    // Check if we're in a valid chat context
        const isInChat = messageExtractor.isInActiveChat() && 
                       currentChatInfo && 
                       currentChatInfo.title && 
                       currentChatInfo.title !== 'Unknown Chat' &&
                       currentChatInfo.title !== 'WhatsApp';

            // If no messages but we have chat info, this might be a new chat or loading state
            if (messages.length === 0) {
              if (isInChat) {
                console.log('No messages found but in valid chat context - might be new chat or loading');
                sendResponse({ 
                  success: true, 
                  chats: [],
                  chatInfo: currentChatInfo || {},
                  stats: { messageCount: 0, chatTitle: currentChatInfo?.title || 'Unknown' },
                  formatted: '',
                  warning: 'No messages found in current chat. This might be a new conversation or the chat is still loading.'
                });
              } else {
                console.log('No messages and no valid chat context - user might be on main page');
                sendResponse({ 
                  success: false, 
                  error: 'No active chat found. Please open a conversation first.',
                  chats: [],
                  chatInfo: currentChatInfo || {},
                  stats: { messageCount: 0, chatTitle: 'No Chat' },
                  formatted: ''
                });
              }
              return;
            }

            // Ensure we return full message objects with stable IDs for deduplication
            const fullMessages = Array.isArray(messages)
              ? messages.map((m, i) => ({
                  id: m.id || m.messageId || `msg_${i}`,
                  messageId: m.messageId || m.id || `msg_${i}`,
                  text: typeof m === 'string' ? m : (m.text || ''),
                  timestamp: m.timestamp || m.ts || Date.now(),
                  ts: m.ts || m.timestamp || Date.now(),
                  chatId: m.chatId || m.chat_id || (currentChatInfo && currentChatInfo.id) || 'current_chat',
                  chatTitle: m.chatTitle || (currentChatInfo && currentChatInfo.title) || 'Unknown Chat',
                  isGroup: m.isGroup || (currentChatInfo && currentChatInfo.isGroup) || false,
                  type: m.type || 'text',
                }))
              : [];

            sendResponse({ 
              success: true, 
              chats: fullMessages,
              chatInfo: currentChatInfo || {},
              stats: messageExtractor.getChatStats(),
              formatted: messageExtractor.getFormattedChatText()
            });
          })();
          return true; // keep channel open for async response
          
        case "getChatStats":
          const stats = messageExtractor.getChatStats();
          sendResponse({ success: true, stats: stats });
          return true; // keep channel open for response
          
        case "getFormattedChat":
          const formatted = messageExtractor.getFormattedChatText();
          sendResponse({ success: true, formatted: formatted });
          return true; // keep channel open for response

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
          return true; // keep channel open for response

        case "fetchAllChats":
          (async () => {
            try {
              console.log('Fetching all chats as requested...');
              const allChatsData = await messageExtractor.fetchAllChatMessages();
              sendResponse({ 
                success: true, 
                allChats: allChatsData,
                totalChats: allChatsData.size,
                message: `Successfully fetched data from ${allChatsData.size} chats`
              });
            } catch (error) {
              console.error('Error fetching all chats:', error);
              sendResponse({ 
                success: false, 
                error: error.message,
                allChats: new Map(),
                totalChats: 0
              });
            }
          })();
          return true; // keep channel open for response

        case "fetchAllChatsBulk":
          (async () => {
            try {
              console.log('=== BULK FETCHING ALL CHATS ===');
              const chats = request.chats || [];
              console.log(`Processing ${chats.length} chats in bulk...`);
              
              const allMessages = [];
              let processedChats = 0;
              let totalMessages = 0;
              
              for (const chat of chats) {
                try {
                  console.log(`Processing chat: ${chat.title}`);
                  
                  // Click on the chat to open it
                  chat.element.click();
                  
                  // Wait for chat to load
                  await new Promise(resolve => setTimeout(resolve, 1500));
                  
                  // Extract messages from this chat
                  const messages = messageExtractor.getChatMessages();
                  
                  if (messages && messages.length > 0) {
                    // Add chat context to messages
                    const messagesWithContext = messages.map(msg => ({
                      ...msg,
                      chatTitle: chat.title,
                      chatId: chat.id || chat.title,
                      extractedAt: Date.now()
                    }));
                    
                    allMessages.push(...messagesWithContext);
                    totalMessages += messages.length;
                    console.log(`✅ Extracted ${messages.length} messages from ${chat.title}`);
                  } else {
                    console.log(`ℹ️ No messages found in ${chat.title}`);
                  }
                  
                  processedChats++;
                  
                  // Go back to chat list
                  await messageExtractor.goBackToChatList();
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                } catch (error) {
                  console.error(`Error processing chat ${chat.title}:`, error);
                  processedChats++;
                }
              }
              
              // Store all extracted messages
              if (allMessages.length > 0) {
                messageExtractor.allExtractedMessages = allMessages;
                console.log(`✅ Bulk extraction complete: ${totalMessages} messages from ${processedChats} chats`);
                
                // Send to background for processing
                chrome.runtime.sendMessage({
                  action: 'bulkMessagesExtracted',
                  data: {
                    messages: allMessages,
                    totalMessages: totalMessages,
                    processedChats: processedChats,
                    timestamp: Date.now()
                  }
                });
              }
              
              sendResponse({ 
                success: true, 
                totalMessages: totalMessages,
                processedChats: processedChats,
                message: `Successfully extracted ${totalMessages} messages from ${processedChats} chats`
              });
              
            } catch (error) {
              console.error('Error in bulk fetch:', error);
              sendResponse({ 
                success: false, 
                error: error.message,
                totalMessages: 0,
                processedChats: 0
              });
            }
          })();
          return true; // keep channel open for response

        case "getAvailableChats":
          (async () => {
            try {
              console.log('Getting available chats for navigation...');
              
              // First, wait for WhatsApp to be ready
              await messageExtractor.waitForWhatsAppReady();
              
              // Debug: show what's on the page
              messageExtractor.debugPageStructure();
              
              // Get available chats
              const availableChats = messageExtractor.getAvailableChats();
              
              sendResponse({ 
                success: true, 
                availableChats: availableChats,
                totalChats: availableChats.length,
                message: `Found ${availableChats.length} available chats`
              });
            } catch (error) {
              console.error('Error getting available chats:', error);
              sendResponse({ 
                success: false, 
                error: error.message,
                availableChats: [],
                totalChats: 0
              });
            }
          })();
          return true; // keep channel open for response

        case "getAllExtractedMessages":
          try {
            console.log('Getting all extracted messages...');
            const allMessages = messageExtractor.allExtractedMessages || [];
            sendResponse({ 
              success: true, 
              messages: allMessages,
              totalMessages: allMessages.length,
              message: `Found ${allMessages.length} extracted messages`
            });
          } catch (error) {
            console.error('Error getting all extracted messages:', error);
            sendResponse({ 
              success: false, 
              error: error.message,
              messages: [],
              totalMessages: 0
            });
          }
          return true; // keep channel open for response

        case "startMonitoring":
          messageExtractor.startMessageMonitoring();
          sendResponse({ success: true, message: 'Monitoring started' });
          return true; // keep channel open for response

        case "stopMonitoring":
          messageExtractor.stopMessageMonitoring();
          sendResponse({ success: true, message: 'Monitoring stopped' });
          return true; // keep channel open for response

        case "getMonitoringStatus":
          const status = messageExtractor.getMonitoringStatus();
          sendResponse({ success: true, ...status });
          return true; // keep channel open for response

        case "getCurrentChatInfo":
          console.log('getCurrentChatInfo requested');
          (async () => {
            const chatInfo = await messageExtractor.getCurrentChatInfo();
            sendResponse({ success: true, chatInfo: chatInfo });
          })();
          return true; // keep channel open for response
          
        case "forceRefreshChatTitle":
          console.log('forceRefreshChatTitle requested');
          (async () => {
            const refreshedTitle = await messageExtractor.forceRefreshChatTitle();
            sendResponse({ success: true, title: refreshedTitle });
          })();
          return true; // keep channel open for response
          
        case "extractChatTitleComprehensive":
          console.log('extractChatTitleComprehensive requested');
          (async () => {
            const comprehensiveTitle = await messageExtractor.extractChatTitleComprehensive();
            sendResponse({ success: true, title: comprehensiveTitle });
          })();
          return true; // keep channel open for response
          
        case "checkChatContext":
          console.log('checkChatContext requested');
          (async () => {
            try {
              const currentChatInfo = await messageExtractor.getCurrentChatInfo();
              const messages = messageExtractor.getChatMessages();
              const isInChat = currentChatInfo && 
                             currentChatInfo.title && 
                             currentChatInfo.title !== 'Unknown Chat' &&
                             currentChatInfo.title !== 'WhatsApp';
              
              sendResponse({ 
                success: true, 
                isInChat: isInChat,
                chatInfo: currentChatInfo,
                messageCount: messages.length,
                hasMessages: messages.length > 0,
                status: isInChat ? 
                  (messages.length > 0 ? 'active_chat_with_messages' : 'active_chat_no_messages') : 
                  'no_active_chat'
              });
            } catch (error) {
              sendResponse({ 
                success: false, 
                error: error.message,
                isInChat: false,
                status: 'error'
              });
            }
          })();
          return true; // keep channel open for response

        case "processForAI":
          const contextResult = messageExtractor.processMessagesWithContext();
          sendResponse({ 
            success: true, 
            data: contextResult
          });
          return true; // keep channel open for response

        case "debugExtraction":
          messageExtractor.debugMessageExtraction();
          sendResponse({ success: true, message: 'Debug information logged to console' });
          return true; // keep channel open for response

        case "ping":
          // Respond to ping for connection testing
          console.log('🏓 Ping received from popup, responding...');
          sendResponse({ 
            success: true, 
            message: 'pong', 
            timestamp: Date.now(),
            scriptVersion: '2.0.0',
            isReady: true
          });
          return true; // Keep channel open for response
          
        case "test":
          // Simple test action for debugging
          console.log('🧪 Test action received from popup');
          sendResponse({ 
            success: true, 
            message: 'Content script is working!', 
            timestamp: Date.now(),
            scriptVersion: '2.0.0',
            isReady: true
          });
          return true; // Keep channel open for response

        case "validateSelectors":
          const workingSelectors = messageExtractor.validateSelectors();
          sendResponse({ 
            success: true, 
            workingSelectors: workingSelectors,
            totalSelectors: messageExtractor.messageSelectors.length
          });
          return true; // keep channel open for response
          
        default:
          console.log('❓ Unknown action received:', request.action);
          sendResponse({ success: false, error: 'Unknown action: ' + request.action });
          return true; // keep channel open for response
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      sendResponse({ success: false, error: error.message });
      return true; // keep channel open for response even on error
    }
    
    // This should never be reached since all cases return true
    console.warn('⚠️ Message handler reached end without return statement');
    return true;
  });

  // Auto-start monitoring when page is ready
  function initializeWhenReady() {
    // Check if already initialized to prevent duplicates
    if (window.naxInitialized) {
      console.log('Nax already initialized, skipping...');
      return;
    }
    
    const checkReady = () => {
      const mainElement = document.querySelector('#main') || 
                         document.querySelector('[data-testid="main"]') ||
                         document.querySelector('[data-testid="conversation-panel-wrapper"]');
      
      if (mainElement) {
        // Detect WhatsApp version and adapt
        messageExtractor.detectWhatsAppVersion();
        
        // Start monitoring automatically
        messageExtractor.startMessageMonitoring();
        
        // Fetch messages from all chats in background
        setTimeout(async () => {
          try {
            console.log('Starting background chat fetching...');
            await messageExtractor.fetchAllChatMessages();
          } catch (error) {
            console.log('Background chat fetching failed:', error);
          }
        }, 5000); // Wait 5 seconds for WhatsApp to fully load
        
        // Ensure floating icon is visible - DISABLED
        // messageExtractor.ensureFloatingIconVisible();
        
        // Mark as initialized
        window.naxInitialized = true;
        
        console.log('Nax content script loaded and monitoring started');
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
  
  // Add a global flag to indicate the script is loaded
  window.NaxContentScriptInitialized = true;
  console.log('🏷️ Global flag set: window.NaxContentScriptInitialized = true');
  
  // Test message listener is working
  console.log('✅ Nax content script message listener registered successfully');
  console.log('📡 Ready to receive messages from popup and background script');
  
  // Test the message listener is working
  setTimeout(() => {
    console.log('🧪 Testing content script message listener...');
    try {
      // Simulate a message to test the listener
      const testEvent = new CustomEvent('nax-test', { 
        detail: { action: 'test', timestamp: Date.now() } 
      });
      document.dispatchEvent(testEvent);
      console.log('✅ Content script test event dispatched successfully');
      
      // Also test that we can access chrome.runtime
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        console.log('✅ Chrome runtime API is accessible');
      } else {
        console.error('❌ Chrome runtime API not accessible');
      }
      
      // Test that we can send a message to ourselves (this should work)
      console.log('🧪 Testing self-message capability...');
      chrome.runtime.sendMessage({ action: 'test', source: 'content-script' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('ℹ️ Self-message test result (expected):', chrome.runtime.lastError.message);
        } else {
          console.log('✅ Self-message test successful:', response);
        }
      });
      
      // Test that we can access the messageExtractor
      if (window.messageExtractor) {
        console.log('✅ messageExtractor is accessible');
      } else {
        console.error('❌ messageExtractor not accessible');
      }
      
      // Test that we can access the global flag
      if (window.NaxContentScriptInitialized) {
        console.log('✅ Global flag is set correctly');
      } else {
        console.error('❌ Global flag not set');
      }
    } catch (error) {
      console.error('❌ Content script test failed:', error);
    }
  }, 1000);



  // Fallback function to create floating icon - DISABLED
  /*
  function createFallbackFloatingIcon() {
    try {
      // Check if icon already exists to prevent duplicates
      const existingIcon = document.getElementById('whatsapp-ai-helper-icon');
      if (existingIcon) {
        console.log('Floating icon already exists, skipping creation...');
        return;
      }

      // Remove any other potential duplicate icons
      const allIcons = document.querySelectorAll('[id*="whatsapp-ai-helper"]');
      if (allIcons.length > 1) {
        console.log(`Found ${allIcons.length} potential duplicate icons, removing extras...`);
        for (let i = 1; i < allIcons.length; i++) {
          allIcons[i].remove();
        }
      }

      console.log('=== CREATING NEW FLOATING ICON ===');

      // Create icon container
      const iconContainer = document.createElement('div');
      iconContainer.id = 'whatsapp-ai-helper-icon';
      iconContainer.style.cssText = `
        position: fixed;
        left: calc(100vw - 40px);
        top: 50%;
        transform: translateY(-50%);
        width: 35px;
        height: 35px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        z-index: 10000;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        user-select: none;
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-top-right-radius:20px;
      `;

      // Create video element
      const videoElement = document.createElement('video');
      videoElement.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
        pointer-events: none;
      `;
      videoElement.muted = true;
      videoElement.loop = true;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      
      // Set video source with retry mechanism
      const videoUrl = chrome.runtime.getURL('nax.mp4');
      console.log('Video URL generated:', videoUrl);
      
      // Function to load video with retry
      const loadVideo = (retryCount = 0) => {
        if (retryCount > 3) {
          console.error('Video failed to load after 3 retries, using fallback emoji');
          // Remove video and add fallback emoji
          videoElement.remove();
          iconContainer.innerHTML = '🤖';
          iconContainer.style.fontSize = '24px';
          iconContainer.style.color = 'white';
          return;
        }
        
        videoElement.src = videoUrl;
        videoElement.load(); // Force load
        
        // Set a timeout for video loading
        const loadTimeout = setTimeout(() => {
          if (videoElement.readyState < 2) { // HAVE_CURRENT_DATA
            console.log(`Video load timeout, retry ${retryCount + 1}/3`);
            loadVideo(retryCount + 1);
          }
        }, 3000); // 3 second timeout
        
        // Clear timeout if video loads successfully
        videoElement.addEventListener('canplay', () => {
          clearTimeout(loadTimeout);
          console.log('Video loaded successfully and can play');
        }, { once: true });
      };
      
      // Start loading video
      loadVideo();
      
      // Add load event listener for debugging
      videoElement.addEventListener('loadstart', () => {
        console.log('Video load started');
      });
      
      videoElement.addEventListener('loadeddata', () => {
        console.log('Video data loaded successfully');
      });
      
      videoElement.addEventListener('canplay', () => {
        console.log('Video can play');
      });
      
      // Add error handling for video with retry
      videoElement.addEventListener('error', (e) => {
        console.log('Video error detected:', e);
        console.log('Video error details:', {
          error: videoElement.error,
          networkState: videoElement.networkState,
          readyState: videoElement.readyState
        });
        
        // Try to reload the video once more
        if (videoElement.readyState === 0) { // HAVE_NOTHING
          console.log('Attempting to reload video...');
          setTimeout(() => {
            videoElement.src = videoUrl;
            videoElement.load();
          }, 1000);
        } else {
          console.log('Video failed to load, using fallback emoji');
          // Remove video and add fallback emoji
          videoElement.remove();
          iconContainer.innerHTML = '🤖';
          iconContainer.style.fontSize = '24px';
          iconContainer.style.color = 'white';
        }
      });
      
      // Add video to container
      iconContainer.appendChild(videoElement);

      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.id = 'whatsapp-ai-helper-tooltip';
      tooltip.style.cssText = `
        position: absolute;
        right: 60px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-family: 'Segoe UI', Arial, sans-serif;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        pointer-events: none;
        z-index: 10001;
      `;
      tooltip.textContent = 'Open Chat';

      // Add tooltip to icon
      iconContainer.appendChild(tooltip);

      // Hover effects
      iconContainer.addEventListener('mouseenter', () => {
        if (!isDragging) {
          iconContainer.style.transform = 'scale(1.1)';
          iconContainer.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.4)';
        }
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
        
        // Play video once on hover (not continuously)
        if (videoElement.paused) {
          videoElement.currentTime = 0; // Reset to beginning
          videoElement.play().catch(e => console.log('Video play failed:', e));
        }
      });

      iconContainer.addEventListener('mouseleave', () => {
        if (!isDragging) {
          iconContainer.style.transform = 'scale(1)';
          iconContainer.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        }
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
        
        // Pause video when not hovering
        if (!videoElement.paused) {
          videoElement.pause();
        }
      });

      // Click to open AI chat panel
      iconContainer.addEventListener('click', () => {
        console.log('Floating icon clicked! Opening AI chat panel...');
        
        // Check if panel already exists
        const existingPanel = document.getElementById('nax-ai-chat-panel');
        if (existingPanel) {
          console.log('AI panel already exists, removing...');
          existingPanel.remove();
          toggleFloatingIcon(true);
          return;
        }
        
        // Hide the floating icon when panel opens
        // toggleFloatingIcon(false); // DISABLED - No longer needed
        
        // Create split-screen interface
        // messageExtractor.createAIChatPanel(); // DISABLED - Duplicate UI removed
        
        // Add click animation
        iconContainer.style.transform = 'scale(0.95)';
        setTimeout(() => {
          iconContainer.style.transform = 'scale(1)';
        }, 150);
      });

      // Add drag functionality
      let isDragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let initialLeft = 0;
      let initialTop = 0;

      // Mouse down - start dragging
      iconContainer.addEventListener('mousedown', (e) => {
        if (e.target === iconContainer || e.target === tooltip) {
          isDragging = true;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          
          // Get current position
          const rect = iconContainer.getBoundingClientRect();
          initialLeft = rect.left;
          initialTop = rect.top;
          
          // Change cursor and prevent text selection
          iconContainer.style.cursor = 'grabbing';
          iconContainer.style.userSelect = 'none';
          e.preventDefault();
        }
      });

      // Mouse move - handle dragging
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        
        // Calculate new position
        const newLeft = initialLeft + deltaX;
        const newTop = initialTop + deltaY;
        
        // Keep icon within viewport bounds
        const maxLeft = window.innerWidth - iconContainer.offsetWidth;
        const maxTop = window.innerHeight - iconContainer.offsetHeight;
        
        const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
        const clampedTop = Math.max(0, Math.min(newTop, maxTop));
        
        // Update position
        iconContainer.style.left = clampedLeft + 'px';
        iconContainer.style.right = 'auto';
        iconContainer.style.top = clampedTop + 'px';
        iconContainer.style.transform = 'none';
      });

      // Mouse up - stop dragging
      document.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          iconContainer.style.cursor = 'pointer';
          iconContainer.style.userSelect = 'none';
        }
      });

      // Add to page
      document.body.appendChild(iconContainer);

      console.log('✅ Fallback floating icon created successfully with video and drag functionality!');
      console.log('Icon element:', iconContainer);
      console.log('Video element:', videoElement);
      console.log('Icon position:', iconContainer.getBoundingClientRect());
      
      // Test if icon is visible
      setTimeout(() => {
        const rect = iconContainer.getBoundingClientRect();
        console.log('Icon visibility test:', {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          right: rect.right,
          isVisible: rect.width > 0 && rect.height > 0
        });
        
        // Check video status
        console.log('Video status:', {
          src: videoElement.src,
          readyState: videoElement.readyState,
          paused: videoElement.paused,
          muted: videoElement.muted,
          loop: videoElement.loop,
          autoplay: videoElement.autoplay
        });
      }, 100);
      
    } catch (error) {
      console.error('❌ Error creating fallback floating icon with video:', error);
    }
  }
  */

  // Function to show fallback message when extension popup can't be opened - DISABLED
  /*
  function showFallbackMessage() {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 10002;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      max-width: 300px;
      animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 20px;">🤖</span>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">Nax</div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">Extension context needs refresh</div>
          <div style="font-size: 11px; opacity: 0.8;">Click the extension icon in your browser toolbar, or refresh the page</div>
        </div>
      </div>
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove notification after 8 seconds (longer for context issues)
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 8000);
    
    // Add slideOut animation
    const slideOutStyle = document.createElement('style');
    slideOutStyle.textContent = `
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(slideOutStyle);
  }
  */

  // Function to check extension context health - DISABLED
  /*
  function checkExtensionContext() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        // Test if extension context is valid by sending a ping
        chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Extension context check failed:', chrome.runtime.lastError.message);
            // Context might be invalid, try to refresh
            refreshExtensionContext();
          } else {
            console.log('Extension context is healthy');
          }
        });
      } else {
        console.log('Extension context not available');
      }
    } catch (error) {
      console.log('Extension context check error:', error.message);
      refreshExtensionContext();
    }
  }
  */

  // Function to refresh extension context - DISABLED
  /*
  function refreshExtensionContext() {
    console.log('Attempting to refresh extension context...');
    
    // Remove existing icon
    const existingIcon = document.getElementById('whatsapp-ai-helper-icon');
    if (existingIcon) {
      existingIcon.remove();
    }
    
    // Wait a bit and recreate
    setTimeout(() => {
      createFallbackFloatingIcon();
      console.log('Extension context refreshed');
    }, 1000);
  }
  */

  // Function to handle extension context invalidation - DISABLED
  /*
  function handleExtensionContextInvalidation() {
    console.log('Extension context invalidated, refreshing...');
    
    // Show notification to user
    showFallbackMessage();
    
    // Remove existing icon
    const existingIcon = document.getElementById('whatsapp-ai-helper-icon');
    if (existingIcon) {
      existingIcon.remove();
    }
    
    // Wait a bit and recreate with fresh context
    setTimeout(() => {
      createFallbackFloatingIcon();
      console.log('Extension context refreshed after invalidation');
    }, 2000);
  }
  */

  // Function to automatically refresh extension context - DISABLED
  /*
  function autoRefreshExtensionContext() {
    console.log('Auto-refreshing extension context...');
    
    // Remove existing icon
    const existingIcon = document.getElementById('whatsapp-ai-helper-icon');
    if (existingIcon) {
      existingIcon.remove();
    }
    
    // Wait a bit and recreate
    setTimeout(() => {
      createFallbackFloatingIcon();
      console.log('Extension context auto-refreshed');
    }, 1000);
  }
  */

  // Start periodic extension context checking - DISABLED
  // setInterval(checkExtensionContext, 30000); // Check every 30 seconds

  // Add global error handler for extension context invalidation - DISABLED
  /*
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('Extension context invalidated')) {
      console.log('Caught extension context invalidation error, refreshing...');
      handleExtensionContextInvalidation();
    }
  });

  // Add unhandled rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('Extension context invalidated')) {
      console.log('Caught unhandled extension context invalidation, refreshing...');
      handleExtensionContextInvalidation();
    }
  });
  */

  // Add global debug function for easy access
  window.debugWhatsAppChatTitle = function() {
    console.log('=== QUICK CHAT TITLE DEBUG ===');
    console.log('Page title:', document.title);
    console.log('URL:', window.location.href);
    
    // Check for conversation header
    const conversationHeader = document.querySelector('div[data-testid="conversation-header"]');
    if (conversationHeader) {
      console.log('✅ Conversation header found');
      console.log('Header text content:', conversationHeader.textContent?.trim());
      
      // Check for title elements
      const titleElements = conversationHeader.querySelectorAll('[data-testid*="title"], [title], h1, h2, h3');
      console.log(`Found ${titleElements.length} potential title elements in header`);
      
      titleElements.forEach((el, i) => {
        console.log(`Title element ${i}:`, {
          text: el.textContent?.trim(),
          title: el.getAttribute('title'),
          tagName: el.tagName,
          className: el.className
        });
      });
    }
    
    // Test the new class-based selectors
    console.log('=== TESTING NEW CLASS-BASED SELECTORS ===');
    const titleClassSelectors = [
      '.x1iyjqo2.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft.x1rg5ohu.x1jchvi3.xjb2p0i.xo1l8bm.x17mssa0.x1ic7a3i._ao3e',
      '[class*="x1iyjqo2"][class*="x6ikm8r"][class*="x10wlt62"]',
      '[class*="x1iyjqo2"][class*="x6ikm8r"]',
      '[class*="x1iyjqo2"]'
    ];
    
    titleClassSelectors.forEach((selector, i) => {
      const elements = document.querySelectorAll(selector);
      console.log(`Selector ${i + 1} "${selector}":`, elements.length, 'elements found');
      
      elements.forEach((el, j) => {
        console.log(`  Element ${j + 1}:`, {
          text: el.textContent?.trim(),
          className: el.className,
          tagName: el.tagName,
          rect: el.getBoundingClientRect()
        });
      });
    });
    
    // Check for any elements with similar class patterns
    console.log('=== LOOKING FOR SIMILAR CLASS PATTERNS ===');
    const allElements = document.querySelectorAll('*');
    const classPatterns = ['x1iyjqo2', 'x6ikm8r', 'x10wlt62', 'x1n2onr6', 'xlyipyv', 'xuxw1ft'];
    
    classPatterns.forEach(pattern => {
      const elements = document.querySelectorAll(`[class*="${pattern}"]`);
      if (elements.length > 0) {
        console.log(`Elements with class "${pattern}":`, elements.length);
        elements.slice(0, 5).forEach((el, i) => {
          console.log(`  ${i + 1}:`, {
            text: el.textContent?.trim(),
            className: el.className,
            tagName: el.tagName
          });
        });
      }
    });
    
    // Test the isValidChatTitle function
    console.log('=== TESTING isValidChatTitle FUNCTION ===');
    const testTexts = ['Test Chat', 'John Doe', 'Group Chat', 'WhatsApp', '123', '📱', ''];
    testTexts.forEach(text => {
      console.log(`"${text}" -> isValid:`, window.messageExtractor?.isValidChatTitle(text));
    });
    
    console.log('=== END DEBUG ===');
  };

  // Add a simple test function for the class-based extraction
  window.testClassBasedExtraction = function() {
    console.log('=== TESTING CLASS-BASED EXTRACTION ===');
    
    const titleClassSelectors = [
      '.x1iyjqo2.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft.x1rg5ohu.x1jchvi3.xjb2p0i.xo1l8bm.x17mssa0.x1ic7a3i._ao3e',
      '[class*="x1iyjqo2"][class*="x6ikm8r"][class*="x10wlt62"]',
      '[class*="x1iyjqo2"][class*="x6ikm8r"]',
      '[class*="x1iyjqo2"]'
    ];
    
    let foundTitle = null;
    
    for (const selector of titleClassSelectors) {
      const titleElements = document.querySelectorAll(selector);
      console.log(`Selector "${selector}":`, titleElements.length, 'elements found');
      
      for (const element of titleElements) {
        const text = element.textContent.trim();
        console.log(`  Element text: "${text}"`);
        
        if (text && text.length > 2 && text !== 'WhatsApp') {
          console.log(`  ✅ Potential title found: "${text}"`);
          foundTitle = text;
          break;
        }
      }
      
      if (foundTitle) break;
    }
    
    if (foundTitle) {
      console.log(`🎉 SUCCESS: Found chat title: "${foundTitle}"`);
    } else {
      console.log('❌ No chat title found with class-based selectors');
    }
    
    return foundTitle;
  };

  // Duplicate call removed - already called above

  // Cleanup function to remove any existing duplicate elements
  function cleanupDuplicateElements() {
    try {
      // Remove duplicate floating icons
      const allIcons = document.querySelectorAll('[id*="whatsapp-ai-helper"]');
      if (allIcons.length > 1) {
        console.log(`Found ${allIcons.length} duplicate icons, keeping only the first one...`);
        for (let i = 1; i < allIcons.length; i++) {
          allIcons[i].remove();
        }
      }
      
      // Remove duplicate AI panels - DISABLED since panels are no longer created
      /*
      const allPanels = document.querySelectorAll('[id*="nax-ai-chat-panel"]');
      if (allPanels.length > 1) {
        console.log(`Found ${allPanels.length} duplicate AI panels, keeping only the first one...`);
        for (let i = 1; i < allPanels.length; i++) {
          allPanels[i].remove();
        }
      }
      */
      
      console.log('Cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Run cleanup when page loads
  cleanupDuplicateElements();

  // Debug function to show all available chats
  window.debugAllChats = function() {
    console.log('=== DEBUGGING ALL AVAILABLE CHATS ===');
    
    if (window.messageExtractor) {
      const chats = window.messageExtractor.getAllAvailableChats();
      console.log('All available chats:', chats);
      
      // Show current chat info
      const currentChat = window.messageExtractor.getCurrentChatInfo();
      console.log('Current chat info:', currentChat);
      
      // Test reliable selectors
      console.log('=== TESTING RELIABLE SELECTORS ===');
      const reliableSelectors = [
        'header span[data-testid="conversation-title"]',
        'header [data-testid="conversation-info-header"] span',
        '[data-testid="conversation-title"]',
        '[data-testid="chat-header"] span'
      ];
      
      reliableSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`✅ Selector "${selector}" found:`, {
            text: element.textContent?.trim(),
            title: element.getAttribute('title'),
            tagName: element.tagName,
            className: element.className
          });
        } else {
          console.log(`❌ Selector "${selector}" not found`);
        }
      });
      
      return { chats, currentChat };
    } else {
      console.log('❌ messageExtractor not found');
      return null;
    }
  };

  // Simple test function for chat title extraction
  window.testChatTitleExtraction = function() {
    console.log('=== TESTING CHAT TITLE EXTRACTION ===');
    
    if (window.messageExtractor) {
      console.log('Testing extractChatTitleFromWhatsApp...');
      const title = window.messageExtractor.extractChatTitleFromWhatsApp();
      console.log('Extracted title:', title);
      
      console.log('Testing getCurrentChatInfo...');
      const chatInfo = window.messageExtractor.getCurrentChatInfo();
      console.log('Current chat info:', chatInfo);
      
      return { title, chatInfo };
    } else {
      console.log('❌ messageExtractor not found');
      return null;
    }
  };

})(); // Close the IIFE