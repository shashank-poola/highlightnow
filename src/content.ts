import "./style.css";
import { Highlighter } from "./highlighter";
import { Toolbar, createClearAllFloatingButton, createExitOverlay } from "./toolbar";

const highlighter = new Highlighter(document);

let currentRange: Range | null = null;
let isHighlightingEnabled = false; // Start disabled

// Clear-all floating button
const clearButton = createClearAllFloatingButton(document, () => {
  highlighter.clearAll();
  clearButton.classList.add("st-hidden");
});

// Exit overlay (shown when highlighting is active)
const exitOverlay = createExitOverlay(document, () => {
  // Exit highlighting mode
  isHighlightingEnabled = false;
  exitOverlay.classList.add("st-hidden");
  toolbar.hide();
  clearButton.classList.add("st-hidden");
});

// Setup toolbar
const toolbar = new Toolbar(document, {
  onColorSelected: (color) => {
    if (!currentRange) return;
    const success = highlighter.highlightRange(currentRange, color);
    if (success) {
      clearButton.classList.remove("st-hidden");
    }
    // Clear the selection so it doesn't stay blue
    window.getSelection()?.removeAllRanges();
    // Hide toolbar immediately
    toolbar.hide();
    currentRange = null;
  },
  onClearAll: () => {
    highlighter.clearAll();
    clearButton.classList.add("st-hidden");
  }
});

// Listen for messages from background script (extension icon clicks)
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "toggleHighlighting") {
    isHighlightingEnabled = !isHighlightingEnabled;
    if (isHighlightingEnabled) {
      exitOverlay.classList.remove("st-hidden");
    } else {
      exitOverlay.classList.add("st-hidden");
      toolbar.hide();
    }
  }
});

// Listen for mouseup to detect selection
document.addEventListener("mouseup", (event) => {
  // Don't show toolbar if highlighting is disabled
  if (!isHighlightingEnabled) {
    return;
  }

  // Ignore clicks on toolbar elements
  const target = event.target as HTMLElement;
  if (target.closest('.st-toolbar') || target.closest('.st-clear-all') || target.closest('.st-exit-overlay')) {
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    toolbar.hide();
    return;
  }

  const range = selection.getRangeAt(0);
  const text = selection.toString().trim();

  if (!text) {
    toolbar.hide();
    return;
  }

  // Clone the range to prevent it from becoming invalid when selection is cleared
  currentRange = range.cloneRange();

  const rect = range.getBoundingClientRect();
  const toolbarX = rect.left + window.scrollX + rect.width / 2;
  const toolbarY = rect.top + window.scrollY - 40; // slightly above

  toolbar.showAt(toolbarX, toolbarY);
});

// Handle clicks on the page - only for removing highlights
document.addEventListener("click", (event) => {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  // If clicking on a highlight, remove it
  if (target.classList.contains("st-highlight")) {
    event.preventDefault();
    highlighter.removeHighlightElement(target);
    if (!highlighter.getAllHighlightedText()) {
      clearButton.classList.add("st-hidden");
    }
  }
});
