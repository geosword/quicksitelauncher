/**
 * Saves or updates a shortcut.
 * @param {string} newKey - The key for the shortcut (single character, lowercase).
 * @param {string} name - The name/title of the shortcut.
 * @param {string} url - The URL for the shortcut.
 * @param {string|null} originalKey - The original key if updating an existing shortcut (lowercase), otherwise null.
 * @returns {Promise<{success: boolean, message: string, updatedShortcuts?: object}>}
 */
export async function saveOrUpdateShortcut(newKey, name, url, originalKey = null) {
    newKey = newKey.toLowerCase();
    if (originalKey) {
        originalKey = originalKey.toLowerCase();
    }

    if (!url || !name || !newKey) {
        return Promise.reject({ success: false, message: 'URL, Title, and Key are required.' });
    }
    if (newKey.length !== 1) {
        return Promise.reject({ success: false, message: 'Key must be a single character.' });
    }
    if (!/^[a-z0-9]$/.test(newKey)) {
        return Promise.reject({ success: false, message: 'Key must be a letter (a-z) or a number (0-9).' });
    }
    try {
        new URL(url); // Basic URL validation
    } catch (_) {
        return Promise.reject({ success: false, message: 'Invalid URL format. Please include http:// or https://' });
    }

    try {
        const data = await chrome.storage.sync.get('urlShortcuts');
        let shortcuts = data.urlShortcuts || {};

        // Check for key conflict:
        // - If adding a new shortcut (originalKey is null) AND newKey already exists.
        // - If updating AND newKey is different from originalKey AND newKey already exists.
        if ((!originalKey && shortcuts.hasOwnProperty(newKey)) ||
            (originalKey && newKey !== originalKey && shortcuts.hasOwnProperty(newKey))) {
            return Promise.reject({ success: false, message: `Key '${newKey}' is already in use.` });
        }

        // If updating and the key has changed, remove the old entry
        if (originalKey && originalKey !== newKey && shortcuts.hasOwnProperty(originalKey)) {
            delete shortcuts[originalKey];
        }

        // Add/update the shortcut
        shortcuts[newKey] = { name: name, url: url };

        await chrome.storage.sync.set({ urlShortcuts: shortcuts });
        return Promise.resolve({ success: true, message: 'Shortcut saved successfully!', updatedShortcuts: shortcuts });

    } catch (error) {
        console.error("Error in saveOrUpdateShortcut:", error);
        return Promise.reject({ success: false, message: `Error saving shortcut: ${error.message || 'Unknown error'}` });
    }
}
