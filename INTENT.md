# Mockup Canvas

## Goal
A lightweight, zero-dependency infinite canvas tool for designers and developers to spatially view, compare, and annotate HTML layout versions and revisions. Inspired by Google Stitch's canvas experience — the key insight being that seeing layouts *on a canvas* is more valuable than the layouts themselves.

Must be dead simple: `node canvas.js ./path/to/mockups` and it opens in the browser.

## Current Direction
Single-command Node server (zero npm deps) that:
- Watches a directory for HTML files
- Serves an infinite canvas web app
- Renders each file as a live iframe preview on the canvas
- Groups versioned files (name-v1.html, name-v2.html) visually
- Supports sticky notes and per-card annotations
- Persists canvas state (positions, notes) to .canvas-state.json in the target dir

## What's Done
- **canvas.js** — Zero-dep Node server with:
  - HTML file discovery + tab parsing + version pattern detection
  - Static file serving + mockup file serving
  - State persistence API (GET/POST)
  - SSE file watcher for live reload
  - Auto-opens browser on start
- **public/index.html** — Canvas web app with:
  - Infinite canvas (pan via drag, zoom via scroll wheel, dot grid background that scales)
  - Cards with live iframe previews (1440px design scaled to 420px card)
  - Card drag (header), interactive mode (click preview to interact with iframe)
  - Version grouping with dashed border + label
  - Version badges (v1, v2) and tab count badges
  - Sticky notes (double-click to create, drag, edit, color picker, delete)
  - Per-card annotations (click comment icon, add notes with categories: note/love/fix/idea/question)
  - Auto-layout (grouped versions side-by-side, ungrouped in grid)
  - Fit All, zoom controls, keyboard shortcuts (1=fit, 0=100%, L=layout, N=note, Esc=deselect)
  - Welcome overlay (first-visit only)
  - SSE live reload (flashes card border green on file change)
  - State persistence (debounced save to server)
  - Context menu on cards
  - Empty state when no files found
- **Test mockups** created (dashboard-v1, dashboard-v2, settings-page)
- Verified working: server runs, API returns files with grouping, canvas renders correctly

## Rejected Approaches
- (none yet)

## Open Questions
- Should tab-switched mockups be "explodable" into separate canvas cards?
- File drag-and-drop onto canvas (from Finder)?
- Mini-map for orientation on large canvases?
- Export canvas as image?

## Next Steps
- Test annotations and sticky notes in browser
- Consider how this integrates with user's existing mockup feedback workflow
- Think about packaging for easy sharing (npx? single-file?)
