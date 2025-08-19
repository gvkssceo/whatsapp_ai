# WhatsApp ML Helper

A Chrome extension that provides intelligent message prioritization and analysis for WhatsApp Web using local ML models.

## 🚀 Features

- **Message Prioritization**: Automatically categorizes messages by importance (P1, P2, P3)
- **Smart Filtering**: Filter messages by priority, chat, or search terms
- **ML-Powered Analysis**: Uses local ML service for intelligent message processing
- **Real-time Monitoring**: Automatically detects and processes new messages
- **Chat Summarization**: Generate summaries of conversations
- **Sentiment Analysis**: Analyze conversation tone and emotional patterns
- **Fallback Processing**: Works even when ML service is unavailable

## 🔧 Installation

### 1. Install the Extension

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `Extension` folder
5. The extension icon should appear in your toolbar

### 2. Start the ML Service

1. Navigate to the `service` folder
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the ML service:
   ```bash
   python start_service.py
   ```
4. The service will be available at `http://127.0.0.1:8000`

## 📱 Usage

### Basic Setup

1. Click the extension icon in your Chrome toolbar
2. Go to the "Config" tab
3. Set the ML Service URL to `http://127.0.0.1:8000`
4. Click "Test Connection" to verify the service is working
5. Click "Save" to store your configuration

### Using the Extension

1. **Navigate to WhatsApp Web**: Go to [web.whatsapp.com](https://web.whatsapp.com)
2. **Open a Chat**: Select any conversation
3. **View Important Messages**: Click the extension icon and go to the "Important" tab
4. **Analyze Chats**: Use the "Analysis" tab for summarization and sentiment analysis

### Features

- **Important Messages Tab**: View all prioritized messages with filtering options
- **Analysis Tab**: Generate chat summaries and analyze sentiment
- **Configuration Tab**: Manage ML service settings and monitoring

## 🏗️ Architecture

### Extension Components

- **popup.js**: Main UI logic and ML service integration
- **content.js**: WhatsApp Web DOM interaction and message extraction
- **background.js**: Background processing and message management
- **manifest.json**: Extension configuration and permissions

### ML Service

- **FastAPI-based**: RESTful API for message processing
- **Local Model**: Uses pre-trained ML model for message classification
- **Fallback Processing**: Rule-based classification when ML service is unavailable

### Message Processing Flow

1. **Extraction**: Content script extracts messages from WhatsApp Web DOM
2. **Processing**: Messages are sent to ML service for prioritization
3. **Storage**: Important messages are stored locally with metadata
4. **Display**: UI shows prioritized messages with filtering options

## 🔍 Message Prioritization

### Priority Levels

- **P3 (High)**: Urgent, time-sensitive, or critical messages
- **P2 (Medium)**: Important but not urgent messages
- **P1 (Low)**: Regular conversation messages

### Classification Factors

- **Keywords**: Urgent terms, business language, personal content
- **Content Type**: Questions, requests, deadlines, payments
- **Context**: Time sensitivity, sender importance, message length

## 🛠️ Development

### Prerequisites

- Python 3.7+
- Chrome browser
- Node.js (for development)

### Local Development

1. **Extension Development**:
   - Make changes to files in the `Extension` folder
   - Reload the extension in Chrome
   - Test changes on WhatsApp Web

2. **ML Service Development**:
   - Modify `service/service.py` for API changes
   - Update ML model in `training/` folder
   - Restart the service to apply changes

### Testing

- Use the "Debug Extraction" button to test message extraction
- Use "Validate Selectors" to check DOM selectors
- Check browser console for detailed logs

## 🚨 Troubleshooting

### Common Issues

1. **"No messages found"**:
   - Ensure you're in an active WhatsApp Web conversation
   - Try refreshing the page
   - Check browser console for extraction errors

2. **"ML service connection failed"**:
   - Verify the ML service is running on port 8000
   - Check firewall settings
   - Ensure the service URL is correct

3. **Extension not working**:
   - Reload the extension in Chrome
   - Check for JavaScript errors in console
   - Verify WhatsApp Web is loaded completely

### Debug Mode

- Open browser console (F12) for detailed logging
- Use debug buttons in the extension popup
- Check network tab for API calls

## 📊 Performance

- **Message Processing**: Handles 1000+ messages efficiently
- **Real-time Updates**: Processes new messages as they arrive
- **Memory Usage**: Minimal memory footprint with local storage
- **Response Time**: Fast processing with local ML service

## 🔒 Privacy & Security

- **Local Processing**: All message analysis happens locally
- **No External APIs**: No data sent to third-party services
- **Local Storage**: Messages stored only on your device
- **Secure Communication**: HTTPS-only for WhatsApp Web

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## 📞 Support

For support or questions:
1. Check the troubleshooting section
2. Review browser console logs
3. Open an issue on GitHub
4. Check the ML service logs

---

**Note**: This extension is not affiliated with WhatsApp Inc. Use at your own discretion and in accordance with WhatsApp's terms of service.
