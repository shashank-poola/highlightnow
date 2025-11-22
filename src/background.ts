chrome.runtime.onInstalled.addListener(() => {
  // V1: nothing special.
  // In future we can add onboarding, keyboard shortcuts, etc.
});

// Handle extension icon click to toggle highlighting mode
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: "toggleHighlighting" });
  }
});
  