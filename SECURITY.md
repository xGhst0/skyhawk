# Security policy

SKYHAWK handles incident evidence, so it is built to run offline and to be
defensible. This document covers how to harden a deployment, how the collection
agent is meant to be used, and how to report a problem.

## Reporting a vulnerability

Please report security issues privately, not in a public issue.

Use GitHub's private vulnerability reporting on this repository
(**Security → Report a vulnerability**). Include the version or commit, what you
found, and enough detail to reproduce it. We aim to acknowledge within a few days
and will keep you posted through to a fix.

Please do not open a public issue or PR for anything exploitable until it has been
addressed.

## Hardening checklist

The defaults are meant for a quick local start. Before you put SKYHAWK in front of
real cases:

- **Change the seeded passwords.** Morgan, Chen, Rivera and Patel all ship with
  the password `skyhawk`. Change them, or create fresh accounts and remove the
  seeds.
- **Set `SKYHAWK_ENROLL_TOKEN`.** Without it, a fresh enrolment secret is
  generated on every boot and written to the log. Set a strong, persistent value
  so agents enrol against a known secret.
- **Turn on TLS.** Provide `TLS_CERT` and `TLS_KEY` (or terminate TLS at a
  reverse proxy). The session cookie is then marked `Secure`.
- **Keep it on a trusted network.** SKYHAWK is designed for `localhost` or a LAN
  you control. Do not expose it directly to the internet.
- **Protect the data at rest.** The file store (`skyhawk-data.json`) and the
  `evidence/` directory hold the whole case. Put them on encrypted storage and
  restrict filesystem access.
- **Back it up.** A Manager can export a full backup from the portfolio; keep
  copies off the host.

## What SKYHAWK does for you

- Passwords are hashed with scrypt; identity comes from a server-side session, not
  from anything the client sends.
- Login is rate-limited: five failed attempts per IP and name triggers a
  15-minute lockout.
- Uploaded screenshots are SHA-256 hashed, and the hash is printed in the
  technical report.
- Every action on a case is written to a hash-chained audit log that is
  re-verified on load and after a restart. Editing history breaks the chain
  visibly.
- The formal report can be frozen and signed, producing an immutable, versioned
  snapshot.
- No telemetry and no outbound connections. The app does not call home.

## Collection agent: authorised use

The collection agent (`agent/skyhawk-agent.ps1`) is a **read-only forensic
collector for authorised incident response**. Only deploy it to systems you own
or are authorised to investigate.

It is deliberately narrow:

- It runs a **fixed catalogue** of read-only collectors (host triage, or a
  bundled Chainsaw run). The server cannot make it run arbitrary commands.
- It does not modify the host and does nothing to hide itself.
- It is deployed by an administrator through normal tooling (GPO, scheduled task,
  or an admin session). It does not self-propagate.
- It authenticates with a per-host token and only talks to your SKYHAWK server.
- Queuing a collection requires the Tech Lead role and is recorded in the case
  audit chain.

It is not an EDR, not a C2 channel, and not a persistence mechanism. Do not
extend it into one.

## Supported versions

This is an actively developed project; security fixes land on `main`. Run a
recent build.
