#!/usr/bin/env bash
# Generate a self-signed certificate for local HTTPS.
# Then run SKYHAWK over TLS:
#   ./gen-cert.sh
#   TLS_CERT=cert.pem TLS_KEY=key.pem node server.js
set -e
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 825 -subj "/CN=localhost"
echo "→ created cert.pem and key.pem"
echo "→ start with:  TLS_CERT=cert.pem TLS_KEY=key.pem node server.js"
