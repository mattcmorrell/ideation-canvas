#!/bin/sh
# Ideation Canvas — One-line installer
# Usage: curl -sL https://raw.githubusercontent.com/mattcmorrell/ideation-canvas/main/install.sh | sh

set -e

SKILL_DIR="$HOME/.claude/skills/canvas"
SKILL_URL="https://raw.githubusercontent.com/mattcmorrell/ideation-canvas/main/skill/SKILL.md"

echo ""
echo "  Ideation Canvas — Installing..."
echo "  ─────────────────────────────────"

# Create skill directory
mkdir -p "$SKILL_DIR"

# Download the skill file
if command -v curl >/dev/null 2>&1; then
  curl -sL "$SKILL_URL" -o "$SKILL_DIR/SKILL.md"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$SKILL_DIR/SKILL.md" "$SKILL_URL"
else
  echo "  Error: curl or wget required"
  exit 1
fi

echo "  ✓ Installed /canvas skill to $SKILL_DIR"
echo ""
echo "  You're all set! Open Claude Code in any project and type:"
echo ""
echo "    /canvas"
echo ""
echo "  Then ask Claude to make mockups. They'll appear on the canvas."
echo ""
