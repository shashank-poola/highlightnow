import "./style.css";
import { Highlighter, HighlightColor } from "./highlighter";
import { Toolbar, createClearAllFloatingButton, createExitOverlay } from "./toolbar";
import { HighlightStorage, StoredHighlight } from "./storage";
import { HighlightExporter } from "./exporter";

const highlighter = new Highlighter(document);
const storage = new HighlightStorage();
const exporter = new HighlightExporter();

let currentRange: Range | null = null;
let isHighlightingEnabled = false; // Start disabled
let lastUsedColor: HighlightColor = "#fff7a5"; // Default to yellow

// Save all current highlights to storage
async function saveHighlights() {
  const highlights = highlighter.getAllHighlights();
  await storage.save(highlights);
}

// Clear-all floating button
const clearButton = createClearAllFloatingButton(document, async () => {
  highlighter.clearAll();
  await storage.clear();
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
  onColorSelected: async (color) => {
    if (!currentRange) return;
    const storedHighlight = highlighter.highlightRange(currentRange, color);
    if (storedHighlight) {
      lastUsedColor = color;
      clearButton.classList.remove("st-hidden");
      await saveHighlights();
    }
    // Clear the selection so it doesn't stay blue
    window.getSelection()?.removeAllRanges();
    // Hide toolbar immediately
    toolbar.hide();
    currentRange = null;
  },
  onClearAll: async () => {
    highlighter.clearAll();
    await storage.clear();
    clearButton.classList.add("st-hidden");
  },
  onCopy: async () => {
    const highlights = highlighter.getAllHighlights();
    const content = exporter.export(highlights, "markdown");
    const success = await exporter.copyToClipboard(content);
    if (success) {
      showNotification("Highlights copied to clipboard!");
    }
  },
  onExport: () => {
    const highlights = highlighter.getAllHighlights();
    showExportMenu(highlights);
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
document.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  // If clicking on a highlight, remove it
  if (target.classList.contains("st-highlight")) {
    event.preventDefault();
    highlighter.removeHighlightElement(target);
    await saveHighlights();
    if (!highlighter.getAllHighlightedText()) {
      clearButton.classList.add("st-hidden");
    }
  }
});

// Load highlights on page load
(async () => {
  const storedHighlights = await storage.load();
  let restoredCount = 0;

  for (const highlight of storedHighlights) {
    if (highlighter.restoreHighlight(highlight)) {
      restoredCount++;
    }
  }

  if (restoredCount > 0) {
    clearButton.classList.remove("st-hidden");
  }
})();

// Keyboard shortcuts
document.addEventListener("keydown", async (event) => {
  // Ctrl+Shift+H: Highlight with last used color
  if (event.ctrlKey && event.shiftKey && event.key === "H") {
    event.preventDefault();
    if (!isHighlightingEnabled) {
      isHighlightingEnabled = true;
      exitOverlay.classList.remove("st-hidden");
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const storedHighlight = highlighter.highlightRange(range, lastUsedColor);
      if (storedHighlight) {
        clearButton.classList.remove("st-hidden");
        await saveHighlights();
      }
      selection.removeAllRanges();
    }
  }

  // Ctrl+Shift+C: Copy all highlights
  if (event.ctrlKey && event.shiftKey && event.key === "C") {
    event.preventDefault();
    const highlights = highlighter.getAllHighlights();
    if (highlights.length > 0) {
      const content = exporter.export(highlights, "markdown");
      const success = await exporter.copyToClipboard(content);
      if (success) {
        showNotification("Highlights copied to clipboard!");
      }
    }
  }

  // Ctrl+Shift+X: Clear all highlights
  if (event.ctrlKey && event.shiftKey && event.key === "X") {
    event.preventDefault();
    highlighter.clearAll();
    await storage.clear();
    clearButton.classList.add("st-hidden");
  }

  // Ctrl+Shift+E: Export highlights
  if (event.ctrlKey && event.shiftKey && event.key === "E") {
    event.preventDefault();
    const highlights = highlighter.getAllHighlights();
    if (highlights.length > 0) {
      showExportMenu(highlights);
    }
  }

  // Number keys 1-6 for quick color selection (when text is selected)
  if (isHighlightingEnabled && event.key >= "1" && event.key <= "6") {
    const colors: HighlightColor[] = [
      "#fff7a5",
      "#c2ffd2",
      "#c9e4ff",
      "#ffd3f8",
      "#e0c9ff",
      "#ffe0b5",
    ];
    const colorIndex = parseInt(event.key) - 1;
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
      event.preventDefault();
      const range = selection.getRangeAt(0);
      const storedHighlight = highlighter.highlightRange(range, colors[colorIndex]);
      if (storedHighlight) {
        lastUsedColor = colors[colorIndex];
        clearButton.classList.remove("st-hidden");
        await saveHighlights();
      }
      selection.removeAllRanges();
      toolbar.hide();
    }
  }
});

// Show notification
function showNotification(message: string) {
  const notification = document.createElement("div");
  notification.className = "st-notification";
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("st-notification-show");
  }, 10);

  setTimeout(() => {
    notification.classList.remove("st-notification-show");
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Show export menu
function showExportMenu(highlights: StoredHighlight[]) {
  const menu = document.createElement("div");
  menu.className = "st-export-menu";
  menu.innerHTML = `
    <div class="st-export-menu-header">Export Highlights (${highlights.length})</div>
    <button class="st-export-menu-item" data-format="text">Plain Text</button>
    <button class="st-export-menu-item" data-format="markdown">Markdown</button>
    <button class="st-export-menu-item" data-format="json">JSON</button>
    <button class="st-export-menu-item st-export-menu-close">Cancel</button>
  `;

  document.body.appendChild(menu);

  menu.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("st-export-menu-close")) {
      menu.remove();
      return;
    }

    const format = target.dataset.format as "text" | "markdown" | "json" | undefined;
    if (format) {
      const content = exporter.export(highlights, format);
      exporter.downloadAsFile(content, format);
      showNotification(`Exported ${highlights.length} highlights as ${format}`);
      menu.remove();
    }
  });

  // Close on outside click
  setTimeout(() => {
    document.addEventListener(
      "click",
      (e) => {
        if (!menu.contains(e.target as Node)) {
          menu.remove();
        }
      },
      { once: true }
    );
  }, 100);
}
