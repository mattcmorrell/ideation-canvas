#!/bin/sh
# Ideation Canvas — One-line installer
# Usage: curl -sL https://raw.githubusercontent.com/mattcmorrell/ideation-canvas/main/install.sh | sh

set -e

INSTALL_DIR="$HOME/.ideation-canvas"
SKILL_DIR="$HOME/.claude/skills/canvas"
REPO_URL="https://github.com/mattcmorrell/ideation-canvas.git"

echo ""
echo "  Ideation Canvas — Installing..."
echo "  ─────────────────────────────────"

# Clone or update the repo
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "  Updating existing install..."
  git -C "$INSTALL_DIR" pull -q
  echo "  ✓ Updated canvas server"
else
  echo "  Downloading canvas server..."
  git clone -q "$REPO_URL" "$INSTALL_DIR"
  echo "  ✓ Installed canvas server to $INSTALL_DIR"
fi

# Install the skill
mkdir -p "$SKILL_DIR"
cp "$INSTALL_DIR/skill/SKILL.md" "$SKILL_DIR/SKILL.md"
echo "  ✓ Installed /canvas skill for Claude Code"

echo ""
echo "  You're all set! Open Claude Code in any project and type:"
echo ""
echo "    /canvas"
echo ""
echo "  Then ask Claude to make mockups. They'll appear on the canvas."
echo ""
