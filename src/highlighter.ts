export type HighlightColor =
  | "#fff7a5" // yellow
  | "#c2ffd2" // mint green
  | "#c9e4ff" // soft blue
  | "#ffd3f8" // pink
  | "#e0c9ff" // purple
  | "#ffe0b5"; // peach

const HIGHLIGHT_CLASS = "st-highlight";

export class Highlighter {
  private document: Document;

  constructor(doc: Document = document) {
    this.document = doc;
  }

  /**
   * Wrap the current selection range in a highlight span.
   * Returns true if successful.
   */
  highlightRange(range: Range, color: HighlightColor): boolean {
    if (range.collapsed) return false;

    const wrapper = this.document.createElement("span");
    wrapper.className = HIGHLIGHT_CLASS;
    wrapper.style.backgroundColor = color;

    try {
      range.surroundContents(wrapper);
      return true;
    } catch {
      // For complex selections (multiple nodes), we fallback by not highlighting.
      // V1 keeps it simple; V2 can implement a more robust approach.
      return false;
    }
  }

  /**
   * Remove a single highlight span, restoring its text.
   */
  removeHighlightElement(el: HTMLElement): void {
    if (!el.classList.contains(HIGHLIGHT_CLASS)) return;

    const parent = el.parentNode;
    if (!parent) return;

    const textNode = this.document.createTextNode(el.textContent ?? "");
    parent.replaceChild(textNode, el);
    parent.normalize();
  }

  /**
   * Clear all highlights on page.
   */
  clearAll(): void {
    const highlights = Array.from(
      this.document.querySelectorAll<HTMLElement>("." + HIGHLIGHT_CLASS)
    );
    highlights.forEach((el) => this.removeHighlightElement(el));
  }

  /**
   * Get innerText of all highlights concatenated with newlines.
   */
  getAllHighlightedText(): string {
    const highlights = Array.from(
      this.document.querySelectorAll<HTMLElement>("." + HIGHLIGHT_CLASS)
    );
    return highlights.map((el) => (el.textContent || "").trim()).join("\n\n");
  }
}
