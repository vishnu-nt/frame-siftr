#!/usr/bin/env bash
# Organize images into label folders from image-categorizer export JSON (format v2).
#
# Usage (run from the folder you selected in the browser upload dialog):
#   ./scripts/organize-from-export.sh ./export.json
#   ./scripts/organize-from-export.sh ./export.json --preserve --output-dir ./organized
#   ./scripts/organize-from-export.sh ./export.json --flat --force

set -euo pipefail

MODE="preserve"
OUTPUT_DIR="./organized"
FORCE=0
STRICT=0
JSON_FILE=""

usage() {
  cat <<'EOF'
Usage: organize-from-export.sh <export.json> [options]

Options:
  --preserve       Copy to OUTPUT/<label>/<relativePath> (default)
  --flat           Copy to OUTPUT/<label>/<basename>
  --output-dir DIR Output directory (default: ./organized)
  --force          Overwrite existing files; allow output inside cwd
  --strict         Exit non-zero if any source missing or flat collision
  -h, --help       Show this help

Run from the upload root folder (the directory you picked in the app).
Requires: jq
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --preserve) MODE="preserve"; shift ;;
    --flat) MODE="flat"; shift ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --strict) STRICT=1; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    *)
      if [[ -z "$JSON_FILE" ]]; then
        JSON_FILE="$1"
      else
        echo "Unexpected argument: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "$JSON_FILE" ]]; then
  echo "Error: export.json path required" >&2
  usage
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required. Install with: brew install jq" >&2
  exit 1
fi

if [[ ! -f "$JSON_FILE" ]]; then
  echo "Error: file not found: $JSON_FILE" >&2
  exit 1
fi

FORMAT_VERSION=$(jq -r '.formatVersion // 1' "$JSON_FILE")
if [[ "$FORMAT_VERSION" != "2" ]]; then
  echo "Error: expected formatVersion 2 export" >&2
  exit 1
fi

UPLOAD_ROOT=$(jq -r '.uploadRoot // ""' "$JSON_FILE")
PWD_NAME=$(basename "$(pwd)")

if [[ -n "$UPLOAD_ROOT" && "$UPLOAD_ROOT" != "$PWD_NAME" ]]; then
  echo "Warning: current directory '$PWD_NAME' does not match uploadRoot '$UPLOAD_ROOT' in JSON" >&2
  echo "         Run this script from the folder you selected when uploading." >&2
fi

mkdir -p "$OUTPUT_DIR"
OUTPUT_ABS=$(cd "$OUTPUT_DIR" && pwd)
CWD_ABS=$(pwd)

if [[ "$FORCE" -eq 0 ]]; then
  case "$OUTPUT_ABS" in
    "$CWD_ABS"|"$CWD_ABS"/*)
      echo "Warning: output directory is inside the source tree. Use --force to proceed." >&2
      exit 1
      ;;
  esac
fi

sanitize_label() {
  echo "$1" | sed 's/[/\\?%*:|"<>]/_/g' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | sed 's/^$/unnamed/'
}

is_safe_path() {
  local p="$1"
  [[ -n "$p" && "$p" != /* && "$p" != *..* ]]
}

ASSIGNMENT_COUNT=$(jq '.assignments | length' "$JSON_FILE")
if [[ "$ASSIGNMENT_COUNT" -eq 0 ]]; then
  echo "No assignments in export."
  exit 0
fi

ERRORS=0
COPIED=0
SKIPPED=0
FLAT_MAP=$(mktemp)
trap 'rm -f "$FLAT_MAP"' EXIT

FIRST_REL=$(jq -r '.assignments[0].relativePath // empty' "$JSON_FILE")
if [[ -n "$FIRST_REL" && ! -f "$FIRST_REL" ]]; then
  echo "Warning: first assignment source not found: $FIRST_REL" >&2
  echo "         Ensure you are in the upload root directory." >&2
fi

while IFS= read -r line; do
  REL=$(echo "$line" | jq -r '.relativePath')
  LABEL=$(echo "$line" | jq -r '.label')
  BASENAME=$(basename "$REL")

  if ! is_safe_path "$REL"; then
    echo "Error: unsafe relativePath: $REL" >&2
    ERRORS=$((ERRORS + 1))
    continue
  fi

  if [[ ! -f "$REL" ]]; then
    echo "Missing: $REL" >&2
    ERRORS=$((ERRORS + 1))
    continue
  fi

  SAFE_LABEL=$(sanitize_label "$LABEL")
  if [[ "$MODE" == "flat" ]]; then
    DEST="$OUTPUT_DIR/$SAFE_LABEL/$BASENAME"
    key="${SAFE_LABEL}/${BASENAME}"
    if grep -q "^${key}:" "$FLAT_MAP" 2>/dev/null; then
      existing=$(grep "^${key}:" "$FLAT_MAP" | head -1 | cut -d: -f2-)
      if [[ "$existing" != "$REL" ]]; then
        echo "Collision (flat): $BASENAME in label '$SAFE_LABEL' from $REL and $existing" >&2
        ERRORS=$((ERRORS + 1))
        [[ "$STRICT" -eq 1 ]] && continue
      fi
    else
      echo "${key}:${REL}" >> "$FLAT_MAP"
    fi
  else
    DEST="$OUTPUT_DIR/$SAFE_LABEL/$REL"
  fi

  mkdir -p "$(dirname "$DEST")"

  if [[ -f "$DEST" ]]; then
    if [[ "$FORCE" -eq 1 ]]; then
      cp -f "$REL" "$DEST"
      COPIED=$((COPIED + 1))
    else
      echo "Skip (exists): $DEST" >&2
      SKIPPED=$((SKIPPED + 1))
    fi
  else
    cp "$REL" "$DEST"
    COPIED=$((COPIED + 1))
  fi
done < <(jq -c '.assignments[]' "$JSON_FILE")

echo "Done: copied=$COPIED skipped=$SKIPPED errors=$ERRORS -> $OUTPUT_DIR"

if [[ "$ERRORS" -gt 0 ]]; then
  exit 1
fi
