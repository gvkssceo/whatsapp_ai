# 🤖 WhatsApp AI Helper

A powerful Chrome extension that provides intelligent analysis and summarization of your WhatsApp Web conversations using OpenAI's GPT-4 technology.

## ✨ Features

- **📊 Smart Chat Summarization** - Get comprehensive summaries of your conversations
- **🔍 Sentiment Analysis** - Analyze the tone and mood of your chats
- **🎯 Enhanced Message Extraction** - Robust parsing of WhatsApp Web messages
- **🔐 Secure API Key Management** - Store your OpenAI API key securely
- **📱 Beautiful Modern UI** - Clean, intuitive interface with real-time feedback
- **⚡ Fast & Efficient** - Optimized for performance and reliability

## 🚀 Installation

### Method 1: Load Unpacked Extension (Development)

1. **Download/Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top right)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

### Method 2: Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store for easy one-click installation.

## ⚙️ Configuration

### 1. Get OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Generate a new API key
4. Copy the key (keep it secure!)

### 2. Configure the Extension

1. **Click the extension icon** in your Chrome toolbar
2. **Enter your OpenAI API key** in the configuration section
3. **Click "Save"** to store your settings
4. **Click "Test"** to verify your API key works

## 📖 How to Use

### Basic Usage

1. **Navigate to WhatsApp Web** (`https://web.whatsapp.com`)
2. **Open any conversation** you want to analyze
3. **Click the extension icon** in your toolbar
4. **Choose your analysis type**:
   - 📊 **Summarize Chat** - Get a comprehensive summary
   - 🔍 **Analyze Sentiment** - Understand conversation tone

### Advanced Features

- **Message Statistics** - See total messages, media count, and more
- **Smart Truncation** - Automatically handles long conversations
- **Error Handling** - Clear feedback for any issues
- **Loading States** - Visual feedback during AI processing

## 🔧 Technical Details

### Architecture

- **Manifest V3** - Latest Chrome extension standard
- **Service Worker** - Background processing and API calls
- **Content Script** - WhatsApp Web integration
- **Popup Interface** - User interaction and configuration

### Message Extraction

The extension uses multiple DOM selectors to reliably extract messages:
- Primary selectors for current WhatsApp Web versions
- Fallback selectors for compatibility
- Media and reaction detection
- Timestamp extraction
- Sender identification

### AI Processing

- **Model**: GPT-4o-mini (cost-effective and powerful)
- **Token Limit**: 500 tokens for responses
- **Temperature**: 0.7 (balanced creativity and consistency)
- **Context**: Up to 4000 characters of chat content

## 🛡️ Privacy & Security

- **Local Storage** - API keys stored securely in Chrome's sync storage
- **No Data Collection** - Your chat data never leaves your browser
- **OpenAI Only** - Direct communication with OpenAI API
- **Permission Minimal** - Only accesses WhatsApp Web when needed

## 🐛 Troubleshooting

### Common Issues

1. **"No chat messages found"**
   - Make sure you're in an active conversation
   - Refresh the WhatsApp Web page
   - Check if the conversation has text messages

2. **"API key not configured"**
   - Enter your OpenAI API key in the configuration section
   - Click "Save" to store it
   - Use "Test" to verify it works

3. **"Network error"**
   - Check your internet connection
   - Verify OpenAI API is accessible
   - Try again in a few minutes

4. **"Invalid API key"**
   - Verify your API key is correct
   - Check if you have sufficient OpenAI credits
   - Ensure the key has proper permissions

### Debug Mode

1. **Open Developer Tools** (F12)
2. **Check Console** for error messages
3. **Look for extension logs** starting with "WhatsApp AI Helper"

## 🔄 Updates

### Version 1.1.0 (Current)
- ✨ Enhanced message extraction
- 🎨 Modern UI redesign
- 🔐 Secure API key management
- 📊 Sentiment analysis feature
- 🛡️ Better error handling
- ⚡ Performance improvements

### Version 1.0.0
- Basic chat summarization
- Simple message extraction
- Basic popup interface

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

### Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/whatsapp-ai-helper.git

# Navigate to the directory
cd whatsapp-ai-helper

# Load in Chrome as unpacked extension
# See installation instructions above
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing the GPT-4 API
- **Chrome Extensions Team** for the excellent platform
- **WhatsApp** for the web interface
- **Open Source Community** for inspiration and tools

## 📞 Support

If you need help or have questions:

- **GitHub Issues** - Report bugs or request features
- **Documentation** - Check this README first
- **Community** - Join our discussions

---

**Made with ❤️ for better WhatsApp conversations**

*This extension is not affiliated with WhatsApp Inc. or OpenAI.*
