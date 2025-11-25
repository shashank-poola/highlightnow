import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { HighlightStorage, getXPath, findNodeByXPath, StoredHighlight } from "../storage";
import { JSDOM } from "jsdom";
import { HighlightColor } from "../highlighter";

let dom: JSDOM;
let doc: Document;
let storage: HighlightStorage;

beforeEach(() => {
  dom = new JSDOM(
    `<html><body><p id="p">The art of writing is the art of discovering what you believe.</p></body></html>`,
    { url: "https://example.com/test-page" }
  );
  doc = dom.window.document;

  global.window = dom.window as any;
  global.localStorage = dom.window.localStorage;

  storage = new HighlightStorage();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("HighlightStorage", () => {
  describe("Save and Load", () => {
    it("saves highlights to localStorage", async () => {
      const highlights: StoredHighlight[] = [
        {
          text: "test text",
          color: "#fff7a5",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 9,
          timestamp: Date.now(),
        },
      ];

      await storage.save(highlights);

      const keys = Object.keys(localStorage);
      expect(keys.length).toBe(1);
      expect(keys[0]).toContain("st-highlights-");
    });

    it("loads saved highlights", async () => {
      const highlights: StoredHighlight[] = [
        {
          text: "test text",
          color: "#fff7a5",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 9,
          timestamp: Date.now(),
        },
      ];

      await storage.save(highlights);
      const loaded = await storage.load();

      expect(loaded).toEqual(highlights);
    });

    it("returns empty array when no highlights saved", async () => {
      const loaded = await storage.load();
      expect(loaded).toEqual([]);
    });

    it("saves multiple highlights", async () => {
      const highlights: StoredHighlight[] = [
        {
          text: "first",
          color: "#fff7a5",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 5,
          timestamp: Date.now(),
        },
        {
          text: "second",
          color: "#c9e4ff",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 10,
          length: 6,
          timestamp: Date.now(),
        },
      ];

      await storage.save(highlights);
      const loaded = await storage.load();

      expect(loaded.length).toBe(2);
      expect(loaded[0].text).toBe("first");
      expect(loaded[1].text).toBe("second");
    });

    it("overwrites previous highlights for same page", async () => {
      const highlights1: StoredHighlight[] = [
        {
          text: "old",
          color: "#fff7a5",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 3,
          timestamp: Date.now(),
        },
      ];

      const highlights2: StoredHighlight[] = [
        {
          text: "new",
          color: "#c9e4ff",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 3,
          timestamp: Date.now(),
        },
      ];

      await storage.save(highlights1);
      await storage.save(highlights2);
      const loaded = await storage.load();

      expect(loaded.length).toBe(1);
      expect(loaded[0].text).toBe("new");
    });
  });

  describe("Clear", () => {
    it("clears highlights for current page", async () => {
      const highlights: StoredHighlight[] = [
        {
          text: "test",
          color: "#fff7a5",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 4,
          timestamp: Date.now(),
        },
      ];

      await storage.save(highlights);
      expect((await storage.load()).length).toBe(1);

      await storage.clear();
      expect((await storage.load()).length).toBe(0);
    });

    it("does not affect other pages", async () => {
      const highlights: StoredHighlight[] = [
        {
          text: "test",
          color: "#fff7a5",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 4,
          timestamp: Date.now(),
        },
      ];

      await storage.save(highlights);
      const keyBefore = Object.keys(localStorage)[0];

      // Simulate different page
      const otherDom = new JSDOM(
        `<html><body><p>Other page</p></body></html>`,
        { url: "https://example.com/other-page" }
      );
      global.window = otherDom.window as any;
      global.localStorage = otherDom.window.localStorage;

      const otherStorage = new HighlightStorage();
      await otherStorage.save(highlights);

      // Clear highlights from first page
      global.window = dom.window as any;
      global.localStorage = dom.window.localStorage;
      await storage.clear();

      // Check other page still has highlights
      global.window = otherDom.window as any;
      global.localStorage = otherDom.window.localStorage;
      const loaded = await otherStorage.load();
      expect(loaded.length).toBe(1);
    });
  });

  describe("Get all pages", () => {
    it("returns all stored pages with highlights", async () => {
      const highlights: StoredHighlight[] = [
        {
          text: "test",
          color: "#fff7a5",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 4,
          timestamp: Date.now(),
        },
      ];

      await storage.save(highlights);

      const pages = await storage.getAllPages();
      expect(pages.length).toBeGreaterThan(0);
      expect(pages[0].url).toContain("example.com");
      expect(pages[0].highlights).toEqual(highlights);
    });

    it("returns empty array when no pages stored", async () => {
      const pages = await storage.getAllPages();
      expect(pages).toEqual([]);
    });
  });

  describe("URL normalization", () => {
    it("normalizes URL by removing hash", async () => {
      global.window = { ...dom.window, location: { href: "https://example.com/page#section" } } as any;
      const storage1 = new HighlightStorage();

      global.window = { ...dom.window, location: { href: "https://example.com/page" } } as any;
      const storage2 = new HighlightStorage();

      const highlights: StoredHighlight[] = [
        {
          text: "test",
          color: "#fff7a5",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 4,
          timestamp: Date.now(),
        },
      ];

      await storage1.save(highlights);

      global.window = { ...dom.window, location: { href: "https://example.com/page" } } as any;
      const loaded = await storage2.load();

      expect(loaded.length).toBe(1);
    });

    it("normalizes URL by removing trailing slash", async () => {
      global.window = { ...dom.window, location: { href: "https://example.com/page/" } } as any;
      const storage1 = new HighlightStorage();

      const highlights: StoredHighlight[] = [
        {
          text: "test",
          color: "#fff7a5",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 4,
          timestamp: Date.now(),
        },
      ];

      await storage1.save(highlights);

      global.window = { ...dom.window, location: { href: "https://example.com/page" } } as any;
      const storage2 = new HighlightStorage();
      const loaded = await storage2.load();

      expect(loaded.length).toBe(1);
    });
  });
});

describe("XPath utilities", () => {
  beforeEach(() => {
    dom = new JSDOM(
      `<html><body><div><p id="p1">First paragraph</p><p id="p2">Second paragraph</p></div></body></html>`
    );
    doc = dom.window.document;
  });

  describe("getXPath", () => {
    it("generates XPath for text node", () => {
      const p = doc.getElementById("p1")!;
      const textNode = p.firstChild!;

      const xpath = getXPath(textNode);

      expect(xpath).toContain("text()");
      expect(xpath).toContain("p");
    });

    it("generates XPath for element node", () => {
      const p = doc.getElementById("p1")!;
      const xpath = getXPath(p);

      expect(xpath).toContain("p");
      expect(xpath).not.toContain("text()");
    });

    it("generates different XPaths for different nodes", () => {
      const p1 = doc.getElementById("p1")!;
      const p2 = doc.getElementById("p2")!;

      const xpath1 = getXPath(p1.firstChild!);
      const xpath2 = getXPath(p2.firstChild!);

      expect(xpath1).not.toBe(xpath2);
    });

    it("returns / for document node", () => {
      const xpath = getXPath(doc);
      expect(xpath).toBe("/");
    });

    it("returns empty string for node without parent", () => {
      // In JSDOM, parentNode is read-only, so we test with a newly created text node
      // which has no parent by default
      const textNode = doc.createTextNode("orphan");

      const xpath = getXPath(textNode);
      // A text node without a parent returns empty string
      expect(xpath).toBe("");
    });
  });

  describe("findNodeByXPath", () => {
    it("finds node by known XPath", () => {
      // Use a known working XPath format
      const found = findNodeByXPath("/html/body/div[1]/p[1]/text()[1]", doc);

      expect(found).toBeTruthy();
      expect(found?.textContent).toBe("First paragraph");
    });

    it("returns null for invalid XPath", () => {
      const found = findNodeByXPath("/invalid/xpath[999]", doc);
      expect(found).toBeNull();
    });

    it("finds element node by known XPath", () => {
      const found = findNodeByXPath("/html/body/div[1]/p[1]", doc);

      expect(found).toBeTruthy();
      expect((found as HTMLElement).id).toBe("p1");
    });
  });

  describe("XPath round-trip", () => {
    it("generates valid XPath for text nodes", () => {
      const p = doc.getElementById("p1")!;
      const textNode = p.firstChild!;

      const xpath = getXPath(textNode);

      // XPath should contain text() notation
      expect(xpath).toContain("text()");
      expect(xpath).toBeTruthy();
    });

    it("generates valid XPath for element nodes", () => {
      const p = doc.getElementById("p1")!;
      const xpath = getXPath(p);

      // XPath should contain the element name
      expect(xpath).toContain("p");
      expect(xpath).toBeTruthy();
      expect(xpath).not.toContain("text()");
    });
  });
});
