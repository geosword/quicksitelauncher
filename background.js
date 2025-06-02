// background.js (Service Worker for Manifest V3)

// Listen for the installation or update of the extension
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      console.log("Quick URL Navigator extension installed.");
      // Set up initial default shortcuts
      chrome.storage.sync.set({
        urlShortcuts: {
          'g': { name: 'Google', url: 'https://google.com' },
          'm': { name: 'Mail', url: 'https://gmail.com' },
          'c': { name: 'ChatGPT', url: 'https://chatgpt.com' },
          'b': { name: 'Bubble', url: 'https://bubble.io' },
          'i': { name: 'Airtable', url: 'https://airtable.com' },
          'a': { name: 'Ars Technica', url: 'https://arstechnica.com' },
          'y': { name: 'YouTube', url: 'https://youtube.com' },
          's': { name: 'Stockport Grammar', url: 'https://stockportgrammar.co.uk' },
          '1': { name: 'OpenAI', url: 'https://openai.com' }
        }
      }, () => {
        console.log("Default shortcuts set (including new additions).");
      });
    } else if (details.reason === "update") {
      const newVersion = chrome.runtime.getManifest().version;
      console.log(`Quick URL Navigator extension updated to version ${newVersion}.`);
    }
  });

  // Listen for the keyboard shortcut command (e.g., Ctrl+M)
  // The command name "open-popup" should match what's defined in your manifest.json
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === "open-popup") {
      console.log("Ctrl+M command received, attempting to open popup.");
      try {
        // Programmatically open the extension's popup.
        // This function opens the popup for the currently active window.
        await chrome.action.openPopup();
      } catch (e) {
        console.error("Error trying to open popup:", e);
        // This might happen if there's no suitable window or other constraints.
      }
    }
  });

  // Listen for messages from other parts of the extension (e.g., the popup)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Check if the message is for navigation
    if (request.action === "navigate") {
      const targetUrl = request.url;
      if (targetUrl) {
        console.log(`Navigation request received for URL: ${targetUrl}`);
        // Find the active tab in the current window
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs.length > 0) {
            const activeTab = tabs[0];
            // Update the URL of the active tab
            chrome.tabs.update(activeTab.id, { url: targetUrl }, () => {
              if (chrome.runtime.lastError) {
                console.error(`Error navigating tab: ${chrome.runtime.lastError.message}`);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
              } else {
                console.log(`Successfully navigated tab ${activeTab.id} to ${targetUrl}`);
                sendResponse({ success: true });
              }
            });
          } else {
            console.warn("No active tab found to navigate.");
            sendResponse({ success: false, error: "No active tab found." });
          }
        });
        // Return true to indicate that sendResponse will be called asynchronously.
        // This is crucial for Manifest V3 service workers when dealing with async operations 4.
        return true;
      } else {
        console.warn("Navigation request received without a URL.");
        sendResponse({ success: false, error: "No URL provided." });
        return false; // No async response in this case
      }
    }
    // If the message is not 'navigate', or for other actions, you can add more handlers here.
    // Return false or undefined if you don't send a response synchronously or asynchronously.
    return false;
  });

  console.log("Quick URL Navigator service worker initialized.");
