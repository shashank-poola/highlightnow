import { StoredHighlight } from "./storage";

export type ExportFormat = "text" | "markdown" | "json";

export class HighlightExporter {
  /**
   * Export highlights in the specified format
   */
  export(highlights: StoredHighlight[], format: ExportFormat): string {
    switch (format) {
      case "text":
        return this.exportAsText(highlights);
      case "markdown":
        return this.exportAsMarkdown(highlights);
      case "json":
        return this.exportAsJSON(highlights);
      default:
        return this.exportAsText(highlights);
    }
  }

  /**
   * Export as plain text
   */
  private exportAsText(highlights: StoredHighlight[]): string {
    if (highlights.length === 0) {
      return "No highlights to export.";
    }

    const lines: string[] = [
      `Highlights from: ${window.location.href}`,
      `Exported: ${new Date().toLocaleString()}`,
      `Total highlights: ${highlights.length}`,
      "",
      "---",
      "",
    ];

    highlights.forEach((highlight, index) => {
      lines.push(`${index + 1}. ${highlight.text.trim()}`);
      lines.push("");
    });

    return lines.join("\n");
  }

  /**
   * Export as markdown
   */
  private exportAsMarkdown(highlights: StoredHighlight[]): string {
    if (highlights.length === 0) {
      return "No highlights to export.";
    }

    const colorEmoji: Record<string, string> = {
      "#fff7a5": "🟨",
      "#c2ffd2": "🟩",
      "#c9e4ff": "🟦",
      "#ffd3f8": "🟪",
      "#e0c9ff": "🟪",
      "#ffe0b5": "🟧",
    };

    const lines: string[] = [
      `# Highlights`,
      "",
      `**Source:** [${this.getPageTitle()}](${window.location.href})`,
      `**Exported:** ${new Date().toLocaleString()}`,
      `**Total:** ${highlights.length} highlights`,
      "",
      "---",
      "",
    ];

    highlights.forEach((highlight, index) => {
      const emoji = colorEmoji[highlight.color] || "📌";
      lines.push(`### ${emoji} Highlight ${index + 1}`);
      lines.push("");
      lines.push(`> ${highlight.text.trim()}`);
      lines.push("");
    });

    return lines.join("\n");
  }

  /**
   * Export as JSON
   */
  private exportAsJSON(highlights: StoredHighlight[]): string {
    const data = {
      url: window.location.href,
      title: this.getPageTitle(),
      exported: new Date().toISOString(),
      count: highlights.length,
      highlights: highlights.map((h) => ({
        text: h.text.trim(),
        color: h.color,
        timestamp: h.timestamp,
      })),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Download export to file
   */
  downloadAsFile(content: string, format: ExportFormat): void {
    const timestamp = new Date().toISOString().slice(0, 10);
    const slug = this.getPageTitle()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50);

    const filename = `highlights-${slug}-${timestamp}.${format}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Copy export to clipboard
   */
  async copyToClipboard(content: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(content);
      return true;
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      return false;
    }
  }

  private getPageTitle(): string {
    return document.title || "Untitled Page";
  }
}
