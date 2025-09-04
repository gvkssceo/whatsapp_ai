// Debug script to test the fixes for runtime errors and chat detection
console.log('🔧 Testing Extension Fixes...');

// Test 1: Chat Title Detection
function testChatTitleDetection() {
  console.log('\n=== Testing Chat Title Detection ===');
  
  const selectors = [
    'header[data-testid="conversation-header"] span[title]:not([title=""])',
    'div[data-testid="conversation-header"] span[title]:not([title=""])', 
    'header span[data-testid="conversation-title"]',
    'div span[data-testid="conversation-title"]',
    'header[data-testid="conversation-header"] *[title]:not([title=""])',
    'div[data-testid="conversation-header"] *[title]:not([title=""])',
    'header[data-testid="conversation-header"] span[dir="auto"]',
    'div[data-testid="conversation-header"] span[dir="auto"]'
  ];
  
  let foundTitle = false;
  
  selectors.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      const title = element.title || element.getAttribute('title') || element.textContent;
      if (title && title.trim() && title.trim() !== 'WhatsApp') {
        console.log(`✅ Found title: "${title.trim()}" with selector: ${selector}`);
        foundTitle = true;
      }
    }
  });
  
  if (!foundTitle) {
    console.warn('❌ No chat title found with any selector');
    console.log('Available conversation headers:', document.querySelectorAll('[data-testid="conversation-header"]'));
  }
}

// Test 2: Message Extraction
function testMessageExtraction() {
  console.log('\n=== Testing Message Extraction ===');
  
  const messageSelectors = [
    'div[data-testid="msg-container"] span[dir="ltr"]',
    'div[data-testid="conversation-message"] span[dir="ltr"]',
    'div[data-testid="message-text"]',
    'div[data-testid="msg-text"]'
  ];
  
  let totalMessages = 0;
  
  messageSelectors.forEach(selector => {
    const messages = document.querySelectorAll(selector);
    console.log(`Selector "${selector}": found ${messages.length} messages`);
    if (messages.length > totalMessages) {
      totalMessages = messages.length;
    }
  });
  
  console.log(`🔍 Total unique messages found: ${totalMessages}`);
  
  if (totalMessages === 0) {
    console.warn('❌ No messages found - user may not be in an active chat');
  }
}

// Test 3: Extension Connection
async function testExtensionConnection() {
  console.log('\n=== Testing Extension Connection ===');
  
  try {
    // Test if we can access chrome runtime
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      console.log('✅ Chrome runtime available');
      
      // Test message sending (this will fail in console but shows the structure)
      try {
        chrome.runtime.sendMessage({action: 'ping'}, (response) => {
          if (chrome.runtime.lastError) {
            console.log('Expected error (running in console):', chrome.runtime.lastError.message);
          } else {
            console.log('✅ Extension connection working:', response);
          }
        });
      } catch (error) {
        console.log('Expected error (running in console):', error.message);
      }
    } else {
      console.warn('❌ Chrome runtime not available (running in console)');
    }
  } catch (error) {
    console.error('Extension connection test failed:', error);
  }
}

// Test 4: DOM Structure Analysis
function analyzeDOMStructure() {
  console.log('\n=== Analyzing WhatsApp DOM Structure ===');
  
  const structures = {
    'Conversation Header': document.querySelectorAll('[data-testid="conversation-header"]'),
    'Message Containers': document.querySelectorAll('[data-testid*="msg"]'),
    'Chat List': document.querySelectorAll('[data-testid*="chat"]'),
    'Spans with title': document.querySelectorAll('span[title]'),
    'Spans with dir=auto': document.querySelectorAll('span[dir="auto"]')
  };
  
  Object.entries(structures).forEach(([name, elements]) => {
    console.log(`${name}: ${elements.length} elements`);
    if (elements.length > 0 && elements.length < 5) {
      console.log(`  Sample:`, elements[0]);
    }
  });
}

// Run all tests
function runAllTests() {
  console.log('🚀 Starting Extension Debug Tests...');
  
  testChatTitleDetection();
  testMessageExtraction();
  testExtensionConnection();
  analyzeDOMStructure();
  
  console.log('\n✅ Debug tests completed!');
  console.log('📋 Next steps:');
  console.log('1. Check if chat title was detected correctly');
  console.log('2. Verify message extraction is working');
  console.log('3. Test the extension popup');
  console.log('4. Look for any runtime.lastError messages');
}

// Auto-run tests if in WhatsApp Web
if (window.location.hostname === 'web.whatsapp.com') {
  setTimeout(runAllTests, 2000); // Wait for page to load
} else {
  console.warn('⚠️ Not on WhatsApp Web. Please run this script on web.whatsapp.com');
}

// Export for manual testing
window.debugWhatsAppExtension = {
  testChatTitle: testChatTitleDetection,
  testMessages: testMessageExtraction,
  testConnection: testExtensionConnection,
  analyzeDom: analyzeDOMStructure,
  runAll: runAllTests
};
