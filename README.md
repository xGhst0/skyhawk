<div align="center">

# 🦅 SKYHAWK

**Air-gapped investigation-to-report platform for blue-team analyst teams.**

Analysts capture findings with full evidence, leads curate, managers sign - and
every case produces a live technical report and a frozen, signed formal report.
Runs entirely on `localhost` / your LAN. No internet. No database required.

`self-hosted` · `runs offline` · `zero runtime dependencies` · `role-based access`

</div>

---

## Install & run (one command)

**Linux / macOS**

```bash
curl -fsSL https://raw.githubusercontent.com/xGhst0/skyhawk/main/install.sh | bash
```

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/xGhst0/skyhawk/main/install.ps1 | iex
```

<sub>Windows with curl instead: `curl.exe -L https://raw.githubusercontent.com/xGhst0/skyhawk/main/install.ps1 -o install.ps1 && powershell -ExecutionPolicy Bypass -File install.ps1`</sub>

The installer ensures Node.js 18+ is present (installs it if missing - `nvm` on
Linux/macOS, `winget` on Windows), downloads SKYHAWK, and starts it. When it's up
it opens **http://localhost:8462**.

### Already have Node.js? Clone and go

```bash
git clone https://github.com/xGhst0/skyhawk && cd skyhawk
node server.js        # or: npm start
```

There is **nothing to build and nothing to `npm install`** - the app is plain
Node using only built-in modules.

## First sign-in

The sign-in screen is seeded with accounts (password `skyhawk` - **change these in
production**):

| Name | Title | Role |
|------|-------|------|
| Morgan | MC | manager - full control, incl. freezing the formal report |
| Chen | TC | team lead - technical report + edit any finding |
| Rivera | NCM | member - create/edit own findings |
| Patel | HCM | member - create/edit own findings |

New users can self-register and pick a title.

## What it does

- **Role-based access** (NCM / HCM / TC / MC) with real authentication - hashed
  passwords (scrypt) and server-side sessions; identity comes from the session,
  not the client.
- **Findings with full evidence** - affected systems (typed devices), screenshots,
  verbatim queries, tools used; editable after creation.
- **Network map** auto-built from the affected systems tagged on findings.
- **Reports** - live technical (full, credited) and frozen, signed formal
  (curated, anonymous); printable to PDF.
- **Tamper-evident audit chain**, persisted and re-verified after restart.
- **Team chat** - a shared Team channel plus private DMs, all history saved.
- **Appearance** - per-account theme (4 palettes) + hawk mark, saved to the account.
- **Store seam** - file by default; Postgres with one env flip (`STORE=postgres`).
- **Structured logging** to console + `skyhawk.log`.

## Configuration

| Env var | Default | Notes |
|---------|---------|-------|
| `PORT` | `8462` | HTTP port |
| `STORE` | `file` | `file` or `postgres` |
| `DATABASE_URL` | - | required when `STORE=postgres` (needs `npm i pg`) |
| `DEBUG` | - | set to `1` for verbose request logs |

## Run it as a service (optional)

Linux (systemd), after installing to `~/skyhawk`:

```ini
# /etc/systemd/system/skyhawk.service
[Unit]
Description=SKYHAWK
After=network.target
[Service]
ExecStart=/usr/bin/node %h/skyhawk/server.js
WorkingDirectory=%h/skyhawk
Restart=on-failure
[Install]
WantedBy=default.target
```

## Security notes

Runs offline by design; the only published port is the API. For a hardened
production deployment: put it behind TLS (add `Secure` to the session cookie),
add login rate-limiting, change the seeded passwords, and - if using Postgres -
load-test that path first.

## License

MIT - see [LICENSE](LICENSE).
