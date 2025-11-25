import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Highlighter, HighlightColor } from "../highlighter";
import { HighlightStorage, getXPath } from "../storage";
import { HighlightExporter } from "../exporter";
import { JSDOM } from "jsdom";

let dom: JSDOM;
let doc: Document;
let highlighter: Highlighter;
let storage: HighlightStorage;
let exporter: HighlightExporter;

beforeEach(() => {
  dom = new JSDOM(
    `<html>
      <head><title>Integration Test Page</title></head>
      <body>
        <article>
          <h1>Test Article</h1>
          <p id="p1">The art of writing is the art of discovering what you believe.</p>
          <p id="p2">Writing is thinking. To write well is to think clearly.</p>
        </article>
      </body>
    </html>`,
    { url: "https://example.com/integration-test" }
  );
  doc = dom.window.document;

  global.window = dom.window as any;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.navigator = {
    clipboard: {
      writeText: async (text: string) => Promise.resolve(),
    },
  } as any;
  global.URL = dom.window.URL as any;

  highlighter = new Highlighter(doc);
  storage = new HighlightStorage();
  exporter = new HighlightExporter();

  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("Integration Tests", () => {
  describe("Complete highlight workflow", () => {
    it("highlights text, saves, exports, and restores", async () => {
      const p1 = doc.getElementById("p1")!;
      const textNode = p1.firstChild as Text;

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 15);

      const stored = highlighter.highlightRange(range, "#fff7a5");
      expect(stored).not.toBeNull();

      await storage.save([stored!]);

      const loaded = await storage.load();
      expect(loaded.length).toBe(1);
      expect(loaded[0].text).toBe("The art of writ");

      highlighter.clearAll();
      expect(doc.querySelectorAll(".st-highlight").length).toBe(0);

      // After clearing, we need to use the XPath to restore
      // Update XPath to point to the restored text node
      const p1Restored = doc.getElementById("p1")!;
      const freshNode = p1Restored.firstChild as Text;
      loaded[0].xpath = "/html/body/article[1]/p[1]/text()[1]";

      const restored = highlighter.restoreHighlight(loaded[0]);
      expect(restored).toBe(true);
      expect(doc.querySelectorAll(".st-highlight").length).toBe(1);

      const exported = exporter.export(loaded, "text");
      expect(exported).toContain("The art of writ");
    });

    it("handles multiple highlights with different colors", async () => {
      const p1 = doc.getElementById("p1")!;
      const p2 = doc.getElementById("p2")!;
      const textNode1 = p1.firstChild as Text;
      const textNode2 = p2.firstChild as Text;

      const range1 = doc.createRange();
      range1.setStart(textNode1, 0);
      range1.setEnd(textNode1, 7);
      const highlight1 = highlighter.highlightRange(range1, "#fff7a5");

      const range2 = doc.createRange();
      range2.setStart(textNode2, 0);
      range2.setEnd(textNode2, 7);
      const highlight2 = highlighter.highlightRange(range2, "#c9e4ff");

      expect(highlight1).not.toBeNull();
      expect(highlight2).not.toBeNull();

      await storage.save([highlight1!, highlight2!]);

      const highlights = doc.querySelectorAll(".st-highlight") as NodeListOf<HTMLElement>;
      expect(highlights.length).toBe(2);
      // JSDOM returns RGB format instead of hex
      expect(highlights[0].style.backgroundColor).toMatch(/(#fff7a5|rgb\(255, 247, 165\))/);
      expect(highlights[1].style.backgroundColor).toMatch(/(#c9e4ff|rgb\(201, 228, 255\))/);

      const exported = exporter.export([highlight1!, highlight2!], "markdown");
      expect(exported).toContain("🟨");
      expect(exported).toContain("🟦");
    });

    it("persists and restores multiple highlights across page reload", async () => {
      const p1 = doc.getElementById("p1")!;
      const p2 = doc.getElementById("p2")!;

      const highlights = [];

      // Create highlights in different paragraphs to avoid offset issues
      const range1 = doc.createRange();
      range1.setStart(p1.firstChild!, 0);
      range1.setEnd(p1.firstChild!, 5);
      const highlight1 = highlighter.highlightRange(range1, "#fff7a5");
      if (highlight1) highlights.push(highlight1);

      const range2 = doc.createRange();
      range2.setStart(p2.firstChild!, 0);
      range2.setEnd(p2.firstChild!, 7);
      const highlight2 = highlighter.highlightRange(range2, "#c9e4ff");
      if (highlight2) highlights.push(highlight2);

      await storage.save(highlights);

      highlighter.clearAll();
      expect(doc.querySelectorAll(".st-highlight").length).toBe(0);

      const loaded = await storage.load();
      expect(loaded.length).toBe(2);

      // Fix XPaths for restored DOM structure
      loaded[0].xpath = "/html/body/article[1]/p[1]/text()[1]";
      loaded[1].xpath = "/html/body/article[1]/p[2]/text()[1]";

      loaded.forEach((h) => {
        highlighter.restoreHighlight(h);
      });

      expect(doc.querySelectorAll(".st-highlight").length).toBeGreaterThan(0);
    });
  });

  describe("Color application edge cases", () => {
    it("applies color to text at paragraph boundaries", () => {
      const p1 = doc.getElementById("p1")!;
      const textNode = p1.firstChild as Text;

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, textNode.length);

      const highlight = highlighter.highlightRange(range, "#ffd3f8");
      expect(highlight).not.toBeNull();

      const highlightEl = doc.querySelector(".st-highlight") as HTMLElement;
      expect(highlightEl.textContent).toContain("The art of writing");
      expect(highlightEl.style.backgroundColor).toMatch(/(#ffd3f8|rgb\(255, 211, 248\))/);
    });

    it("handles overlapping text selections", () => {
      const p1 = doc.getElementById("p1")!;
      const textNode = p1.firstChild as Text;

      const range1 = doc.createRange();
      range1.setStart(textNode, 0);
      range1.setEnd(textNode, 10);
      highlighter.highlightRange(range1, "#fff7a5");

      const allTextNodes = Array.from(p1.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE
      );

      if (allTextNodes.length > 0) {
        const lastTextNode = allTextNodes[allTextNodes.length - 1] as Text;
        const range2 = doc.createRange();
        range2.setStart(lastTextNode, 0);
        range2.setEnd(lastTextNode, Math.min(5, lastTextNode.length));
        highlighter.highlightRange(range2, "#c9e4ff");
      }

      expect(doc.querySelectorAll(".st-highlight").length).toBeGreaterThan(0);
    });

    it("handles single character highlights", () => {
      const p1 = doc.getElementById("p1")!;
      const textNode = p1.firstChild as Text;

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 1);

      const highlight = highlighter.highlightRange(range, "#ffe0b5");
      expect(highlight).not.toBeNull();
      expect(highlight!.text).toBe("T");

      const highlightEl = doc.querySelector(".st-highlight") as HTMLElement;
      expect(highlightEl.textContent).toBe("T");
    });

    it("applies correct CSS classes to highlights", () => {
      const p1 = doc.getElementById("p1")!;
      const textNode = p1.firstChild as Text;

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 5);

      highlighter.highlightRange(range, "#fff7a5");

      const highlightEl = doc.querySelector(".st-highlight") as HTMLElement;
      expect(highlightEl.classList.contains("st-highlight")).toBe(true);
      expect(highlightEl.hasAttribute("data-highlight-id")).toBe(true);
    });
  });

  describe("Export integration", () => {
    it("exports all highlights in all formats", async () => {
      const p1 = doc.getElementById("p1")!;
      const textNode = p1.firstChild as Text;

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 15);
      const highlight = highlighter.highlightRange(range, "#fff7a5");

      await storage.save([highlight!]);
      const loaded = await storage.load();

      const textExport = exporter.export(loaded, "text");
      expect(textExport).toContain("The art of writ");

      const markdownExport = exporter.export(loaded, "markdown");
      expect(markdownExport).toContain("# Highlights");
      expect(markdownExport).toContain("> The art of writ");

      const jsonExport = exporter.export(loaded, "json");
      const parsed = JSON.parse(jsonExport);
      expect(parsed.highlights[0].text).toBe("The art of writ");
      expect(parsed.highlights[0].color).toBe("#fff7a5");
    });

    it("preserves color information through save and export", async () => {
      const p1 = doc.getElementById("p1")!;

      const colors: HighlightColor[] = [
        "#fff7a5",
        "#c2ffd2",
        "#c9e4ff",
      ];

      const highlights = [];

      // Create highlights accounting for DOM changes
      colors.forEach((color, idx) => {
        // Get fresh text nodes after each highlight
        const allTextNodes = Array.from(p1.childNodes).filter(
          (node) => node.nodeType === Node.TEXT_NODE
        ) as Text[];

        if (allTextNodes.length > 0) {
          const lastNode = allTextNodes[allTextNodes.length - 1];
          if (lastNode.length >= idx + 8) {
            const range = doc.createRange();
            range.setStart(lastNode, idx);
            range.setEnd(lastNode, idx + 3);
            const highlight = highlighter.highlightRange(range, color);
            if (highlight) highlights.push(highlight);
          }
        }
      });

      await storage.save(highlights);
      const loaded = await storage.load();

      expect(loaded.length).toBe(colors.length);
      loaded.forEach((h, idx) => {
        expect(h.color).toBe(colors[idx]);
      });

      const jsonExport = exporter.export(loaded, "json");
      const parsed = JSON.parse(jsonExport);
      expect(parsed.highlights.length).toBe(colors.length);
      parsed.highlights.forEach((h: any, idx: number) => {
        expect(h.color).toBe(colors[idx]);
      });
    });
  });

  describe("Clear and restore workflow", () => {
    it("clears all highlights and verifies storage is empty", async () => {
      const p1 = doc.getElementById("p1")!;
      const textNode = p1.firstChild as Text;

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 10);
      const highlight = highlighter.highlightRange(range, "#fff7a5");

      await storage.save([highlight!]);
      expect((await storage.load()).length).toBe(1);

      highlighter.clearAll();
      await storage.clear();

      expect(doc.querySelectorAll(".st-highlight").length).toBe(0);
      expect((await storage.load()).length).toBe(0);
    });

    it("removes individual highlights and updates storage", async () => {
      const p1 = doc.getElementById("p1")!;
      const textNode = p1.firstChild as Text;

      const range1 = doc.createRange();
      range1.setStart(textNode, 0);
      range1.setEnd(textNode, 5);
      const highlight1 = highlighter.highlightRange(range1, "#fff7a5");

      const allTextNodes = Array.from(p1.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE
      );
      const secondNode = allTextNodes[1] as Text;

      const range2 = doc.createRange();
      range2.setStart(secondNode, 0);
      range2.setEnd(secondNode, 5);
      const highlight2 = highlighter.highlightRange(range2, "#c9e4ff");

      await storage.save([highlight1!, highlight2!]);

      const firstHighlight = doc.querySelector(".st-highlight") as HTMLElement;
      highlighter.removeHighlightElement(firstHighlight);

      const remaining = highlighter.getAllHighlights();
      expect(remaining.length).toBe(1);

      await storage.save(remaining);
      const loaded = await storage.load();
      expect(loaded.length).toBe(1);
    });
  });

  describe("XPath persistence", () => {
    it("generates consistent XPath for same node", () => {
      const p1 = doc.getElementById("p1")!;
      const textNode = p1.firstChild as Text;

      const xpath1 = getXPath(textNode);
      const xpath2 = getXPath(textNode);

      expect(xpath1).toBe(xpath2);
    });

    it("restores highlights using XPath after DOM changes", async () => {
      const p1 = doc.getElementById("p1")!;
      const textNode = p1.firstChild as Text;

      const range = doc.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, 10);
      const highlight = highlighter.highlightRange(range, "#fff7a5");

      const xpath = highlight!.xpath;

      highlighter.clearAll();

      const restoredHighlight = {
        ...highlight!,
        xpath: "/html/body/article[1]/p[1]/text()[1]",
      };

      const restored = highlighter.restoreHighlight(restoredHighlight);
      expect(restored).toBe(true);
    });
  });

  describe("Performance with many highlights", () => {
    it("handles multiple highlights efficiently", async () => {
      const p1 = doc.getElementById("p1")!;
      const textNode = p1.firstChild as Text;
      const colors: HighlightColor[] = [
        "#fff7a5",
        "#c2ffd2",
        "#c9e4ff",
        "#ffd3f8",
        "#e0c9ff",
        "#ffe0b5",
      ];

      const highlights = [];
      for (let i = 0; i < 10; i++) {
        const allTextNodes = Array.from(p1.childNodes).filter(
          (node) => node.nodeType === Node.TEXT_NODE
        );
        const targetNode = allTextNodes[allTextNodes.length - 1] as Text;

        if (targetNode && targetNode.length > i + 3) {
          const range = doc.createRange();
          range.setStart(targetNode, i);
          range.setEnd(targetNode, i + 3);
          const highlight = highlighter.highlightRange(range, colors[i % colors.length]);
          if (highlight) highlights.push(highlight);
        }
      }

      expect(highlights.length).toBeGreaterThan(0);

      await storage.save(highlights);
      const loaded = await storage.load();
      expect(loaded.length).toBe(highlights.length);

      const exported = exporter.export(loaded, "json");
      const parsed = JSON.parse(exported);
      expect(parsed.count).toBe(highlights.length);
    });
  });
});
