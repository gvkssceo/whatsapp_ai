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
        
        // Comprehensive list of selectors for WhatsApp Web 2024/2025
        const selectors = [
          // Modern WhatsApp Web selectors
          '[data-testid*="message"]',
          '[data-testid="msg-container"]',
          '[data-testid="conversation-message"]',
          '[data-testid="msg-bubble"]',
          '[data-testid="msg-text"]',
          '[data-testid="bubble-text"]',
          
          // Generic message containers
          'div[class*="message"]',
          'div[class*="msg"]',
          'div[class*="bubble"]',
          'div[class*="conversation"]',
          'div[role="row"]',
          'div[role="listitem"]',
          
          // WhatsApp specific class patterns (these change frequently)
          'div[class*="_21Ahp"]',
          'div[class*="_2aBzC"]',
          'div[class*="_3_7SH"]',
          'div[class*="_1Gy50"]',
          'div[class*="_2H6nH"]',
          'div[class*="_1Gy50"]',
          
          // Legacy selectors
          'div[class*="message-in"], div[class*="message-out"]',
          'div.message-in, div.message-out',
          
          // Fallback: any div with text content that might be a message
          'div[dir="ltr"]',
          'div[dir="auto"]'
        ];
        
        let messageElements = [];
        let usedSelector = '';
        
        for (const selector of selectors) {
          messageElements = document.querySelectorAll(selector);
          if (messageElements.length > 0) {
            usedSelector = selector;
            console.log(`Found ${messageElements.length} message elements using selector: ${selector}`);
            break;
          }
        }
        
        // If no elements found with specific selectors, try a more aggressive approach
        if (messageElements.length === 0) {
          console.log('No elements found with specific selectors, trying dynamic scanning...');
          
          // Try to find any elements that might contain messages
          const allDivs = document.querySelectorAll('div');
          const potentialMessages = Array.from(allDivs).filter(div => {
            const text = div.textContent?.trim();
            return text && 
                   text.length > 10 && 
                   text.length < 1000 && 
                   !text.includes('data-testid') &&
                   !text.match(/^\d{1,2}:\d{2}$/) && // Not just time
                   !text.includes('WhatsApp') && // Not UI text
                   !text.includes('Search') &&
                   !text.includes('Menu') &&
                   div.children.length < 10; // Not too complex
          });
          
          if (potentialMessages.length > 0) {
            messageElements = potentialMessages;
            usedSelector = 'dynamic-scanning';
            console.log(`Found ${messageElements.length} potential message elements using dynamic scanning`);
          }
        }
        
        if (messageElements.length === 0) {
          console.warn('No message elements found with any method');
          return [];
        }
        
        messageElements.forEach((element, index) => {
          try {
            // Try multiple approaches to extract text
            let messageText = '';
            
            // Method 1: Try our predefined selectors
            for (const selector of this.messageSelectors) {
              const textElement = element.querySelector(selector);
              if (textElement && textElement.textContent.trim()) {
                messageText = textElement.textContent.trim();
                break;
              }
            }
            
            // Method 2: If no text found, try direct text content
            if (!messageText) {
              const directText = element.textContent?.trim();
              if (directText && directText.length > 10) { // Ignore very short texts
                messageText = directText;
              }
            }
            
            // Method 3: Try finding any span or div with text
            if (!messageText) {
              const textElements = element.querySelectorAll('span, div');
              for (const textEl of textElements) {
                const text = textEl.textContent?.trim();
                if (text && text.length > 5 && !text.includes('data-testid')) {
                  messageText = text;
                  break;
                }
              }
            }
            
            if (messageText && messageText.length > 0) {
              // Clean up the message text
              messageText = messageText
                .replace(/\n+/g, ' ') // Replace newlines with spaces
                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                .trim();
                
              // Only add if it looks like a real message (not just timestamps, etc.)
              if (messageText.length > 3 && !messageText.match(/^\d{1,2}:\d{2}$/)) {
                messages.push({
                  id: `msg_${Date.now()}_${index}`,
                  messageId: `msg_${Date.now()}_${index}`,
                  text: messageText,
                  timestamp: Date.now(),
                  ts: Date.now(),
                  element: element,
                  sender: 'unknown'
                });
              }
          }
        } catch (error) {
            console.warn('Error extracting message:', error);
          }
        });
        
        console.log(`Successfully extracted ${messages.length} messages from ${messageElements.length} elements`);
        
        // Log sample messages for debugging
        if (messages.length > 0) {
          console.log('Sample extracted messages:', messages.slice(0, 3).map(m => ({
            id: m.id,
            text: m.text.substring(0, 50) + '...',
            length: m.text.length
          })));
          } else {
          console.warn('⚠️ No messages extracted! Debugging info:');
          console.log('- Total elements found:', messageElements.length);
          if (messageElements.length > 0) {
            console.log('- First element:', messageElements[0]);
            console.log('- First element text:', messageElements[0].textContent);
            console.log('- First element innerHTML:', messageElements[0].innerHTML.substring(0, 200));
          }
        }
        
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

    // Get all available chats (for now, just return current chat)
    getAllAvailableChats() {
      try {
        // In a full implementation, this would scan all chat elements
        // For now, we'll just return the current active chat
        const currentChat = this.getCurrentChatInfo();
        return [currentChat];
        
      } catch (error) {
        console.error('Error getting available chats:', error);
        return [{
          title: 'Unknown Chat',
          id: 'unknown',
          isGroup: false,
                timestamp: Date.now()
        }];
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
            // Format response to match what popup expects
                sendResponse({ 
                  success: true, 
              chats: chatData.messages, // popup expects 'chats' property
              messages: chatData.messages,
              chatInfo: chatData.chatInfo,
              messageCount: chatData.messageCount
            });
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
            
          case 'getAvailableChats':
            console.log('📋 Getting available chats...');
            try {
              const chats = window.messageExtractor.getAllAvailableChats ? 
                window.messageExtractor.getAllAvailableChats() : 
                [window.messageExtractor.getCurrentChatInfo()];
              sendResponse({ success: true, chats: chats });
            } catch (error) {
              sendResponse({ success: false, error: error.message });
            }
            break;
            
          case 'getChats':
            console.log('📋 Getting chats (alias for getAvailableChats)...');
            try {
              const chats = window.messageExtractor.getAllAvailableChats ? 
                window.messageExtractor.getAllAvailableChats() : 
                [window.messageExtractor.getCurrentChatInfo()];
              sendResponse({ success: true, chats: chats });
                } catch (error) {
              sendResponse({ success: false, error: error.message });
            }
            break;
            
          case 'getAllChatsAndMessages':
            console.log('📨 Getting all chats and messages...');
            try {
              const result = window.messageExtractor.getAllMessagesWithChatInfo();
              sendResponse({ success: true, ...result });
            } catch (error) {
              sendResponse({ success: false, error: error.message });
            }
            break;
            
          case 'getCurrentChatMessages':
            console.log('💬 Getting current chat messages...');
            try {
              const result = window.messageExtractor.getAllMessagesWithChatInfo();
              sendResponse({ success: true, messages: result.messages, chatInfo: result.chatInfo });
          } catch (error) {
              sendResponse({ success: false, error: error.message });
            }
            break;
            
          case 'fetchAllChatsBulk':
            console.log('📨 Fetching messages from all chats in bulk...');
            try {
              // For now, just return current chat messages since we can only access the active chat
              const result = window.messageExtractor.getAllMessagesWithChatInfo();
              sendResponse({ 
                success: true, 
                messages: result.messages,
                chatInfo: result.chatInfo,
                totalMessages: result.messages.length,
                processedChats: 1
              });
            } catch (error) {
              sendResponse({ success: false, error: error.message });
            }
            break;
            
          case 'debugMessageExtraction':
            console.log('🔍 Debugging message extraction...');
            try {
              // Get detailed debugging info
              const messages = window.messageExtractor.extractMessages();
              const chatInfo = window.messageExtractor.getCurrentChatInfo();
              
              // Also try to find any text elements on the page
              const allTextElements = document.querySelectorAll('span, div');
              const textSamples = Array.from(allTextElements)
                .slice(0, 10)
                .map(el => ({
                  tagName: el.tagName,
                  textContent: el.textContent?.substring(0, 100),
                  className: el.className,
                  id: el.id
                }))
                .filter(el => el.textContent && el.textContent.trim().length > 5);
              
              sendResponse({ 
                success: true, 
                extractedMessages: messages,
                chatInfo: chatInfo,
                textSamples: textSamples,
                totalTextElements: allTextElements.length
              });
            } catch (error) {
              sendResponse({ success: false, error: error.message });
            }
            break;
            
          case 'getAllExtractedMessages':
            console.log('📋 Getting all extracted messages...');
            try {
              const result = window.messageExtractor.getAllMessagesWithChatInfo();
              sendResponse({ 
                success: true, 
                messages: result.messages,
                chatInfo: result.chatInfo,
                messageCount: result.messageCount
              });
            } catch (error) {
              sendResponse({ success: false, error: error.message });
            }
            break;
            
          case 'scanWhatsAppDOM':
            console.log('🔍 Scanning WhatsApp Web DOM structure...');
            try {
              // Get all elements with data-testid
              const testIdElements = Array.from(document.querySelectorAll('[data-testid]'))
                .map(el => ({
                  testid: el.getAttribute('data-testid'),
                  tagName: el.tagName,
                  className: el.className,
                  textContent: el.textContent?.substring(0, 100)
                }))
                .filter(el => el.textContent && el.textContent.trim().length > 5);
              
              // Get all divs with classes that might be messages
              const classElements = Array.from(document.querySelectorAll('div[class*="message"], div[class*="msg"], div[class*="bubble"]'))
                .map(el => ({
                  className: el.className,
                  textContent: el.textContent?.substring(0, 100),
                  children: el.children.length
                }))
                .filter(el => el.textContent && el.textContent.trim().length > 5);
              
              // Get all spans and divs with text content
              const textElements = Array.from(document.querySelectorAll('span, div'))
                .filter(el => {
                  const text = el.textContent?.trim();
                  return text && text.length > 10 && text.length < 200;
                })
                .slice(0, 20) // Limit to first 20
                .map(el => ({
                  tagName: el.tagName,
                  className: el.className,
                  textContent: el.textContent?.substring(0, 100)
                }));
              
              sendResponse({ 
                success: true, 
                testIdElements: testIdElements,
                classElements: classElements,
                textElements: textElements,
                totalElements: document.querySelectorAll('*').length
              });
            } catch (error) {
              sendResponse({ success: false, error: error.message });
            }
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
