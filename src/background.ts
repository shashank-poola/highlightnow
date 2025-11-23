chrome.runtime.onInstalled.addListener(() => {
  // V1: nothing special.
  // In future we can add onboarding, keyboard shortcuts, etc.
});

// Handle extension icon click to toggle highlighting mode
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    // Send message and suppress any errors if content script not ready
    chrome.tabs.sendMessage(tab.id, { action: "toggleHighlighting" }, (response) => {
      // Clear the error by checking chrome.runtime.lastError
      if (chrome.runtime.lastError) {
        // Silently ignore - happens when content script not loaded yet
        // User just needs to refresh the page once
      }
    });
  }
});
  