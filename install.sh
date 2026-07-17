#!/usr/bin/env bash
# SKYHAWK installer (Linux / macOS)
#   Run from a downloaded copy:   ./install.sh
#   Or one-liner (after you push):
#     curl -fsSL https://raw.githubusercontent.com/xGhst0/skyhawk/main/install.sh | bash
# Leaves SKYHAWK RUNNING as a background service on port 8462.
set -euo pipefail

REPO="${SKYHAWK_REPO:-https://github.com/xGhst0/skyhawk}"
PORT="${PORT:-8462}"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   SKYHAWK · installer                 ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# 1) Node.js >= 18 (user-space nvm if missing — no sudo)
if command -v node >/dev/null 2>&1 && [ "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)" -ge 18 ]; then
  echo "→ Node.js $(node -v) found"
else
  echo "→ Installing Node.js via nvm (user-space, no sudo)…"
  export NVM_DIR="$HOME/.nvm"
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  . "$NVM_DIR/nvm.sh"; nvm install 20 >/dev/null; nvm use 20 >/dev/null
  echo "→ Node.js $(node -v) ready"
fi
NODE_BIN="$(command -v node)"

# 2) locate the code — use THIS folder if it's already a SKYHAWK checkout, else fetch
SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
if [ -n "${SELF_DIR:-}" ] && [ -f "$SELF_DIR/server.js" ]; then
  DIR="$SELF_DIR"
  echo "→ Using existing SKYHAWK files in $DIR (no download needed)"
else
  DIR="${SKYHAWK_DIR:-$HOME/skyhawk}"
  echo "→ Fetching SKYHAWK into $DIR"
  if [ -d "$DIR/.git" ]; then git -C "$DIR" pull --ff-only
  elif command -v git >/dev/null 2>&1; then git clone --depth 1 "$REPO" "$DIR"
  else mkdir -p "$DIR"; curl -fsSL "$REPO/archive/refs/heads/main.tar.gz" | tar xz -C "$DIR" --strip-components=1; fi
fi

# 3) install + start as a persistent background service
start_systemd() {
  command -v systemctl >/dev/null 2>&1 || return 1
  [ -n "${XDG_RUNTIME_DIR:-}" ] || return 1
  timeout 5 systemctl --user show-environment >/dev/null 2>&1 || return 1
  mkdir -p "$HOME/.config/systemd/user"
  cat > "$HOME/.config/systemd/user/skyhawk.service" <<UNIT
[Unit]
Description=SKYHAWK
After=network.target
[Service]
Environment=PORT=$PORT
${SKYHAWK_ENROLL_TOKEN:+Environment=SKYHAWK_ENROLL_TOKEN=$SKYHAWK_ENROLL_TOKEN}
WorkingDirectory=$DIR
ExecStart=$NODE_BIN $DIR/server.js
Restart=always
RestartSec=2
[Install]
WantedBy=default.target
UNIT
  systemctl --user daemon-reload
  systemctl --user enable skyhawk.service >/dev/null 2>&1 || true
  # restart (not just start) so re-running the installer picks up pulled updates
  systemctl --user restart skyhawk.service
  loginctl enable-linger "$(whoami)" >/dev/null 2>&1 || true
  echo "→ Installed as a systemd user service (auto-restart, starts on boot)."
}
start_nohup() {
  pkill -f "$DIR/server.js" >/dev/null 2>&1 || true
  ( cd "$DIR" && PORT="$PORT" nohup "$NODE_BIN" "$DIR/server.js" >"$DIR/skyhawk.out" 2>&1 & )
  if command -v crontab >/dev/null 2>&1; then
    ( crontab -l 2>/dev/null | grep -v "skyhawk/server.js" ; echo "@reboot cd $DIR && PORT=$PORT $NODE_BIN $DIR/server.js >>$DIR/skyhawk.out 2>&1" ) | crontab - 2>/dev/null || true
  fi
  echo "→ Started in the background (nohup) with @reboot restart."
}
start_systemd || start_nohup

# 4) wait until it answers
echo -n "→ Waiting for SKYHAWK to come up"
for i in $(seq 1 20); do curl -fsS "http://localhost:$PORT/health" >/dev/null 2>&1 && break; echo -n "."; sleep 1; done
echo ""
if curl -fsS "http://localhost:$PORT/health" >/dev/null 2>&1; then
  echo ""
  echo "  ✔ SKYHAWK is running →  http://localhost:$PORT"
  echo "    Stays running in the background and restarts on boot."
  echo "    Stop:  systemctl --user stop skyhawk   (or)  pkill -f skyhawk/server.js"
  echo ""
  ( command -v xdg-open >/dev/null 2>&1 && (xdg-open "http://localhost:$PORT" >/dev/null 2>&1) & ) 2>/dev/null || true
else
  echo "  ✖ SKYHAWK did not respond on port $PORT. Check: $DIR/skyhawk.out"; exit 1
fi
