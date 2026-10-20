# Shared helpers for the JobTrail scripts. Source this file; don't run it.
# shellcheck shell=bash

api_url="${JOBTRAIL_API_URL:-http://localhost:8000}"

require_jq() {
    if ! command -v jq > /dev/null; then
        echo "This script needs jq. It ships with macOS 15+, or install it with: brew install jq" >&2
        exit 1
    fi
}

require_api() {
    if ! curl --silent --fail --max-time 5 "$api_url/health" > /dev/null; then
        echo "The JobTrail API is not running at $api_url" >&2
        echo "Start it from the repo root with:  docker compose up --build" >&2
        echo "or from backend/ with:             uv run uvicorn app.main:app --reload --reload-dir app" >&2
        exit 1
    fi
}

# Print the error from an API response file. 422 errors list every problem with
# its location (for example body.0.position_type). Falls back to the raw body.
print_api_error() {
    jq -r '.detail | if type == "string" then . else .[] | "\(.loc | map(tostring) | join(".")): \(.msg)" end' \
        "$1" 2> /dev/null || cat "$1"
}
