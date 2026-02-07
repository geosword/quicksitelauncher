// popup.js
import { saveOrUpdateShortcut } from './shared-utils.js'; // Import the shared function

/**
 * Extracts the domain (hostname) from a URL string.
 * @param {string} url - The URL to parse.
 * @returns {string|null} The hostname, or null if invalid.
 */
function getDomain(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const headerElement = document.querySelector('.header'); // Get the header element
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
    const openOptionsButton = document.getElementById('open-options-button');

    let loadedShortcuts = {}; // To store the shortcuts loaded from storage
    let isAddPaneVisible = false;
    let showHeader = true; // Default to showing header

    const COLUMN_WIDTH = 180; // px
    const COLUMN_GAP = 10; // px
    const PANE_PADDING_HORIZONTAL = 15 * 2; // px (15px on each side)
    const MAX_COLUMNS_FOR_WIDTH_ADJUST = 3;

    const FIXED_POPUP_WIDTH = (COLUMN_WIDTH * MAX_COLUMNS_FOR_WIDTH_ADJUST) + (COLUMN_GAP * (MAX_COLUMNS_FOR_WIDTH_ADJUST - 1)) + PANE_PADDING_HORIZONTAL;
    document.body.style.width = `${FIXED_POPUP_WIDTH}px`;

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

    // --- Function to set popup body width ---
    function setPopupWidth(numColumns) {
        let targetWidth;
        if (numColumns <= 0) numColumns = 1; // Should not happen with current logic, but safety

        if (numColumns === 1) {
            targetWidth = COLUMN_WIDTH + PANE_PADDING_HORIZONTAL;
        } else if (numColumns === 2) {
            targetWidth = (COLUMN_WIDTH * 2) + COLUMN_GAP + PANE_PADDING_HORIZONTAL;
        } else { // 3 or more columns
            targetWidth = (COLUMN_WIDTH * MAX_COLUMNS_FOR_WIDTH_ADJUST) + (COLUMN_GAP * (MAX_COLUMNS_FOR_WIDTH_ADJUST - 1)) + PANE_PADDING_HORIZONTAL;
        }
        document.body.style.width = `${targetWidth}px`;
    }

    // --- Function to switch between panes (modified) ---
    function switchToDisplayPane() {
        shortcutsDisplayPane.style.display = 'block';
        addShortcutPane.style.display = 'none';
        popupTitle.textContent = 'Quick Shortcuts';
        toggleAddPaneButton.textContent = '+';
        toggleAddPaneButton.title = 'Add new shortcut (+)';
        isAddPaneVisible = false;
        addShortcutForm.reset();
        keyValidationMessage.textContent = '';
        saveShortcutButton.disabled = false;
        popupStatusMessage.style.display = 'none';
        focusBody();
        // Width will be set by displayShortcuts after data is loaded/re-rendered
        // For an immediate switch back, we might need to re-calculate or store last column count
        // For now, let loadAndDisplayShortcuts handle it if called after this.
    }

    function switchToAddPane() {
        shortcutsDisplayPane.style.display = 'none';
        addShortcutPane.style.display = 'block';
        popupTitle.textContent = 'Add New Shortcut';
        toggleAddPaneButton.textContent = '‹';
        toggleAddPaneButton.title = 'Cancel add shortcut (Backspace)';
        isAddPaneVisible = true;
        keyValidationMessage.textContent = '';
        saveShortcutButton.disabled = false;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                const currentTab = tabs[0];
                if (currentTab.url && !currentTab.url.startsWith('chrome://') && !currentTab.url.startsWith('chrome-extension://')) {
                    addUrlInput.value = currentTab.url;
                }
                if (currentTab.title) {
                    addTitleInput.value = currentTab.title;
                }
                addKeyInput.focus();
            } else {
                addKeyInput.focus();
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

    // --- Event listener for Open Options button ---
    openOptionsButton.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

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

    // --- Handle Add Shortcut Form submission (Refactored) ---
    addShortcutForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const url = addUrlInput.value.trim();
        const title = addTitleInput.value.trim();
        const newKey = addKeyInput.value.trim(); // Will be lowercased by shared function

        // Basic client-side check for empty fields, though shared function also validates
        if (!url || !title || !newKey) {
            showPopupStatus('URL, Title, and Key are required.', 'error');
            return;
        }
        if (newKey.length !== 1) {
            showPopupStatus('Key must be a single character.', 'error');
            return;
        }

        saveShortcutButton.disabled = true; // Disable button during save operation

        try {
            // For popup, we are always adding, so originalKey is null.
            const result = await saveOrUpdateShortcut(newKey, title, url, null);
            showPopupStatus(result.message, 'success');
            loadedShortcuts = result.updatedShortcuts; // Update local copy
            refreshShortcutsDisplay();
            switchToDisplayPane();
        } catch (error) {
            showPopupStatus(error.message || 'Failed to save shortcut.', 'error');
            // Potentially re-enable key input validation if key conflict was the issue
            if (error.message && error.message.toLowerCase().includes("key") && error.message.toLowerCase().includes("in use")) {
                keyValidationMessage.textContent = 'In use';
                // Save button remains disabled from the live validation if key is still the same
            } else {
                 saveShortcutButton.disabled = false; // Re-enable on other errors
            }
        } finally {
            // Ensure button is re-enabled if it wasn't specifically disabled by key validation
            if (keyValidationMessage.textContent !== 'In use' && keyValidationMessage.textContent !== '1 char only') {
                 saveShortcutButton.disabled = false;
            }
        }
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

    // --- Refresh display: query tabs, build open domains set, then render ---
    function refreshShortcutsDisplay() {
        chrome.tabs.query({}, (tabs) => {
            const openTabDomains = new Set();
            for (const tab of tabs) {
                if (tab.url) {
                    const domain = getDomain(tab.url);
                    if (domain) openTabDomains.add(domain);
                }
            }
            displayShortcuts(loadedShortcuts, openTabDomains);
        });
    }

    // --- Function to display shortcuts in the grid (Modified for width adjustment) ---
    function displayShortcuts(shortcuts, openTabDomains = new Set()) {
        shortcutsGrid.innerHTML = '';
        let numRenderedColumns = 0;

        if (!shortcuts || Object.keys(shortcuts).length === 0) {
            const noShortcutsMessage = document.createElement('div');
            noShortcutsMessage.className = 'no-shortcuts';
            noShortcutsMessage.style.width = '100%';
            noShortcutsMessage.style.textAlign = 'center';
            noShortcutsMessage.textContent = 'No shortcuts configured. Please set them up in the options page.';
            shortcutsGrid.appendChild(noShortcutsMessage);
            return;
        }

        const shortcutsArray = Object.entries(shortcuts);
        shortcutsArray.sort(([keyA, valueA], [keyB, valueB]) => {
            const isNumA = /^\d+$/.test(keyA);
            const isNumB = /^\d+$/.test(keyB);

            if (isNumA && isNumB) {
                return parseInt(keyA, 10) - parseInt(keyB, 10); // Sort numbers numerically
            } else if (isNumA) {
                return -1; // Numbers come before non-numbers
            } else if (isNumB) {
                return 1;  // Non-numbers come after numbers
            } else {
                // Both are non-numbers, sort by key alphabetically, case-insensitive
                const lowerKeyA = keyA.toLowerCase();
                const lowerKeyB = keyB.toLowerCase();
                if (lowerKeyA < lowerKeyB) return -1;
                if (lowerKeyA > lowerKeyB) return 1;
                return 0;
            }
        });

        const ITEMS_PER_COLUMN = 8;
        let currentColumn = null;

        if (shortcutsArray.length > 0) {
            shortcutsArray.forEach(([key, shortcutData], index) => {
                if (index % ITEMS_PER_COLUMN === 0) {
                    currentColumn = document.createElement('div');
                    currentColumn.className = 'shortcut-column';
                    shortcutsGrid.appendChild(currentColumn);
                    numRenderedColumns++;
                }

                const itemDiv = document.createElement('div');
                itemDiv.className = 'shortcut-item';
                itemDiv.dataset.shortcutKey = key;

                const nameSpan = document.createElement('span');
                nameSpan.className = 'shortcut-name';
                nameSpan.textContent = shortcutData.name || 'Unnamed Shortcut';
                nameSpan.title = `${shortcutData.name || 'Unnamed'} (${shortcutData.url})`;

                const domain = getDomain(shortcutData.url);
                const isOpen = domain && openTabDomains.has(domain);

                const keySpan = document.createElement('span');
                keySpan.className = 'shortcut-key';
                keySpan.textContent = key;

                itemDiv.appendChild(nameSpan);
                itemDiv.appendChild(keySpan);
                if (isOpen) {
                    const indicator = document.createElement('span');
                    indicator.className = 'shortcut-open-indicator';
                    indicator.setAttribute('aria-label', 'Open in a tab');
                    indicator.textContent = '👍';
                    itemDiv.appendChild(indicator);
                }
                currentColumn.appendChild(itemDiv);

                itemDiv.addEventListener('click', () => {
                    navigateToShortcut(itemDiv.dataset.shortcutKey, false);
                });
            });
        } else {
             numRenderedColumns = 1; // if empty, conceptually 1 column width
        }
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
        if (namespace === 'sync') {
            if (changes.urlShortcuts) {
                loadedShortcuts = changes.urlShortcuts.newValue || {};
                refreshShortcutsDisplay();
                console.log("Shortcuts updated in popup due to storage change.");
            }
            if (changes.showPopupHeader) {
                showHeader = changes.showPopupHeader.newValue === undefined ? true : changes.showPopupHeader.newValue;
                applyHeaderVisibility();
                console.log("Popup header visibility updated.");
            }
            if (chrome.runtime.lastError && changes.urlShortcuts === undefined) { // Check specific to urlShortcuts loading
                console.error("Error loading shortcuts:", chrome.runtime.lastError.message);
                shortcutsGrid.innerHTML = '<div class="no-shortcuts">Error loading shortcuts.</div>';
                return;
            }
            loadedShortcuts = changes.urlShortcuts.newValue || {};
        }
    });

    // --- Function to apply header visibility ---
    function applyHeaderVisibility() {
        if (headerElement) {
            headerElement.style.display = showHeader ? 'flex' : 'none';
        }
    }

    // --- Function to load settings (including header visibility) ---
    function loadSettingsAndShortcuts() {
        chrome.storage.sync.get(['urlShortcuts', 'showPopupHeader'], (data) => {
            // Load header visibility setting
            showHeader = data.showPopupHeader === undefined ? true : data.showPopupHeader;
            applyHeaderVisibility();

            // Load shortcuts
            if (chrome.runtime.lastError && data.urlShortcuts === undefined) { // Check specific to urlShortcuts loading
                console.error("Error loading shortcuts:", chrome.runtime.lastError.message);
                shortcutsGrid.innerHTML = '<div class="no-shortcuts">Error loading shortcuts.</div>';
                return;
            }
            loadedShortcuts = data.urlShortcuts || {};
            refreshShortcutsDisplay();
        });
    }

    // --- Initial setup ---
    loadSettingsAndShortcuts(); // New function to load all settings and then shortcuts
    switchToDisplayPane();
});
