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
      
      // Strategy 1: Look for message-specific elements
      const messageSelectors = [
        // WhatsApp's specific message containers
        'div[data-testid="last-msg"]',
        'span[data-testid="last-msg"]',
        'div[title]:not([title*=":"])', // divs with title but not timestamps
        'span[title]:not([title*=":"])', // spans with title but not timestamps
        
        // Look for elements that contain message text
        'div[dir="ltr"]',
        'span[dir="ltr"]',
        'div[dir="auto"]:not(:first-child)',
        'span[dir="auto"]:not(:first-child)',
        
        // Look for elements with specific classes that contain messages
        'div[class*="message"]',
        'span[class*="message"]',
        'div[class*="text"]',
        'span[class*="text"]',
        
        // Look for elements that are not the first child (likely not the chat name)
        'div:not(:first-child)',
        'span:not(:first-child)'
      ];

      for (const selector of messageSelectors) {
        const elements = chatElement.querySelectorAll(selector);
        
        for (const element of elements) {
          // Skip if this element contains the chat name
          if (chatName && element.textContent?.includes(chatName)) {
            continue;
          }
          
          // Get text from title attribute first (often contains the actual message)
          let text = element.title || element.textContent;
          if (!text) continue;
          
          text = text.trim();
          if (text.length < 3) continue;
          
          // Skip if it's just the chat name
          if (chatName && text === chatName) {
            continue;
          }
          
          // Skip if the text is exactly the same as chat name (case insensitive)
          if (chatName && text.toLowerCase() === chatName.toLowerCase()) {
            continue;
          }
          
          // Skip if text starts with chat name (likely a UI element)
          if (chatName && text.toLowerCase().startsWith(chatName.toLowerCase())) {
            continue;
          }
          
          // Skip if text contains chat name as a word (likely not a real message)
          if (chatName && text.toLowerCase().includes(chatName.toLowerCase())) {
            const words = text.toLowerCase().split(/\s+/);
            if (words.includes(chatName.toLowerCase())) {
              continue;
            }
          }
          
          // Skip timestamps
          if (text.match(/^\d{1,2}:\d{2}(\s*(am|pm|AM|PM))?$/)) {
            continue;
          }
          
          // Skip status indicators
          if (text.match(/^(online|last seen|typing|away|yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i)) {
            continue;
          }
          
          // Skip very short or purely numeric text
          if (text.length < 3 || text.match(/^\d+$/)) {
            continue;
          }
          
                     // Skip UI artifacts
           if (text.match(/^(default-|refreshed|status-|image-|pin-|voice-|disappearing-|call-)/)) {
             continue;
           }
           
           // Check if this contains actual message content (not just UI artifacts)
           const hasRealContent = text.match(/[a-zA-Z]{3,}/) && text.length > 10;
           if (!hasRealContent) {
             continue;
           }
           
           // This looks like a real message
           const cleanText = this.cleanMessageText(text);
           if (cleanText && cleanText.length > 3) {
             console.log('✅ Found message via selector:', cleanText.substring(0, 50));
             return cleanText;
           }
        }
      }

      // Strategy 2: Parse the DOM structure more carefully
      const allTextElements = chatElement.querySelectorAll('span, div');
      const potentialMessages = [];
      
      for (const element of allTextElements) {
        const text = element.textContent?.trim();
        if (!text || text.length < 3) continue;
        
                 // Skip if it's the chat name
         if (chatName && text === chatName) continue;
         
         // Skip if text is exactly the same as chat name (case insensitive)
         if (chatName && text.toLowerCase() === chatName.toLowerCase()) continue;
         
         // Skip if text starts with chat name (likely a UI element)
         if (chatName && text.toLowerCase().startsWith(chatName.toLowerCase())) continue;
        
        // Skip timestamps and status
        if (text.match(/^\d{1,2}:\d{2}/) || 
            text.match(/^(online|last seen|typing|away|yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i)) {
          continue;
        }
        
                 // Skip UI artifacts
         if (text.match(/^(default-|refreshed|status-|image-|pin-|voice-|disappearing-|call-)/)) {
           continue;
         }
         
         // Skip very short or purely numeric
         if (text.length < 3 || text.match(/^\d+$/)) continue;
         
         // Must contain some alphanumeric content
         if (!/[a-zA-Z0-9]/.test(text)) continue;
         
         // Check if this contains actual message content (not just UI artifacts)
         const hasRealContent = text.match(/[a-zA-Z]{3,}/) && text.length > 10;
         if (!hasRealContent) {
           continue;
         }
         
         potentialMessages.push(text);
      }
      
      // Sort by length (longer text is more likely to be a message)
      potentialMessages.sort((a, b) => b.length - a.length);
      
      for (const text of potentialMessages) {
        const cleanText = this.cleanMessageText(text);
        if (cleanText && cleanText.length > 3) {
          console.log('✅ Found message via text analysis:', cleanText.substring(0, 50));
          return cleanText;
        }
      }

      // Strategy 3: Look for specific patterns in the full text
      const fullText = chatElement.textContent || '';
      const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      for (let i = lines.length - 1; i >= 0; i--) { // Start from the end
        const line = lines[i];
        
                 // Skip the chat name
         if (chatName && line === chatName) continue;
         
         // Skip if line is exactly the same as chat name (case insensitive)
         if (chatName && line.toLowerCase() === chatName.toLowerCase()) continue;
         
         // Skip if line starts with chat name (likely a UI element)
         if (chatName && line.toLowerCase().startsWith(chatName.toLowerCase())) continue;
        
        // Skip timestamps and status
        if (line.match(/^\d{1,2}:\d{2}/) || 
            line.match(/^(online|last seen|typing|away|yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i)) {
          continue;
        }
        
                 // Skip UI artifacts
         if (line.match(/^(default-|refreshed|status-|image-|pin-|voice-|disappearing-|call-)/)) {
           continue;
         }
         
         // Skip very short or purely numeric
         if (line.length < 3 || line.match(/^\d+$/)) continue;
         
         // Must contain some alphanumeric content
         if (!/[a-zA-Z0-9]/.test(line)) continue;
         
         // Check if this contains actual message content (not just UI artifacts)
         const hasRealContent = line.match(/[a-zA-Z]{3,}/) && line.length > 10;
         if (!hasRealContent) {
           continue;
         }
         
         const cleanText = this.cleanMessageText(line);
         if (cleanText && cleanText.length > 3) {
           console.log('✅ Found message via line analysis:', cleanText.substring(0, 50));
           return cleanText;
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

      // Filter out UI elements and chat metadata - MORE AGGRESSIVE
      const uiPatterns = [
        /^(typing|online|last seen|archived|muted|pinned)$/i, // Only exact matches
        /^(draft:|you:)$/i, // Only exact matches
        /^\d{1,2}:\d{2}$/i, // Only exact timestamps
        /^[^\w\s]*$/, // Only symbols
        /^(yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i,
        /^(\d+\s*)?(unread|new)$/i, // Only exact matches
        /^(call|missed call|incoming call|outgoing call)$/i, // Only exact matches
        /^(default-|refreshed|status-|image-|pin-|voice-|disappearing-|call-)/i, // UI artifacts
        /^(you deleted this message|you recalled|message deleted)$/i, // WhatsApp system messages
        /^(photo|image|video|audio|document|location|contact|sticker)$/i, // Media indicators
        /^(sent|delivered|read|pending)$/i, // Message status
        /^[^\w\s]*$/, // Only symbols and punctuation
        /^\d+$/, // Only numbers
        /^[a-zA-Z]+(\([^)]+\))?$/, // Single words with optional parentheses (like "Harsha(You)")
        /^[a-zA-Z]+\s+\d+\/\d+\/\d+$/, // Name with date pattern
        /^[a-zA-Z]+\s+\d{1,2}:\d{2}/, // Name with time pattern
      ];

      for (const pattern of uiPatterns) {
        if (pattern.test(cleaned)) {
          console.log(`🗑️ Filtered UI pattern: "${cleaned}"`);
          return '';
        }
      }

             // Additional cleaning for specific artifacts - MORE AGGRESSIVE
       cleaned = cleaned
         .replace(/^(‪|‬)/g, '') // Remove text direction marks
         .replace(/^\W+/, '') // Remove leading non-word characters
         .replace(/\W+$/, '') // Remove trailing non-word characters
         .replace(/^(you|i|me|he|she|they|we|it)\s*:/i, '') // Remove sender prefixes
         .replace(/^[a-zA-Z]+\s*\([^)]+\)\s*/, '') // Remove name with status like "Harsha(You)"
         .trim();

       // Remove common UI artifacts that appear in the middle of messages
       cleaned = cleaned
         .replace(/\s*status-dblcheck\s*/g, ' ') // Remove status indicators
         .replace(/\s*mute-notifications-refreshed\s*/g, ' ') // Remove notification artifacts
         .replace(/\s*image-refreshed\s*/g, ' ') // Remove image artifacts
         .replace(/\s*pin-refreshed-thin\s*/g, ' ') // Remove pin artifacts
         .replace(/\s*disappearing-messages-refreshed\s*/g, ' ') // Remove disappearing messages
         .replace(/\s*default-contact-refreshed\s*/g, ' ') // Remove contact artifacts
         .replace(/\s*default-group-refreshed\s*/g, ' ') // Remove group artifacts
         .replace(/\s*voice-call-outgoing-filled\s*/g, ' ') // Remove call artifacts
         .replace(/\s*‪😌‬\s*/g, ' ') // Remove emoji artifacts
         .replace(/\s*\d{1,2}:\d{2}\s*(am|pm|AM|PM)?\s*/g, ' ') // Remove timestamps
         .replace(/\s*\d{1,2}\/\d{1,2}\/\d{4}\s*/g, ' ') // Remove dates
         .replace(/\s*https?:\/\/[^\s]+\s*/g, ' ') // Remove URLs
         .replace(/\s*[a-zA-Z]+@[a-zA-Z]+\.[a-zA-Z]+\s*/g, ' ') // Remove email addresses
         .trim();

       // Check if the cleaned text is just a chat name or similar pattern
       const chatNamePatterns = [
         /^[a-zA-Z\s&\/]+$/i, // Just letters, spaces, &, / (like "IT & Software Jobs 679")
         /^[a-zA-Z\s]+$/i, // Just letters and spaces
         /^[a-zA-Z\s]+[0-9]+$/i, // Letters and spaces followed by numbers
         /^[a-zA-Z\s]+[0-9]+\s*[a-zA-Z\s]*$/i, // Letters, numbers, and more letters
       ];
       
       for (const pattern of chatNamePatterns) {
         if (pattern.test(cleaned) && cleaned.length < 50) {
           console.log(`🗑️ Filtered chat name pattern: "${cleaned}"`);
           return '';
         }
       }

      // Must have some actual content - MORE RESTRICTIVE
      if (cleaned.length < 5 || !/[a-zA-Z0-9]/.test(cleaned)) {
        console.log(`🗑️ Too short or no alphanumeric: "${cleaned}"`);
        return '';
      }

      // Must not be just a single word (likely a name or status)
      const words = cleaned.split(/\s+/);
      if (words.length < 2) {
        console.log(`🗑️ Single word likely not a message: "${cleaned}"`);
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
