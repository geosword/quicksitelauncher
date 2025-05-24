// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const shortcutsGrid = document.getElementById('shortcuts-grid');

    // Extended list of predefined shortcuts, inspired by your image
    // URLs are placeholders - replace with actual URLs
    const predefinedShortcuts = {
      'u': { name: 'Aibuddy', url: 'https://example.com/aibuddy' },
      'x': { name: 'AIBuddyMedia', url: 'https://example.com/aibuddymedia' },
      'a': { name: 'Amazon Console', url: 'https://console.aws.amazon.com/' },
      'r': { name: 'Andrea', url: 'https://example.com/andrea' },
      'b': { name: 'Bubble Editor', url: 'https://bubble.io/home' },
      'c': { name: 'ChatGPT', url: 'https://chat.openai.com/' },
      'd': { name: 'DH Airtable', url: 'https://airtable.com/' },
      'i': { name: 'DH interface', url: 'https://example.com/dhinterface' },
      // 'key_for_dixon': { name: 'Dixon Humphreys', url: 'https://example.com/dixon' }, // Key not visible
      'e': { name: 'Events', url: 'https://example.com/events' },
      'l': { name: 'Google Calendar', url: 'https://calendar.google.com/' },
      'g': { name: 'Google Drive', url: 'https://drive.google.com/' },
      'k': { name: 'Google Keep', url: 'https://keep.google.com/' },
      'o': { name: 'OneDrive', url: 'https://onedrive.live.com/' },
      'p': { name: 'Perplexity', url: 'https://www.perplexity.ai/' },
      's': { name: 'Stockportgrammar', url: 'https://example.com/stockportgrammar' },
      // 'key_for_toni': { name: 'Toni Rosinol', url: 'https://example.com/tonirosinol' }, // Key not visible
      'n': { name: 'Week Planning', url: 'https://example.com/weekplanning' },
      'y': { name: 'Whalesync App', url: 'https://www.whalesync.com/' },
      'w': { name: 'Whatsapp Web', url: 'https://web.whatsapp.com/' },
      'q': { name: 'Whitenoise', url: 'https://example.com/whitenoise' },
      'z': { name: 'Zapier', url: 'https://zapier.com/' }
    };

    // Display the shortcuts in the grid
    // Sort keys alphabetically for consistent order, or define a specific order
    const sortedKeys = Object.keys(predefinedShortcuts).sort();

    for (const key of sortedKeys) {
      if (predefinedShortcuts.hasOwnProperty(key)) {
        const shortcutData = predefinedShortcuts[key];

        const itemDiv = document.createElement('div');
        itemDiv.className = 'shortcut-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'shortcut-name';
        nameSpan.textContent = shortcutData.name;
        nameSpan.title = shortcutData.name; // Show full name on hover if truncated

        const keySpan = document.createElement('span');
        keySpan.className = 'shortcut-key';
        keySpan.textContent = key;

        itemDiv.appendChild(nameSpan);
        itemDiv.appendChild(keySpan);
        shortcutsGrid.appendChild(itemDiv);
      }
    }

    // Listen for key presses within the popup
    document.addEventListener('keydown', (event) => {
      // Ignore key presses if modifier keys like Ctrl, Alt, Meta are also pressed,
      // unless it's a specific combination you want to allow.
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const pressedKey = event.key.toLowerCase();

      if (predefinedShortcuts.hasOwnProperty(pressedKey)) {
        const targetUrl = predefinedShortcuts[pressedKey].url;

        console.log(`Key '${pressedKey}' pressed. Navigating to: ${targetUrl}`);

        chrome.runtime.sendMessage(
          {
            action: 'navigate',
            url: targetUrl
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error sending message:", chrome.runtime.lastError.message);
            } else if (response && response.success) {
              console.log("Navigation message sent successfully.");
            } else {
              console.warn("Navigation message may not have been processed successfully by background.", response);
            }
          }
        );
        window.close(); // Close the popup
      }
    });

    // Optional: Focus the window to capture key presses immediately.
    // This can sometimes be unreliable due to browser focus management.
    // window.focus();
  });
