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
          // 2025 WhatsApp Web primary selectors (Updated)
          'div[data-testid="msg-container"] span[dir="ltr"]',
          'div[data-testid="conversation-message"] span[dir="ltr"]',
          'div[data-testid="message-text"]',
          'div[data-testid="msg-text"]',
          'div[data-testid="bubble-text"]',
          
          // New 2025 selectors
          'div[data-testid="msg-container"] div[dir="ltr"]',
          'div[data-testid="conversation-message"] div[dir="ltr"]',
          'div[data-testid="msg-container"] span.selectable-text',
          'div[data-testid="conversation-message"] span.selectable-text',
          
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
          'div[aria-label*="message"]',
          
          // Additional fallback selectors for 2025
          'div[role="listitem"] span[dir="ltr"]',
          'div[role="row"] span[dir="ltr"]',
          'div[class*="_ak8q"] span[dir="ltr"]',
          'div[class*="_ak8r"] span[dir="ltr"]'
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
          'span[dir="auto"][title]',
          // New 2025 selectors
          'header[data-testid="conversation-header"] span[title]',
          'header[data-testid="conversation-header"] div[title]',
          'div[data-testid="conversation-header"] span[title]',
          'div[data-testid="conversation-header"] div[title]',
          'header[data-testid="conversation-header"] span[dir="auto"]',
          'div[data-testid="conversation-header"] span[dir="auto"]',
          // Additional fallback selectors
          'span[data-testid*="title"]',
          'div[data-testid*="title"]',
          'span[class*="title"]',
          'div[class*="title"]'
        ];
        
        console.log('✅ WhatsAppMessageExtractor initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing WhatsAppMessageExtractor:', error);
        throw error;
      }
    }

    // Extract messages from the current chat
    // Clean message text from UI artifacts
    cleanMessageText(text) {
      if (!text || !text.trim()) return '';
      
      // Clean the text
      text = text.trim()
        .replace(/\s+/g, ' ')  // Multiple spaces to single space
        .replace(/[\n\r\t]/g, ' ')  // Remove line breaks and tabs
        .trim();
      
      // Enhanced filtering for UI elements and system messages
      const uiPatterns = [
        /^(status-dblcheck|image-refreshed|default-group-refreshed|pin-refreshed|voice-call|photopin-refreshed).*$/i,
        /^(muted|unmuted|pinned|unpinned|archived|unarchived).*$/i,
        /^(message-deleted|message-recalled|message-forwarded).*$/i,
        /^(disappearing-messages|chat-filled|refreshed).*$/i,
        /^(recall|pin|unpin|mute|unmute).*$/i,
        /^\d{1,2}:\d{2}\s*(am|pm)?$/i,  // Just timestamps
        /^(You|you)[\s:]*$/i,  // Just "You:" 
        /^(am|pm|AM|PM)$/i,  // Just am/pm
        /^[\d\s:apm]+$/i,  // Only times and dates
        /^[^\w\s]*$/,  // Only special characters
        /^[\s\W]*$/,  // Only whitespace and non-word characters
        /^[\w\s]*\(\w+\)\d+\/\d+\/\d+.*$/i,  // Pattern like "Harsha(You)2/7/2025..."
      ];
      
      // Check if it matches any UI pattern
      for (const pattern of uiPatterns) {
        if (pattern.test(text)) {
          console.log(`🗑️ Filtered out UI element: "${text.substring(0, 30)}..."`);
          return '';
        }
      }
      
      // Filter out very short or nonsensical text
      if (text.length < 3) return '';
      
      // Filter out text that's mostly symbols or timestamps
      const wordCount = text.split(/\s+/).filter(word => /[a-zA-Z0-9]/.test(word)).length;
      if (wordCount === 0) return '';
      
      // Clean up common UI artifacts
      text = text
        .replace(/^(You|you):\s*/i, '')  // Remove "You:" prefix
        .replace(/\s*(am|pm|AM|PM)\s*$/i, '')  // Remove trailing am/pm
        .replace(/^\d{1,2}:\d{2}\s*/i, '')  // Remove leading timestamps
        .trim();
      
      // Final check - must have meaningful content
      if (text.length < 3 || !/[a-zA-Z]/.test(text)) {
        return '';
      }
      
      // Additional cleaning for WhatsApp-specific artifacts
      const artifactKeywords = ['status-dblcheck', 'image-refreshed', 'default-group', 
                               'voice-call-outgoing', 'disappearing-messages', 'photopin-refreshed'];
      
      for (const keyword of artifactKeywords) {
        if (text.toLowerCase().includes(keyword)) {
          console.log(`🗑️ Filtered WhatsApp UI artifact: "${text.substring(0, 30)}..."`);
          return '';
        }
      }
      
      console.log(`✅ Clean message: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      return text;
    }

    extractMessages() {
      try {
        const messages = [];
        const processedTexts = new Set(); // Track processed messages to avoid duplicates
        
        // First, try to find the main conversation panel
        const conversationPanel = document.querySelector('[data-testid="conversation-panel-wrapper"]');
        console.log('🔍 Conversation panel found:', !!conversationPanel);
        
        // Comprehensive list of selectors for WhatsApp Web 2025
        // Prioritize selectors that are likely to be in the current conversation
        const selectors = [
          // Most specific - messages in conversation panel (Updated for 2025)
          '[data-testid="conversation-panel-wrapper"] [data-testid*="message"]',
          '[data-testid="conversation-panel-wrapper"] [data-testid="msg-container"]',
          '[data-testid="conversation-panel-wrapper"] [data-testid="conversation-message"]',
          '[data-testid="conversation-panel-wrapper"] [data-testid="msg-bubble"]',
          '[data-testid="conversation-panel-wrapper"] div[role="listitem"]',
          '[data-testid="conversation-panel-wrapper"] div[role="row"]',
          
          // New 2025 specific selectors
          '[data-testid="conversation-panel-wrapper"] div[data-testid*="msg"]',
          '[data-testid="conversation-panel-wrapper"] span[dir="ltr"]',
          '[data-testid="conversation-panel-wrapper"] div[dir="ltr"]',
          
          // Modern WhatsApp Web selectors (global but excluding chat list)
          '[data-testid*="message"]:not([data-testid="cell-frame-container"] *)',
          '[data-testid="msg-container"]:not([data-testid="cell-frame-container"] *)',
          '[data-testid="conversation-message"]:not([data-testid="cell-frame-container"] *)',
          '[data-testid="msg-bubble"]:not([data-testid="cell-frame-container"] *)',
          '[data-testid="msg-text"]:not([data-testid="cell-frame-container"] *)',
          '[data-testid="bubble-text"]:not([data-testid="cell-frame-container"] *)',
          
          // Generic message containers (exclude chat list)
          'div[class*="message"]:not([data-testid="cell-frame-container"] *)',
          'div[class*="msg"]:not([data-testid="cell-frame-container"] *)',
          'div[class*="bubble"]:not([data-testid="cell-frame-container"] *)',
          'div[class*="conversation"]:not([data-testid="cell-frame-container"] *)',
          
          // WhatsApp specific class patterns (Updated for 2025, exclude chat list)
          'div[class*="_ak8q"]:not([data-testid="cell-frame-container"] *)', // New 2025 class pattern
          'div[class*="_ak8r"]:not([data-testid="cell-frame-container"] *)', // New 2025 class pattern
          'div[class*="_21Ahp"]:not([data-testid="cell-frame-container"] *)',
          'div[class*="_2aBzC"]:not([data-testid="cell-frame-container"] *)',
          'div[class*="_3_7SH"]:not([data-testid="cell-frame-container"] *)',
          'div[class*="_1Gy50"]:not([data-testid="cell-frame-container"] *)',
          'div[class*="_2H6nH"]:not([data-testid="cell-frame-container"] *)',
          
          // Legacy selectors (exclude chat list)
          'div[class*="message-in"]:not([data-testid="cell-frame-container"] *), div[class*="message-out"]:not([data-testid="cell-frame-container"] *)',
          'div.message-in:not([data-testid="cell-frame-container"] *), div.message-out:not([data-testid="cell-frame-container"] *)',
          
          // Fallback: any div with text content that might be a message (exclude chat list)
          'div[dir="ltr"]:not([data-testid="cell-frame-container"] *)',
          'div[dir="auto"]:not([data-testid="cell-frame-container"] *)',
          
          // Additional 2025 fallback selectors (exclude chat list)
          'span[dir="ltr"]:not([data-testid*="icon"]):not([data-testid*="button"]):not([data-testid="cell-frame-container"] *)',
          'div[dir="ltr"]:not([data-testid*="icon"]):not([data-testid*="button"]):not([data-testid="cell-frame-container"] *)',
          
          // Last resort - only if conversation panel is not found, look in chat list
          'div[role="listitem"]'
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
                   !text.includes('Call') &&
                   !text.includes('Video') &&
                   !text.includes('Info') &&
                   !text.includes('More') &&
                   div.children.length < 10; // Not too complex
          });
          
          if (potentialMessages.length > 0) {
            messageElements = potentialMessages;
            usedSelector = 'dynamic-scanning';
            console.log(`Found ${messageElements.length} potential message elements using dynamic scanning`);
          }
        }
        
        // If still no elements found, try even more aggressive scanning
        if (messageElements.length === 0) {
          console.log('Still no elements found, trying ultra-aggressive scanning...');
          
          // Try to find any text elements that might be messages
          const allTextElements = document.querySelectorAll('span, div, p');
          const ultraPotentialMessages = Array.from(allTextElements).filter(el => {
            const text = el.textContent?.trim();
            const hasText = text && text.length > 5 && text.length < 500;
            const notUI = !text.includes('WhatsApp') && 
                         !text.includes('Search') && 
                         !text.includes('Menu') &&
                         !text.includes('Call') &&
                         !text.includes('Video') &&
                         !text.includes('Info') &&
                         !text.includes('More') &&
                         !text.match(/^\d{1,2}:\d{2}$/) &&
                         !text.includes('data-testid');
            const notEmpty = text && text.trim().length > 0;
            
            return hasText && notUI && notEmpty;
          });
          
          if (ultraPotentialMessages.length > 0) {
            messageElements = ultraPotentialMessages.slice(0, 50); // Limit to 50
            usedSelector = 'ultra-aggressive-scanning';
            console.log(`Found ${messageElements.length} potential message elements using ultra-aggressive scanning`);
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
              if (textElement && textElement.textContent && textElement.textContent.trim()) {
                messageText = textElement.textContent.trim();
                break;
              }
            }
            
            // Method 2: If no text found, try direct text content
            if (!messageText) {
              const directText = element.textContent?.trim();
              if (directText && directText.length > 10) { // Ignore very short texts
                messageText = this.cleanMessageText(directText);
              }
            }
            
            // Method 3: Try finding any span or div with text
            if (!messageText) {
              const textElements = element.querySelectorAll('span, div');
              for (const textEl of textElements) {
                const text = textEl.textContent?.trim();
                if (text && text.length > 5 && !text.includes('data-testid') && !text.includes('aria-label')) {
                  messageText = this.cleanMessageText(text);
                  if (messageText) break; // Only break if we have clean text
                }
              }
            }
            
            // Method 4: Try to get text from any child element with meaningful content
            if (!messageText) {
              const allChildren = element.querySelectorAll('*');
              for (const child of allChildren) {
                const text = child.textContent?.trim();
                if (text && text.length > 10 && text.length < 1000 && 
                    !text.includes('data-testid') && 
                    !text.includes('aria-label') &&
                    !text.match(/^\d{1,2}:\d{2}$/) && // Not just time
                    !text.includes('WhatsApp')) {
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
                // Check for duplicates
                if (processedTexts.has(messageText)) {
                  console.log(`⚠️ Skipping duplicate message: ${messageText.substring(0, 50)}...`);
                  return; // Skip duplicate
                }
                
                // Check if this message is from the chat list (not current conversation)
                const isFromChatList = element.closest('[data-testid="cell-frame-container"]') !== null;
                const isFromConversationPanel = conversationPanel && conversationPanel.contains(element);
                const isFromSidebar = element.closest('#side') !== null || element.closest('[data-testid="chat-list"]') !== null;
                
                // Skip if message is from chat list/sidebar and not from conversation panel
                if ((isFromChatList || isFromSidebar) && !isFromConversationPanel) {
                  console.log(`⚠️ Skipping message from chat list/sidebar: ${messageText.substring(0, 50)}...`);
                  return; // Skip this message
                }
                
                // Additional check: if we're using the fallback selector (div[role="listitem"]) 
                // and there's no conversation panel, we need to be more selective
                if (usedSelector === 'div[role="listitem"]' && !conversationPanel) {
                  // Check if this looks like a chat list item vs a message
                  const parentElement = element.parentElement;
                  const hasMultipleContacts = element.querySelectorAll('span[title]').length > 1;
                  const hasTimestamp = element.textContent.match(/\d{1,2}:\d{2}\s*(AM|PM)?/i);
                  const isLikelyMessage = !hasMultipleContacts && element.textContent.length > 20;
                  
                  if (!isLikelyMessage) {
                    console.log(`⚠️ Skipping chat list item: ${messageText.substring(0, 50)}...`);
                    return; // Skip this chat list item
                  }
                }
                
                // Add to processed texts to prevent duplicates
                processedTexts.add(messageText);
                
                const uniqueId = `msg_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
                messages.push({
                  id: uniqueId,
                  messageId: uniqueId,
                  text: messageText,
                  timestamp: Date.now(),
                  ts: Date.now(),
                  element: element,
                  sender: 'unknown',
                  isFromChatList: isFromChatList,
                  isFromConversationPanel: isFromConversationPanel
                });
              }
          }
        } catch (error) {
            console.warn('Error extracting message:', error);
          }
        });
        
        console.log(`Successfully extracted ${messages.length} messages from ${messageElements.length} elements using selector: ${usedSelector}`);
        
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
          console.log('- Selector used:', usedSelector);
          if (messageElements.length > 0) {
            console.log('- First element:', messageElements[0]);
            console.log('- First element text:', messageElements[0].textContent);
            console.log('- First element innerHTML:', messageElements[0].innerHTML.substring(0, 200));
            
            // Try to extract text from first element using our methods
            console.log('- Testing text extraction methods on first element:');
            for (const selector of this.messageSelectors.slice(0, 5)) {
              const textElement = messageElements[0].querySelector(selector);
              if (textElement) {
                console.log(`  - Selector "${selector}" found text:`, textElement.textContent?.substring(0, 50));
              }
            }
          } else {
            console.log('- No elements found with any selector');
            console.log('- Available data-testid elements:', document.querySelectorAll('[data-testid]').length);
            console.log('- Available span elements:', document.querySelectorAll('span').length);
            console.log('- Available div elements:', document.querySelectorAll('div').length);
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
        let chatElement = null;
        
        // Enhanced chat title detection with 2025 WhatsApp Web selectors
        const chatTitleSelectors = [
          // Most current WhatsApp Web selectors (2025)
          'header[data-testid="conversation-header"] span[title]:not([title=""])',
          'div[data-testid="conversation-header"] span[title]:not([title=""])', 
          'header span[data-testid="conversation-title"]',
          'div span[data-testid="conversation-title"]',
          
          // Title attribute selectors
          'header[data-testid="conversation-header"] *[title]:not([title=""])',
          'div[data-testid="conversation-header"] *[title]:not([title=""])',
          
          // Text content selectors
          'header[data-testid="conversation-header"] span[dir="auto"]',
          'div[data-testid="conversation-header"] span[dir="auto"]',
          'header[data-testid="conversation-header"] h1',
          'div[data-testid="conversation-header"] h1',
          
          // Fallback selectors
          'header[data-testid="conversation-header"] span:first-child',
          'div[data-testid="conversation-header"] span:first-child',
          
          // Generic header selectors
          'header div[role="button"] span',
          'header button span',
          // New 2025 class patterns
          'header[data-testid="conversation-header"] span[class*="_ak8q"]',
          'header[data-testid="conversation-header"] span[class*="_ak8r"]',
          'div[data-testid="conversation-header"] span[class*="_ak8q"]',
          'div[data-testid="conversation-header"] span[class*="_ak8r"]',
          // Fallback selectors
          ...this.chatSelectors
        ];
        
        // Words to exclude from chat titles (UI elements)
        const excludeWords = [
          'chat-filled-refreshed', 'default-group-refreshed', 'pin-refreshed-thin',
          'status-dblcheck', 'image-refreshed', 'photopin-refreshed-thin',
          'refreshed', 'filled', 'default', 'group', 'pin', 'status', 'image', 'photo'
        ];
        
        for (const selector of chatTitleSelectors) {
          const titleElement = document.querySelector(selector);
          if (titleElement) {
            // Prioritize title attribute over textContent for better accuracy
            let title = titleElement.title || titleElement.getAttribute('title') || titleElement.textContent;
            if (title && title.trim()) {
              const cleanTitle = title.trim();
              
              // Clean up HTML entities and extra spaces
              const cleanedTitle = cleanTitle
                .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
                .replace(/&amp;/g, '&')   // Replace HTML entities
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
                .trim();
              
              // Skip if it's a UI element or contains excluded words
              if (cleanedTitle === 'WhatsApp' || 
                  excludeWords.some(word => cleanedTitle.toLowerCase().includes(word.toLowerCase())) ||
                  cleanedTitle.length < 2 ||
                  /^[a-z-]+$/.test(cleanedTitle)) { // Skip if it's all lowercase with hyphens (likely UI)
                continue;
              }
              
              chatTitle = cleanedTitle;
              console.log(`Found chat title: "${chatTitle}" using selector: ${selector}`);
              console.log(`Original title: "${title}" -> Cleaned: "${cleanedTitle}"`);
              break;
            }
          }
        }
        
        // If still not found, try alternative methods
        if (chatTitle === 'Unknown Chat') {
          // Method 1: Try to get from page title
          const pageTitle = document.title;
          if (pageTitle && pageTitle.includes('WhatsApp')) {
            const titleMatch = pageTitle.match(/WhatsApp\s*-\s*(.+)/);
            if (titleMatch && titleMatch[1]) {
              chatTitle = titleMatch[1].trim();
              console.log(`Extracted chat title from page title: "${chatTitle}"`);
            }
          }
          
          // Method 1.5: Try to find any span with meaningful text in the header area
          if (chatTitle === 'Unknown Chat') {
            const headerArea = document.querySelector('header[data-testid="conversation-header"]') || 
                              document.querySelector('div[data-testid="conversation-header"]');
            if (headerArea) {
              const allSpans = headerArea.querySelectorAll('span');
              for (const span of allSpans) {
                const text = span.textContent?.trim();
                if (text && text.length > 2 && text.length < 100 && 
                    !text.includes('WhatsApp') && 
                    !text.includes('Search') &&
                    !text.includes('Menu') &&
                    !text.includes('More') &&
                    !text.includes('Call') &&
                    !text.includes('Video') &&
                    !text.includes('Info') &&
                    !/^[a-z-]+$/.test(text)) { // Not just lowercase with hyphens
                  chatTitle = text;
                  console.log(`Found chat title from header span: "${chatTitle}"`);
                  break;
                }
              }
            }
          }
          
          // Method 2: Try to find chat name in the conversation list
          if (chatTitle === 'Unknown Chat') {
            const chatListItems = document.querySelectorAll('[data-testid="cell-frame-container"]');
            for (const item of chatListItems) {
              const titleSpan = item.querySelector('span[title]');
              if (titleSpan && titleSpan.title) {
                const title = titleSpan.title.trim();
                if (title && !excludeWords.some(word => title.toLowerCase().includes(word.toLowerCase()))) {
                  chatTitle = title;
                  console.log(`Found chat title from conversation list: "${chatTitle}"`);
                  break;
                }
              }
            }
          }
          
          // Method 3: Try to find in the main chat area
          if (chatTitle === 'Unknown Chat') {
            const mainChatArea = document.querySelector('[data-testid="conversation-panel-wrapper"]');
            if (mainChatArea) {
              const titleElements = mainChatArea.querySelectorAll('span, div');
              for (const element of titleElements) {
                const text = element.textContent?.trim();
                if (text && text.length > 2 && text.length < 50 && 
                    !excludeWords.some(word => text.toLowerCase().includes(word.toLowerCase())) &&
                    !/^[a-z-]+$/.test(text)) {
                  chatTitle = text;
                  console.log(`Found chat title from main chat area: "${chatTitle}"`);
                  break;
                }
              }
            }
          }
          
          // Method 4: Try to find the active/selected chat in the chat list
          if (chatTitle === 'Unknown Chat') {
            const activeChatItem = document.querySelector('[data-testid="cell-frame-container"][aria-selected="true"]') ||
                                 document.querySelector('[data-testid="cell-frame-container"]._ak8q') ||
                                 document.querySelector('[data-testid="cell-frame-container"][class*="selected"]') ||
                                 document.querySelector('[data-testid="cell-frame-container"][class*="active"]') ||
                                 document.querySelector('[data-testid="cell-frame-container"][class*="highlighted"]');
            
            if (activeChatItem) {
              const titleSpan = activeChatItem.querySelector('span[title]') || 
                               activeChatItem.querySelector('span[dir="auto"]') ||
                               activeChatItem.querySelector('span[class*="x1iyjqo2"]') ||
                               activeChatItem.querySelector('span[class*="x6ikm8r"]');
              if (titleSpan) {
                const title = titleSpan.title || titleSpan.textContent;
                if (title && title.trim()) {
                  chatTitle = title.trim()
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/\s+/g, ' ')
                    .trim();
                  console.log(`Found active chat title: "${chatTitle}"`);
                }
              }
            }
          }
          
          // Method 4.5: Try to find the first visible chat in the list (fallback)
          if (chatTitle === 'Unknown Chat') {
            const firstChatItem = document.querySelector('[data-testid="cell-frame-container"]');
            if (firstChatItem) {
              const titleSpan = firstChatItem.querySelector('span[title]') || 
                               firstChatItem.querySelector('span[dir="auto"]') ||
                               firstChatItem.querySelector('span[class*="x1iyjqo2"]') ||
                               firstChatItem.querySelector('span[class*="x6ikm8r"]');
              if (titleSpan) {
                const title = titleSpan.title || titleSpan.textContent;
                if (title && title.trim()) {
                  chatTitle = title.trim()
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/\s+/g, ' ')
                    .trim();
                  console.log(`Found first chat title (fallback): "${chatTitle}"`);
                }
              }
            }
          }
          
          // Method 5: Try to find the chat title from the page URL or title
          if (chatTitle === 'Unknown Chat') {
            const pageTitle = document.title;
            if (pageTitle && pageTitle.includes('WhatsApp')) {
              // Extract chat name from page title (format: "WhatsApp - Chat Name")
              const titleMatch = pageTitle.match(/WhatsApp\s*-\s*(.+)/);
              if (titleMatch && titleMatch[1]) {
                chatTitle = titleMatch[1].trim();
                console.log(`Extracted chat title from page title: "${chatTitle}"`);
              }
            }
          }
        }
            
        return {
          title: chatTitle,
          id: `chat_${Date.now()}`,
          isGroup: chatTitle.includes('Group') || chatTitle.includes('group') || chatTitle.includes('+'),
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
        // Try to find the conversation panel first (actual conversation messages)
        const conversationPanel = document.querySelector('[data-testid="conversation-panel-wrapper"]');
        
        if (conversationPanel) {
          console.log('📞 Found conversation panel - extracting from active conversation');
          return this.extractFromActiveConversation();
        } else {
          console.log('📝 No conversation panel found - extracting from chat list view');
          return this.extractFromChatListView();
        }
        
      } catch (error) {
        console.error('❌ Error getting messages with chat info:', error);
        return {
          success: false,
          error: error.message,
          messages: [],
          chatInfo: { title: 'Error', id: 'error', isGroup: false },
          messageCount: 0
        };
      }
    }

    // Extract messages from active conversation (when in a chat)
    extractFromActiveConversation() {
      try {
        // First get fresh chat info
        const chatInfo = this.getCurrentChatInfo();
        console.log(`🔍 Detected chat info:`, chatInfo);
        
        // Extract messages
        const messages = this.extractMessages();
        console.log(`🔍 Extracted ${messages.length} messages from DOM`);
        
        if (messages.length === 0) {
          console.warn('No messages found - user may not be in an active chat');
          return {
            success: false,
            error: 'No messages found in current view. Please open a chat conversation.',
            messages: [],
            chatInfo: chatInfo,
            messageCount: 0
          };
        }
        
        // Enhanced message processing with better chat detection
        const messagesWithChatInfo = messages.map((msg, index) => {
          // Use the current chat info for all messages since they're from the current view
          return {
            ...msg,
            chatId: chatInfo.id,
            chatTitle: chatInfo.title,
            isGroup: chatInfo.isGroup,
            messageId: msg.id || `msg_${Date.now()}_${index}`,
            extractedAt: Date.now(),
            source: 'current_chat'
          };
        });
        
        console.log(`✅ Processed ${messagesWithChatInfo.length} messages for chat: "${chatInfo.title}"`);
        
        // Sample of processed messages for debugging
        if (messagesWithChatInfo.length > 0) {
          console.log('📝 Sample message:', {
            text: messagesWithChatInfo[0].text?.substring(0, 50) + '...',
            chatTitle: messagesWithChatInfo[0].chatTitle,
            isGroup: messagesWithChatInfo[0].isGroup
          });
        }
        
        return {
          success: true,
          messages: messagesWithChatInfo,
          chatInfo: chatInfo,
          messageCount: messagesWithChatInfo.length
        };
        
      } catch (error) {
        console.error('❌ Error extracting from active conversation:', error);
        return {
          success: false,
          error: error.message,
          messages: [],
          chatInfo: { title: 'Error', id: 'error', isGroup: false },
          messageCount: 0
        };
      }
    }

    // Extract messages from chat list view (when looking at multiple chats)
    extractFromChatListView() {
      try {
        console.log('🔍 Extracting from chat list view...');
        
        // First try to use the chat scanner if available
        if (window.naxChatScanner) {
          console.log('📱 Using chat scanner for extraction...');
          const scannerResult = window.naxChatScanner.getAllChatsWithLatestMessages();
          
          if (scannerResult.success && scannerResult.chats.length > 0) {
            console.log(`📱 Chat scanner found ${scannerResult.chats.length} chats with messages`);
            
            const allMessages = scannerResult.chats.map((chat, index) => {
              const uniqueId = `msg_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
              return {
                id: uniqueId,
                messageId: uniqueId,
                text: chat.latestMessage,
                timestamp: Date.now(),
                ts: Date.now(),
                element: null,
                sender: 'unknown',
                chatId: chat.id,
                chatTitle: chat.chatName,
                isGroup: chat.isGroup,
                extractedAt: Date.now(),
                source: 'chat_scanner',
                isFromChatList: true,
                isFromConversationPanel: false
              };
            });
            
            console.log(`✅ Extracted ${allMessages.length} messages using chat scanner`);
            
            return {
              success: true,
              messages: allMessages,
              chatInfo: { title: 'Multiple Chats', id: 'multi_chat', isGroup: false },
              messageCount: allMessages.length
            };
          }
        }
        
        // Fallback: Get all available chats manually
        console.log('📝 Fallback: Getting available chats manually...');
        const chats = this.getAllAvailableChats();
        const allMessages = [];
        
        // For each chat, extract its latest message
        chats.forEach((chat, chatIndex) => {
          try {
            // Find the chat element in the list
            const chatElement = chat.element;
            if (!chatElement) {
              console.log(`⚠️ No element found for chat: ${chat.title}`);
              return;
            }
            
            // Extract message from this specific chat item
            const messageText = this.extractLatestMessageFromChatElement(chatElement);
            if (!messageText) {
              console.log(`⚠️ No message extracted from chat: ${chat.title}`);
              return;
            }
            
            const uniqueId = `msg_${Date.now()}_${chatIndex}_${Math.random().toString(36).substr(2, 9)}`;
            const message = {
              id: uniqueId,
              messageId: uniqueId,
              text: messageText,
              timestamp: Date.now(),
              ts: Date.now(),
              element: chatElement,
              sender: 'unknown',
              chatId: chat.id,
              chatTitle: chat.title,
              isGroup: chat.isGroup,
              extractedAt: Date.now(),
              source: 'chat_list',
              isFromChatList: true,
              isFromConversationPanel: false
            };
            
            allMessages.push(message);
            console.log(`📝 Extracted from "${chat.title}": ${messageText.substring(0, 50)}...`);
            
          } catch (error) {
            console.warn(`Error processing chat ${chatIndex}:`, error);
          }
        });
        
        console.log(`✅ Extracted ${allMessages.length} messages from ${chats.length} chats`);
        
        return {
          success: true,
          messages: allMessages,
          chatInfo: { title: 'Multiple Chats', id: 'multi_chat', isGroup: false },
          messageCount: allMessages.length
        };
        
      } catch (error) {
        console.error('❌ Error extracting from chat list view:', error);
        return {
          success: false,
          error: error.message,
          messages: [],
          chatInfo: { title: 'Error', id: 'error', isGroup: false },
          messageCount: 0
        };
      }
    }

    // Extract latest message from a specific chat element
    extractLatestMessageFromChatElement(chatElement) {
      try {
        console.log(`🔍 Extracting message from chat element:`, chatElement);
        
        // Try multiple approaches to extract the message
        let messageText = '';
        
        // Method 1: Look for specific message selectors within the chat element
        const messageSelectors = [
          'span[title]',
          'span[dir="ltr"]',
          'div[dir="ltr"]',
          'span:last-child',
          'div:last-child'
        ];
        
        for (const selector of messageSelectors) {
          const elements = chatElement.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.textContent?.trim();
            if (text && text.length > 10 && !text.match(/^\d{1,2}:\d{2}/)) {
              if (text.length > messageText.length) {
                messageText = text;
              }
            }
          }
        }
        
        // Method 2: If no specific message found, parse the full text
        if (!messageText) {
          const allText = chatElement.textContent || '';
          console.log(`📝 Full chat element text:`, allText.substring(0, 200));
          
          // Split by lines and filter
          const lines = allText.split('\n').map(line => line.trim()).filter(line => line.length > 3);
          console.log(`📝 Text lines found:`, lines);
          
          // Find the longest meaningful line that's not a timestamp or contact name
          for (const line of lines) {
            // Skip timestamps, contact names, and UI elements
            if (line.match(/^\d{1,2}:\d{2}/) || // timestamp
                line.match(/^\d+$/) || // just numbers
                line.length < 10 || // too short
                line.includes('default-group-refreshed') ||
                line.includes('status-dblcheck') ||
                line.includes('voice-call') ||
                line.includes('Photo') ||
                line.includes('Video') ||
                line.includes('Audio') ||
                line.includes('Document')) {
              continue;
            }
            
            // Take the longest meaningful line
            if (line.length > messageText.length) {
              messageText = line;
            }
          }
        }
        
        // Method 3: If still no message, try to find any meaningful text
        if (!messageText) {
          const allSpans = chatElement.querySelectorAll('span');
          for (const span of allSpans) {
            const text = span.textContent?.trim();
            if (text && text.length > 5 && text.length < 200) {
              if (text.length > messageText.length) {
                messageText = text;
              }
            }
          }
        }
        
        console.log(`🔍 Extracted message:`, messageText?.substring(0, 100) || 'No message found');
        return messageText || null;
      } catch (error) {
        console.warn('Error extracting message from chat element:', error);
        return null;
      }
    }
    
    // Determine the chat info for a specific message
    determineMessageChatInfo(msg, currentChatInfo, index) {
      try {
        // Check if the message element is within the current conversation
        if (msg.element) {
          // Check if the message is in the main conversation area
          const conversationPanel = document.querySelector('[data-testid="conversation-panel-wrapper"]');
          if (conversationPanel && conversationPanel.contains(msg.element)) {
            console.log(`✅ Message ${index} is in current conversation panel`);
            return {
              ...currentChatInfo,
              source: 'current_conversation'
            };
          }
          
          // Check if the message is in a chat list item (different chat)
          const chatListItem = msg.element.closest('[data-testid="cell-frame-container"]');
          if (chatListItem) {
            // This message is from a different chat in the chat list
            // Try multiple selectors to find the chat title
            const chatTitleSelectors = [
              'span[title]',
              'span[dir="auto"][title]',
              'div[title]',
              'span[class*="x1iyjqo2"]', // WhatsApp specific class
              'span[class*="x6ikm8r"]'   // WhatsApp specific class
            ];
            
            let chatTitle = null;
            for (const selector of chatTitleSelectors) {
              const chatTitleElement = chatListItem.querySelector(selector);
              if (chatTitleElement) {
                const title = chatTitleElement.title || chatTitleElement.getAttribute('title') || chatTitleElement.textContent;
                if (title && title.trim()) {
                  // Clean up the title
                  chatTitle = title.trim()
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/\s+/g, ' ')
                    .trim();
                  
                  if (chatTitle.length > 2) {
                    console.log(`⚠️ Message ${index} is from different chat: ${chatTitle}`);
                    return {
                      title: chatTitle,
                      id: `chat_${Date.now()}_${index}`,
                      isGroup: chatTitle.includes('Group') || chatTitle.includes('group') || chatTitle.includes('+'),
                      source: 'chat_list'
                    };
                  }
                }
              }
            }
          }
        }
        
        // Default to current chat info
        return {
          ...currentChatInfo,
          source: 'current_chat_default'
        };
        
      } catch (error) {
        console.error('Error determining message chat info:', error);
        return {
          ...currentChatInfo,
          source: 'error_fallback'
        };
      }
    }

    // Get all available chats (for now, just return current chat)
    getAllAvailableChats() {
      try {
        const chats = [];
        
        // Scan all chat list items with multiple selectors
        const chatListSelectors = [
          '[data-testid="cell-frame-container"]',
          '[data-testid="chat-list"] [data-testid*="cell"]',
          '[data-testid="chat-list"] div[role="listitem"]',
          'div[data-testid*="chat"] div[role="listitem"]',
          'div[data-testid*="conversation"] div[role="listitem"]',
          // Fallback selectors
          'div[class*="chat"] div[role="listitem"]',
          'div[class*="conversation"] div[role="listitem"]'
        ];
        
        let chatListItems = [];
        for (const selector of chatListSelectors) {
          chatListItems = document.querySelectorAll(selector);
          if (chatListItems.length > 0) {
            console.log(`🔍 Found ${chatListItems.length} chat list items using selector: ${selector}`);
            break;
          }
        }
        
        console.log(`🔍 Total chat list items found: ${chatListItems.length}`);
        
        chatListItems.forEach((item, index) => {
          try {
            // Try multiple selectors to find the chat title
            const chatTitleSelectors = [
              'span[title]',
              'span[dir="auto"][title]',
              'div[title]',
              'span[class*="x1iyjqo2"]', // WhatsApp specific class
              'span[class*="x6ikm8r"]'   // WhatsApp specific class
            ];
            
            let chatTitle = null;
            for (const selector of chatTitleSelectors) {
              const chatTitleElement = item.querySelector(selector);
              if (chatTitleElement) {
                const title = chatTitleElement.title || chatTitleElement.getAttribute('title') || chatTitleElement.textContent;
                if (title && title.trim()) {
                  // Clean up the title
                  chatTitle = title.trim()
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/\s+/g, ' ')
                    .trim();
                  
                  if (chatTitle.length > 2) {
                    break;
                  }
                }
              }
            }
            
            if (chatTitle) {
              chats.push({
                title: chatTitle,
                id: `chat_${Date.now()}_${index}`,
                isGroup: chatTitle.includes('Group') || chatTitle.includes('group') || chatTitle.includes('+'),
                element: item,
                index: index,
                timestamp: Date.now()
              });
              console.log(`📋 Chat ${index}: "${chatTitle}"`);
            }
          } catch (error) {
            console.warn(`Error processing chat item ${index}:`, error);
          }
        });
        
        // Also add current chat if not already in the list
        const currentChat = this.getCurrentChatInfo();
        const currentChatExists = chats.some(chat => chat.title === currentChat.title);
        if (!currentChatExists && currentChat.title !== 'Unknown Chat') {
          chats.unshift(currentChat);
          console.log(`📋 Current chat: "${currentChat.title}"`);
        }
        
        // If still no chats found, try to get current chat info and add it
        if (chats.length === 0) {
          console.log('🔍 No chats found in list, trying to get current chat...');
          const currentChatInfo = this.getCurrentChatInfo();
          if (currentChatInfo && currentChatInfo.title !== 'Unknown Chat') {
            chats.push(currentChatInfo);
            console.log(`📋 Added current chat as fallback: "${currentChatInfo.title}"`);
          } else {
            // Last resort - add a generic current chat
            chats.push({
              title: 'Current Chat',
              id: 'current_chat',
              isGroup: false,
              timestamp: Date.now()
            });
            console.log('📋 Added generic current chat as last resort');
          }
        }
        
        console.log(`🔍 Total chats found: ${chats.length}`);
        return chats;
        
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
    
    // Handle runtime.lastError to prevent unchecked errors
    const safeResponse = (response) => {
      try {
        if (chrome.runtime.lastError) {
          console.warn('Runtime error in content script:', chrome.runtime.lastError.message);
          return;
        }
        sendResponse(response);
      } catch (error) {
        console.warn('Error sending response from content script:', error.message);
      }
    };
    
    try {
      switch (request.action) {
          case 'ping':
            console.log('🏓 Ping received from popup, responding...');
            safeResponse({ success: true, message: 'pong', timestamp: Date.now() });
            break;
            
          case 'getChatData':
            console.log('📊 Getting chat data...');
            const chatData = window.messageExtractor.getAllMessagesWithChatInfo();
            // Format response to match what popup expects
                safeResponse({ 
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
            safeResponse({ success: true, messages: messages });
            break;
            
          case 'getChatInfo':
            console.log('ℹ️ Getting chat info...');
            const chatInfo = window.messageExtractor.getCurrentChatInfo();
            safeResponse({ success: true, chatInfo: chatInfo });
            break;
            
          case 'getAvailableChats':
            console.log('📋 Getting available chats...');
            try {
              const chats = window.messageExtractor.getAllAvailableChats ? 
                window.messageExtractor.getAllAvailableChats() : 
                [window.messageExtractor.getCurrentChatInfo()];
              safeResponse({ success: true, chats: chats });
            } catch (error) {
              safeResponse({ success: false, error: error.message });
            }
            break;
            
          case 'getChats':
            console.log('📋 Getting chats (alias for getAvailableChats)...');
            try {
              const chats = window.messageExtractor.getAllAvailableChats ? 
                window.messageExtractor.getAllAvailableChats() : 
                [window.messageExtractor.getCurrentChatInfo()];
              safeResponse({ success: true, chats: chats });
                } catch (error) {
              safeResponse({ success: false, error: error.message });
            }
            break;
            
          case 'getAllChatsAndMessages':
            console.log('📨 Getting all chats and messages...');
            try {
              const result = window.messageExtractor.getAllMessagesWithChatInfo();
              safeResponse({ success: true, ...result });
            } catch (error) {
              safeResponse({ success: false, error: error.message });
            }
            break;
            
          case 'getCurrentChatMessages':
            console.log('💬 Getting current chat messages...');
            try {
              const result = window.messageExtractor.getAllMessagesWithChatInfo();
              safeResponse({ success: true, messages: result.messages, chatInfo: result.chatInfo });
          } catch (error) {
              safeResponse({ success: false, error: error.message });
            }
            break;
            
          case 'fetchAllChatsBulk':
            console.log('📨 Fetching messages from all chats in bulk...');
            try {
              // For now, just return current chat messages since we can only access the active chat
              const result = window.messageExtractor.getAllMessagesWithChatInfo();
              
              // Automatically process messages for importance if we have messages
              if (result.messages && result.messages.length > 0) {
                console.log(`🔄 Auto-processing ${result.messages.length} messages for importance...`);
                
                // Send to background script for ML processing
                chrome.runtime.sendMessage({
                  action: 'processMessagesForPriority',
                  messages: result.messages
                }, (response) => {
                  if (response && response.success) {
                    console.log(`✅ Processed ${result.messages.length} messages, found ${response.important?.length || 0} important`);
                  } else {
                    console.log('⚠️ ML processing failed or not available:', response?.error);
                  }
                });
              }
              
              safeResponse({ 
                success: true, 
                messages: result.messages,
                chatInfo: result.chatInfo,
                totalMessages: result.messages.length,
                processedChats: 1
              });
            } catch (error) {
              safeResponse({ success: false, error: error.message });
            }
            break;
            
          case 'debugMessageExtraction':
            console.log('🔍 Debugging message extraction...');
            try {
              // Get detailed debugging info
              const messages = window.messageExtractor.extractMessages();
              const chatInfo = window.messageExtractor.getCurrentChatInfo();
              
              // Debug chat title detection
              const chatTitleDebug = {
                pageTitle: document.title,
                headerElements: [],
                conversationHeader: null,
                chatListItems: [],
                allSpansWithTitle: [],
                allSpansWithText: []
              };
              
              // Check for conversation header
              const convHeader = document.querySelector('header[data-testid="conversation-header"]');
              if (convHeader) {
                chatTitleDebug.conversationHeader = {
                  textContent: convHeader.textContent,
                  innerHTML: convHeader.innerHTML.substring(0, 200),
                  children: Array.from(convHeader.children).map(child => ({
                    tagName: child.tagName,
                    textContent: child.textContent,
                    title: child.title,
                    className: child.className
                  }))
                };
              }
              
              // Check all header elements
              const headers = document.querySelectorAll('header');
              chatTitleDebug.headerElements = Array.from(headers).map(header => ({
                textContent: header.textContent,
                title: header.title,
                dataTestId: header.getAttribute('data-testid'),
                children: Array.from(header.children).map(child => ({
                  tagName: child.tagName,
                  textContent: child.textContent,
                  title: child.title
                }))
              }));
              
              // Check chat list items
              const chatListItems = document.querySelectorAll('[data-testid="cell-frame-container"]');
              chatTitleDebug.chatListItems = Array.from(chatListItems).slice(0, 5).map(item => ({
                textContent: item.textContent,
                title: item.title,
                spans: Array.from(item.querySelectorAll('span')).map(span => ({
                  textContent: span.textContent,
                  title: span.title,
                  className: span.className
                }))
              }));
              
              // Check all spans with title attribute
              const spansWithTitle = document.querySelectorAll('span[title]');
              chatTitleDebug.allSpansWithTitle = Array.from(spansWithTitle).slice(0, 10).map(span => ({
                textContent: span.textContent,
                title: span.title,
                className: span.className
              }));
              
              // Check all spans with meaningful text
              const allSpans = document.querySelectorAll('span');
              chatTitleDebug.allSpansWithText = Array.from(allSpans)
                .filter(span => span.textContent && span.textContent.trim().length > 2 && span.textContent.trim().length < 50)
                .slice(0, 10)
                .map(span => ({
                  textContent: span.textContent,
                  title: span.title,
                  className: span.className
                }));
              
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
              
              safeResponse({ 
                success: true, 
                extractedMessages: messages,
                chatInfo: chatInfo,
                chatTitleDebug: chatTitleDebug,
                textSamples: textSamples,
                totalTextElements: allTextElements.length
              });
            } catch (error) {
              safeResponse({ success: false, error: error.message });
            }
            break;
            
          case 'getAllExtractedMessages':
            console.log('📋 Getting all extracted messages...');
            try {
              const result = window.messageExtractor.getAllMessagesWithChatInfo();
              
              // Automatically process messages for importance if we have messages
              if (result.messages && result.messages.length > 0) {
                console.log(`🔄 Auto-processing ${result.messages.length} messages for importance...`);
                
                // Send to background script for ML processing
                chrome.runtime.sendMessage({
                  action: 'processMessagesForPriority',
                  messages: result.messages
                }, (response) => {
                  if (response && response.success) {
                    console.log(`✅ Processed ${result.messages.length} messages, found ${response.important?.length || 0} important`);
                  } else {
                    console.log('⚠️ ML processing failed or not available:', response?.error);
                  }
                });
              }
              
              safeResponse({ 
                success: true, 
                messages: result.messages,
                chatInfo: result.chatInfo,
                messageCount: result.messageCount
              });
            } catch (error) {
              safeResponse({ success: false, error: error.message });
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
              
              // Test our message selectors
              const selectorTests = {};
              const testSelectors = [
                'div[data-testid="msg-container"]',
                'div[data-testid="conversation-message"]',
                'div[data-testid="message-text"]',
                'span[dir="ltr"]',
                'div[dir="ltr"]'
              ];
              
              testSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                selectorTests[selector] = {
                  count: elements.length,
                  sampleTexts: Array.from(elements).slice(0, 3).map(el => el.textContent?.substring(0, 50))
                };
              });
              
              safeResponse({ 
                success: true, 
                testIdElements: testIdElements,
                classElements: classElements,
                textElements: textElements,
                selectorTests: selectorTests,
                totalElements: document.querySelectorAll('*').length
              });
            } catch (error) {
              safeResponse({ success: false, error: error.message });
            }
            break;
          
        default:
            console.warn('❓ Unknown action:', request.action);
            safeResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
      safeResponse({ success: false, error: error.message });
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

  // Load debug script
  if (!window.debugWhatsAppExtension) {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('debug_fixes.js');
      script.onload = () => console.log('✅ Debug script loaded');
      script.onerror = () => console.warn('⚠️ Could not load debug script');
      document.head.appendChild(script);
    } catch (error) {
      console.warn('⚠️ Could not load debug script:', error);
    }
  }

})(); // Close the IIFE
