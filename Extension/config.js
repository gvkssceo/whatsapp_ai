// Configuration file for Nax
const CONFIG = {
  // OpenAI API Configuration
  OPENAI: {
    BASE_URL: 'https://api.openai.com/v1',
    MODEL: 'gpt-4o-mini',
    MAX_TOKENS: 500,
    TEMPERATURE: 0.7,
    PRESENCE_PENALTY: 0.1,
    FREQUENCY_PENALTY: 0.1,
    MAX_CONTENT_LENGTH: 4000
  },

  // Extension Configuration
  EXTENSION: {
    NAME: 'Nax',
    VERSION: '1.1.0',
    STORAGE_KEYS: {
      OPENAI_API_KEY: 'openai_api_key',
      USER_PREFERENCES: 'user_preferences'
    }
  },

  // WhatsApp Web Configuration
  WHATSAPP: {
    BASE_URL: 'https://web.whatsapp.com',
    SELECTORS: {
      MESSAGE_IN: 'div.message-in',
      MESSAGE_OUT: 'div.message-out',
      MESSAGE_TEXT: [
        'span.selectable-text span',
        'div.copyable-text span',
        '[data-testid="message-text"]',
        'div[dir="ltr"]',
        'span[dir="ltr"]'
      ],
      MEDIA: [
        'div[data-testid="media-canvas"]',
        'img[data-testid="media-canvas"]'
      ],
      REACTIONS: [
        'span[data-testid="reaction"]'
      ],
      TIMESTAMP: [
        'span[data-testid="message-time"]',
        'span[data-pre-plain-text]'
      ]
    }
  },

  // UI Configuration
  UI: {
    POPUP_WIDTH: 320,
    STATUS_TIMEOUT: 5000,
    LOADING_DELAY: 100
  },

  // Error Messages
  ERRORS: {
    NO_API_KEY: 'OpenAI API key not configured',
    INVALID_API_KEY: 'Invalid API key',
    NO_CHAT_DATA: 'No chat messages found',
    NETWORK_ERROR: 'Network error - please check your internet connection',
    WHATSAPP_NOT_LOADED: 'Please navigate to WhatsApp Web first',
    UNKNOWN_ERROR: 'An unknown error occurred'
  },

  // Success Messages
  SUCCESS: {
    CONFIG_SAVED: 'Configuration saved successfully',
    API_KEY_VALID: 'API key is valid!',
    ANALYSIS_COMPLETE: 'Analysis completed successfully',
    SUMMARY_COMPLETE: 'Summary completed successfully'
  },

  // Prompts for AI Analysis
  PROMPTS: {
    SUMMARIZE: 'Please provide a comprehensive summary of this WhatsApp conversation. Include key topics discussed, important decisions made, and any action items mentioned.',
    SENTIMENT: 'Please analyze the sentiment and tone of this WhatsApp conversation. Identify the overall mood, any emotional patterns, and provide insights about the communication dynamics.',
    SYSTEM: 'You are a helpful AI assistant that analyzes WhatsApp chat conversations. Provide clear, concise, and insightful analysis. Be helpful and professional.'
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
