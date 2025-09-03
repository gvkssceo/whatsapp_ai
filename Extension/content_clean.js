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
          'header[data-testid="conversation-header"]',
          'div[data-testid="chat-header"]',
          'span[data-testid="conversation-title"]',
          'span[dir="auto"][title]'
        ];

        console.log('✅ WhatsAppMessageExtractor initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing WhatsAppMessageExtractor:', error);
        throw error;
      }
    }

    // Extract messages from the current chat
    extractMessages() {
      try {
        const messages = [];
        const messageElements = document.querySelectorAll('[data-testid*="message"]');
        
        console.log(`Found ${messageElements.length} potential message elements`);
        
        messageElements.forEach((element, index) => {
          try {
            // Try multiple selectors to find message text
            let messageText = '';
            for (const selector of this.messageSelectors) {
              const textElement = element.querySelector(selector);
              if (textElement && textElement.textContent.trim()) {
                messageText = textElement.textContent.trim();
                break;
              }
            }
            
            if (messageText && messageText.length > 0) {
              messages.push({
                id: `msg_${Date.now()}_${index}`,
                text: messageText,
                timestamp: Date.now(),
                element: element
              });
            }
          } catch (error) {
            console.warn('Error extracting message:', error);
          }
        });
        
        console.log(`Successfully extracted ${messages.length} messages`);
        return messages;
        
      } catch (error) {
        console.error('Error in extractMessages:', error);
        return [];
      }
    }

    // Get current chat information
    getCurrentChatInfo() {
      try {
        // Try multiple selectors to find chat title
        let chatTitle = 'Unknown Chat';
        
        for (const selector of this.chatSelectors) {
          const titleElement = document.querySelector(selector);
          if (titleElement) {
            const title = titleElement.textContent || titleElement.title || titleElement.getAttribute('title');
            if (title && title.trim()) {
              chatTitle = title.trim();
              break;
            }
          }
        }
        
        return {
          title: chatTitle,
          id: `chat_${Date.now()}`,
          isGroup: chatTitle.includes('Group') || chatTitle.includes('group'),
          timestamp: Date.now()
        };
        
      } catch (error) {
        console.error('Error getting chat info:', error);
        return {
          title: 'Unknown Chat',
          id: `chat_${Date.now()}`,
          isGroup: false,
          timestamp: Date.now()
        };
      }
    }

    // Get all messages with chat info
    getAllMessagesWithChatInfo() {
      try {
        const chatInfo = this.getCurrentChatInfo();
        const messages = this.extractMessages();
        
        // Add chat info to each message
        const messagesWithChatInfo = messages.map(msg => ({
          ...msg,
          chatId: chatInfo.id,
          chatTitle: chatInfo.title,
          isGroup: chatInfo.isGroup
        }));
        
        return {
          messages: messagesWithChatInfo,
          chatInfo: chatInfo,
          messageCount: messages.length
        };
        
      } catch (error) {
        console.error('Error getting all messages with chat info:', error);
        return {
          messages: [],
          chatInfo: { title: 'Error', id: 'error', isGroup: false },
          messageCount: 0
        };
      }
    }
  };

  // Initialize the message extractor
  if (!window.messageExtractor) {
    window.messageExtractor = new window.WhatsAppMessageExtractor();
    console.log('✅ Global messageExtractor created');
  }

  // Set up message listener for communication with popup and background
  if (!window.naxMessageListenerActive) {
    console.log('📡 Setting up message listener...');
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('📨 Message received in content script:', request.action);
      
      try {
        switch (request.action) {
          case 'ping':
            console.log('🏓 Ping received from popup, responding...');
            sendResponse({ success: true, message: 'pong', timestamp: Date.now() });
            break;
            
          case 'getChatData':
            console.log('📊 Getting chat data...');
            const chatData = window.messageExtractor.getAllMessagesWithChatInfo();
            sendResponse({ success: true, data: chatData });
            break;
            
          case 'extractMessages':
            console.log('📝 Extracting messages...');
            const messages = window.messageExtractor.extractMessages();
            sendResponse({ success: true, messages: messages });
            break;
            
          case 'getChatInfo':
            console.log('ℹ️ Getting chat info...');
            const chatInfo = window.messageExtractor.getCurrentChatInfo();
            sendResponse({ success: true, chatInfo: chatInfo });
            break;
            
          default:
            console.warn('❓ Unknown action:', request.action);
            sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        console.error('❌ Error handling message:', error);
        sendResponse({ success: false, error: error.message });
      }
      
      return true; // Keep message channel open for async responses
    });
    
    // Mark message listener as active
    window.naxMessageListenerActive = true;
    console.log('✅ Nax content script message listener registered successfully');
    console.log('📡 Ready to receive messages from popup and background script');
  }

  // Mark as initialized
  if (!window.naxInitialized) {
    window.naxInitialized = true;
    window.NaxContentScriptInitialized = true;
    console.log('=== NAX INITIALIZED SUCCESSFULLY ===');
  }

  // Test the message listener is working
  setTimeout(() => {
    console.log('🧪 Testing content script message listener...');
    try {
      // Test if we can dispatch a custom event
      const testEvent = new CustomEvent('naxTest', { detail: { test: true } });
      document.dispatchEvent(testEvent);
      console.log('✅ Content script test event dispatched successfully');
      
      // Test if chrome runtime API is accessible
      if (chrome && chrome.runtime) {
        console.log('✅ Chrome runtime API is accessible');
      }
      
      // Test self-message capability
      console.log('🧪 Testing self-message capability...');
      chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
        if (response && response.success) {
          console.log('✅ Self-message test successful:', response);
        } else {
          console.log('⚠️ Self-message test failed or no response');
        }
      });
      
      // Test messageExtractor availability
      if (window.messageExtractor) {
        console.log('✅ messageExtractor is accessible');
      } else {
        console.error('❌ messageExtractor not accessible');
      }
      
      // Test global flag
      if (window.NaxContentScriptInitialized) {
        console.log('✅ Global flag is set correctly');
      } else {
        console.error('❌ Global flag not set');
      }
    } catch (error) {
      console.error('❌ Content script test failed:', error);
    }
  }, 1000);

})(); // Close the IIFE
