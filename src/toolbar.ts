import { HighlightColor } from "./highlighter";

export type ColorOption = {
  color: HighlightColor;
  label: string;
};

export type ToolbarCallbacks = {
  onColorSelected: (color: HighlightColor) => void;
  onClearAll: () => void;
  onExport?: () => void;
  onCopy?: () => void;
};

export class Toolbar {
  private readonly doc: Document;
  private readonly root: HTMLDivElement;
  private readonly clearButton: HTMLButtonElement;
  private isVisible = false;

  private readonly colors: ColorOption[] = [
    { color: "#fff7a5", label: "Yellow" },
    { color: "#c2ffd2", label: "Green" },
    { color: "#c9e4ff", label: "Blue" },
    { color: "#ffd3f8", label: "Pink" },
    { color: "#e0c9ff", label: "Purple" },
    { color: "#ffe0b5", label: "Orange" }
  ];

  constructor(doc: Document = document, callbacks: ToolbarCallbacks) {
    this.doc = doc;
    this.root = this.doc.createElement("div");
    this.root.className = "st-toolbar st-hidden";

    // Color pills
    this.colors.forEach((opt) => {
      const pill = this.doc.createElement("div");
      pill.className = "st-color-pill";
      pill.style.backgroundColor = opt.color;
      pill.title = opt.label;
      pill.addEventListener("mousedown", (e) => {
        e.preventDefault();
        callbacks.onColorSelected(opt.color);
      });
      this.root.appendChild(pill);
    });

    // Copy button
    if (callbacks.onCopy) {
      const copyButton = this.doc.createElement("button");
      copyButton.className = "st-toolbar-button st-toolbar-button-icon";
      copyButton.innerHTML = "📋";
      copyButton.title = "Copy all highlights";
      copyButton.addEventListener("mousedown", (e) => {
        e.preventDefault();
        callbacks.onCopy!();
      });
      this.root.appendChild(copyButton);
    }

    // Export button
    if (callbacks.onExport) {
      const exportButton = this.doc.createElement("button");
      exportButton.className = "st-toolbar-button st-toolbar-button-icon";
      exportButton.innerHTML = "💾";
      exportButton.title = "Export highlights";
      exportButton.addEventListener("mousedown", (e) => {
        e.preventDefault();
        callbacks.onExport!();
      });
      this.root.appendChild(exportButton);
    }

    // Clear button
    this.clearButton = this.doc.createElement("button");
    this.clearButton.className = "st-toolbar-button";
    this.clearButton.textContent = "Clear all";
    this.clearButton.addEventListener("mousedown", (e) => {
      e.preventDefault();
      callbacks.onClearAll();
      this.hide();
    });
    this.root.appendChild(this.clearButton);

    this.doc.body.appendChild(this.root);
  }

  showAt(x: number, y: number) {
    this.root.style.left = `${x}px`;
    this.root.style.top = `${y}px`;
    this.root.classList.remove("st-hidden");
    this.isVisible = true;
  }

  hide() {
    this.root.classList.add("st-hidden");
    this.isVisible = false;
  }

  isShown() {
    return this.isVisible;
  }
}

/**
 * A small bottom-right "Clear highlights" button.
 */
export function createClearAllFloatingButton(
  doc: Document,
  onClear: () => void
): HTMLButtonElement {
  const btn = doc.createElement("button");
  btn.className = "st-clear-all st-hidden";
  btn.textContent = "Clear highlights";
  btn.addEventListener("click", () => {
    onClear();
    btn.classList.add("st-hidden");
  });
  doc.body.appendChild(btn);
  return btn;
}

/**
 * Exit overlay shown when highlighting mode is active.
 */
export function createExitOverlay(
  doc: Document,
  onExit: () => void
): HTMLDivElement {
  const overlay = doc.createElement("div");
  overlay.className = "st-exit-overlay st-hidden";
  overlay.innerHTML = `
    <button class="st-exit-button">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
      </svg>
      Exit HighlightText
    </button>
  `;

  const exitButton = overlay.querySelector(".st-exit-button") as HTMLButtonElement;
  exitButton.addEventListener("click", () => {
    onExit();
  });

  doc.body.appendChild(overlay);
  return overlay;
}
