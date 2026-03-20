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

### 1. Discover existing mockup files

Search the project for HTML files that look like mockups. Run these searches:

```bash
# Check for common mockup directories
ls -d mockups/ public/mockups/ designs/ public/designs/ 2>/dev/null

# Find standalone HTML files (skip framework/build output)
find . -name "*.html" -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/build/*" -not -path "*/.next/*" -not -path "*/coverage/*" -not -path "*/.git/*" -not -name "index.html" -not -name "404.html" | head -30
```

**Decision logic:**

1. **Dedicated mockup directory exists** (e.g., `mockups/`, `public/mockups/`, `designs/`):
   → Use it. Tell the user: "Found your mockups in `mockups/` — starting the canvas."

2. **HTML files found in a single directory** (e.g., 3+ `.html` files in `src/pages/`):
   → Ask the user: "I found HTML files in `src/pages/`. Should I use that directory, or create a new `mockups/` folder?"

3. **HTML files scattered across the project**:
   → Ask the user which ones to include, or suggest creating a `mockups/` directory and copying/symlinking the relevant files.

4. **No HTML files found**:
   → Create `mockups/` and tell the user: "Created `mockups/` — I'll put all mockups there."

**Important:** Do NOT silently create a new directory if mockup files already exist elsewhere in the project. Always prefer using existing work.

### 2. Remember the mockup directory

Once discovered, store the chosen directory path. Use it for all future mockup operations in this session. If a `.canvas-state.json` already exists in the chosen directory, the canvas will restore previous positions and comments.

### 3. Start the canvas server (or restart if pointing at wrong directory)

First check if a server is already running and whether it's watching the right directory:
```bash
# Check if port 3333 is in use
lsof -ti:3333

# If running, check what directory it's serving
curl -s http://localhost:3333/api/info 2>/dev/null
```

The `/api/info` endpoint returns `{"dir":"/absolute/path/to/mockups","port":3333}`.

**If the server is running AND `/api/info` returns the correct directory** → skip to step 4.

**If the server is running BUT `/api/info` returns a different directory, returns "Not found", or fails** → it's stale or wrong. Kill it and restart:
```bash
lsof -ti:3333 | xargs kill
sleep 1
```

**If no server is running, or after killing the old one**, start it in the background. Try in order:
```bash
# Option 1: npx (works if published to npm)
npx ideation-canvas ./{mockup-dir} &

# Option 2: local canvas.js in this project
node ./canvas.js ./{mockup-dir} &

# Option 3: globally installed
ideation-canvas ./{mockup-dir} &
```

Replace `{mockup-dir}` with the actual directory path from step 1.

If none of these work, tell the user:
> I couldn't find the canvas server. Run: `npm install -g ideation-canvas` or clone https://github.com/mattcmorrell/ideation-canvas

### 4. Open the browser

```bash
open http://localhost:3333  # macOS
```

### 5. Confirm

Tell the user the canvas is running. Show them:
- How many mockup files were found
- The directory being watched
- Quick controls: **C** to comment, **Space + drag** to pan, **Scroll** to zoom, **Comment** button for sidebar

## Creating Mockups

When the user asks you to create mockups, designs, or variations:

### File convention

Write all mockups to the **same directory the canvas is watching** (discovered in step 1 of startup). Use this naming pattern:

- `{dir}/{name}.html` — single mockup
- `{dir}/{name}-v1.html`, `{dir}/{name}-v2.html` — variations (auto-grouped on canvas)

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

Read `.canvas-state.json` from the mockup directory the canvas is watching:
```bash
cat {mockup-dir}/.canvas-state.json
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
- The `.canvas-state.json` file is in the watched mockup directory, not the project root
- Mockup files should be beautiful and production-quality by default — use good typography, spacing, and color
