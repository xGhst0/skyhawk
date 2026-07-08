#!/usr/bin/env bash
# SKYHAWK one-command installer (Linux / macOS)
#   curl -fsSL https://raw.githubusercontent.com/xGhst0/skyhawk/main/install.sh | bash
set -euo pipefail

REPO="${SKYHAWK_REPO:-https://github.com/xGhst0/skyhawk}"
DIR="${SKYHAWK_DIR:-$HOME/skyhawk}"
PORT="${PORT:-8462}"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   SKYHAWK · installer                 ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# 1) ensure Node.js >= 18 (user-space nvm if missing — no sudo needed)
ensure_node() {
  if command -v node >/dev/null 2>&1; then
    local maj; maj="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    if [ "${maj:-0}" -ge 18 ]; then echo "→ Node.js $(node -v) found"; return; fi
    echo "→ Node.js is too old ($(node -v)); installing a newer one via nvm…"
  else
    echo "→ Node.js not found; installing via nvm (user-space, no sudo)…"
  fi
  export NVM_DIR="$HOME/.nvm"
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm install 20 >/dev/null
  nvm use 20 >/dev/null
  echo "→ Node.js $(node -v) ready"
}
ensure_node

# 2) fetch the code
echo "→ Fetching SKYHAWK into $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
elif command -v git >/dev/null 2>&1; then
  git clone --depth 1 "$REPO" "$DIR"
else
  mkdir -p "$DIR"
  curl -fsSL "$REPO/archive/refs/heads/main.tar.gz" | tar xz -C "$DIR" --strip-components=1
fi

# 3) run
cd "$DIR"
echo ""
echo "  ✔ Installed. Starting on http://localhost:$PORT"
echo "    (Ctrl+C to stop · re-run later with:  cd $DIR && node server.js)"
echo ""
# best-effort open a browser
( command -v xdg-open >/dev/null 2>&1 && (sleep 2; xdg-open "http://localhost:$PORT" >/dev/null 2>&1) & ) 2>/dev/null || \
( command -v open >/dev/null 2>&1 && (sleep 2; open "http://localhost:$PORT" >/dev/null 2>&1) & ) 2>/dev/null || true
exec node server.js
