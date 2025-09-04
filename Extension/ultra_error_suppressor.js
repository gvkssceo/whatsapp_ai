// Ultra-aggressive WhatsApp error suppressor - loads first
(function() {
  'use strict';
  
  console.log('🛡️ Ultra Error Suppressor Loading...');

  // Immediately override console functions before WhatsApp can use them
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  // Super aggressive console.error override
  console.error = function(...args) {
    const message = args.join(' ').toLowerCase();
    
    // Check for WhatsApp error patterns
    if (message.includes('errorutils caught an error') ||
        message.includes('converting to a string will drop content data') ||
        message.includes('hash="undefined"') ||
        message.includes('translation=') ||
        message.includes('subsequent non-fatal errors')) {
      
      // Log a suppression notice instead
      originalLog('🔇 [ULTRA] Suppressed WhatsApp error:', 
                  args[0]?.toString?.()?.substring(0, 80) || 'Unknown error');
      return; // Don't call original error function
    }
    
    // For other errors, call the original
    return originalError.apply(console, args);
  };

  // Override console.warn too
  console.warn = function(...args) {
    const message = args.join(' ').toLowerCase();
    
    if (message.includes('errorutils') ||
        message.includes('converting to a string') ||
        message.includes('fburl.com/debugjs')) {
      originalLog('🔇 [ULTRA] Suppressed WhatsApp warning:', 
                  args[0]?.toString?.()?.substring(0, 80) || 'Unknown warning');
      return;
    }
    
    return originalWarn.apply(console, args);
  };

  // Override window.onerror at the very beginning
  window.onerror = function(message, source, lineno, colno, error) {
    const errorStr = message?.toLowerCase() || '';
    
    if (errorStr.includes('converting to a string will drop content data') ||
        errorStr.includes('hash="undefined"') ||
        errorStr.includes('translation=')) {
      originalLog('🔇 [ULTRA] Suppressed window.onerror:', message?.substring(0, 80));
      return true; // Prevent default error handling
    }
    
    return false; // Let other errors through
  };

  // Nuclear option: Try to prevent ErrorUtils from initializing
  Object.defineProperty(window, 'ErrorUtils', {
    configurable: true,
    get: function() {
      return this._ErrorUtils;
    },
    set: function(value) {
      originalLog('🎯 [ULTRA] Intercepted ErrorUtils assignment');
      
      if (value && value.reportError) {
        const originalReportError = value.reportError;
        value.reportError = function(error, ...args) {
          const errorStr = error?.toString?.() || error?.message || '';
          
          if (errorStr.includes('Converting to a string will drop content data') ||
              errorStr.includes('Hash="undefined"') ||
              errorStr.includes('Translation=')) {
            originalLog('🔇 [ULTRA] Blocked ErrorUtils.reportError:', errorStr.substring(0, 80));
            return; // Don't report this error
          }
          
          return originalReportError.call(this, error, ...args);
        };
      }
      
      this._ErrorUtils = value;
    }
  });

  // Intercept and patch any errorListener functions
  let errorListenerPatched = false;
  const patchErrorListener = () => {
    if (window.errorListener && !errorListenerPatched) {
      const originalErrorListener = window.errorListener;
      window.errorListener = function(...args) {
        const errorStr = args.join(' ');
        if (errorStr.includes('Converting to a string will drop content data') ||
            errorStr.includes('ErrorUtils caught an error')) {
          originalLog('🔇 [ULTRA] Blocked errorListener call');
          return;
        }
        return originalErrorListener.apply(this, args);
      };
      errorListenerPatched = true;
      originalLog('🎯 [ULTRA] Patched errorListener function');
    }
  };

  // Check for errorListener periodically
  const checkInterval = setInterval(() => {
    patchErrorListener();
    if (errorListenerPatched) {
      clearInterval(checkInterval);
    }
  }, 100);

  // Stop checking after 10 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 10000);

  console.log('🛡️ Ultra Error Suppressor Ready - All WhatsApp errors will be blocked');

})();
