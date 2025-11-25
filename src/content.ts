import "./style.css";
import { Highlighter, HighlightColor } from "./highlighter";
import { Toolbar, createClearAllFloatingButton, createExitOverlay } from "./toolbar";
import { HighlightStorage, StoredHighlight } from "./storage";
import { HighlightExporter } from "./exporter";

const highlighter = new Highlighter(document);
const storage = new HighlightStorage();
const exporter = new HighlightExporter();

let currentRange: Range | null = null;
let isHighlightingEnabled = false;
let lastUsedColor: HighlightColor = "#fff7a5";

async function saveHighlights() {
  await storage.save(highlighter.getAllHighlights());
}

function updateClearButtonVisibility() {
  if (highlighter.getAllHighlightedText()) {
    clearButton.classList.remove("st-hidden");
  } else {
    clearButton.classList.add("st-hidden");
  }
}

async function copyTextToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    showNotification("Copied!");
  } catch {
    showNotification("Copy failed");
  }
}

const clearButton = createClearAllFloatingButton(document, async () => {
  highlighter.clearAll();
  await storage.clear();
  clearButton.classList.add("st-hidden");
});

const exitOverlay = createExitOverlay(document, () => {
  isHighlightingEnabled = false;
  exitOverlay.classList.add("st-hidden");
  toolbar.hide();
  clearButton.classList.add("st-hidden");
});

const toolbar = new Toolbar(document, {
  onColorSelected: async (color) => {
    if (!currentRange) return;
    const highlight = highlighter.highlightRange(currentRange, color);
    if (highlight) {
      lastUsedColor = color;
      await saveHighlights();
      updateClearButtonVisibility();
      attachHighlightActions();
    }
    window.getSelection()?.removeAllRanges();
    toolbar.hide();
    currentRange = null;
  },
  onClearAll: async () => {
    highlighter.clearAll();
    await storage.clear();
    clearButton.classList.add("st-hidden");
  },
  onCopy: async () => {
    const content = exporter.export(highlighter.getAllHighlights(), "markdown");
    if (await exporter.copyToClipboard(content)) {
      showNotification("Copied to clipboard!");
    }
  },
  onExport: () => showExportMenu(highlighter.getAllHighlights())
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "toggleHighlighting") {
    isHighlightingEnabled = !isHighlightingEnabled;
    exitOverlay.classList.toggle("st-hidden", !isHighlightingEnabled);
    if (!isHighlightingEnabled) toolbar.hide();
  }
});

document.addEventListener("mouseup", (event) => {
  if (!isHighlightingEnabled) return;

  const target = event.target as HTMLElement;
  if (target.closest('.st-toolbar, .st-clear-all, .st-exit-overlay')) return;

  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.toString().trim()) {
    toolbar.hide();
    return;
  }

  const range = selection.getRangeAt(0);
  currentRange = range.cloneRange();

  const rect = range.getBoundingClientRect();
  toolbar.showAt(
    rect.left + window.scrollX + rect.width / 2,
    rect.top + window.scrollY - 40
  );
});

function attachHighlightActions() {
  document.querySelectorAll(".st-highlight").forEach((highlight) => {
    if (highlight.querySelector(".st-highlight-actions")) return;

    const highlightEl = highlight as HTMLElement;
    let actionsEl: HTMLDivElement | null = null;

    highlightEl.addEventListener("mouseenter", () => {
      actionsEl = document.createElement("div");
      actionsEl.className = "st-highlight-actions";

      const copyBtn = document.createElement("button");
      copyBtn.className = "st-highlight-action-btn copy";
      copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
      copyBtn.title = "Copy this text";
      copyBtn.onclick = (e) => {
        e.stopPropagation();
        copyTextToClipboard(highlightEl.textContent || "");
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "st-highlight-action-btn delete";
      deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`;
      deleteBtn.title = "Delete this highlight";
      deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        highlighter.removeHighlightElement(highlightEl);
        await saveHighlights();
        updateClearButtonVisibility();
      };

      actionsEl.appendChild(copyBtn);
      actionsEl.appendChild(deleteBtn);
      highlightEl.appendChild(actionsEl);
    });

    highlightEl.addEventListener("mouseleave", () => {
      actionsEl?.remove();
      actionsEl = null;
    });
  });
}

(async () => {
  const highlights = await storage.load();
  const restored = highlights.filter(h => highlighter.restoreHighlight(h));

  if (restored.length > 0) {
    updateClearButtonVisibility();
    attachHighlightActions();
  }
})();

const COLORS: HighlightColor[] = ["#fff7a5", "#c2ffd2", "#c9e4ff", "#ffd3f8", "#e0c9ff", "#ffe0b5"];

async function highlightSelection(color: HighlightColor) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.toString().trim()) return;

  const highlight = highlighter.highlightRange(selection.getRangeAt(0), color);
  if (highlight) {
    lastUsedColor = color;
    await saveHighlights();
    updateClearButtonVisibility();
    attachHighlightActions();
  }
  selection.removeAllRanges();
  toolbar.hide();
}

document.addEventListener("keydown", async (event) => {
  const { ctrlKey, shiftKey, key } = event;

  if (ctrlKey && shiftKey && key === "H") {
    event.preventDefault();
    if (!isHighlightingEnabled) {
      isHighlightingEnabled = true;
      exitOverlay.classList.remove("st-hidden");
    }
    await highlightSelection(lastUsedColor);
  }

  if (ctrlKey && shiftKey && key === "C") {
    event.preventDefault();
    const content = exporter.export(highlighter.getAllHighlights(), "markdown");
    if (await exporter.copyToClipboard(content)) {
      showNotification("Copied to clipboard!");
    }
  }

  if (ctrlKey && shiftKey && key === "X") {
    event.preventDefault();
    highlighter.clearAll();
    await storage.clear();
    clearButton.classList.add("st-hidden");
  }

  if (ctrlKey && shiftKey && key === "E") {
    event.preventDefault();
    const highlights = highlighter.getAllHighlights();
    if (highlights.length > 0) showExportMenu(highlights);
  }

  if (isHighlightingEnabled && key >= "1" && key <= "6") {
    const colorIndex = parseInt(key) - 1;
    if (window.getSelection()?.toString().trim()) {
      event.preventDefault();
      await highlightSelection(COLORS[colorIndex]);
    }
  }
});

function showNotification(message: string) {
  const notification = document.createElement("div");
  notification.className = "st-notification";
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add("st-notification-show"), 10);
  setTimeout(() => {
    notification.classList.remove("st-notification-show");
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

function showExportMenu(highlights: StoredHighlight[]) {
  const backdrop = document.createElement("div");
  backdrop.className = "st-export-backdrop";

  const menu = document.createElement("div");
  menu.className = "st-export-menu";
  menu.innerHTML = `
    <div class="st-export-menu-header">Export Highlights (${highlights.length})</div>
    <button class="st-export-menu-item" data-format="text">Plain Text</button>
    <button class="st-export-menu-item" data-format="markdown">Markdown</button>
    <button class="st-export-menu-item" data-format="json">JSON</button>
    <button class="st-export-menu-item st-export-menu-close">Cancel</button>
  `;

  const closeMenu = () => {
    menu.remove();
    backdrop.remove();
  };

  menu.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("st-export-menu-close")) return closeMenu();

    const format = target.dataset.format as "text" | "markdown" | "json" | undefined;
    if (format) {
      exporter.downloadAsFile(exporter.export(highlights, format), format);
      showNotification(`Exported ${highlights.length} highlights`);
      closeMenu();
    }
  });

  backdrop.addEventListener("click", closeMenu);
  document.body.append(backdrop, menu);
}
