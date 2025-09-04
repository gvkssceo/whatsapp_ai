// WhatsApp Chat List Scanner - Fetches latest messages from all chats
(function() {
  'use strict';
  
  if (window.naxChatScannerLoaded) {
    console.log('Nax Chat Scanner already loaded');
    return;
  }
  window.naxChatScannerLoaded = true;
  
  console.log('🚀 Nax Chat Scanner Loading...');

  class WhatsAppChatScanner {
    constructor() {
      this.setupMessageListener();
      console.log('✅ WhatsApp Chat Scanner ready');
    }

    // Get all chats from the chat list with their latest messages
    getAllChatsWithLatestMessages() {
      try {
        const chatListSelectors = [
          // WhatsApp Web 2025 chat list selectors - more specific
          '[data-testid="chat-list"] > div > div[role="listitem"]',
          '[data-testid="chat-list"] div[role="listitem"]',
          '[data-testid="chat-list"] div[tabindex="-1"]',
          'div[aria-label*="Chat list"] div[role="listitem"]',
          '[data-testid="conversation-list"] div[role="listitem"]',
          // Fallback selectors
          'div[id="pane-side"] div[role="listitem"]',
          'div[data-testid*="chat"] div[role="listitem"]',
          '#side div[role="listitem"]'
        ];

        let chatElements = [];
        
        // Try each selector until we find chats
        for (const selector of chatListSelectors) {
          chatElements = document.querySelectorAll(selector);
          if (chatElements.length > 0) {
            console.log(`✅ Found ${chatElements.length} chats using selector: ${selector}`);
            break;
          }
        }

        if (chatElements.length === 0) {
          console.warn('❌ No chat elements found in chat list');
          return {
            success: false,
            error: 'No chats found in chat list',
            chats: []
          };
        }

        const chats = [];
        const processedChats = new Set();

        chatElements.forEach((chatElement, index) => {
          try {
            const chatData = this.extractChatData(chatElement, index);
            
            if (chatData && chatData.chatName && chatData.latestMessage) {
              // Avoid duplicates
              const chatKey = `${chatData.chatName}_${chatData.latestMessage}`;
              if (!processedChats.has(chatKey)) {
                processedChats.add(chatKey);
                chats.push(chatData);
                console.log(`📱 Found chat: "${chatData.chatName}" - "${chatData.latestMessage.substring(0, 50)}..."`);
              }
            }
          } catch (error) {
            console.warn(`Error processing chat ${index}:`, error);
          }
        });

        console.log(`🎉 Successfully extracted ${chats.length} chats with latest messages`);
        
        return {
          success: true,
          chats: chats,
          totalFound: chats.length
        };

      } catch (error) {
        console.error('❌ Error getting all chats:', error);
        return {
          success: false,
          error: error.message,
          chats: []
        };
      }
    }

    // Extract chat name and latest message from a chat list item
    extractChatData(chatElement, index) {
      try {
        // Extract chat name
        const chatName = this.extractChatName(chatElement);
        if (!chatName) {
          console.warn(`No chat name found for chat ${index}`);
          return null;
        }

        // Extract latest message
        const latestMessage = this.extractLatestMessage(chatElement);
        if (!latestMessage) {
          console.warn(`No latest message found for chat ${index} (${chatName})`);
          return null;
        }

        // Extract additional info
        const timestamp = this.extractTimestamp(chatElement);
        const isGroup = this.detectIfGroup(chatElement, chatName);
        const hasUnread = this.detectUnreadStatus(chatElement);

        return {
          id: `chat_${Date.now()}_${index}`,
          chatName: chatName,
          latestMessage: latestMessage,
          timestamp: timestamp,
          isGroup: isGroup,
          hasUnread: hasUnread,
          extractedAt: Date.now(),
          index: index
        };

      } catch (error) {
        console.error(`Error extracting chat data for index ${index}:`, error);
        return null;
      }
    }

    // Extract chat name from chat list item
    extractChatName(chatElement) {
      const nameSelectors = [
        // Chat name selectors for 2025 WhatsApp Web
        'span[title]:not([title=""])',
        'div[title]:not([title=""])',
        'span[data-testid="conversation-name"]',
        'div[data-testid="conversation-name"]',
        // Fallback selectors
        'span[dir="auto"]:first-child',
        'div[dir="auto"]:first-child',
        'span:first-child',
        'div:first-child'
      ];

      for (const selector of nameSelectors) {
        const nameElement = chatElement.querySelector(selector);
        if (nameElement) {
          const name = nameElement.title || nameElement.textContent;
          if (name && name.trim() && name.length > 1) {
            const cleanName = name.trim()
              .replace(/\s+/g, ' ')
              .replace(/[^\w\s\u00C0-\u017F\u0100-\u024F\u1E00-\u1EFF]/g, ''); // Keep letters, spaces, accented chars
            
            if (cleanName.length > 1) {
              return cleanName;
            }
          }
        }
      }

      return null;
    }

    // Extract latest message from chat list item
    extractLatestMessage(chatElement) {
      console.log('🔍 Extracting latest message from chat element:', chatElement);
      
      // Get the chat name first to avoid including it in the message
      const chatName = this.extractChatName(chatElement);
      console.log('📱 Chat name for filtering:', chatName);
      
      // First, try to get the full text content of the chat element
      const fullText = chatElement.textContent || '';
      console.log('📝 Full chat element text:', fullText.substring(0, 300));
      
      // Split into lines and find the message
      const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      console.log('📝 All text lines:', lines);
      
      // Look for the message line (usually the second or third meaningful line)
      let messageLine = null;
      let lineIndex = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip empty lines
        if (!line || line.length < 2) continue;
        
        // Skip the chat name
        if (chatName && line === chatName) {
          console.log(`⏭️ Skipping chat name line: "${line}"`);
          continue;
        }
        
        // Skip timestamps (like "12:34", "12:34 PM")
        if (line.match(/^\d{1,2}:\d{2}(\s*(am|pm|AM|PM))?$/)) {
          console.log(`⏭️ Skipping timestamp: "${line}"`);
          continue;
        }
        
        // Skip status indicators
        if (line.match(/^(online|last seen|typing|away)$/i)) {
          console.log(`⏭️ Skipping status: "${line}"`);
          continue;
        }
        
        // Skip very short lines (likely UI elements)
        if (line.length < 3) {
          console.log(`⏭️ Skipping short line: "${line}"`);
          continue;
        }
        
        // Skip lines that are just numbers
        if (line.match(/^\d+$/)) {
          console.log(`⏭️ Skipping number line: "${line}"`);
          continue;
        }
        
        // This looks like a potential message
        if (line.length >= 3 && /[a-zA-Z0-9]/.test(line)) {
          messageLine = line;
          lineIndex = i;
          console.log(`✅ Found potential message at line ${i}: "${line}"`);
          break;
        }
      }
      
      if (messageLine) {
        const cleanMessage = this.cleanMessageText(messageLine);
        if (cleanMessage) {
          console.log(`✅ Final clean message: "${cleanMessage}"`);
          return cleanMessage;
        }
      }
      
      // Fallback: Try specific selectors
      const messageSelectors = [
        'span[title]:not(:first-child)',
        'div[title]:not(:first-child)', 
        'span[data-testid="last-msg"]',
        'div[data-testid="last-msg"]',
        'span:not([title])',
        'span:last-of-type',
        'div:last-of-type'
      ];

      for (const selector of messageSelectors) {
        const elements = chatElement.querySelectorAll(selector);
        
        for (const element of elements) {
          const text = element.title || element.textContent;
          if (text && text.trim() && text.length > 3) {
            // Skip if it's the chat name
            if (chatName && text.trim() === chatName.trim()) {
              continue;
            }
            
            const cleanText = this.cleanMessageText(text.trim());
            if (cleanText && cleanText.length > 3) {
              console.log('✅ Found message via selector:', cleanText.substring(0, 50));
              return cleanText;
            }
          }
        }
      }

      // Last resort - scan all spans for meaningful content
      const allSpans = chatElement.querySelectorAll('span');
      for (const span of allSpans) {
        const text = span.textContent?.trim();
        if (text && 
            text.length > 5 && 
            text.length < 500 &&
            (!chatName || text !== chatName) &&
            !text.match(/^\d{1,2}:\d{2}/) &&
            /[a-zA-Z0-9]/.test(text)) {
          
          const cleanText = this.cleanMessageText(text);
          if (cleanText) {
            console.log('✅ Found message via span scanning:', cleanText.substring(0, 50));
            return cleanText;
          }
        }
      }

      console.log('❌ No message found in chat element');
      return null;
    }

    // Clean message text from UI artifacts
    cleanMessageText(text) {
      if (!text) return '';
      
      // Remove common UI artifacts
      let cleaned = text
        .replace(/\s+/g, ' ')
        .replace(/[\n\r\t]/g, ' ')
        .replace(/\u200e/g, '') // Remove left-to-right mark
        .replace(/\u200f/g, '') // Remove right-to-left mark
        .trim();

      // Filter out UI elements and chat metadata - LESS AGGRESSIVE
      const uiPatterns = [
        /^(typing|online|last seen|archived|muted|pinned)$/i, // Only exact matches
        /^(draft:|you:)$/i, // Only exact matches
        /^\d{1,2}:\d{2}$/i, // Only exact timestamps
        /^[^\w\s]*$/, // Only symbols
        /^(yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i,
        /^(\d+\s*)?(unread|new)$/i, // Only exact matches
        /^(call|missed call|incoming call|outgoing call)$/i // Only exact matches
      ];

      for (const pattern of uiPatterns) {
        if (pattern.test(cleaned)) {
          console.log(`🗑️ Filtered UI pattern: "${cleaned}"`);
          return '';
        }
      }

      // Additional cleaning for specific artifacts - LESS AGGRESSIVE
      cleaned = cleaned
        .replace(/^(‪|‬)/g, '') // Remove text direction marks
        .replace(/^\W+/, '') // Remove leading non-word characters
        .replace(/\W+$/, '') // Remove trailing non-word characters
        .trim();

      // Must have some actual content - LESS RESTRICTIVE
      if (cleaned.length < 2 || !/[a-zA-Z0-9]/.test(cleaned)) {
        console.log(`🗑️ Too short or no alphanumeric: "${cleaned}"`);
        return '';
      }

      console.log(`✅ Cleaned message: "${cleaned}"`);
      return cleaned;
    }

    // Extract timestamp from chat list item
    extractTimestamp(chatElement) {
      const timeSelectors = [
        'span[data-testid="msg-time"]',
        'div[data-testid="msg-time"]',
        'time',
        'span:last-child',
        'div:last-child'
      ];

      for (const selector of timeSelectors) {
        const timeElement = chatElement.querySelector(selector);
        if (timeElement) {
          const timeText = timeElement.textContent || timeElement.title;
          if (timeText && timeText.match(/^\d{1,2}:\d{2}/)) {
            return timeText.trim();
          }
        }
      }

      return null;
    }

    // Detect if chat is a group
    detectIfGroup(chatElement, chatName) {
      // Check for group indicators
      const groupIndicators = [
        () => chatName && (chatName.toLowerCase().includes('group') || 
                          chatName.toLowerCase().includes('team') ||
                          chatName.toLowerCase().includes('family')),
        () => chatElement.querySelector('[data-testid="group"]'),
        () => chatElement.querySelector('[aria-label*="group"]'),
        () => chatElement.querySelector('svg[data-icon="group"]')
      ];

      return groupIndicators.some(check => {
        try {
          return check();
        } catch {
          return false;
        }
      });
    }

    // Detect unread status
    detectUnreadStatus(chatElement) {
      const unreadIndicators = [
        '[data-testid="unread-count"]',
        '[aria-label*="unread"]',
        '.unread',
        '[data-icon="unread"]'
      ];

      return unreadIndicators.some(selector => 
        chatElement.querySelector(selector) !== null
      );
    }

    // Setup message listener
    setupMessageListener() {
      try {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
          console.log('📨 Chat Scanner received:', request.action);

          // Handle runtime.lastError to prevent unchecked errors
          const safeResponse = (response) => {
            try {
              if (chrome.runtime.lastError) {
                console.warn('Runtime error in chat scanner:', chrome.runtime.lastError.message);
                return;
              }
              sendResponse(response);
            } catch (error) {
              console.warn('Error sending response from chat scanner:', error.message);
            }
          };

          const timeout = setTimeout(() => {
            console.warn('⏰ Response timeout for:', request.action);
            safeResponse({ success: false, error: 'Timeout' });
          }, 10000);

          try {
            switch (request.action) {
              case 'ping':
                clearTimeout(timeout);
                safeResponse({ success: true, message: 'pong' });
                break;

              case 'getAllChatsWithMessages':
              case 'getAllChatsAndMessages':
                const result = this.getAllChatsWithLatestMessages();
                clearTimeout(timeout);
                safeResponse(result);
                break;

              case 'scanChatList':
                const scanResult = this.getAllChatsWithLatestMessages();
                clearTimeout(timeout);
                safeResponse({ 
                  success: scanResult.success, 
                  chats: scanResult.chats,
                  totalFound: scanResult.totalFound,
                  error: scanResult.error
                });
                break;

              default:
                clearTimeout(timeout);
                safeResponse({ success: false, error: 'Unknown action' });
            }
          } catch (error) {
            clearTimeout(timeout);
            console.error('Error in message handler:', error);
            safeResponse({ success: false, error: error.message });
          }

          return true;
        });

        console.log('✅ Chat Scanner message listener registered');
      } catch (error) {
        console.error('Failed to setup message listener:', error);
      }
    }
  }

  // Initialize with delay to avoid conflicts
  setTimeout(() => {
    try {
      window.naxChatScanner = new WhatsAppChatScanner();
      console.log('🎉 Nax Chat Scanner initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Nax Chat Scanner:', error);
    }
  }, 1000);

})();
