import { describe, it, expect, beforeEach } from "vitest";
import { Highlighter } from "../highlighter";
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

  it("clears all highlights", () => {
    const p = doc.getElementById("p")!;
    const textNode = p.firstChild as Text;

    const range = doc.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 3); // "The"

    const highlighter = new Highlighter(doc);
    highlighter.highlightRange(range, "#fff7a5");
    expect(doc.querySelectorAll(".st-highlight").length).toBe(1);

    highlighter.clearAll();
    expect(doc.querySelectorAll(".st-highlight").length).toBe(0);
    expect(p.textContent).toContain("The art of writing");
  });

  it("returns concatenated highlighted text", () => {
    const p = doc.getElementById("p")!;
    const highlighter = new Highlighter(doc);

    // First highlight
    const textNode1 = p.firstChild as Text;
    const range1 = doc.createRange();
    range1.setStart(textNode1, 0);
    range1.setEnd(textNode1, 3); // "The"
    highlighter.highlightRange(range1, "#fff7a5");

    // After first highlight, DOM structure changed - need to find the new text node
    // The text "writing" is now in a different position in the DOM
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
