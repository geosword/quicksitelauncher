// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const shortcutsGrid = document.getElementById('shortcuts-grid');
    let loadedShortcuts = {}; // To store the shortcuts loaded from storage

    // --- Function to handle navigation ---
    function navigateToShortcut(key) {
      if (loadedShortcuts.hasOwnProperty(key)) {
        const targetUrl = loadedShortcuts[key].url;

        if (!targetUrl) {
          console.warn(`Shortcut '${key}' found, but has no URL defined.`);
          return;
        }

        console.log(`Activating shortcut '${key}'. Navigating to: ${targetUrl}`);

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
        window.close(); // Close the popup
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
          // Store the key on the element itself for easy access in the click listener
          itemDiv.dataset.shortcutKey = key;

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

          // Add click listener to the shortcut item
          itemDiv.addEventListener('click', () => {
            navigateToShortcut(itemDiv.dataset.shortcutKey);
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
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      const pressedKey = event.key.toLowerCase();
      navigateToShortcut(pressedKey); // Use the common navigation function
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
