import { StoredHighlight, getXPath } from "./storage";

export type HighlightColor =
  | "#fff7a5" // yellow
  | "#c2ffd2" // mint green
  | "#c9e4ff" // soft blue
  | "#ffd3f8" // pink
  | "#e0c9ff" // purple
  | "#ffe0b5"; // peach

const HIGHLIGHT_CLASS = "st-highlight";
const HIGHLIGHT_DATA_ATTR = "data-highlight-id";

export class Highlighter {
  private document: Document;
  private highlightIdCounter = 0;

  constructor(doc: Document = document) {
    this.document = doc;
  }

  /**
   * Wrap the current selection range in a highlight span.
   * Returns StoredHighlight if successful, null otherwise.
   */
  highlightRange(range: Range, color: HighlightColor): StoredHighlight | null {
    if (range.collapsed) return null;

    const text = range.toString();
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;

    const wrapper = this.document.createElement("span");
    wrapper.className = HIGHLIGHT_CLASS;
    wrapper.style.backgroundColor = color;
    wrapper.setAttribute(HIGHLIGHT_DATA_ATTR, String(this.highlightIdCounter++));

    try {
      // First try the simple approach
      range.surroundContents(wrapper);
    } catch {
      // For complex selections (multiple nodes), extract contents and wrap them
      try {
        const contents = range.extractContents();
        wrapper.appendChild(contents);
        range.insertNode(wrapper);
      } catch (error) {
        // If even that fails, fall back to not highlighting
        console.error("Failed to highlight selection:", error);
        return null;
      }
    }

    // Create storage record
    return {
      text,
      color,
      xpath: getXPath(startContainer),
      offset: startOffset,
      length: text.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Restore a highlight from storage
   */
  restoreHighlight(stored: StoredHighlight): boolean {
    try {
      const { xpath, offset, length, color } = stored;

      // Find the text node
      const node = this.findNodeByXPath(xpath);
      if (!node || node.nodeType !== Node.TEXT_NODE) {
        return false;
      }

      const textNode = node as Text;
      if (offset + length > textNode.length) {
        return false;
      }

      // Create range and highlight
      const range = this.document.createRange();
      range.setStart(textNode, offset);
      range.setEnd(textNode, offset + length);

      const wrapper = this.document.createElement("span");
      wrapper.className = HIGHLIGHT_CLASS;
      wrapper.style.backgroundColor = color;
      wrapper.setAttribute(HIGHLIGHT_DATA_ATTR, String(this.highlightIdCounter++));

      range.surroundContents(wrapper);
      return true;
    } catch (error) {
      console.error("Failed to restore highlight:", error);
      return false;
    }
  }

  private findNodeByXPath(xpath: string): Node | null {
    try {
      const result = this.document.evaluate(
        xpath,
        this.document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue;
    } catch (error) {
      return null;
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

  /**
   * Get all highlights as StoredHighlight format for export.
   */
  getAllHighlights(): StoredHighlight[] {
    const highlights = Array.from(
      this.document.querySelectorAll<HTMLElement>("." + HIGHLIGHT_CLASS)
    );

    return highlights.map((el) => {
      const firstTextNode = this.getFirstTextNode(el);
      const color = el.style.backgroundColor as HighlightColor;

      return {
        text: el.textContent || "",
        color: this.rgbToHex(color) as HighlightColor,
        xpath: firstTextNode ? getXPath(firstTextNode) : "",
        offset: 0,
        length: (el.textContent || "").length,
        timestamp: Date.now(),
      };
    });
  }

  private getFirstTextNode(element: Node): Text | null {
    if (element.nodeType === Node.TEXT_NODE) {
      return element as Text;
    }

    for (const child of Array.from(element.childNodes)) {
      const textNode = this.getFirstTextNode(child);
      if (textNode) return textNode;
    }

    return null;
  }

  private rgbToHex(rgb: string): string {
    // If already hex, return it
    if (rgb.startsWith("#")) return rgb;

    // Convert rgb(r, g, b) to hex
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb;

    const r = parseInt(match[1]).toString(16).padStart(2, "0");
    const g = parseInt(match[2]).toString(16).padStart(2, "0");
    const b = parseInt(match[3]).toString(16).padStart(2, "0");

    return `#${r}${g}${b}`;
  }
}
