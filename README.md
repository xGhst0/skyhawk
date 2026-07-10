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

### Air-gapped target (Ubuntu / Linux box with NO internet)

On any machine **with** internet, build a fully self-contained bundle — SKYHAWK
plus the Node.js runtime, i.e. everything it needs, checksum-verified:

```bash
curl -fsSL https://raw.githubusercontent.com/xGhst0/skyhawk/main/bundle-airgap.sh | bash
```

Carry the resulting `skyhawk-airgap-linux-x64.tar.gz` (~46 MB) across on
removable media, then on the air-gapped machine:

```bash
tar -xzf skyhawk-airgap-linux-x64.tar.gz && ./skyhawk-airgap/run.sh
```

That's it — no internet, no `apt`, no `npm`, no installs. The app has zero npm
dependencies, so the bundle's Node runtime is the *only* dependency and it ships
inside the tarball. For an ARM target build with `ARCH=arm64`.

The installer ensures Node.js 18+ is present (installs it if missing - `nvm` on
Linux/macOS, `winget` on Windows), downloads SKYHAWK, and **starts it as a
background service on port 8462** - it keeps running after you close the terminal
and **restarts on boot/logon**. When it's up it opens **http://localhost:8462**.

- Linux/macOS: a `systemd --user` service (falls back to `nohup` + an `@reboot`
  cron entry if systemd isn't available).
- Windows: a Scheduled Task that runs at logon (and it starts immediately).

### Already have Node.js? Clone and go

```bash
git clone https://github.com/xGhst0/skyhawk && cd skyhawk
node server.js        # or: npm start
```

There is **nothing to build and nothing to `npm install`** - the app is plain
Node using only built-in modules.

## Managing the service

**Linux / macOS**
```bash
systemctl --user status skyhawk      # is it running?
systemctl --user restart skyhawk     # restart
systemctl --user stop skyhawk        # stop
systemctl --user disable --now skyhawk   # uninstall the service
# (nohup fallback) stop with:  pkill -f skyhawk/server.js
```

**Windows (PowerShell)**
```powershell
Get-ScheduledTask SKYHAWK            # is it registered?
Stop-ScheduledTask -TaskName SKYHAWK; Get-Process node | Stop-Process   # stop
Unregister-ScheduledTask -TaskName SKYHAWK -Confirm:$false              # uninstall
```

## First sign-in

The sign-in screen is seeded with accounts (password `skyhawk` - **change these in
production**):

| Name | Title | Role |
|------|-------|------|
| Morgan | Manager | full control incl. freezing & signing the formal report |
| Chen | Tech Lead | controls the technical report, can edit any finding |
| Rivera | Analyst | create/edit own findings |
| Patel | Analyst | create/edit own findings |

New users can self-register and pick a title.

## What it does

- **Role-based access** (Analyst / Tech Lead / Manager) with real authentication -
  hashed passwords (scrypt) and server-side sessions; identity comes from the
  session, not the client.
- **Tabbed workspace** - Findings, Timeline, IOCs, Tasks, Network map, Report and
  Audit tabs.
- **Case lifecycle** - status workflow (open → contained → eradicated → recovered
  → closed), case severity, and a case lead, all controlled by Tech Leads /
  Managers and shown on the portfolio.
- **Findings with full evidence** - affected systems (typed devices), screenshots
  (SHA-256 hashed on upload for integrity), verbatim queries, tools used; editable
  after creation. Approved findings appear in the technical report.
- **Incident timeline** - reconstruct the attack chronologically (time, source,
  event); rendered into the technical report.
- **IOC tracking** - indicators auto-typed (IP, domain, URL, email, MD5/SHA-1/
  SHA-256, CVE, path), one-click **extraction from finding text**, copy buttons,
  and an IOC appendix in the technical report.
- **Response checklists** - offline PICERL playbooks (ransomware, BEC, malware,
  generic) plus custom tasks, with per-phase grouping and a progress bar.
- **Editable network map** - a full drag-and-drop builder for the whole
  environment: add/link/position devices, set compromise state, edit IPs. Findings
  can seed it ("Sync from findings"), but you own it. Saved per investigation.
- **MITRE ATT&CK helper** - a searchable offline cheat sheet plus a keyword
  suggester ("Suggest from finding") so analysts don't need to know technique IDs.
- **Technical report** - live, full, credited; printable to PDF. Now includes the
  incident timeline, IOC appendix and evidence hashes.
- **Formal report workflow** - leads flag approved findings into the formal
  report and write plain-language summaries (with a fully offline draft
  assistant); a Manager freezes & signs an immutable, versioned snapshot. Analyst
  names and raw technical detail are excluded by policy.
- **Tamper-evident audit chain**, persisted and re-verified after restart - now
  with an in-app Audit tab showing the verified hash chain per case.
- **Case bundles (air-gap transfer)** - export a whole investigation (findings,
  evidence images, timeline, IOCs, tasks, audit chain) as one JSON file and
  import it on another SKYHAWK instance; the audit chain is re-verified on import.
- **Full backup** - one-click Manager-only JSON dump of every collection.
- **Global search** - one box searches case IDs/titles, finding text and IOC
  values across all investigations.
- **Team chat** - a shared Team channel plus private DMs, all history saved, with unread badges/alerts.
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
| `TLS_CERT` / `TLS_KEY` | - | paths to a cert + key; when both are set SKYHAWK serves **HTTPS** and the session cookie becomes `Secure` |

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

## HTTPS (TLS)

Generate a local self-signed cert and run over HTTPS:

```bash
./gen-cert.sh
TLS_CERT=cert.pem TLS_KEY=key.pem node server.js   # serves https://localhost:8462
```

In production, point `TLS_CERT`/`TLS_KEY` at a real certificate (or terminate TLS
at a reverse proxy). When TLS is on, the session cookie is issued with `Secure`
in addition to `HttpOnly` and `SameSite=Strict`.

## Security

- **Runs offline** - the only published port is the app; no telemetry, no cloud.
- **Auth** - scrypt-hashed passwords, HttpOnly server-side session cookies;
  identity is taken from the session, never trusted from the client.
- **Login rate-limiting** - 5 failed attempts per IP+name triggers a 15-minute
  lockout (returns HTTP 429).
- **Tamper-evident audit chain** per investigation, persisted and re-verified.
- Change the seeded passwords before any real use.

The `PostgresStore` path has been validated at the SQL level (create/upsert/
select/delete) against an in-process Postgres engine; run your own load test
against your Postgres before production.

## License

MIT - see [LICENSE](LICENSE).
