# Privacy Policy for Quick URL Navigator Chrome Extension
## Last Updated: May 2025
Thank you for using Quick Nav (the "Extension"). This Privacy Policy describes how your information is handled by the Extension. By installing and using the Extension, you agree to the terms of this Privacy Policy.

1. Information We Collect and How We Use It
The Quick Nav extension is designed to enhance your browsing productivity by allowing you to create and use keyboard shortcuts for your favorite websites.
User-Defined Shortcuts:
What we collect: The Extension allows you to define shortcuts, which include a trigger key (e.g., "g"), a descriptive name (e.g., "Google"), and a URL (e.g., "https://www.google.com").
How we use it: This information is stored locally on your computer using Chrome's storage (chrome.storage.sync). If you are signed into Chrome and have sync enabled, this data may be synced across your devices via Google's infrastructure. This data is used solely to provide the core functionality of the Extension – allowing you to quickly navigate to your saved URLs using the defined keys or by clicking them in the extension popup.
We do not collect or store these URLs or shortcut names on any external servers controlled by us.
No Personal Identification Information (PII)

## Collection:
The Extension does not collect, store, or transmit any personally identifiable information (PII) such as your name (unless you voluntarily use it as a shortcut name), email address, physical address, IP address, or browsing history beyond the URLs you explicitly save as shortcuts.

## Usage Data (Anonymous and Aggregated):
The Extension itself does not collect anonymous usage statistics or analytics. Chrome Web Store may collect aggregated and anonymized installation and usage statistics, which are subject to Google's Privacy Policy.

2. How Information is Stored
Your shortcut data (key, name, URL) is stored using chrome.storage.sync.
This means the data is stored locally on your device.
If you have Chrome Sync enabled, Google may sync this data across your signed-in devices. The handling of this synced data is governed by Google's Privacy Policy.
We, the developers of Quick Nav, do not have access to your chrome.storage.sync data stored on Google's servers.
3. Data Sharing and Disclosure
We do not sell, trade, rent, or otherwise share your shortcut data or any personal information with third parties.
The Extension interacts with your browser to perform its functions:
When you activate a shortcut (by key press or click), the Extension instructs your browser to navigate to the saved URL either in the current tab or a new tab. This interaction is standard browser behavior.
4. User Control and Data Deletion
You have full control over the shortcuts you create.
You can add, modify, or delete your shortcuts at any time through the Extension's options page.
Deleting a shortcut removes it from chrome.storage.sync.
Uninstalling the Extension will typically remove all associated data stored by it, though this behavior can be influenced by Chrome's settings and sync status.
5. Security
We rely on the security mechanisms provided by Google Chrome and its storage APIs (chrome.storage.sync) to protect your shortcut data stored locally and when synced.
However, please be aware that no method of electronic storage or transmission over the internet is 100% secure.
6. Permissions Requested
The Extension requests the following permissions:
storage: To store and retrieve your shortcut configurations.
tabs: (If chrome.tabs.create is used for "open in new tab") To open your bookmarked URLs in new browser tabs as per your command (e.g., Ctrl + key).
activeTab: (If your background script uses it for current tab navigation) To navigate the currently active tab to a bookmarked URL when a shortcut is activated for the current tab.
These permissions are used solely for the intended functionality of the Extension.
7. Changes to This Privacy Policy
We may update this Privacy Policy from time to time. We will notify you of any significant changes by updating the "Last Updated" date at the top of this policy and potentially through a notice within the Extension or on its Chrome Web Store page. We encourage you to review this Privacy Policy periodically.
8. Contact Us
If you have any questions or concerns about this Privacy Policy or the Extension's practices, please contact us at:
https://github.com/geosword/quicksitelauncher/issues
