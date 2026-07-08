#!/usr/bin/env bash
# Build a fully self-contained SKYHAWK bundle for an air-gapped Linux machine.
#
# Run this on any machine WITH internet (Linux or macOS). It produces one
# tarball containing SKYHAWK plus its only dependency — the Node.js runtime —
# so the target box needs no internet, no apt, no npm, nothing.
#
#   curl -fsSL https://raw.githubusercontent.com/xGhst0/skyhawk/main/bundle-airgap.sh | bash
#
# Options (env vars):
#   ARCH=x64|arm64          target CPU architecture       (default: x64)
#   NODE_CHANNEL=latest-v20.x  Node.js dist channel        (default: latest-v20.x)
set -euo pipefail

ARCH="${ARCH:-x64}"
CHANNEL="${NODE_CHANNEL:-latest-v20.x}"
WORK="$(mktemp -d)"
OUT="skyhawk-airgap-linux-${ARCH}.tar.gz"
trap 'rm -rf "$WORK"' EXIT

sha_check() { # portable sha256 -c (Linux: sha256sum, macOS: shasum)
  if command -v sha256sum >/dev/null 2>&1; then sha256sum -c -; else shasum -a 256 -c -; fi
}

echo "==> Resolving current Node.js LTS (${CHANNEL}, linux-${ARCH})"
SHAS="$(curl -fsSL "https://nodejs.org/dist/${CHANNEL}/SHASUMS256.txt")"
NODE_TAR="$(printf '%s\n' "$SHAS" | grep -o "node-v[0-9.]*-linux-${ARCH}\.tar\.xz" | head -1)"
[ -n "$NODE_TAR" ] || { echo "ERROR: could not resolve a Node tarball for linux-${ARCH}" >&2; exit 1; }
echo "    ${NODE_TAR}"

echo "==> Downloading Node.js runtime"
curl -fsSL -o "$WORK/$NODE_TAR" "https://nodejs.org/dist/${CHANNEL}/${NODE_TAR}"

echo "==> Verifying checksum against nodejs.org SHASUMS256.txt"
( cd "$WORK" && printf '%s\n' "$SHAS" | grep "  ${NODE_TAR}\$" | sha_check )

echo "==> Downloading SKYHAWK"
curl -fsSL -o "$WORK/skyhawk.tar.gz" "https://github.com/xGhst0/skyhawk/archive/refs/heads/main.tar.gz"

echo "==> Assembling bundle"
mkdir -p "$WORK/skyhawk-airgap"
tar -xJf "$WORK/$NODE_TAR" -C "$WORK/skyhawk-airgap"
mv "$WORK/skyhawk-airgap/${NODE_TAR%.tar.xz}" "$WORK/skyhawk-airgap/node"
tar -xzf "$WORK/skyhawk.tar.gz" -C "$WORK/skyhawk-airgap"
mv "$WORK/skyhawk-airgap/skyhawk-main" "$WORK/skyhawk-airgap/skyhawk"

cat > "$WORK/skyhawk-airgap/run.sh" <<'RUN'
#!/bin/sh
# Start SKYHAWK with the bundled Node runtime — no internet, no installs.
DIR="$(cd "$(dirname "$0")" && pwd)"
echo "SKYHAWK starting on http://localhost:${PORT:-8462}"
exec "$DIR/node/bin/node" "$DIR/skyhawk/server.js"
RUN
chmod +x "$WORK/skyhawk-airgap/run.sh"

tar -czf "$OUT" -C "$WORK" skyhawk-airgap

echo
echo "==> Done: $OUT  ($(du -h "$OUT" | cut -f1 | tr -d ' '))"
echo
echo "    Carry it to the air-gapped machine on removable media, then:"
echo "      tar -xzf $OUT"
echo "      ./skyhawk-airgap/run.sh"
echo
echo "    (ARM target? Re-run with: ARCH=arm64)"
