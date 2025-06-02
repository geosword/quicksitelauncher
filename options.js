// options.js
import { saveOrUpdateShortcut } from './shared-utils.js'; // Import the shared function

document.addEventListener('DOMContentLoaded', () => {
    const shortcutsTableBody = document.getElementById('shortcuts-table-body');
    const shortcutForm = document.getElementById('shortcut-form');
    const urlInput = document.getElementById('url');
    const titleInput = document.getElementById('title');
    const keyInput = document.getElementById('key');
    const saveButton = document.getElementById('save-button');
    const formTitle = document.getElementById('form-title');
    const cancelEditButton = document.getElementById('cancel-edit-button');
    const statusMessage = document.getElementById('status-message');
    const showPopupHeaderCheckbox = document.getElementById('show-popup-header');

    let editingKey = null; // This is our originalKey when in edit mode

    // --- Utility to show status messages ---
    function showStatus(message, type = 'success', duration = 3000) {
      statusMessage.textContent = message;
      statusMessage.className = type;
      statusMessage.style.display = 'block';
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, duration);
    }

    // --- Load shortcuts and populate the table ---
    function loadShortcuts() {
      chrome.storage.sync.get('urlShortcuts', (data) => {
        const shortcuts = data.urlShortcuts || {};
        shortcutsTableBody.innerHTML = '';

        if (Object.keys(shortcuts).length === 0) {
          const row = shortcutsTableBody.insertRow();
          const cell = row.insertCell();
          cell.colSpan = 4;
          cell.textContent = 'No shortcuts configured yet.';
          cell.style.textAlign = 'center';
          return;
        }
        const sortedKeys = Object.keys(shortcuts).sort((a, b) => {
            const isNumA = /^\d+$/.test(a);
            const isNumB = /^\d+$/.test(b);
            if (isNumA && isNumB) return parseInt(a, 10) - parseInt(b, 10);
            if (isNumA) return -1;
            if (isNumB) return 1;
            // Fallback to name sort if not numeric or mixed, or implement more complex sort as in popup if needed
            const nameA = (shortcuts[a].name || '').toLowerCase();
            const nameB = (shortcuts[b].name || '').toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        for (const key of sortedKeys) {
          const shortcut = shortcuts[key];
          const row = shortcutsTableBody.insertRow();
          row.insertCell().textContent = shortcut.name || 'N/A';
          row.insertCell().textContent = shortcut.url;
          row.insertCell().textContent = key;
          const actionsCell = row.insertCell();
          actionsCell.className = 'actions-cell';
          const editButton = document.createElement('button');
          editButton.textContent = 'Edit';
          editButton.className = 'btn-secondary';
          editButton.addEventListener('click', () => populateFormForEdit(key, shortcut));
          actionsCell.appendChild(editButton);
          const deleteButton = document.createElement('button');
          deleteButton.textContent = 'Delete';
          deleteButton.className = 'btn-danger';
          deleteButton.style.marginLeft = '5px';
          deleteButton.addEventListener('click', () => deleteShortcut(key));
          actionsCell.appendChild(deleteButton);
        }
      });
    }

    // --- Populate form for editing a shortcut ---
    function populateFormForEdit(key, shortcut) {
      editingKey = key; // This is the originalKey
      urlInput.value = shortcut.url;
      titleInput.value = shortcut.name || '';
      keyInput.value = key;
      formTitle.textContent = 'Edit Shortcut';
      saveButton.textContent = 'Update Shortcut';
      cancelEditButton.style.display = 'inline-block';
      urlInput.focus();
    }

    // --- Reset form to "Add New" mode ---
    function resetForm() {
      shortcutForm.reset();
      editingKey = null;
      formTitle.textContent = 'Add New Shortcut';
      saveButton.textContent = 'Add Shortcut';
      cancelEditButton.style.display = 'none';
    }

    // --- Handle form submission (Add or Update) (Refactored) ---
    shortcutForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const url = urlInput.value.trim();
      const title = titleInput.value.trim();
      const newKey = keyInput.value.trim(); // Will be lowercased by shared function

      saveButton.disabled = true;

      try {
        const result = await saveOrUpdateShortcut(newKey, title, url, editingKey);
        showStatus(result.message, 'success');
        resetForm();
        loadShortcuts(); // Reload to show changes
      } catch (error) {
        showStatus(error.message || 'Failed to save shortcut.', 'error');
      } finally {
        saveButton.disabled = false;
      }
    });

    // --- Handle cancel edit button ---
    cancelEditButton.addEventListener('click', () => {
      resetForm();
    });

    // --- Delete a shortcut (remains mostly the same, interacts directly with storage) ---
    function deleteShortcut(keyToDelete) {
      if (!confirm(`Are you sure you want to delete the shortcut for key '${keyToDelete}'?`)) {
        return;
      }
      chrome.storage.sync.get('urlShortcuts', (data) => {
        let shortcuts = data.urlShortcuts || {};
        if (shortcuts.hasOwnProperty(keyToDelete)) {
          delete shortcuts[keyToDelete];
          chrome.storage.sync.set({ urlShortcuts: shortcuts }, () => {
            if (chrome.runtime.lastError) {
              showStatus(`Error deleting shortcut: ${chrome.runtime.lastError.message}`, 'error');
            } else {
              showStatus('Shortcut deleted successfully!', 'success');
              if (editingKey === keyToDelete) {
                  resetForm();
              }
              loadShortcuts();
            }
          });
        }
      });
    }

    // --- Load Popup Settings ---
    function loadPopupSettings() {
        chrome.storage.sync.get('showPopupHeader', (data) => {
            showPopupHeaderCheckbox.checked = data.showPopupHeader === undefined ? true : data.showPopupHeader;
        });
    }

    // --- Save Popup Settings ---
    showPopupHeaderCheckbox.addEventListener('change', () => {
        chrome.storage.sync.set({ showPopupHeader: showPopupHeaderCheckbox.checked }, () => {
            if (chrome.runtime.lastError) {
                showStatus('Error saving popup setting.', 'error');
            } else {
                showStatus('Popup setting saved.', 'success');
            }
        });
    });

    // --- Initial load ---
    loadShortcuts();
    loadPopupSettings();
});
