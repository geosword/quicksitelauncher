// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const shortcutsGrid = document.getElementById('shortcuts-grid');
    const popupTitle = document.getElementById('popup-title');
    const toggleAddPaneButton = document.getElementById('toggle-add-pane-button');
    const shortcutsDisplayPane = document.getElementById('shortcuts-display-pane');
    const addShortcutPane = document.getElementById('add-shortcut-pane');
    const addShortcutForm = document.getElementById('add-shortcut-form');
    const addUrlInput = document.getElementById('add-url');
    const addTitleInput = document.getElementById('add-title');
    const addKeyInput = document.getElementById('add-key');
    const saveShortcutButton = document.getElementById('save-shortcut-button');
    const cancelAddButton = document.getElementById('cancel-add-button');
    const popupStatusMessage = document.getElementById('popup-status-message');
    const keyValidationMessage = document.getElementById('key-validation-message');

    let loadedShortcuts = {}; // To store the shortcuts loaded from storage
    let isAddPaneVisible = false;

    // --- Make body focusable and focus it for immediate key capture --- (if needed for display pane)
    document.body.tabIndex = -1;
    function focusBody() {
        setTimeout(() => {
            window.focus();
            document.body.focus();
            console.log("Attempted window and body focus for display pane.");
        }, 50);
    }

    // --- Utility to show status messages in popup ---
    function showPopupStatus(message, type = 'success', duration = 3000) {
        popupStatusMessage.textContent = message;
        popupStatusMessage.className = type;
        popupStatusMessage.style.display = 'block';
        setTimeout(() => {
            popupStatusMessage.style.display = 'none';
        }, duration);
    }

    // --- Function to switch between panes ---
    function switchToDisplayPane() {
        shortcutsDisplayPane.style.display = 'block';
        addShortcutPane.style.display = 'none';
        popupTitle.textContent = 'Quick Shortcuts';
        toggleAddPaneButton.textContent = '+';
        toggleAddPaneButton.title = 'Add new shortcut (+)';
        isAddPaneVisible = false;
        addShortcutForm.reset(); // Reset form when switching away
        keyValidationMessage.textContent = '';
        saveShortcutButton.disabled = false;
        popupStatusMessage.style.display = 'none'; // Hide status message
        focusBody(); // Refocus body for keyboard navigation of shortcuts
    }

    function switchToAddPane() {
        shortcutsDisplayPane.style.display = 'none';
        addShortcutPane.style.display = 'block';
        popupTitle.textContent = 'Add New Shortcut';
        toggleAddPaneButton.textContent = '‹'; // Or a back arrow/cancel icon
        toggleAddPaneButton.title = 'Cancel add shortcut (Backspace)';
        isAddPaneVisible = true;
        keyValidationMessage.textContent = '';
        saveShortcutButton.disabled = false;

        // Pre-fill form with current tab's URL and Title
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                const currentTab = tabs[0];
                if (currentTab.url && !currentTab.url.startsWith('chrome://') && !currentTab.url.startsWith('chrome-extension://')) {
                    addUrlInput.value = currentTab.url;
                }
                if (currentTab.title) {
                    addTitleInput.value = currentTab.title;
                }
                addKeyInput.focus(); // Focus the key input field
            } else {
                addKeyInput.focus(); // Fallback focus if tab info not available
            }
        });
    }

    // --- Event listener for the toggle button ---
    toggleAddPaneButton.addEventListener('click', () => {
        if (isAddPaneVisible) {
            switchToDisplayPane();
        } else {
            switchToAddPane();
        }
    });

    // --- Event listener for Cancel button in add pane ---
    cancelAddButton.addEventListener('click', switchToDisplayPane);

    // --- Live Key Validation ---
    addKeyInput.addEventListener('input', () => {
        const key = addKeyInput.value.trim().toLowerCase();
        if (key.length === 1) {
            if (loadedShortcuts.hasOwnProperty(key)) {
                keyValidationMessage.textContent = 'In use';
                saveShortcutButton.disabled = true;
            } else {
                keyValidationMessage.textContent = '';
                saveShortcutButton.disabled = false;
            }
        } else if (key.length > 1) { // If user somehow enters more than 1 char despite maxlength
             keyValidationMessage.textContent = '1 char only';
             saveShortcutButton.disabled = true;
        } else {
            keyValidationMessage.textContent = '';
            saveShortcutButton.disabled = false; // Re-enable if field is cleared
        }
    });

    // --- Handle Add Shortcut Form submission ---
    addShortcutForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const url = addUrlInput.value.trim();
        const title = addTitleInput.value.trim();
        const newKey = addKeyInput.value.trim().toLowerCase();

        if (!url || !title || !newKey) {
            showPopupStatus('URL, Title, and Key are required.', 'error');
            return;
        }
        if (newKey.length !== 1) {
            showPopupStatus('Key must be a single character.', 'error');
            return;
        }
        try {
            new URL(url); // Basic URL validation
        } catch (_) {
            showPopupStatus('Invalid URL format.', 'error');
            return;
        }

        if (loadedShortcuts.hasOwnProperty(newKey)) {
            showPopupStatus(`Key '${newKey}' is already in use. Submit anyway to overwrite, or choose another.`, 'error');
            addKeyInput.focus();
            return;
        }

        loadedShortcuts[newKey] = { name: title, url: url };
        chrome.storage.sync.set({ urlShortcuts: loadedShortcuts }, () => {
            if (chrome.runtime.lastError) {
                showPopupStatus(`Error: ${chrome.runtime.lastError.message}`, 'error');
                delete loadedShortcuts[newKey]; // Revert optimistic update
            } else {
                showPopupStatus('Shortcut added!', 'success');
                displayShortcuts(loadedShortcuts); // Refresh display immediately
                switchToDisplayPane();
            }
        });
    });

    // --- Function to handle navigation (modified to be callable) ---
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
        return true;
      }
    }

    // --- Function to display shortcuts in the grid (Modified for columns and sorting) ---
    function displayShortcuts(shortcuts) {
        shortcutsGrid.innerHTML = ''; // Clear any existing items

        if (!shortcuts || Object.keys(shortcuts).length === 0) {
            const noShortcutsMessage = document.createElement('div');
            noShortcutsMessage.className = 'no-shortcuts';
            // Ensure it spans if the grid is flex (it won't directly span, but we can make it take full width)
            noShortcutsMessage.style.width = '100%';
            noShortcutsMessage.style.textAlign = 'center';
            noShortcutsMessage.textContent = 'No shortcuts configured. Please set them up in the options page.';
            shortcutsGrid.appendChild(noShortcutsMessage);
            return;
        }

        // Convert shortcuts object to an array of [key, value] pairs for sorting
        const shortcutsArray = Object.entries(shortcuts);

        // Custom sort: numbers first (numerically), then strings (by name/title alphabetically)
        shortcutsArray.sort(([keyA, valueA], [keyB, valueB]) => {
            const isNumA = /^\d+$/.test(keyA);
            const isNumB = /^\d+$/.test(keyB);

            if (isNumA && isNumB) {
                return parseInt(keyA, 10) - parseInt(keyB, 10); // Sort numbers numerically
            } else if (isNumA) {
                return -1; // Numbers come before strings
            } else if (isNumB) {
                return 1; // Strings come after numbers
            } else {
                // Sort by name (title) alphabetically, case-insensitive
                const nameA = (valueA.name || '').toLowerCase();
                const nameB = (valueB.name || '').toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            }
        });

        const ITEMS_PER_COLUMN = 8;
        let currentColumn = null;

        shortcutsArray.forEach(([key, shortcutData], index) => {
            if (index % ITEMS_PER_COLUMN === 0) {
                currentColumn = document.createElement('div');
                currentColumn.className = 'shortcut-column';
                shortcutsGrid.appendChild(currentColumn);
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = 'shortcut-item';
            itemDiv.dataset.shortcutKey = key;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'shortcut-name';
            nameSpan.textContent = shortcutData.name || 'Unnamed Shortcut';
            nameSpan.title = `${shortcutData.name || 'Unnamed'} (${shortcutData.url})`;

            const keySpan = document.createElement('span');
            keySpan.className = 'shortcut-key';
            keySpan.textContent = key;

            itemDiv.appendChild(nameSpan);
            itemDiv.appendChild(keySpan);
            currentColumn.appendChild(itemDiv);

            itemDiv.addEventListener('click', () => {
                navigateToShortcut(itemDiv.dataset.shortcutKey, false);
            });
        });
    }

    // --- Listen for key presses within the popup ---
    document.addEventListener('keydown', (event) => {
        if (isAddPaneVisible) {
            if (event.key === 'Backspace' && event.target !== addKeyInput && event.target !== addTitleInput && event.target !== addUrlInput) {
                switchToDisplayPane();
                event.preventDefault();
            }
            return;
        }

        if (event.key === '+') {
            switchToAddPane();
            return;
        }

        if (["Shift", "Control", "Alt", "Meta"].includes(event.key)) {
            return;
        }

        const pressedKey = event.key.toLowerCase();
        let openInNewTab = false;

        if (event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
            openInNewTab = true;
            navigateToShortcut(pressedKey, openInNewTab);
        } else if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
            openInNewTab = false;
            navigateToShortcut(pressedKey, openInNewTab);
        }
    });

    // --- Listen for storage changes ---
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.urlShortcuts) {
        loadedShortcuts = changes.urlShortcuts.newValue || {};
        displayShortcuts(loadedShortcuts);
        console.log("Shortcuts updated in popup due to storage change.");
      }
    });

    // --- Initial setup ---
    switchToDisplayPane(); // Start with the display pane
    loadAndDisplayShortcuts(); // Initial load of shortcuts

    function loadAndDisplayShortcuts() {
        chrome.storage.sync.get('urlShortcuts', (data) => {
            if (chrome.runtime.lastError) {
                console.error("Error loading shortcuts:", chrome.runtime.lastError.message);
                shortcutsGrid.innerHTML = '<div class="no-shortcuts">Error loading shortcuts.</div>';
                return;
            }
            loadedShortcuts = data.urlShortcuts || {};
            displayShortcuts(loadedShortcuts);
        });
    }
});
