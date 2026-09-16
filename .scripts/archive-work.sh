#!/usr/bin/env bash
set -euo pipefail

# Run from inside a git worktree working directory (sibling of ../main).
# Copies .work/ contents (excluding current.json) into ../main/.work-archive/.

WORK_DIR=".work"
ARCHIVE_DIR="../main/.work-archive"

if [ ! -d "$WORK_DIR" ]; then
  echo "archive-work: $WORK_DIR not found in $(pwd)" >&2
  exit 1
fi

mkdir -p "$ARCHIVE_DIR"

rsync -a --exclude 'current.json' "$WORK_DIR"/ "$ARCHIVE_DIR"/
