---
name: canvas
description: Start an ideation canvas for creating and reviewing HTML mockups with live comments
argument-hint: "[start | review | iterate]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, Agent
---

# /canvas — Ideation Canvas

Launch an infinite canvas for creating, reviewing, and iterating on HTML mockups. Mockups appear in real time as you create them. Comments left on the canvas are readable by Claude for iteration.

## Quick Reference

| Command | What it does |
|---------|-------------|
| `/canvas` or `/canvas start` | Start the canvas server and open the browser |
| `/canvas review` | Read all comments from the canvas and summarize feedback |
| `/canvas iterate` | Read comments, then update mockups based on the feedback |

## Starting the Canvas

When the user invokes `/canvas` or `/canvas start`:

### 1. Find or create the mockups directory

Look for a `mockups/` directory in the project root. If it doesn't exist, create it:

```bash
mkdir -p mockups
```

### 2. Start the canvas server (if not already running)

Check if port 3333 is in use:
```bash
lsof -ti:3333
```

If not running, start it in the background:
```bash
npx ideation-canvas ./mockups &
```

If `npx ideation-canvas` is not available, fall back to checking for canvas.js:
```bash
# Check common locations
ls ./canvas.js ./node_modules/.bin/ideation-canvas 2>/dev/null
```

If found locally, use `node canvas.js ./mockups &`.

If nothing is found, tell the user:
> Install ideation-canvas first: `npm install -g ideation-canvas` or `npx ideation-canvas setup`

### 3. Open the browser

```bash
open http://localhost:3333  # macOS
```

### 4. Confirm

Tell the user the canvas is running and ready. Remind them:
- **C** to add a comment on the canvas
- **Space + drag** to pan
- **Scroll** to zoom
- Click the **Comment** button to see all comments in a sidebar

## Creating Mockups

When the user asks you to create mockups, designs, or variations:

### File convention

Write all mockups to the `mockups/` directory in the project root. Use this naming pattern:

- `mockups/{name}.html` — single mockup
- `mockups/{name}-v1.html`, `mockups/{name}-v2.html` — variations (auto-grouped on canvas)

### Mockup format

Each mockup is a **self-contained HTML file** with inline styles. Requirements:
- Full HTML document (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`)
- All CSS inline in a `<style>` tag (no external stylesheets)
- Designed for **1440x900** viewport (the canvas scales them down to card size)
- Use modern, polished design — not wireframes unless asked
- Each file should be independently viewable in a browser

### Multiple designs with tab switcher

When creating multiple variants of the same concept in one file, use a tab switcher:

```html
<div class="switcher">
  <button class="active" data-tab="design-a">Design A</button>
  <button data-tab="design-b">Design B</button>
</div>
<div class="design-panel active" id="design-a">...</div>
<div class="design-panel" id="design-b">...</div>
```

The canvas parses `.switcher` buttons to show a "N designs" badge on the card.

### After creating mockups

Tell the user their mockups are on the canvas. The canvas auto-detects new files via file watching — no refresh needed.

## Reading Comments (`/canvas review`)

When the user invokes `/canvas review`:

### 1. Read the canvas state

```bash
cat mockups/.canvas-state.json
```

### 2. Extract comments

The state file has this structure:
```json
{
  "comments": [
    {
      "id": "comment-123",
      "x": 500,
      "y": 300,
      "text": "Make this header bigger",
      "cardFile": "dashboard-v1.html",
      "resolved": false,
      "timestamp": "2026-03-20T..."
    }
  ],
  "annotations": {
    "dashboard-v1.html": [
      { "id": "a-123", "text": "Love the layout", "category": "love", "timestamp": "..." }
    ]
  }
}
```

- **comments** — pins placed on the canvas, associated with a `cardFile` (mockup filename)
- **annotations** — per-card notes accessed via the speech bubble button on each card

### 3. Summarize

Group feedback by mockup file. For each mockup, list:
- What people like (love/positive comments)
- What needs fixing (fix/negative comments)
- Questions and ideas
- Whether comments are resolved or open

## Iterating (`/canvas iterate`)

When the user invokes `/canvas iterate`:

1. Read comments (same as `/canvas review`)
2. For each mockup with unresolved comments, update the HTML file to address the feedback
3. The canvas will auto-reload the updated mockups
4. Tell the user what you changed and why

Do NOT create new files unless the feedback calls for a new variant. Update in place.

## Tips

- The canvas server watches for file changes and pushes updates via SSE — edits appear instantly
- Comments have `cardFile` set to the mockup filename — use this to know which file the feedback is about
- The `.canvas-state.json` file is in the mockups directory, not the project root
- Mockup files should be beautiful and production-quality by default — use good typography, spacing, and color
