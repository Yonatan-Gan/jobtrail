#!/usr/bin/env bash
# Mark the application with a given job URL as applied, through the JobTrail API.
#
# Usage: scripts/mark_applied.sh <job_url> [YYYY-MM-DD]
#        make applied URL=<job_url> [DATE=YYYY-MM-DD]
# Without a date the API records the current time. With a date it records noon
# local time on that day. Optional override: JOBTRAIL_API_URL.

set -euo pipefail

# shellcheck source=scripts/lib.sh
source "$(dirname "$0")/lib.sh"

job_url="${1:-}"
applied_date="${2:-}"

if [[ -z "$job_url" ]]; then
    echo "Usage: make applied URL=<job_url> [DATE=YYYY-MM-DD]" >&2
    exit 1
fi

require_jq

payload='{"to_status": "applied"}'
if [[ -n "$applied_date" ]]; then
    # macOS date silently turns 2026-02-30 into 2026-03-02, so also check that
    # the date comes back unchanged.
    if [[ ! "$applied_date" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] ||
        [[ "$(date -j -f '%Y-%m-%d' "$applied_date" '+%Y-%m-%d' 2> /dev/null)" != "$applied_date" ]]; then
        echo "DATE must be a real date in the form YYYY-MM-DD, got: $applied_date" >&2
        exit 1
    fi
    changed_at="$(date -j -f '%Y-%m-%d %H:%M:%S' "$applied_date 12:00:00" '+%Y-%m-%dT%H:%M:%S%z')"
    payload="$(jq -n --arg at "$changed_at" '{to_status: "applied", changed_at: $at}')"
fi

require_api

matches="$(curl --silent --show-error --fail --max-time 10 --get \
    --data-urlencode "job_url=$job_url" "$api_url/applications")"
if [[ "$(jq 'length' <<< "$matches")" == "0" ]]; then
    echo "No application found with job_url $job_url" >&2
    echo "Check the URL, or import the listing first with: make import" >&2
    exit 1
fi
id="$(jq -r '.[0].id' <<< "$matches")"
title="$(jq -r '.[0].title' <<< "$matches")"
current_status="$(jq -r '.[0].status' <<< "$matches")"

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT

http_code="$(curl --silent --show-error --max-time 10 \
    --output "$response_file" --write-out "%{http_code}" \
    -X POST "$api_url/applications/$id/status" \
    -H "Content-Type: application/json" \
    --data-binary "$payload")"

if [[ "$http_code" != "201" ]]; then
    echo "Could not mark \"$title\" (application $id) as applied." >&2
    # Only a refused move (409) is about the status; a 422 is about the date.
    if [[ "$http_code" == "409" ]]; then
        echo "Its status is '$current_status'." >&2
    fi
    print_api_error "$response_file" >&2
    exit 1
fi

echo "Marked \"$title\" (application $id) as applied at $(jq -r '.changed_at' "$response_file")"
