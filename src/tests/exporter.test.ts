import { describe, it, expect, beforeEach, vi } from "vitest";
import { HighlightExporter } from "../exporter";
import { StoredHighlight } from "../storage";
import { JSDOM } from "jsdom";

let dom: JSDOM;
let exporter: HighlightExporter;

beforeEach(() => {
  dom = new JSDOM(
    `<html><head><title>Test Page</title></head><body><p>Test content</p></body></html>`,
    { url: "https://example.com/test-page" }
  );

  global.window = dom.window as any;
  global.document = dom.window.document;
  global.navigator = {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  } as any;

  // Mock URL.createObjectURL which is not available in JSDOM
  global.URL = {
    ...dom.window.URL,
    createObjectURL: vi.fn().mockReturnValue("blob:mock-url"),
    revokeObjectURL: vi.fn(),
  } as any;

  exporter = new HighlightExporter();
});

describe("HighlightExporter", () => {
  const sampleHighlights: StoredHighlight[] = [
    {
      text: "First highlight",
      color: "#fff7a5",
      xpath: "/html/body/p[1]/text()[1]",
      offset: 0,
      length: 15,
      timestamp: Date.now(),
    },
    {
      text: "Second highlight",
      color: "#c9e4ff",
      xpath: "/html/body/p[1]/text()[1]",
      offset: 20,
      length: 16,
      timestamp: Date.now(),
    },
  ];

  describe("Export as Text", () => {
    it("exports highlights as plain text", () => {
      const result = exporter.export(sampleHighlights, "text");

      expect(result).toContain("Highlights from:");
      expect(result).toContain("https://example.com/test-page");
      expect(result).toContain("Total highlights: 2");
      expect(result).toContain("First highlight");
      expect(result).toContain("Second highlight");
    });

    it("includes export timestamp", () => {
      const result = exporter.export(sampleHighlights, "text");
      expect(result).toContain("Exported:");
    });

    it("numbers the highlights", () => {
      const result = exporter.export(sampleHighlights, "text");
      expect(result).toContain("1. First highlight");
      expect(result).toContain("2. Second highlight");
    });

    it("handles empty highlights", () => {
      const result = exporter.export([], "text");
      expect(result).toBe("No highlights to export.");
    });

    it("trims whitespace from highlights", () => {
      const highlights: StoredHighlight[] = [
        {
          text: "  Text with spaces  ",
          color: "#fff7a5",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 20,
          timestamp: Date.now(),
        },
      ];

      const result = exporter.export(highlights, "text");
      expect(result).toContain("Text with spaces");
      expect(result).not.toContain("  Text with spaces  ");
    });
  });

  describe("Export as Markdown", () => {
    it("exports highlights as markdown", () => {
      const result = exporter.export(sampleHighlights, "markdown");

      expect(result).toContain("# Highlights");
      expect(result).toContain("**Source:**");
      expect(result).toContain("https://example.com/test-page");
      expect(result).toContain("**Total:** 2 highlights");
    });

    it("includes color emojis", () => {
      const result = exporter.export(sampleHighlights, "markdown");

      expect(result).toContain("🟨"); // Yellow
      expect(result).toContain("🟦"); // Blue
    });

    it("formats highlights as blockquotes", () => {
      const result = exporter.export(sampleHighlights, "markdown");

      expect(result).toContain("> First highlight");
      expect(result).toContain("> Second highlight");
    });

    it("includes page title in markdown link", () => {
      const result = exporter.export(sampleHighlights, "markdown");
      expect(result).toContain("[Test Page]");
    });

    it("numbers highlights with headers", () => {
      const result = exporter.export(sampleHighlights, "markdown");

      expect(result).toContain("### 🟨 Highlight 1");
      expect(result).toContain("### 🟦 Highlight 2");
    });

    it("handles all color types", () => {
      const allColorHighlights: StoredHighlight[] = [
        {
          text: "Yellow",
          color: "#fff7a5",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 6,
          timestamp: Date.now(),
        },
        {
          text: "Green",
          color: "#c2ffd2",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 5,
          timestamp: Date.now(),
        },
        {
          text: "Blue",
          color: "#c9e4ff",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 4,
          timestamp: Date.now(),
        },
        {
          text: "Pink",
          color: "#ffd3f8",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 4,
          timestamp: Date.now(),
        },
        {
          text: "Purple",
          color: "#e0c9ff",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 6,
          timestamp: Date.now(),
        },
        {
          text: "Peach",
          color: "#ffe0b5",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 5,
          timestamp: Date.now(),
        },
      ];

      const result = exporter.export(allColorHighlights, "markdown");

      expect(result).toContain("🟨"); // Yellow
      expect(result).toContain("🟩"); // Green
      expect(result).toContain("🟦"); // Blue
      expect(result).toContain("🟪"); // Purple/Pink
      expect(result).toContain("🟧"); // Peach
    });

    it("handles empty highlights", () => {
      const result = exporter.export([], "markdown");
      expect(result).toBe("No highlights to export.");
    });
  });

  describe("Export as JSON", () => {
    it("exports highlights as JSON", () => {
      const result = exporter.export(sampleHighlights, "json");
      const parsed = JSON.parse(result);

      expect(parsed.url).toBe("https://example.com/test-page");
      expect(parsed.title).toBe("Test Page");
      expect(parsed.count).toBe(2);
      expect(parsed.highlights).toHaveLength(2);
    });

    it("includes ISO timestamp", () => {
      const result = exporter.export(sampleHighlights, "json");
      const parsed = JSON.parse(result);

      expect(parsed.exported).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("includes highlight details", () => {
      const result = exporter.export(sampleHighlights, "json");
      const parsed = JSON.parse(result);

      expect(parsed.highlights[0].text).toBe("First highlight");
      expect(parsed.highlights[0].color).toBe("#fff7a5");
      expect(parsed.highlights[0].timestamp).toBeDefined();
    });

    it("formats JSON with indentation", () => {
      const result = exporter.export(sampleHighlights, "json");
      expect(result).toContain("\n");
      expect(result).toContain("  ");
    });

    it("trims whitespace from highlights", () => {
      const highlights: StoredHighlight[] = [
        {
          text: "  Text with spaces  ",
          color: "#fff7a5",
          xpath: "/html/body/p[1]/text()[1]",
          offset: 0,
          length: 20,
          timestamp: Date.now(),
        },
      ];

      const result = exporter.export(highlights, "json");
      const parsed = JSON.parse(result);

      expect(parsed.highlights[0].text).toBe("Text with spaces");
    });

    it("handles untitled pages", () => {
      global.document = { title: "" } as any;
      const newExporter = new HighlightExporter();

      const result = newExporter.export(sampleHighlights, "json");
      const parsed = JSON.parse(result);

      expect(parsed.title).toBe("Untitled Page");
    });
  });

  describe("Download as file", () => {
    it("creates a download with correct filename format", () => {
      const createElementSpy = vi.spyOn(document, "createElement");
      const clickSpy = vi.fn();

      createElementSpy.mockReturnValue({
        click: clickSpy,
        href: "",
        download: "",
      } as any);

      exporter.downloadAsFile("test content", "text");

      expect(createElementSpy).toHaveBeenCalledWith("a");
      expect(clickSpy).toHaveBeenCalled();
    });

    it("generates filename with page title slug", () => {
      const createElementSpy = vi.spyOn(document, "createElement");
      let downloadFilename = "";

      createElementSpy.mockReturnValue({
        click: vi.fn(),
        href: "",
        set download(value: string) {
          downloadFilename = value;
        },
        get download() {
          return downloadFilename;
        },
      } as any);

      exporter.downloadAsFile("test content", "markdown");

      expect(downloadFilename).toContain("highlights-");
      expect(downloadFilename).toContain("test-page");
      expect(downloadFilename).toContain(".markdown");
    });

    it("includes timestamp in filename", () => {
      const createElementSpy = vi.spyOn(document, "createElement");
      let downloadFilename = "";

      createElementSpy.mockReturnValue({
        click: vi.fn(),
        href: "",
        set download(value: string) {
          downloadFilename = value;
        },
        get download() {
          return downloadFilename;
        },
      } as any);

      exporter.downloadAsFile("test content", "json");

      expect(downloadFilename).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(downloadFilename).toContain(".json");
    });
  });

  describe("Copy to clipboard", () => {
    it("copies content to clipboard", async () => {
      const result = await exporter.copyToClipboard("test content");

      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("test content");
    });

    it("returns false on clipboard error", async () => {
      global.navigator = {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error("Clipboard error")),
        },
      } as any;

      const newExporter = new HighlightExporter();
      const result = await newExporter.copyToClipboard("test content");

      expect(result).toBe(false);
    });

    it("handles empty content", async () => {
      const result = await exporter.copyToClipboard("");

      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("");
    });
  });

  describe("Export format handling", () => {
    it("defaults to text format for unknown format", () => {
      const result = exporter.export(sampleHighlights, "unknown" as any);

      expect(result).toContain("Highlights from:");
      expect(result).toContain("Total highlights: 2");
    });
  });
});
