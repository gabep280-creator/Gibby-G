#!/usr/bin/env bash
# Thin wrapper around the Blotato REST API (https://backend.blotato.com/v2).
#
# Auth: if BLOTATO_API_KEY is set, it is sent in the `blotato-api-key` header.
# Otherwise a placeholder is sent, which works when the key is saved as a
# network secret for backend.blotato.com (the proxy injects the real value).
# Never hard-code or commit a key.
#
# Usage:
#   blotato.sh me                          # verify auth (GET /users/me)
#   blotato.sh accounts [platform]         # list connected accounts
#   blotato.sh subaccounts <accountId>     # FB/LinkedIn Pages, YT playlists, Slack/Discord channels
#   blotato.sh boards <accountId>          # Pinterest boards
#   blotato.sh post <payload.json>         # POST /posts  (publishes/schedules! needs approval)
#   blotato.sh status <postSubmissionId>   # GET /posts/:id
#   blotato.sh wait <postSubmissionId>     # poll status every 10s, up to ~3 min
#   blotato.sh schedules                   # list future scheduled posts
#   blotato.sh upload <public-media-url>   # POST /media (import media from URL)
set -euo pipefail

BASE="https://backend.blotato.com/v2"
KEY="${BLOTATO_API_KEY:-proxy-injected}"

req() {
  local method="$1" path="$2"; shift 2
  curl -sS --fail-with-body -X "$method" "$BASE$path" \
    -H "blotato-api-key: $KEY" \
    -H "Content-Type: application/json" "$@"
  echo
}

cmd="${1:-}"; shift || true
case "$cmd" in
  me)          req GET /users/me ;;
  accounts)    if [[ -n "${1:-}" ]]; then req GET "/users/me/accounts?platform=$1"; else req GET /users/me/accounts; fi ;;
  subaccounts) req GET "/users/me/accounts/${1:?accountId required}/subaccounts" ;;
  boards)      req GET "/social/pinterest/boards?accountId=${1:?accountId required}" ;;
  post)        req POST /posts --data-binary "@${1:?payload file required}" ;;
  status)      req GET "/posts/${1:?postSubmissionId required}" ;;
  wait)
    id="${1:?postSubmissionId required}"
    for _ in $(seq 1 18); do
      out="$(req GET "/posts/$id")"
      st="$(printf '%s' "$out" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("status",""))' 2>/dev/null || true)"
      echo "status: ${st:-unknown}" >&2
      case "$st" in published|scheduled|failed) printf '%s\n' "$out"; exit 0 ;; esac
      sleep 10
    done
    echo "Still in-progress after ~3 min. Do NOT re-POST; check again later with: status $id" >&2
    printf '%s\n' "$out" ;;
  schedules)   req GET /schedules ;;
  upload)      req POST /media --data "$(python3 -c 'import json,sys; print(json.dumps({"url": sys.argv[1]}))' "${1:?url required}")" ;;
  *) sed -n '2,20p' "$0"; exit 1 ;;
esac
