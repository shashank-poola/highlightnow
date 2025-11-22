import { HighlightColor } from "./highlighter";

export type ColorOption = {
  color: HighlightColor;
  label: string;
};

export type ToolbarCallbacks = {
  onColorSelected: (color: HighlightColor) => void;
  onClearAll: () => void;
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
