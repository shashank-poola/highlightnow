import { describe, it, expect, beforeEach } from "vitest";
import { Highlighter, HighlightColor } from "../highlighter";
import { JSDOM } from "jsdom";

let dom: JSDOM;
let doc: Document;

beforeEach(() => {
  dom = new JSDOM(
    `<html><body><p id="p">The art of writing is the art of discovering what you believe.</p></body></html>`
  );
  doc = dom.window.document;
});

describe("Highlighter", () => {
  describe("Basic highlighting", () => {
    it("highlights a simple range", () => {
      const p = doc.getElementById("p")!;
      const textNode = p.firstChild as Text;

      // Create a range around "art of writing"
      const startIndex = textNode.data.indexOf("art of writing");
      const endIndex = startIndex + "art of writing".length;

      const range = doc.createRange();
      range.setStart(textNode, startIndex);
      range.setEnd(textNode, endIndex);

      const highlighter = new Highlighter(doc);
      const result = highlighter.highlightRange(range, "#fff7a5");

      expect(result).not.toBeNull();
      expect(result?.text).toBe("art of writing");
      expect(result?.color).toBe("#fff7a5");

      const highlights = doc.querySelectorAll(".st-highlight");
      expect(highlights.length).toBe(1);
      expect(highlights[0].textContent).toBe("art of writing");
    });

    it("applies correct background color", () => {
      const p = doc.getElementById("p")!;
      const textNode = p.firstChild as Text;

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 3);

      const highlighter = new Highlighter(doc);
      highlighter.highlightRange(range, "#c2ffd2");

      const highlight = doc.querySelector(".st-highlight") as HTMLElement;
      // JSDOM returns colors in RGB format
      expect(highlight.style.backgroundColor).toMatch(/(#c2ffd2|rgb\(194, 255, 210\))/);
    });

    it("highlights with different colors", () => {
      const p = doc.getElementById("p")!;
      const highlighter = new Highlighter(doc);

      const colors: HighlightColor[] = [
        "#fff7a5",
        "#c2ffd2",
        "#c9e4ff",
      ];

      // Create highlights one at a time, accounting for DOM changes
      colors.forEach((color, idx) => {
        const allTextNodes = Array.from(p.childNodes).filter(
          (node) => node.nodeType === Node.TEXT_NODE
        ) as Text[];

        if (allTextNodes.length > 0) {
          const lastTextNode = allTextNodes[allTextNodes.length - 1];
          if (lastTextNode.length >= idx + 3) {
            const range = doc.createRange();
            range.setStart(lastTextNode, idx);
            range.setEnd(lastTextNode, Math.min(idx + 2, lastTextNode.length));
            highlighter.highlightRange(range, color);
          }
        }
      });

      const highlights = doc.querySelectorAll(".st-highlight") as NodeListOf<HTMLElement>;
      expect(highlights.length).toBeGreaterThan(0);

      // Just verify colors are set (JSDOM may return RGB format)
      highlights.forEach((highlight) => {
        expect(highlight.style.backgroundColor).toBeTruthy();
      });
    });

    it("returns null for collapsed range", () => {
      const p = doc.getElementById("p")!;
      const textNode = p.firstChild as Text;

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 0); // Collapsed range

      const highlighter = new Highlighter(doc);
      const result = highlighter.highlightRange(range, "#fff7a5");

      expect(result).toBeNull();
      expect(doc.querySelectorAll(".st-highlight").length).toBe(0);
    });

    it("handles empty selection gracefully", () => {
      const p = doc.getElementById("p")!;
      const textNode = p.firstChild as Text;

      const range = doc.createRange();
      range.setStart(textNode, 5);
      range.setEnd(textNode, 5);

      const highlighter = new Highlighter(doc);
      const result = highlighter.highlightRange(range, "#fff7a5");

      expect(result).toBeNull();
    });
  });

  describe("Multiple highlights", () => {
    it("supports multiple highlights in same paragraph", () => {
      const p = doc.getElementById("p")!;
      const highlighter = new Highlighter(doc);

      const textNode1 = p.firstChild as Text;
      const range1 = doc.createRange();
      range1.setStart(textNode1, 0);
      range1.setEnd(textNode1, 3);
      highlighter.highlightRange(range1, "#fff7a5");

      const allTextNodes = Array.from(p.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE
      );
      const artNode = allTextNodes.find((node) =>
        node.textContent?.includes("art")
      ) as Text;

      if (artNode) {
        const range2 = doc.createRange();
        const offset = artNode.data.indexOf("art");
        range2.setStart(artNode, offset);
        range2.setEnd(artNode, offset + 3);
        highlighter.highlightRange(range2, "#c9e4ff");
      }

      expect(doc.querySelectorAll(".st-highlight").length).toBe(2);
    });

    it("returns concatenated highlighted text", () => {
      const p = doc.getElementById("p")!;
      const highlighter = new Highlighter(doc);

      const textNode1 = p.firstChild as Text;
      const range1 = doc.createRange();
      range1.setStart(textNode1, 0);
      range1.setEnd(textNode1, 3);
      highlighter.highlightRange(range1, "#fff7a5");

      const allTextNodes = Array.from(p.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE
      );
      const writingNode = allTextNodes.find((node) =>
        node.textContent?.includes("writing")
      ) as Text;

      if (writingNode) {
        const range2 = doc.createRange();
        const offset = writingNode.data.indexOf("writing");
        range2.setStart(writingNode, offset);
        range2.setEnd(writingNode, offset + 7);
        highlighter.highlightRange(range2, "#c9e4ff");
      }

      const text = highlighter.getAllHighlightedText();
      expect(text).toContain("The");
      expect(text).toContain("writing");
    });
  });

  describe("Clear functionality", () => {
    it("clears all highlights", () => {
      const p = doc.getElementById("p")!;
      const textNode = p.firstChild as Text;

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 3);

      const highlighter = new Highlighter(doc);
      highlighter.highlightRange(range, "#fff7a5");
      expect(doc.querySelectorAll(".st-highlight").length).toBe(1);

      highlighter.clearAll();
      expect(doc.querySelectorAll(".st-highlight").length).toBe(0);
      expect(p.textContent).toContain("The art of writing");
    });

    it("restores original text after clearing", () => {
      const p = doc.getElementById("p")!;
      const originalText = p.textContent;
      const textNode = p.firstChild as Text;

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 10);

      const highlighter = new Highlighter(doc);
      highlighter.highlightRange(range, "#fff7a5");
      highlighter.clearAll();

      expect(p.textContent).toBe(originalText);
    });

    it("clears multiple highlights", () => {
      const p = doc.getElementById("p")!;
      const textNode = p.firstChild as Text;
      const highlighter = new Highlighter(doc);

      const range1 = doc.createRange();
      range1.setStart(textNode, 0);
      range1.setEnd(textNode, 3);
      highlighter.highlightRange(range1, "#fff7a5");

      const allTextNodes = Array.from(p.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE
      );
      const secondNode = allTextNodes[1] as Text;

      if (secondNode) {
        const range2 = doc.createRange();
        range2.setStart(secondNode, 0);
        range2.setEnd(secondNode, 3);
        highlighter.highlightRange(range2, "#c9e4ff");
      }

      highlighter.clearAll();
      expect(doc.querySelectorAll(".st-highlight").length).toBe(0);
    });
  });

  describe("Remove single highlight", () => {
    it("removes a single highlight element", () => {
      const p = doc.getElementById("p")!;
      const textNode = p.firstChild as Text;

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 3);

      const highlighter = new Highlighter(doc);
      highlighter.highlightRange(range, "#fff7a5");

      const highlight = doc.querySelector(".st-highlight") as HTMLElement;
      highlighter.removeHighlightElement(highlight);

      expect(doc.querySelectorAll(".st-highlight").length).toBe(0);
    });
  });

  describe("Get all highlights", () => {
    it("returns all highlights in storage format", () => {
      const p = doc.getElementById("p")!;
      const textNode = p.firstChild as Text;
      const highlighter = new Highlighter(doc);

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 3);
      highlighter.highlightRange(range, "#fff7a5");

      const highlights = highlighter.getAllHighlights();
      expect(highlights.length).toBe(1);
      expect(highlights[0].text).toBe("The");
      expect(highlights[0].color).toBe("#fff7a5");
      expect(highlights[0].xpath).toBeTruthy();
      expect(highlights[0].timestamp).toBeTruthy();
    });

    it("returns empty array when no highlights", () => {
      const highlighter = new Highlighter(doc);
      const highlights = highlighter.getAllHighlights();
      expect(highlights).toEqual([]);
    });
  });

  describe("Restore highlights", () => {
    it("restores a highlight from storage", () => {
      const p = doc.getElementById("p")!;
      const textNode = p.firstChild as Text;
      const highlighter = new Highlighter(doc);

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 3);
      const stored = highlighter.highlightRange(range, "#fff7a5");

      expect(stored).not.toBeNull();

      // Store the XPath before clearing
      const storedCopy = { ...stored! };

      highlighter.clearAll();
      expect(doc.querySelectorAll(".st-highlight").length).toBe(0);

      // Get fresh text node after clearing
      const newTextNode = p.firstChild as Text;
      storedCopy.xpath = "/html/body/p[1]/text()[1]";

      const restored = highlighter.restoreHighlight(storedCopy);
      expect(restored).toBe(true);
      expect(doc.querySelectorAll(".st-highlight").length).toBe(1);
    });

    it("returns false for invalid XPath", () => {
      const highlighter = new Highlighter(doc);
      const invalidStored = {
        text: "test",
        color: "#fff7a5" as HighlightColor,
        xpath: "/invalid/xpath[999]",
        offset: 0,
        length: 4,
        timestamp: Date.now(),
      };

      const result = highlighter.restoreHighlight(invalidStored);
      expect(result).toBe(false);
    });

    it("returns false for offset out of bounds", () => {
      const p = doc.getElementById("p")!;
      const textNode = p.firstChild as Text;
      const highlighter = new Highlighter(doc);

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 3);
      const stored = highlighter.highlightRange(range, "#fff7a5");

      if (stored) {
        stored.offset = 10000;
        stored.length = 10000;

        const result = highlighter.restoreHighlight(stored);
        expect(result).toBe(false);
      }
    });
  });

  describe("RGB to Hex conversion", () => {
    it("converts RGB colors to hex format in getAllHighlights", () => {
      const p = doc.getElementById("p")!;
      const textNode = p.firstChild as Text;
      const highlighter = new Highlighter(doc);

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 3);

      const highlight = highlighter.highlightRange(range, "#fff7a5");

      const highlightElement = doc.querySelector(".st-highlight") as HTMLElement;
      highlightElement.style.backgroundColor = "rgb(255, 247, 165)";

      const highlights = highlighter.getAllHighlights();
      expect(highlights[0].color).toBe("#fff7a5");
    });
  });

  describe("Complex selections", () => {
    it("handles multi-element selections", () => {
      dom = new JSDOM(
        `<html><body><div><p>First paragraph</p><p>Second paragraph</p></div></body></html>`
      );
      doc = dom.window.document;

      const firstP = doc.querySelector("p:first-child")!;
      const secondP = doc.querySelector("p:last-child")!;
      const highlighter = new Highlighter(doc);

      const range = doc.createRange();
      range.setStart(firstP.firstChild!, 0);
      range.setEnd(secondP.firstChild!, 6);

      const result = highlighter.highlightRange(range, "#fff7a5");

      expect(result).not.toBeNull();
      expect(result?.text).toContain("First");
    });
  });
});
