# Nax Extension Troubleshooting Guide

## Common Issues and Solutions

### 1. "Could not establish connection. Receiving end does not exist" Error

**Symptoms:**
- Extension popup shows connection errors
- Browser console shows runtime.lastError messages
- Extension features not working

**Causes:**
- Content scripts not properly injected
- WhatsApp Web page not fully loaded
- Extension manifest issues
- Tab navigation or refresh issues

**Solutions:**

1. **Refresh WhatsApp Web page:**
   ```
   Press F5 or Ctrl+R to refresh the page
   Wait for WhatsApp Web to fully load
   Try opening the extension popup again
   ```

2. **Reload the extension:**
   ```
   Go to chrome://extensions/
   Find "Nax" extension
   Click the reload button (circular arrow)
   Refresh WhatsApp Web page
   ```

3. **Check WhatsApp Web URL:**
   ```
   Ensure you're on https://web.whatsapp.com/
   Extension only works on WhatsApp Web
   ```

4. **Use the Fix Connection button:**
   ```
   Open extension popup
   If you see "Connection failed" message
   Click the "🔧 Fix Connection" button
   Wait for the fix to complete
   ```

### 2. WhatsApp Web JavaScript Errors

**Symptoms:**
- Console shows "Converting to a string will drop content data" errors
- "Hash=undefined" translation errors
- "ErrorUtils caught an error" messages

**Solutions:**

These errors are from WhatsApp Web itself and are automatically suppressed by our error handler. They don't affect extension functionality.

**What we do:**
- Filter out known WhatsApp Web errors
- Suppress non-critical error messages
- Continue normal operation despite these errors

### 3. Extension Not Detecting Messages

**Symptoms:**
- Extension shows "No messages found"
- Empty message list in popup
- "Please open a chat conversation" message

**Solutions:**

1. **Open a chat conversation:**
   ```
   Click on any chat in WhatsApp Web sidebar
   Make sure you're viewing a conversation
   Try the extension again
   ```

2. **Wait for page to load:**
   ```
   WhatsApp Web needs time to load completely
   Wait 10-15 seconds after page load
   Try opening extension popup again
   ```

3. **Check DOM elements:**
   ```
   Open browser console (F12)
   Look for Nax initialization messages
   Should see "✅ NAX INITIALIZED SUCCESSFULLY"
   ```

### 4. ML Service Connection Issues

**Symptoms:**
- "ML service unavailable" messages
- Features work but without AI analysis
- Fallback processing being used

**Solutions:**

1. **Start the ML service:**
   ```bash
   cd service/
   python start_service.py
   ```

2. **Check service URL:**
   ```
   Default: http://127.0.0.1:8000
   Verify service is running on this port
   Check for firewall blocking
   ```

3. **Fallback mode:**
   ```
   Extension automatically uses CSV-based fallback
   Basic functionality will still work
   Important messages still detected
   ```

### 5. Performance Issues

**Symptoms:**
- Extension popup loads slowly
- WhatsApp Web becomes sluggish
- High memory usage

**Solutions:**

1. **Clear extension cache:**
   ```
   Open extension popup
   Go to Settings
   Click "Clear Cache"
   Refresh WhatsApp Web page
   ```

2. **Limit message processing:**
   ```
   Extension automatically limits to 50 recent messages
   Old messages are cleaned up periodically
   ```

3. **Check background processes:**
   ```
   Go to chrome://extensions/
   Click "background page" for Nax extension
   Monitor console for excessive processing
   ```

## Debug Information

### Getting Debug Information

1. **Open browser console:**
   ```
   Press F12
   Go to Console tab
   Look for Nax-related messages
   ```

2. **Check extension background:**
   ```
   Go to chrome://extensions/
   Enable Developer mode
   Click "background page" for Nax extension
   Check console for errors
   ```

3. **Test connection:**
   ```
   Open extension popup
   Click "Test Connection" if available
   Check results in console
   ```

### Common Debug Messages

**Good signs:**
```
✅ NAX INITIALIZED SUCCESSFULLY
✅ Nax content script message listener registered
✅ Found X messages using selector: [selector]
✅ Processed X messages for chat: "ChatName"
```

**Warning signs:**
```
❌ No message elements found with any method
⚠️ Skipping duplicate message
❌ Content script injection failed
⚠️ ML processing failed or not available
```

## Version Information

- **Extension Version:** 2.0.1
- **Manifest Version:** 3
- **Chrome API:** Scripting, ActiveTab, Storage, Tabs
- **Content Scripts:** whatsapp_error_handler.js, content_chat_scanner.js, content.js

## Getting Help

If issues persist:

1. **Check console logs** for specific error messages
2. **Try incognito mode** to rule out other extensions
3. **Test with fresh browser profile**
4. **Verify WhatsApp Web works without extension**
5. **Check that all files are present** in extension directory

## Recent Fixes (v2.0.1)

- ✅ Fixed "Could not establish connection" errors
- ✅ Added proper runtime.lastError handling
- ✅ Improved content script injection
- ✅ Added WhatsApp Web error suppression
- ✅ Enhanced retry mechanisms
- ✅ Better tab validation
- ✅ Automatic error filtering
- ✅ Fixed MutationObserver initialization error
- ✅ Improved message-to-chat association
- ✅ Better chat list vs conversation detection
- ✅ Enhanced message extraction from multiple chats
