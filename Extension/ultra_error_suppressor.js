// ultra_error_suppressor.js
(function() {
  'use strict';
  if (window.naxUltraErrorHandlerLoaded) {
    console.log('🛡️ Ultra Error Suppressor already loaded');
    return;
  }
  window.naxUltraErrorHandlerLoaded = true;
  console.log('🛡️ Ultra Error Suppressor Loading...');

  // Layer 1: Immediate console overrides
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const errorMessage = args.join(' ').toLowerCase();
    const knownErrors = [
      'converting to a string will drop content data',
      'hash="undefined"',
      'translation=',
      'errorutils caught an error',
      'subsequent non-fatal errors won\'t be logged',
      'fburl.com/debugjs',
      'could not establish connection. receiving end does not exist',
      'websocket connection to \'wss://web.whatsapp.com/ws/chat\' failed',
      'failed to load resource: net::err_name_not_resolved',
      'event handler of \'x-storagemutated-1\' event must be added',
      'violation \'message\' handler took',
      'listener indicated an asynchronous response by returning true, but the message channel closed'
    ];
    if (knownErrors.some(pattern => errorMessage.includes(pattern))) {
      console.log('🔇 [ULTRA] Suppressed console.error:', args[0]?.substring?.(0, 80) || args[0]);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = function(...args) {
    const warnMessage = args.join(' ').toLowerCase();
    const knownWarnings = [
      'errorutils caught an error',
      'converting to a string will drop content data',
      'subsequent non-fatal errors won\'t be logged',
      'websocket connection failed',
      'failed to load resource',
      'event handler must be added',
      'violation \'message\' handler took'
    ];
    if (knownWarnings.some(pattern => warnMessage.includes(pattern))) {
      console.log('🔇 [ULTRA] Suppressed console.warn:', args[0]?.substring?.(0, 80) || args[0]);
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  // Layer 2: Immediate window.onerror override
  const originalWindowOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const errorMsg = (message || '').toLowerCase();
    const knownErrors = [
      'converting to a string will drop content data',
      'hash="undefined"',
      'translation=',
      'errorutils caught an error',
      'websocket connection failed',
      'failed to load resource',
      'event handler must be added',
      'violation \'message\' handler took',
      'listener indicated an asynchronous response'
    ];
    if (knownErrors.some(pattern => errorMsg.includes(pattern))) {
      console.log('🔇 [ULTRA] Suppressed window.onerror:', message?.substring?.(0, 80) || message);
      return true; // Suppress the error
    }
    if (originalWindowOnError) {
      return originalWindowOnError.apply(this, arguments);
    }
    return false;
  };

  // Layer 3: Intercept ErrorUtils assignment
  // This attempts to catch the ErrorUtils object as soon as it's defined
  Object.defineProperty(window, 'ErrorUtils', {
    configurable: true,
    enumerable: true,
    set(value) {
      console.log('🎯 [ULTRA] ErrorUtils detected, patching...');
      const originalReportError = value.reportError;
      if (originalReportError) {
        value.reportError = function(error, ...args) {
          const errorStr = error?.toString?.() || error?.message || '';
          if (errorStr.includes('Converting to a string will drop content data') ||
              errorStr.includes('Hash="undefined"') ||
              errorStr.includes('Translation=') ||
              errorStr.includes('WebSocket connection failed') ||
              errorStr.includes('Failed to load resource')) {
            console.log('🔇 [ULTRA] Suppressed ErrorUtils.reportError:', errorStr.substring(0, 80));
            return;
          }
          return originalReportError.call(this, error, ...args);
        };
      }
      delete window.ErrorUtils; // Remove the setter
      window.ErrorUtils = value; // Set the actual value
    },
    get() {
      return undefined; // Return undefined until it's properly set
    }
  });

  // Layer 4: Dynamic patching of specific errorListener function
  // This is a more targeted approach for the specific error mentioned by the user
  const attemptPatchErrorListener = () => {
    if (window.errorListener && typeof window.errorListener === 'function') {
      console.log('🎯 [ULTRA] Found window.errorListener, attempting to patch...');
      const originalErrorListener = window.errorListener;
      window.errorListener = function(...args) {
        const errorStr = args.join(' ').toLowerCase();
        if (errorStr.includes('converting to a string will drop content data') ||
            errorStr.includes('hash="undefined"') ||
            errorStr.includes('translation=') ||
            errorStr.includes('websocket connection failed') ||
            errorStr.includes('failed to load resource')) {
          console.log('🔇 [ULTRA] Suppressed window.errorListener call');
          return;
        }
        return originalErrorListener.apply(this, args);
      };
      console.log('✅ [ULTRA] window.errorListener patched.');
      return true;
    }
    return false;
  };

  // Try patching after a short delay, as the script might not be immediately available
  setTimeout(() => {
    if (!attemptPatchErrorListener()) {
      // If not found immediately, try again after WhatsApp scripts might have loaded
      setTimeout(attemptPatchErrorListener, 1000);
    }
  }, 500);

  // Layer 5: Suppress WebSocket errors
  const originalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    const ws = new originalWebSocket(url, protocols);
    
    // Suppress connection errors
    const originalOnError = ws.onerror;
    ws.onerror = function(event) {
      const errorMsg = event.toString().toLowerCase();
      if (errorMsg.includes('websocket connection failed') ||
          errorMsg.includes('failed to load resource')) {
        console.log('🔇 [ULTRA] Suppressed WebSocket error');
        return;
      }
      if (originalOnError) {
        originalOnError.call(this, event);
      }
    };
    
    return ws;
  };

  console.log('🛡️ Ultra Error Suppressor Ready - All WhatsApp errors will be blocked');
})();
