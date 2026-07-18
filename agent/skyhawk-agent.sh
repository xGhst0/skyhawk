#!/usr/bin/env bash
# SKYHAWK collection agent (Linux) - read-only forensic triage.
# -----------------------------------------------------------------------------
# AUTHORISED INCIDENT-RESPONSE USE ONLY. Deploy to hosts you own or administer
# (via a systemd unit, a cron @reboot job, or an admin shell). It enrols to YOUR
# SKYHAWK server with a shared token, polls for collection tasks your analysts
# queue from the console, runs a FIXED set of READ-ONLY collectors, and uploads
# the results for ingestion into the case.
#
# It is a collector, not a remote-control channel and not self-propagating. It
# never runs arbitrary commands the server sends, never modifies the host, and
# does nothing to hide itself. Requires only bash, curl and coreutils.
#
# Poll mode (recommended, run under systemd/cron):
#   ./skyhawk-agent.sh --server https://skyhawk.lan:8462 --enroll-token <token>
#
# One-shot (collect once into a case and exit):
#   ./skyhawk-agent.sh --server http://skyhawk.lan:8462 --enroll-token <token> \
#     --once --collector triage --case INC-2043
# -----------------------------------------------------------------------------
set -u

SERVER=""; ENROLL=""; ONCE=0; COLLECTOR="triage"; CASEID=""
STATE="${SKYHAWK_STATE:-/var/lib/skyhawk/agent.json}"
MAXPROC=200; MAXCONN=300; MAXLOGON=50

while [ $# -gt 0 ]; do
  case "$1" in
    --server) SERVER="${2:-}"; shift 2;;
    --enroll-token) ENROLL="${2:-}"; shift 2;;
    --state) STATE="${2:-}"; shift 2;;
    --once) ONCE=1; shift;;
    --collector) COLLECTOR="${2:-}"; shift 2;;
    --case) CASEID="${2:-}"; shift 2;;
    -h|--help) sed -n '2,20p' "$0"; exit 0;;
    *) echo "unknown argument: $1" >&2; exit 2;;
  esac
done
[ -n "$SERVER" ] && [ -n "$ENROLL" ] || { echo "need --server and --enroll-token" >&2; exit 2; }

CURLOPTS=(-sS --max-time 60)
# Air-gapped LANs commonly use a self-signed cert; trust it for this call only.
case "$SERVER" in https://*) CURLOPTS+=(-k);; esac

HTTP_CODE=""; HTTP_BODY=""
api() { # method path body
  local out
  out=$(printf '%s' "${3:-}" | curl "${CURLOPTS[@]}" -X "$1" -H 'Content-Type: application/json' --data-binary @- -w $'\n%{http_code}' "$SERVER$2" 2>/dev/null) || { HTTP_CODE=000; HTTP_BODY=""; return 1; }
  HTTP_CODE=${out##*$'\n'}; HTTP_BODY=${out%$'\n'*}
}

json_escape() { # arg -> JSON-safe (no surrounding quotes)
  local s=${1-} bs='\' q='"'
  s=${s//"$bs"/"$bs$bs"}   # backslash first (literal-var form: the \\\\ form is unreliable)
  s=${s//"$q"/"$bs$q"}     # then double-quote -> \"
  s=${s//$'\t'/ }; s=${s//$'\r'/}; s=${s//$'\n'/ }
  printf '%s' "$s" | tr -d '\000-\010\013\014\016-\037'
}
# field extractors tolerant of pretty-printed JSON ("key": "value")
jget() { grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" <<<"$1" | head -n1 | sed 's/.*:[[:space:]]*"//; s/"$//'; }
jnum() { grep -o "\"$2\"[[:space:]]*:[[:space:]]*[0-9]\+" <<<"$1" | head -n1 | grep -o '[0-9]\+$'; }
jvals() { grep -o "\"$2\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" <<<"$1" | sed 's/.*:[[:space:]]*"//; s/"$//'; }
os_name() { ( . /etc/os-release 2>/dev/null && printf '%s' "$PRETTY_NAME" ) || uname -sr; }

AGENT_ID=""; AGENT_TOKEN=""
load_state() {
  [ -f "$STATE" ] || return 1
  local s; s=$(cat "$STATE" 2>/dev/null) || return 1
  AGENT_ID=$(jget "$s" agentId); AGENT_TOKEN=$(jget "$s" agentToken)
  [ -n "$AGENT_ID" ] && [ -n "$AGENT_TOKEN" ]
}
enroll() {
  local body; body="{\"enrollToken\":\"$(json_escape "$ENROLL")\",\"host\":\"$(json_escape "$(hostname)")\",\"os\":\"$(json_escape "$(os_name)")\"}"
  api POST /api/agents/enroll "$body" || { echo "[SKYHAWK] enroll request failed" >&2; return 1; }
  case "$HTTP_CODE" in 2*) ;; *) echo "[SKYHAWK] enroll rejected ($HTTP_CODE): $HTTP_BODY" >&2; return 1;; esac
  AGENT_ID=$(jget "$HTTP_BODY" agentId); AGENT_TOKEN=$(jget "$HTTP_BODY" agentToken)
  [ -n "$AGENT_ID" ] && [ -n "$AGENT_TOKEN" ] || { echo "[SKYHAWK] enroll: bad response" >&2; return 1; }
  mkdir -p "$(dirname "$STATE")" 2>/dev/null || true
  ( umask 077; printf '{"agentId":"%s","agentToken":"%s"}\n' "$AGENT_ID" "$AGENT_TOKEN" > "$STATE" ) 2>/dev/null || true
  echo "[SKYHAWK] enrolled as $AGENT_ID ($(hostname))"
}

# ---- read-only collectors (fixed catalogue; nothing here changes the host) ----
DATA=""
collect_triage() {
  local host os now procs conns logons
  host=$(hostname); os=$(os_name); now=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  procs=""
  while read -r pid user comm args; do
    [ -n "${pid:-}" ] || continue
    case "$pid" in *[!0-9]*) continue;; esac
    procs="${procs:+$procs,}{\"pid\":$pid,\"user\":\"$(json_escape "$user")\",\"name\":\"$(json_escape "$comm")\",\"cmdline\":\"$(json_escape "$args")\"}"
  done < <(ps -eo pid=,user=,comm=,args= 2>/dev/null | head -n "$MAXPROC")

  # remote endpoint = last whitespace field of ss/netstat output (robust to
  # leading-column differences between tool versions)
  conns=""; local peer
  if command -v ss >/dev/null 2>&1; then
    while read -r peer; do
      [ -n "${peer:-}" ] || continue
      local raddr rport; raddr=${peer%:*}; rport=${peer##*:}
      case "$raddr" in ""|"*"|0.0.0.0|127.*|::1|"[::1]"|"[::ffff:127."*) continue;; esac
      conns="${conns:+$conns,}{\"proto\":\"tcp\",\"remoteAddr\":\"$(json_escape "$raddr")\",\"remotePort\":\"$(json_escape "$rport")\",\"state\":\"established\"}"
    done < <(ss -tnH state established 2>/dev/null | awk '{print $NF}' | head -n "$MAXCONN")
  elif command -v netstat >/dev/null 2>&1; then
    while read -r peer; do
      [ -n "${peer:-}" ] || continue
      local raddr rport; raddr=${peer%:*}; rport=${peer##*:}
      case "$raddr" in ""|0.0.0.0|127.*|::1) continue;; esac
      conns="${conns:+$conns,}{\"proto\":\"tcp\",\"remoteAddr\":\"$(json_escape "$raddr")\",\"remotePort\":\"$(json_escape "$rport")\",\"state\":\"established\"}"
    done < <(netstat -tn 2>/dev/null | awk '$NF=="ESTABLISHED"{print $5}' | head -n "$MAXCONN")
  fi

  logons=""
  if command -v last >/dev/null 2>&1; then
    while read -r user _tty ip _rest; do
      case "$user" in ""|reboot|shutdown|wtmp|runlevel) continue;; esac
      local srcip; case "$ip" in *[0-9].[0-9].[0-9]*|*:*:*) srcip=$ip;; *) srcip="";; esac
      case "$srcip" in 0.0.0.0|127.*) srcip="";; esac
      logons="${logons:+$logons,}{\"time\":\"$now\",\"user\":\"$(json_escape "$user")\",\"srcIp\":\"$(json_escape "$srcip")\",\"computer\":\"$(json_escape "$host")\"}"
    done < <(last -i 2>/dev/null | head -n "$MAXLOGON")
  fi

  DATA="{\"skyhawkAgent\":1,\"host\":\"$(json_escape "$host")\",\"os\":\"$(json_escape "$os")\",\"collectedAt\":\"$now\",\"collector\":\"triage\",\"processes\":[$procs],\"connections\":[$conns],\"logons\":[$logons],\"autoruns\":[],\"services\":[]}"
}

submit() { # taskId caseId collector
  # every collector maps to read-only triage on Linux (no Windows event logs to hunt)
  collect_triage
  local tid; if [ -n "${1:-}" ]; then tid="\"$1\""; else tid="null"; fi
  local attempt
  for attempt in 1 2; do
    local body; body="{\"id\":\"$AGENT_ID\",\"token\":\"$AGENT_TOKEN\",\"taskId\":$tid,\"invId\":\"$(json_escape "$2")\",\"collector\":\"$(json_escape "$3")\",\"profile\":\"agent\",\"filename\":\"$(json_escape "$(hostname).json")\",\"text\":\"$(json_escape "$DATA")\"}"
    api POST /api/agents/results "$body" || { echo "[SKYHAWK] upload failed" >&2; return 1; }
    case "$HTTP_CODE" in
      2*) local f e i; f=$(jnum "$HTTP_BODY" findings); e=$(jnum "$HTTP_BODY" timeline); i=$(jnum "$HTTP_BODY" iocs)
         echo "[SKYHAWK] $3 -> case $2 : findings=${f:-0} events=${e:-0} iocs=${i:-0}"; return 0;;
      403) if [ "$attempt" = 1 ]; then echo "[SKYHAWK] results auth failed - re-enrolling and retrying" >&2; enroll || return 1; continue; fi
         echo "[SKYHAWK] server rejected results ($HTTP_CODE): $HTTP_BODY" >&2; return 1;;
      *) echo "[SKYHAWK] server rejected results ($HTTP_CODE): $HTTP_BODY" >&2; return 1;;
    esac
  done
}

poll_once() {
  api POST /api/agents/poll "{\"id\":\"$AGENT_ID\",\"token\":\"$AGENT_TOKEN\"}" || { echo "[SKYHAWK] poll failed" >&2; return 0; }
  if [ "$HTTP_CODE" = "403" ]; then echo "[SKYHAWK] agent auth rejected - re-enrolling" >&2; enroll || true; return 0; fi
  case "$HTTP_CODE" in 2*) ;; *) echo "[SKYHAWK] poll error ($HTTP_CODE)" >&2; return 0;; esac
  local ids invs cols
  mapfile -t ids < <(jvals "$HTTP_BODY" id)
  mapfile -t cols < <(jvals "$HTTP_BODY" collector)
  mapfile -t invs < <(jvals "$HTTP_BODY" invId)
  local n; n=${#ids[@]}
  for ((k=0; k<n; k++)); do
    echo "[SKYHAWK] task ${ids[$k]}: collect '${cols[$k]:-triage}' -> ${invs[$k]:-}"
    submit "${ids[$k]}" "${invs[$k]:-}" "${cols[$k]:-triage}" || true
  done
}

# ---- main ----
load_state || enroll || exit 1

if [ "$ONCE" = 1 ]; then
  [ -n "$CASEID" ] || { echo "--once needs --case (e.g. --case INC-2043)" >&2; exit 2; }
  submit "" "$CASEID" "$COLLECTOR"
  exit $?
fi

INTERVAL=15
echo "[SKYHAWK] polling $SERVER every ${INTERVAL}s (Ctrl+C to stop)"
while true; do
  poll_once
  sleep "$INTERVAL"
done
