#!/usr/bin/env bash
# Import the newest JobTrail export file into the running API.
#
# Looks for jobtrail_import_*.json and jobtrail_applied_*.json in ~/Downloads,
# picks the most recently modified one and posts it to /applications/import.
#
# Usage: scripts/import_latest.sh   (or: make import)
# Optional overrides: JOBTRAIL_IMPORT_DIR (default ~/Downloads)
#                     JOBTRAIL_API_URL    (default http://localhost:8000)

set -euo pipefail

# shellcheck source=scripts/lib.sh
source "$(dirname "$0")/lib.sh"

import_dir="${JOBTRAIL_IMPORT_DIR:-$HOME/Downloads}"

# Without nullglob, a pattern that matches nothing stays as literal text.
shopt -s nullglob
latest=""
for file in "$import_dir"/jobtrail_import_*.json "$import_dir"/jobtrail_applied_*.json; do
    if [[ -z "$latest" || "$file" -nt "$latest" ]]; then
        latest="$file"
    fi
done

if [[ -z "$latest" ]]; then
    echo "No jobtrail_import_*.json or jobtrail_applied_*.json file found in $import_dir" >&2
    exit 1
fi

require_jq
require_api

echo "Importing $latest"

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT

if ! http_code="$(curl --silent --show-error --max-time 60 \
    --output "$response_file" --write-out "%{http_code}" \
    -X POST "$api_url/applications/import" \
    -H "Content-Type: application/json" \
    --data-binary "@$latest")"; then
    echo "Could not reach the JobTrail API at $api_url" >&2
    exit 1
fi

if [[ "$http_code" != "200" ]]; then
    echo "Import failed (HTTP $http_code). Nothing was imported." >&2
    print_api_error "$response_file" >&2
    exit 1
fi

jq -r '"Created: \(.created)", "Updated: \(.updated)", "Skipped: \(.skipped)",
    (.updated_urls[] | "  marked as applied: \(.)"),
    (.skipped_urls[] | "  already imported: \(.)")' "$response_file"
