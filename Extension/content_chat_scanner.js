console.log('🚀 Nax Chat Scanner Loading...');

class WhatsAppChatScanner {
  constructor() {
    this.isReady = false;
    this.init();
  }

  init() {
    try {
      console.log('🔧 Initializing WhatsApp Chat Scanner...');
      this.isReady = true;
      console.log('✅ WhatsApp Chat Scanner ready');
    } catch (error) {
      console.error('❌ Error initializing chat scanner:', error);
    }
  }

  // Extract chat name from a chat element
  extractChatName(chatElement) {
    console.log('🔍 Extracting chat name from element:', chatElement);
    
    const nameSelectors = [
      'span[title]:not([title=""])',
      'div[title]:not([title=""])',
      'span[data-testid="conversation-name"]',
      'div[data-testid="conversation-name"]',
      'span[class*="x1iyjqo2"][title]',
      'span[class*="x6ikm8r"][title]',
      'span[class*="x10l6tqk"][title]',
      'span[dir="auto"][title]:not([title*=":"])',
      'div[dir="auto"][title]:not([title*=":"])',
      'span[dir="auto"]:first-child',
      'div[dir="auto"]:first-child'
    ];

    for (const selector of nameSelectors) {
      const elements = chatElement.querySelectorAll(selector);
      for (const element of elements) {
        let name = element.getAttribute('title') || element.textContent?.trim();
        if (!name) continue;

        // Clean the name
        const cleanName = name.replace(/[^\w\s\-&\/]/g, '').trim();
        
        // Filter out UI artifacts and invalid names
        if (cleanName.length > 1 &&
            !cleanName.match(/^\d+$/) &&
            !cleanName.match(/^\d{1,2}:\d{2}/) &&
            !cleanName.includes('default-') &&
            !cleanName.includes('refreshed') &&
            !cleanName.includes('status-') &&
            !cleanName.includes('image-') &&
            !cleanName.includes('voice-') &&
            !cleanName.includes('pin-') &&
            !cleanName.includes('disappearing-') &&
            !cleanName.includes('call-') &&
            !cleanName.match(/^(online|last seen|typing|away|yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i)) {
          console.log(`✅ Found chat name: "${cleanName}" using selector: ${selector}`);
          return cleanName;
        }
      }
    }

    console.log('❌ No valid chat name found');
    return null;
  }

  // Extract latest message from a chat element
  extractLatestMessage(chatElement, chatName) {
    console.log('🔍 Extracting latest message from chat element:', chatElement);
    console.log('📱 Chat name for filtering:', chatName);

    // Debug: Log the full text content of the chat element
    const fullText = chatElement.textContent || '';
    console.log('📝 Full chat element text:', fullText.substring(0, 200) + '...');

    // Strategy 1: Look for message-specific elements
    console.log('🔍 Strategy 1: Looking for message-specific elements...');
    const messageSelectors = [
      'div[class*="_ak8q"]', // WhatsApp Web 2025 message class
      'div[class*="message"]',
      'div[class*="bubble"]',
      'div[class*="text"]',
      'span[class*="text"]',
      'div[data-testid*="message"]',
      'div[data-testid*="text"]',
      'span[data-testid*="text"]',
      'div[dir="ltr"]',
      'span[dir="ltr"]'
    ];

    for (const selector of messageSelectors) {
      const elements = chatElement.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent?.trim();
        if (!text || text.length < 5) continue;

        // Skip if it's the chat name
        if (chatName && text.toLowerCase() === chatName.toLowerCase()) {
          console.log('🗑️ Skipping chat name:', text);
          continue;
        }

        // Skip if it starts with chat name
        if (chatName && text.toLowerCase().startsWith(chatName.toLowerCase())) {
          console.log('🗑️ Skipping text that starts with chat name:', text);
          continue;
        }

        // Skip UI artifacts
        if (text.match(/^\d{1,2}:\d{2}/) ||
            text.match(/^(online|last seen|typing|away|yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i) ||
            text.match(/^(default-|refreshed|status-|image-|pin-|voice-|disappearing-|call-)/)) {
          console.log('🗑️ Skipping UI artifact:', text);
          continue;
        }

        const cleanMessage = this.cleanMessageText(text);
        if (cleanMessage && cleanMessage.length > 5) {
          console.log('✅ Found message via selector:', cleanMessage.substring(0, 50));
          return cleanMessage;
        }
      }
    }

    // Strategy 2: Parse DOM structure to find message
    console.log('🔍 Strategy 2: Parsing DOM structure...');
    const allElements = chatElement.querySelectorAll('*');
    for (const element of allElements) {
      const text = element.textContent?.trim();
      if (!text || text.length < 10) continue;

      // Skip if it's the chat name
      if (chatName && text.toLowerCase() === chatName.toLowerCase()) {
        console.log('🗑️ Skipping chat name in DOM:', text);
        continue;
      }

      // Skip if it starts with chat name
      if (chatName && text.toLowerCase().startsWith(chatName.toLowerCase())) {
        const messagePart = text.substring(chatName.length).trim();
        if (messagePart.length > 5) {
          const cleanMessage = this.cleanMessageText(messagePart);
          if (cleanMessage && cleanMessage.length > 5) {
            console.log('✅ Found message in DOM (substring):', cleanMessage.substring(0, 50));
            return cleanMessage;
          }
        }
        continue;
      }

      // Skip UI artifacts
      if (text.match(/^\d{1,2}:\d{2}/) ||
          text.match(/^(online|last seen|typing|away|yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i) ||
          text.match(/^(default-|refreshed|status-|image-|pin-|voice-|disappearing-|call-)/)) {
        console.log('🗑️ Skipping UI artifact in DOM:', text);
        continue;
      }

      const cleanMessage = this.cleanMessageText(text);
      if (cleanMessage && cleanMessage.length > 10) {
        console.log('✅ Found message in DOM:', cleanMessage.substring(0, 50));
        return cleanMessage;
      }
    }

    // Strategy 3: Look for specific patterns in the full text with stricter filtering
    const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (let i = lines.length - 1; i >= 0; i--) { // Start from the end
      const line = lines[i];
      
      // Skip if it's the chat name
      if (chatName && line.toLowerCase() === chatName.toLowerCase()) {
        console.log('🗑️ Skipping chat name pattern:', line);
        continue;
      }

      // Skip if it starts with chat name
      if (chatName && line.toLowerCase().startsWith(chatName.toLowerCase())) {
        const messagePart = line.substring(chatName.length).trim();
        if (messagePart.length > 5) {
          const cleanMessage = this.cleanMessageText(messagePart);
          if (cleanMessage && cleanMessage.length > 5) {
            console.log('✅ Found message pattern (substring):', cleanMessage.substring(0, 50));
            return cleanMessage;
          }
        }
        continue;
      }

      // Skip UI artifacts
      if (line.match(/^\d{1,2}:\d{2}/) ||
          line.match(/^(online|last seen|typing|away|yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i) ||
          line.match(/^(default-|refreshed|status-|image-|pin-|voice-|disappearing-|call-)/)) {
        console.log('🗑️ Skipping UI artifact pattern:', line);
        continue;
      }

      const cleanMessage = this.cleanMessageText(line);
      if (cleanMessage && cleanMessage.length > 10) {
        console.log('✅ Found message pattern:', cleanMessage.substring(0, 50));
        return cleanMessage;
      }
    }

    // Strategy 4: Look for sibling elements
    console.log('🔍 Strategy 4: Looking for sibling elements...');
    if (chatName) {
      const nameElements = chatElement.querySelectorAll('*');
      for (const element of nameElements) {
        const text = element.textContent?.trim();
        if (text && text.toLowerCase() === chatName.toLowerCase()) {
          // Look for siblings that might contain the message
          const siblings = Array.from(element.parentElement?.children || []);
          for (const sibling of siblings) {
            if (sibling === element) continue;
            const siblingText = sibling.textContent?.trim();
            if (siblingText && siblingText.length > 5 && siblingText !== chatName) {
              const cleanMessage = this.cleanMessageText(siblingText);
              if (cleanMessage && cleanMessage.length > 5) {
                console.log('✅ Found message in sibling:', cleanMessage.substring(0, 50));
                return cleanMessage;
              }
            }
          }
        }
      }
    }

    // Strategy 5: Try to extract message from text that contains chat name
    console.log('🔍 Strategy 5: Looking for embedded messages...');
    
    // Reuse the lines from Strategy 3
    for (const line of lines) {
      if (chatName && line.toLowerCase().includes(chatName.toLowerCase())) {
        // Try different separators to find the message part
        const separators = [':', ' ', '\t', '-', '~'];
        
        for (const separator of separators) {
          const parts = line.split(separator);
          if (parts.length >= 2) {
            for (let i = 1; i < parts.length; i++) {
              const messagePart = parts.slice(i).join(separator).trim();
              if (messagePart.length > 5) {
                const cleanMessage = this.cleanMessageText(messagePart);
                if (cleanMessage && cleanMessage.length > 5) {
                  console.log('✅ Found embedded message:', cleanMessage.substring(0, 50));
                  return cleanMessage;
                }
              }
            }
          }
        }
      }
    }

    // Strategy 6: Final aggressive approach - look for any text that's not the chat name
    console.log('🔍 Strategy 6: Final aggressive message search...');
    const allElementsFinal = chatElement.querySelectorAll('*');
    const textContents = [];
    
    for (const element of allElementsFinal) {
      const text = element.textContent?.trim();
      if (text && text.length > 5 && text !== chatName) {
        // Skip if it's the chat name
        if (chatName && text.toLowerCase() === chatName.toLowerCase()) continue;
        
        // Skip if it starts with chat name
        if (chatName && text.toLowerCase().startsWith(chatName.toLowerCase())) {
          const messagePart = text.substring(chatName.length).trim();
          if (messagePart.length > 5) {
            const cleanMessage = this.cleanMessageText(messagePart);
            if (cleanMessage && cleanMessage.length > 5) {
              console.log('✅ Found message in final strategy (substring):', cleanMessage.substring(0, 50));
              return cleanMessage;
            }
          }
          continue;
        }

        // Skip UI artifacts
        if (text.match(/^\d{1,2}:\d{2}/) ||
            text.match(/^(online|last seen|typing|away|yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i) ||
            text.match(/^(default-|refreshed|status-|image-|pin-|voice-|disappearing-|call-)/)) {
          continue;
        }

        // Skip patterns that look like chat names
        if (text.match(/^[a-zA-Z\s&\/]+[0-9]+$/i) ||
            text.match(/^[a-zA-Z\s]+[0-9]+$/i)) {
          continue;
        }

        // Only include text that looks like actual messages
        if (text.match(/[a-zA-Z]{3,}/) && text.length > 10) {
          textContents.push(text);
        }
      }
    }

    // Sort by length (longer text is more likely to be a message)
    textContents.sort((a, b) => b.length - a.length);
    
    for (const text of textContents) {
      const cleanMessage = this.cleanMessageText(text);
      if (cleanMessage && cleanMessage.length > 5) {
        console.log('✅ Found message in final strategy:', cleanMessage.substring(0, 50));
        return cleanMessage;
      }
    }

    console.log('❌ No message found in chat element');
    return null;
  }

  // Clean message text
  cleanMessageText(text) {
    if (!text) return null;

    // Remove common UI artifacts
    const uiPatterns = [
      /^\d{1,2}:\d{2}\s*/,
      /^(online|last seen|typing|away|yesterday|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*/i,
      /^(default-|refreshed|status-|image-|pin-|voice-|disappearing-|call-)/,
      /^wa-wordmark-refreshed\s*/i,
      /^lock-refreshed\s*/i
    ];

    let cleaned = text;
    for (const pattern of uiPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Remove extra whitespace
    cleaned = cleaned.trim();

    // Filter out very short or invalid messages
    if (cleaned.length < 5) return null;

    // Filter out messages that look like chat names
    const chatNamePatterns = [
      /^[a-zA-Z\s&\/]+[0-9]+$/i,
      /^[a-zA-Z\s]+[0-9]+$/i,
      /^(default-|refreshed|status-|image-|pin-|voice-|disappearing-|call-)/,
      /^wa-wordmark-refreshed$/i,
      /^lock-refreshed$/i
    ];

    for (const pattern of chatNamePatterns) {
      if (pattern.test(cleaned)) {
        console.log('🗑️ Filtered chat name pattern:', cleaned);
        return null;
      }
    }

    // Filter out very short responses
    const words = cleaned.split(/\s+/);
    if (words.length < 2) return null;

    // Filter out short texts that might be names
    if (cleaned.length < 10 && words.length <= 3) {
      const shortResponses = ['hi', 'hello', 'ok', 'yes', 'no', 'thanks', 'thank you'];
      if (shortResponses.includes(cleaned.toLowerCase())) {
        return null;
      }
    }

    console.log('✅ Cleaned message:', cleaned);
    return cleaned;
  }

  // Extract chat data from a single chat element
  extractChatData(chatElement, index) {
    console.log(`🔍 Extracting data from chat ${index}:`, chatElement);

    const chatName = this.extractChatName(chatElement);
    if (!chatName) {
      console.warn(`Skipping chat ${index} - no chat name found`);
      return null;
    }

    const latestMessage = this.extractLatestMessage(chatElement, chatName);
    if (!latestMessage) {
      console.warn(`Skipping chat ${index} - no latest message found`);
      return null;
    }

    // Additional check: if the message is exactly the same as chat name, skip this chat
    if (latestMessage === chatName || latestMessage.toLowerCase() === chatName.toLowerCase()) {
      console.warn(`Skipping chat ${index} - message is same as chat name: "${chatName}"`);
      return null;
    }

    // Additional check: if the message starts with the chat name, extract only the message part
    if (latestMessage.toLowerCase().startsWith(chatName.toLowerCase())) {
      const messagePart = latestMessage.substring(chatName.length).trim();
      if (messagePart.length > 3) {
        console.log(`🔧 Extracting message part from: "${latestMessage}" -> "${messagePart}"`);
        latestMessage = messagePart;
      } else {
        console.warn(`Skipping chat ${index} - message part too short after removing chat name: "${messagePart}"`);
        return null;
      }
    }

    // Additional check: if the message contains the chat name in the middle, try to extract the actual message
    if (latestMessage.includes(chatName) && latestMessage.length > chatName.length + 5) {
      const patterns = [
        new RegExp(chatName + '\\s+(.+)', 'i'),
        new RegExp(chatName + ':(.+)', 'i'),
        new RegExp(chatName + '-(.+)', 'i'),
        new RegExp(chatName + '~(.+)', 'i'),
      ];

      for (const pattern of patterns) {
        const match = latestMessage.match(pattern);
        if (match && match[1] && match[1].trim().length > 3) {
          const extractedMessage = match[1].trim();
          console.log(`🔧 Extracted message using pattern: "${latestMessage}" -> "${extractedMessage}"`);
          latestMessage = extractedMessage;
          break;
        }
      }
    }

    console.log(`📱 Found chat: "${chatName}" - "${latestMessage.substring(0, 50)}..."`);
    
    return {
      name: chatName,
      message: latestMessage,
      timestamp: Date.now()
    };
  }

  // Get all chats with their latest messages
  getAllChatsWithLatestMessages() {
    console.log('🔍 Getting all chats with latest messages...');

    const chatListSelectors = [
      'div[data-testid="cell-frame-container"]',
      'div[data-testid="chat-list-item"]',
      'div[data-testid="conversation-item"]',
      'div[role="row"]',
      'div[role="listitem"]',
      'div[aria-label*="Chat"]',
      'div[aria-label*="chat"]',
      'div[data-testid*="cell"]',
      'div[data-testid*="chat"]',
      'div[data-testid*="conversation"]',
      'div[class*="chat"]',
      'div[class*="conversation"]',
      'div[class*="message"]'
    ];

    let chatElements = [];
    
    // Try different selectors to find chat elements
    for (const selector of chatListSelectors) {
      chatElements = document.querySelectorAll(selector);
      console.log(`🔍 Selector "${selector}" found ${chatElements.length} elements`);
      if (chatElements.length > 0) {
        console.log(`✅ Found ${chatElements.length} chats using selector: ${selector}`);
        break;
      }
    }

    if (chatElements.length === 0) {
      console.warn('❌ No chat elements found in chat list');
      console.log('🔍 Debugging available elements:');
      const allDivs = document.querySelectorAll('div');
      console.log(`Total divs on page: ${allDivs.length}`);
      const divsWithRole = document.querySelectorAll('div[role]');
      console.log(`Divs with role attribute: ${divsWithRole.length}`);
      const listItems = document.querySelectorAll('[role="listitem"]');
      console.log(`Elements with role="listitem": ${listItems.length}`);
      const testIds = document.querySelectorAll('[data-testid]');
      console.log(`Elements with data-testid: ${testIds.length}`);
      
      if (listItems.length > 0) {
        console.log('Sample listitem elements:', Array.from(listItems).slice(0, 3).map(el => ({
          tagName: el.tagName,
          className: el.className,
          textContent: el.textContent?.substring(0, 50)
        })));
      }
      
      return { success: false, error: 'No chats found in chat list', chats: [] };
    }

    const chats = [];
    let successCount = 0;

    for (let i = 0; i < chatElements.length; i++) {
      const chatData = this.extractChatData(chatElements[i], i);
      if (chatData) {
        chats.push(chatData);
        successCount++;
      }
    }

    console.log(`🎉 Successfully extracted ${successCount} chats with latest messages (index):${successCount}`);
    
    return {
      success: true,
      chats: chats,
      count: successCount
    };
  }
}

// Initialize the chat scanner
const chatScanner = new WhatsAppChatScanner();

// Export for use by other scripts
window.whatsappChatScanner = chatScanner;

console.log('✅ WhatsApp Chat Scanner loaded and ready');
