// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const shortcutsGrid = document.getElementById('shortcuts-grid');
    let loadedShortcuts = {}; // To store the shortcuts loaded from storage

    // --- Make body focusable and focus it for immediate key capture ---
    document.body.tabIndex = -1;
    // Attempt to focus slightly after DOM is ready, to give the popup window a chance to fully appear and be focusable by the OS
    setTimeout(() => {
        window.focus(); // Attempt to focus the popup window itself
        document.body.focus(); // Then focus the body within the popup
        console.log("Attempted window and body focus after slight delay.");
    }, 50); // 50ms delay, can be adjusted if issues persist
    // --- End of focus enhancement ---

    // --- Function to handle navigation ---
    function navigateToShortcut(key, openInNewTab = false) {
      if (loadedShortcuts.hasOwnProperty(key)) {
        const targetUrl = loadedShortcuts[key].url;

        if (!targetUrl) {
          console.warn(`Shortcut '${key}' found, but has no URL defined.`);
          return;
        }

        console.log(`Activating shortcut '${key}'. Navigating to: ${targetUrl}. New tab: ${openInNewTab}`);

        if (openInNewTab) {
          chrome.tabs.create({ url: targetUrl }, (tab) => {
            if (chrome.runtime.lastError) {
              console.error("Error creating new tab:", chrome.runtime.lastError.message);
            } else {
              console.log("New tab created successfully:", tab);
            }
          });
        } else {
          chrome.runtime.sendMessage(
            {
              action: 'navigate',
              url: targetUrl
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error("Error sending navigation message:", chrome.runtime.lastError.message);
              } else if (response && response.success) {
                console.log("Navigation message sent successfully.");
              } else {
                console.warn("Navigation message may not have been processed successfully by background.", response);
              }
            }
          );
        }
        window.close(); // Close the popup after initiating navigation
      }
    }

    // --- Function to display shortcuts in the grid ---
    function displayShortcuts(shortcuts) {
      shortcutsGrid.innerHTML = ''; // Clear any existing items

      if (!shortcuts || Object.keys(shortcuts).length === 0) {
        const noShortcutsMessage = document.createElement('div');
        noShortcutsMessage.className = 'no-shortcuts';
        noShortcutsMessage.textContent = 'No shortcuts configured. Please set them up in the options page.';
        shortcutsGrid.appendChild(noShortcutsMessage);
        return;
      }

      const sortedKeys = Object.keys(shortcuts).sort();

      for (const key of sortedKeys) {
        if (shortcuts.hasOwnProperty(key)) {
          const shortcutData = shortcuts[key];

          const itemDiv = document.createElement('div');
          itemDiv.className = 'shortcut-item';
          itemDiv.dataset.shortcutKey = key; // Store key for click listener

          const nameSpan = document.createElement('span');
          nameSpan.className = 'shortcut-name';
          nameSpan.textContent = shortcutData.name || 'Unnamed Shortcut';
          nameSpan.title = shortcutData.name || shortcutData.url;

          const keySpan = document.createElement('span');
          keySpan.className = 'shortcut-key';
          keySpan.textContent = key;

          itemDiv.appendChild(nameSpan);
          itemDiv.appendChild(keySpan);
          shortcutsGrid.appendChild(itemDiv);

          // Add click listener to the shortcut item (opens in current tab by default)
          itemDiv.addEventListener('click', () => {
            navigateToShortcut(itemDiv.dataset.shortcutKey, false); // false for openInNewTab
          });
        }
      }
    }

    // --- Load shortcuts from chrome.storage.sync ---
    chrome.storage.sync.get('urlShortcuts', (data) => {
      if (chrome.runtime.lastError) {
        console.error("Error loading shortcuts:", chrome.runtime.lastError.message);
        shortcutsGrid.innerHTML = '<div class="no-shortcuts">Error loading shortcuts.</div>';
        return;
      }
      loadedShortcuts = data.urlShortcuts || {};
      displayShortcuts(loadedShortcuts);
    });

    // --- Listen for key presses within the popup ---
    document.addEventListener('keydown', (event) => {
      // Ignore if the key pressed is a modifier key itself (e.g., just pressing "Control")
      if (["Shift", "Control", "Alt", "Meta"].includes(event.key)) {
        return;
      }

      const pressedKey = event.key.toLowerCase();
      let openInNewTab = false;

      // Case 1: Ctrl + Key (for new tab)
      // Ensure ONLY Ctrl is the main modifier (not Ctrl+Shift, Ctrl+Alt, etc.)
      if (event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
        openInNewTab = true;
        navigateToShortcut(pressedKey, openInNewTab);
      }
      // Case 2: Key only (for current tab)
      // Ensure NO modifiers are pressed
      else if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
        openInNewTab = false;
        navigateToShortcut(pressedKey, openInNewTab);
      }
      // Otherwise, if other combinations of modifiers are pressed, do nothing.
      // This prevents conflicts with browser/OS shortcuts like Ctrl+Shift+T, etc.
    });

    // --- Listen for storage changes ---
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.urlShortcuts) {
        loadedShortcuts = changes.urlShortcuts.newValue || {};
        displayShortcuts(loadedShortcuts);
        console.log("Shortcuts updated in popup due to storage change.");
      }
    });
  });
