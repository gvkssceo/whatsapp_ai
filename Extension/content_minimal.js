// Minimal, non-intrusive WhatsApp message extractor
(function() {
  'use strict';
  
  // Prevent duplicate execution
  if (window.naxMinimalLoaded) {
    console.log('Nax minimal already loaded');
    return;
  }
  window.naxMinimalLoaded = true;
  
  console.log('🚀 Nax Minimal Content Script Loading...');

  class MinimalWhatsAppExtractor {
    constructor() {
      this.setupMessageListener();
      console.log('✅ Minimal WhatsApp extractor ready');
    }

    // Get current chat title with minimal DOM interaction
    getCurrentChatTitle() {
      try {
        // Simple, reliable selectors
        const selectors = [
          'header[data-testid="conversation-header"] span[title]',
          'header span[title]',
          'div[data-testid="conversation-header"] span[title]',
          'header[data-testid="conversation-header"] span',
          'div[data-testid="conversation-header"] span'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            const title = element.title || element.textContent;
            if (title && title.trim() && title !== 'WhatsApp') {
              console.log(`✅ Found chat title: "${title}" with selector: ${selector}`);
              return title.trim();
            }
          }
        }
        
        return 'Current Chat';
      } catch (error) {
        console.warn('Error getting chat title:', error);
        return 'Current Chat';
      }
    }

    // Extract messages with minimal processing
    extractMessages() {
      try {
        const messages = [];
        const seenTexts = new Set();

        // Simple message selectors that work reliably
        const messageSelectors = [
          '[data-testid="conversation-panel-wrapper"] span[dir="ltr"]',
          'div[data-testid="msg-container"] span',
          'div[role="row"] span[dir="ltr"]',
          'div[class*="message"] span'
        ];

        for (const selector of messageSelectors) {
          const elements = document.querySelectorAll(selector);
          console.log(`Selector "${selector}" found ${elements.length} elements`);

          elements.forEach((element, index) => {
            try {
              let text = element.textContent?.trim();
              if (!text || text.length < 5) return;

              // Basic cleaning - remove obvious UI elements
              if (text.includes('status-dblcheck') || 
                  text.includes('image-refreshed') ||
                  text.includes('voice-call') ||
                  text.match(/^\d{1,2}:\d{2}/) ||
                  seenTexts.has(text.toLowerCase())) {
                return;
              }

              seenTexts.add(text.toLowerCase());
              
              messages.push({
                id: `msg_${Date.now()}_${messages.length}`,
                text: text,
                timestamp: Date.now(),
                type: 'text'
              });

            } catch (error) {
              // Silently skip problematic elements
            }
          });

          // If we found messages, stop trying other selectors
          if (messages.length > 0) {
            console.log(`✅ Found ${messages.length} messages using selector: ${selector}`);
            break;
          }
        }

        console.log(`📝 Total extracted: ${messages.length} messages`);
        return messages;

      } catch (error) {
        console.error('Error extracting messages:', error);
        return [];
      }
    }

    // Get all data in one simple call
    getAllData() {
      try {
        const chatTitle = this.getCurrentChatTitle();
        const messages = this.extractMessages();

        // Add chat info to each message
        const messagesWithChat = messages.map((msg, index) => ({
          ...msg,
          chatTitle: chatTitle,
          chatId: `chat_${Date.now()}`,
          isGroup: chatTitle.toLowerCase().includes('group'),
          messageId: msg.id,
          extractedAt: Date.now()
        }));

        return {
          success: true,
          messages: messagesWithChat,
          chatInfo: {
            title: chatTitle,
            id: `chat_${Date.now()}`,
            isGroup: chatTitle.toLowerCase().includes('group')
          },
          messageCount: messagesWithChat.length
        };

      } catch (error) {
        console.error('Error getting all data:', error);
        return {
          success: false,
          error: error.message,
          messages: [],
          chatInfo: { title: 'Error', id: 'error', isGroup: false },
          messageCount: 0
        };
      }
    }

    // Simple message listener with timeout protection
    setupMessageListener() {
      try {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          console.log('📨 Minimal handler received:', request.action);

          // Set timeout to prevent hanging
          const timeout = setTimeout(() => {
            console.warn('⏰ Response timeout for:', request.action);
            sendResponse({ success: false, error: 'Timeout' });
          }, 5000);

          try {
            switch (request.action) {
              case 'ping':
                clearTimeout(timeout);
                sendResponse({ success: true, message: 'pong' });
                break;

              case 'getAllChatsAndMessages':
                const data = this.getAllData();
                clearTimeout(timeout);
                sendResponse(data);
                break;

              case 'extractMessages':
                const messages = this.extractMessages();
                clearTimeout(timeout);
                sendResponse({ success: true, messages });
                break;

              case 'getChatInfo':
                const chatTitle = this.getCurrentChatTitle();
                clearTimeout(timeout);
                sendResponse({ 
                  success: true, 
                  chatInfo: { 
                    title: chatTitle, 
                    id: `chat_${Date.now()}`, 
                    isGroup: chatTitle.toLowerCase().includes('group') 
                  } 
                });
                break;

              default:
                clearTimeout(timeout);
                sendResponse({ success: false, error: 'Unknown action' });
            }
          } catch (error) {
            clearTimeout(timeout);
            console.error('Error in message handler:', error);
            sendResponse({ success: false, error: error.message });
          }

          return true; // Keep channel open
        });

        console.log('✅ Minimal message listener registered');
      } catch (error) {
        console.error('Failed to setup message listener:', error);
      }
    }
  }

  // Initialize with delay to avoid conflicts
  setTimeout(() => {
    try {
      window.naxMinimal = new MinimalWhatsAppExtractor();
      console.log('🎉 Nax Minimal initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Nax Minimal:', error);
    }
  }, 1000);

})();
