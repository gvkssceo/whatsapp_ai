// WhatsApp Web Error Handler - Suppress common errors and handle DOM changes
(function() {
  'use strict';
  
  console.log('🛡️ WhatsApp Error Handler Loading...');

  // IMMEDIATE aggressive suppression before WhatsApp loads
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const errorMessage = args.join(' ').toLowerCase();
    if (errorMessage.includes('converting to a string will drop content data') ||
        errorMessage.includes('errorutils caught an error') ||
        errorMessage.includes('hash="undefined"')) {
      console.log('🔇 IMMEDIATE suppressed:', args[0]?.substring?.(0, 80) || args[0]);
      return;
    }
    return originalConsoleError.apply(console, args);
  };

  // Suppress common WhatsApp Web errors
  class WhatsAppErrorHandler {
    constructor() {
      this.setupErrorSuppression();
      this.setupConsoleFiltering();
      this.monitorWhatsAppChanges();
      this.setupGlobalErrorCatcher();
      console.log('✅ WhatsApp Error Handler initialized');
    }

    // Setup error suppression for common WhatsApp issues
    setupErrorSuppression() {
      // 1. Override console.error to filter out known issues
      const originalConsoleError = console.error;
      console.error = (...args) => {
        const errorMessage = args.join(' ').toLowerCase();
        
        // Filter out known WhatsApp Web errors
        const knownErrors = [
          'converting to a string will drop content data',
          'hash="undefined"',
          'translation=',
          'content="{"key":null',
          'errorutils caught an error',
          'subsequent non-fatal errors won\'t be logged',
          'fburl.com/debugjs',
          'could not establish connection. receiving end does not exist'
        ];
        
        if (knownErrors.some(pattern => errorMessage.includes(pattern))) {
          // Silently ignore these errors
          console.log('🔇 Suppressed console.error:', args[0]?.substring?.(0, 100) || args[0]);
          return;
        }
        
        // Log other errors normally
        originalConsoleError.apply(console, args);
      };

      // 2. Override console.warn as well
      const originalConsoleWarn = console.warn;
      console.warn = (...args) => {
        const warnMessage = args.join(' ').toLowerCase();
        
        const knownWarnings = [
          'errorutils caught an error',
          'converting to a string will drop content data',
          'subsequent non-fatal errors won\'t be logged'
        ];
        
        if (knownWarnings.some(pattern => warnMessage.includes(pattern))) {
          console.log('🔇 Suppressed console.warn:', args[0]?.substring?.(0, 100) || args[0]);
          return;
        }
        
        originalConsoleWarn.apply(console, args);
      };

      // 3. Aggressive approach: Override the ErrorUtils function if it exists
      setTimeout(() => {
        if (window.ErrorUtils) {
          console.log('🎯 Found ErrorUtils - patching...');
          const originalReportError = window.ErrorUtils.reportError;
          if (originalReportError) {
            window.ErrorUtils.reportError = function(error, ...args) {
              const errorStr = error?.toString?.() || error?.message || '';
              if (errorStr.includes('Converting to a string will drop content data') ||
                  errorStr.includes('Hash="undefined"') ||
                  errorStr.includes('Translation=')) {
                console.log('🔇 Suppressed ErrorUtils.reportError:', errorStr.substring(0, 100));
                return; // Don't call the original function
              }
              return originalReportError.call(this, error, ...args);
            };
          }
        }
      }, 2000);

      // 4. Suppress the specific ErrorUtils error at window level
      const originalErrorListener = window.addEventListener;
      window.addEventListener = function(type, listener, options) {
        if (type === 'error') {
          const wrappedListener = function(event) {
            const errorMsg = event.error?.message || event.message || '';
            if (errorMsg.includes('Converting to a string will drop content data') ||
                errorMsg.includes('Hash="undefined"') ||
                errorMsg.includes('Translation=')) {
              console.log('🔇 Suppressed window error:', errorMsg.substring(0, 100));
              event.preventDefault();
              event.stopPropagation();
              return false;
            }
            return listener.call(this, event);
          };
          return originalErrorListener.call(this, type, wrappedListener, options);
        }
        return originalErrorListener.call(this, type, listener, options);
      };

      // 5. Nuclear option: Monkey patch the errorListener function in 9DrDvlf5bj8.js
      setTimeout(() => {
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
          if (script.src && script.src.includes('9DrDvlf5bj8.js')) {
            console.log('🎯 Found WhatsApp error script, attempting to disable...');
          }
        });

        // Try to find and disable the errorListener function
        if (window.errorListener) {
          const originalErrorListener = window.errorListener;
          window.errorListener = function(...args) {
            const errorStr = args.join(' ');
            if (errorStr.includes('Converting to a string will drop content data')) {
              console.log('🔇 Suppressed errorListener call');
              return;
            }
            return originalErrorListener.apply(this, args);
          };
        }
      }, 3000);

      // Handle uncaught runtime errors
      const originalRuntimeError = chrome?.runtime?.lastError;
      if (chrome?.runtime) {
        // Add a wrapper to check for lastError in all chrome API calls
        const wrapChromeAPI = (api, methodName) => {
          if (api && api[methodName]) {
            const originalMethod = api[methodName];
            api[methodName] = function(...args) {
              try {
                const result = originalMethod.apply(this, args);
                
                // Check for runtime errors after the call
                setTimeout(() => {
                  if (chrome.runtime.lastError) {
                    const error = chrome.runtime.lastError.message;
                    if (!error.includes('Could not establish connection')) {
                      console.warn('Chrome API error suppressed:', error);
                    }
                    // Clear the error to prevent propagation
                    chrome.runtime.lastError = undefined;
                  }
                }, 0);
                
                return result;
              } catch (error) {
                console.warn('Chrome API call failed:', methodName, error.message);
                return null;
              }
            };
          }
        };

        // Wrap common chrome API methods
        if (chrome.tabs) {
          wrapChromeAPI(chrome.tabs, 'sendMessage');
          wrapChromeAPI(chrome.tabs, 'query');
          wrapChromeAPI(chrome.tabs, 'get');
        }
        
        if (chrome.runtime) {
          wrapChromeAPI(chrome.runtime, 'sendMessage');
        }
      }
    }

    // Setup console filtering for WhatsApp-specific noise
    setupConsoleFiltering() {
      // Override console.warn to filter WhatsApp noise
      const originalConsoleWarn = console.warn;
      console.warn = (...args) => {
        const warnMessage = args.join(' ').toLowerCase();
        
        const ignoredWarnings = [
          'errorutils caught an error',
          'fburl.com/debugjs',
          'non-fatal errors won\'t be logged',
          'hash="undefined"',
          'content data'
        ];
        
        if (ignoredWarnings.some(pattern => warnMessage.includes(pattern))) {
          return; // Ignore these warnings
        }
        
        originalConsoleWarn.apply(console, args);
      };

      // Override window.onerror to catch global errors
      const originalOnError = window.onerror;
      window.onerror = function(message, source, lineno, colno, error) {
        const errorMsg = message?.toLowerCase() || '';
        
        // Suppress known WhatsApp errors
        if (errorMsg.includes('converting to a string will drop content data') ||
            errorMsg.includes('hash="undefined"') ||
            errorMsg.includes('content="{"key":null')) {
          return true; // Prevent default error handling
        }
        
        // Call original handler for other errors
        if (originalOnError) {
          return originalOnError.call(this, message, source, lineno, colno, error);
        }
        return false;
      };
    }

    // Monitor WhatsApp Web for structural changes
    monitorWhatsAppChanges() {
      try {
        // Wait for document.body to be available
        if (!document.body) {
          setTimeout(() => this.monitorWhatsAppChanges(), 1000);
          return;
        }

        // Watch for major DOM changes that might affect our extension
        const observer = new MutationObserver((mutations) => {
          let hasSignificantChange = false;
          
          mutations.forEach((mutation) => {
            // Check for added nodes that might indicate a layout change
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  // Check for WhatsApp's main app container changes
                  if (node.matches && (
                      node.matches('[data-testid*="app"]') ||
                      node.matches('[data-testid*="main"]') ||
                      node.matches('[data-testid*="conversation"]'))) {
                    hasSignificantChange = true;
                  }
                }
              });
            }
          });
          
          if (hasSignificantChange) {
            console.log('🔄 WhatsApp Web layout change detected');
            // Notify our extension components about the change
            if (window.naxChatScanner || window.messageExtractor) {
              setTimeout(() => {
                console.log('♻️ Refreshing extension components after layout change');
              }, 1000);
            }
          }
        });

        // Start observing with error handling
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: false
        });

        console.log('👀 Monitoring WhatsApp Web for layout changes');
      } catch (error) {
        console.warn('⚠️ Could not setup DOM monitoring:', error.message);
      }
    }

    // Setup global error catcher as last resort
    setupGlobalErrorCatcher() {
      // Catch all unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason?.toString?.() || event.reason;
        if (reason && (reason.includes('Converting to a string will drop content data') ||
                      reason.includes('Hash="undefined"'))) {
          console.log('🔇 Suppressed unhandled rejection:', reason.substring(0, 100));
          event.preventDefault();
        }
      });

      // Override Object.prototype.toString to prevent the specific error
      setTimeout(() => {
        try {
          // Create a more aggressive console.log override
          const superOriginalLog = console.log;
          const filterLog = function(...args) {
            const logMessage = args.join(' ').toLowerCase();
            if (logMessage.includes('errorutils caught an error') ||
                logMessage.includes('converting to a string will drop content data')) {
              return; // Don't log these at all
            }
            return superOriginalLog.apply(console, args);
          };

          // Replace console.log temporarily to catch ErrorUtils logs
          setTimeout(() => {
            console.log = filterLog;
            setTimeout(() => {
              console.log = superOriginalLog; // Restore after 10 seconds
            }, 10000);
          }, 1000);

        } catch (error) {
          console.warn('Could not setup advanced error suppression:', error.message);
        }
      }, 500);
    }

    // Handle specific WhatsApp error patterns
    handleWhatsAppError(error) {
      const errorMessage = error?.message || error?.toString() || '';
      
      // Handle translation/content data errors
      if (errorMessage.includes('Converting to a string will drop content data')) {
        console.log('🔇 Suppressed WhatsApp translation error');
        return true; // Handled
      }
      
      // Handle other known patterns
      if (errorMessage.includes('Hash="undefined"') || 
          errorMessage.includes('Translation=') ||
          errorMessage.includes('Content="{"key":null')) {
        console.log('🔇 Suppressed WhatsApp content rendering error');
        return true; // Handled
      }
      
      return false; // Not handled
    }
  }

  // Initialize error handler if not already done
  if (!window.whatsappErrorHandler) {
    window.whatsappErrorHandler = new WhatsAppErrorHandler();
  }

  // Expose error handling utility
  window.suppressWhatsAppError = (error) => {
    return window.whatsappErrorHandler.handleWhatsAppError(error);
  };

  console.log('🛡️ WhatsApp Error Handler ready');

})();
