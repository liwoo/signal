#!/bin/bash
# Post-write/edit hook: checks SIGNAL project conventions on changed files.
# Exits 0 with warnings (non-blocking) or exits 0 silently if clean.
# Reads the file path from $CLAUDE_FILE_PATH (set by the hook runner).

FILE="$1"

# Only check our source files
case "$FILE" in
  */src/*.tsx|*/src/*.ts) ;;
  *) exit 0 ;;
esac

# Skip type definition files and config
case "$FILE" in
  */types/*|*/next-env*|*.config.*) exit 0 ;;
esac

WARNINGS=""

# --- Hardcoded colors ---
# Check for Tailwind color utilities that bypass our CSS variable system
if grep -qE '(text|bg|border|ring|shadow)-(red|green|blue|yellow|orange|gray|slate|zinc|neutral|stone|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose|white|black)-[0-9]' "$FILE" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n⚠ HARDCODED COLOR: Use var(--color-*) instead of Tailwind color utilities (e.g., text-[var(--color-danger)] not text-red-500)"
fi

# Check for inline hex colors (but allow var() references and CSS files)
if grep -qE '\[#[0-9a-fA-F]{3,8}\]' "$FILE" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n⚠ INLINE HEX: Use var(--color-*) references instead of hardcoded hex values"
fi

# --- Border radius ---
if grep -qE 'rounded-|border-radius' "$FILE" 2>/dev/null; then
  WARNINGS="${WARNINGS}\n⚠ BORDER RADIUS: SIGNAL uses sharp rectangles. Remove rounded-* classes and border-radius."
fi

# --- Box shadow ---
if grep -qE 'shadow-[a-z]' "$FILE" 2>/dev/null; then
  # Allow shadow-none
  if grep -qE 'shadow-(?!none)[a-z]' "$FILE" 2>/dev/null; then
    WARNINGS="${WARNINGS}\n⚠ BOX SHADOW: SIGNAL doesn't use box-shadow. Use text-shadow in CSS for glow effects."
  fi
fi

# --- Default exports in components/lib ---
case "$FILE" in
  */components/*|*/lib/*|*/hooks/*|*/data/*)
    if grep -qE '^export default ' "$FILE" 2>/dev/null; then
      WARNINGS="${WARNINGS}\n⚠ DEFAULT EXPORT: Use named exports (export function X) not export default."
    fi
    ;;
esac

# --- Direct localStorage/sessionStorage access outside storage layer ---
case "$FILE" in
  */lib/storage/*) ;; # The storage layer itself is allowed
  *)
    if grep -qE 'localStorage\.|sessionStorage\.' "$FILE" 2>/dev/null; then
      WARNINGS="${WARNINGS}\n⚠ DIRECT STORAGE: Use helpers from src/lib/storage/local.ts instead of direct localStorage/sessionStorage calls."
    fi
    ;;
esac

# --- React imports in game logic ---
case "$FILE" in
  */lib/game/*)
    if grep -qE "from ['\"]react['\"]|from ['\"]next" "$FILE" 2>/dev/null; then
      WARNINGS="${WARNINGS}\n⚠ IMPURE GAME LOGIC: Files in lib/game/ must be pure functions. No React or Next.js imports."
    fi
    ;;
esac

# --- Missing "use client" with hooks ---
if grep -qE '(useState|useEffect|useRef|useCallback|useMemo|useReducer|useContext)\b' "$FILE" 2>/dev/null; then
  if ! head -5 "$FILE" | grep -q '"use client"' 2>/dev/null; then
    WARNINGS="${WARNINGS}\n⚠ MISSING USE CLIENT: This file uses React hooks but doesn't have \"use client\" directive."
  fi
fi

# --- Output ---
if [ -n "$WARNINGS" ]; then
  echo -e "SIGNAL convention check for $(basename "$FILE"):${WARNINGS}"
fi

exit 0
