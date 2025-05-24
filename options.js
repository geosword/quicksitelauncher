// options.js
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

    let editingKey = null; // To store the key of the shortcut being edited

    // --- Utility to show status messages ---
    function showStatus(message, type = 'success', duration = 3000) {
      statusMessage.textContent = message;
      statusMessage.className = type; // 'success' or 'error'
      statusMessage.style.display = 'block';
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, duration);
    }

    // --- Load shortcuts and populate the table ---
    function loadShortcuts() {
      chrome.storage.sync.get('urlShortcuts', (data) => {
        const shortcuts = data.urlShortcuts || {};
        shortcutsTableBody.innerHTML = ''; // Clear existing rows

        if (Object.keys(shortcuts).length === 0) {
          const row = shortcutsTableBody.insertRow();
          const cell = row.insertCell();
          cell.colSpan = 4;
          cell.textContent = 'No shortcuts configured yet.';
          cell.style.textAlign = 'center';
          return;
        }

        // Sort keys for consistent display, or use Object.entries if order from storage is preferred
        const sortedKeys = Object.keys(shortcuts).sort();

        for (const key of sortedKeys) {
          const shortcut = shortcuts[key];
          const row = shortcutsTableBody.insertRow();

          row.insertCell().textContent = shortcut.name || 'N/A'; // Display name
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
      editingKey = key;
      urlInput.value = shortcut.url;
      titleInput.value = shortcut.name || '';
      keyInput.value = key;

      formTitle.textContent = 'Edit Shortcut';
      saveButton.textContent = 'Update Shortcut';
      cancelEditButton.style.display = 'inline-block';
      keyInput.focus(); // Or urlInput.focus()
    }

    // --- Reset form to "Add New" mode ---
    function resetForm() {
      shortcutForm.reset();
      editingKey = null;
      formTitle.textContent = 'Add New Shortcut';
      saveButton.textContent = 'Add Shortcut';
      cancelEditButton.style.display = 'none';
    }

    // --- Handle form submission (Add or Update) ---
    shortcutForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const url = urlInput.value.trim();
      const title = titleInput.value.trim();
      const newKey = keyInput.value.trim().toLowerCase();

      if (!url || !title || !newKey) {
        showStatus('All fields (URL, Title, Key) are required.', 'error');
        return;
      }
      if (newKey.length !== 1) {
        showStatus('Key must be a single character.', 'error');
        return;
      }
      // Basic URL validation (can be more robust)
      try {
        new URL(url);
      } catch (_) {
        showStatus('Please enter a valid URL (e.g., https://example.com).', 'error');
        return;
      }


      chrome.storage.sync.get('urlShortcuts', (data) => {
        let shortcuts = data.urlShortcuts || {};

        // Check if the new key (if different from editingKey) is already in use by another shortcut
        if (newKey !== editingKey && shortcuts.hasOwnProperty(newKey)) {
          showStatus(`Key '${newKey}' is already in use. Please choose a different key.`, 'error');
          return;
        }

        // If editing and the key has changed, remove the old entry
        if (editingKey && editingKey !== newKey) {
          delete shortcuts[editingKey];
        }
        // If just editing (key hasn't changed), the old entry will be overwritten
        // If adding a new shortcut, editingKey is null

        shortcuts[newKey] = { name: title, url: url };

        chrome.storage.sync.set({ urlShortcuts: shortcuts }, () => {
          if (chrome.runtime.lastError) {
            showStatus(`Error saving shortcut: ${chrome.runtime.lastError.message}`, 'error');
          } else {
            showStatus(editingKey ? 'Shortcut updated successfully!' : 'Shortcut added successfully!', 'success');
            resetForm();
            loadShortcuts();
          }
        });
      });
    });

    // --- Handle cancel edit button ---
    cancelEditButton.addEventListener('click', () => {
      resetForm();
    });

    // --- Delete a shortcut ---
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
              // If the deleted shortcut was being edited, reset the form
              if (editingKey === keyToDelete) {
                  resetForm();
              }
              loadShortcuts();
            }
          });
        }
      });
    }

    // --- Initial load ---
    loadShortcuts();
  });
