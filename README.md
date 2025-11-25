# HighlightText

> Highlight text while reading. Copy what matters. No clutter.

A minimal Chrome extension that does one thing exceptionally well: lets you highlight text on any webpage with beautiful colors, just like you would in a physical book.

## Why This Exists

Ever find yourself reading a long article, research paper, or documentation and wishing you could just... mark the important parts? Sure, you could copy-paste into a note-taking app. Or use a heavy browser extension with accounts, syncing, and features you'll never use.

**Or you could just highlight the text.**

That's it. No accounts. No cloud sync. No analytics. Just you, the webpage, and a color palette that doesn't hurt your eyes.

<!-- Add your demo screenshot/video here -->
<!-- ![Demo](demo.gif) -->

## What It Does

Select text. Pick a color. Done.

**Core Features:**
- **6 hand-picked colors** — yellow, mint green, soft blue, pink, purple, and peach
- **Instant highlighting** — appears right next to your selection
- **Smart text handling** — works across complex HTML structures
- **Copy all highlights** — grab everything you've marked in one click
- **Clear with one click** — remove all highlights when you're done
- **Zero bloat** — no permissions beyond what's needed, no tracking, no nonsense

**What It Doesn't Do:**
- Doesn't sync (your highlights stay on the page)
- Doesn't track you (no analytics, no phone home)
- Doesn't ask for unnecessary permissions
- Doesn't slow down your browser

## Technical Details

**Stack:**
- Pure TypeScript with zero runtime dependencies
- Built with Vite for fast development and optimized builds
- Chrome Manifest V3 (future-proof)
- Tested with Vitest and jsdom

**Architecture:**
```
├── highlighter.ts    → Core logic (wrapping text in spans, cleanup)
├── toolbar.ts        → UI components (color picker, buttons, overlays)
└── content.js        → Entry point (wires everything together)
```

**Size:** ~3KB minified (that's smaller than most images on this page)

## Installation

### For Users
1. Download or clone this repository
2. Run `bun install` (or `npm install`)
3. Run `bun run build` (or `npm run build`)
4. Open Chrome and go to `chrome://extensions`
5. Enable "Developer mode" (top right)
6. Click "Load unpacked" and select the `dist` folder
7. Start highlighting!

### For Developers
```bash
# Install dependencies
bun install

# Development mode (auto-rebuild on changes)
bun run dev

# Build for production
bun run build

# Run tests
bun test
```

## How It Works

The extension uses the browser's native Selection API to detect when you highlight text. When you pick a color, it wraps your selection in a `<span>` with the chosen background color.

For simple selections, it uses `Range.surroundContents()`. For complex selections spanning multiple elements, it extracts the contents, wraps them, and reinserts them. The result? Highlights that feel native to the page.

**Key Implementation Details:**
- Uses a custom class prefix to avoid conflicts with existing page styles
- Normalizes text nodes after removal to prevent fragmentation
- Handles edge cases like collapsed selections and complex DOM structures
- All highlights are DOM-based (no canvas overlays or weird hacks)

## Philosophy

> "The best tools are invisible until you need them, then they just work."

There are plenty of highlighter extensions out there. Most of them want to be your second brain, your productivity system, your everything app.

HighlightText isn't trying to change your life. It's trying to get out of your way while you read. Pick it up when you need it. Forget it exists when you don't.

**This extension isn't trying to replace your note-taking app. It's just trying to make reading on the web feel a little more like reading a real book.**

## Roadmap

- [ ] Persistent highlights (local storage)
- [ ] Export to markdown
- [ ] Keyboard shortcuts
- [ ] Custom color picker
- [ ] Highlight annotations/notes

## Contributing

Found a bug? Have an idea? Open an issue or submit a PR. Keep it simple. Keep it focused.

## License

MIT — use it, fork it, learn from it, share it.

---
