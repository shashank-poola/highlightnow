import { HighlightColor } from "./highlighter";

export type StoredHighlight = {
  text: string;
  color: HighlightColor;
  xpath: string; // XPath to locate the text node
  offset: number; // Character offset in the node
  length: number; // Length of highlighted text
  timestamp: number;
};

export type PageHighlights = {
  url: string;
  highlights: StoredHighlight[];
};

const STORAGE_KEY_PREFIX = "st-highlights-";

export class HighlightStorage {
  /**
   * Get the storage key for current page URL
   */
  private getStorageKey(url: string = window.location.href): string {
    // Normalize URL (remove hash and trailing slash)
    const normalized = url.split("#")[0].replace(/\/$/, "");
    return `${STORAGE_KEY_PREFIX}${btoa(normalized).slice(0, 100)}`;
  }

  /**
   * Save highlights for current page
   */
  async save(highlights: StoredHighlight[]): Promise<void> {
    const key = this.getStorageKey();
    const data: PageHighlights = {
      url: window.location.href,
      highlights,
    };

    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save highlights:", error);
    }
  }

  /**
   * Load highlights for current page
   */
  async load(): Promise<StoredHighlight[]> {
    const key = this.getStorageKey();

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return [];

      const data: PageHighlights = JSON.parse(stored);
      return data.highlights || [];
    } catch (error) {
      console.error("Failed to load highlights:", error);
      return [];
    }
  }

  /**
   * Clear highlights for current page
   */
  async clear(): Promise<void> {
    const key = this.getStorageKey();
    localStorage.removeItem(key);
  }

  /**
   * Get all stored pages with highlights
   */
  async getAllPages(): Promise<PageHighlights[]> {
    const pages: PageHighlights[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            pages.push(JSON.parse(data));
          }
        } catch (error) {
          console.error("Failed to parse stored data:", error);
        }
      }
    }

    return pages;
  }
}

/**
 * Generate XPath for a node
 */
export function getXPath(node: Node): string {
  if (node.nodeType === Node.DOCUMENT_NODE) {
    return "/";
  }

  const parent = node.parentNode;
  if (!parent) {
    return "";
  }

  const parentPath = getXPath(parent);
  const siblings = Array.from(parent.childNodes);
  const index = siblings.indexOf(node as ChildNode) + 1;

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    return `${parentPath}/${element.tagName.toLowerCase()}[${index}]`;
  } else if (node.nodeType === Node.TEXT_NODE) {
    return `${parentPath}/text()[${index}]`;
  }

  return parentPath;
}

/**
 * Find a node by XPath
 */
export function findNodeByXPath(xpath: string, doc: Document = document): Node | null {
  try {
    const result = doc.evaluate(
      xpath,
      doc,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    return result.singleNodeValue;
  } catch (error) {
    console.error("Failed to evaluate XPath:", error);
    return null;
  }
}
