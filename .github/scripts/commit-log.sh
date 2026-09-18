#!/usr/bin/env bash
# Prepends one entry per commit in the given range to COMMIT_LOG.md.
#
# Usage: commit-log.sh <git-rev-range> [pushed-by]
#   e.g. commit-log.sh abc123..def456 stupnd
#        commit-log.sh HEAD            (log a single commit)
#        commit-log.sh --all           (seed the log from full history)
set -euo pipefail

RANGE="${1:?usage: commit-log.sh <range> [pushed-by]}"
PUSHER="${2:-}"
LOG_FILE="COMMIT_LOG.md"
REPO_URL="${REPO_URL:-$(git remote get-url origin | sed -E 's#git@github.com:#https://github.com/#; s#\.git$##')}"
HEADER="# Commit Log

Automatically updated by the \`commit-log\` GitHub Action on every push to \`main\`. Newest first.
"

if [[ "$RANGE" == "--all" ]]; then
  shas=$(git rev-list HEAD)
elif [[ "$RANGE" == *..* ]]; then
  shas=$(git rev-list "$RANGE")
else
  shas=$(git rev-parse "$RANGE")
fi

new_entries=""
for sha in $shas; do
  short=$(git rev-parse --short "$sha")
  author=$(git log -1 --format='%an' "$sha")
  date=$(git log -1 --date=format:'%Y-%m-%d %H:%M' --format='%ad' "$sha")
  subject=$(git log -1 --format='%s' "$sha")
  body=$(git log -1 --format='%b' "$sha" | sed '/^[[:space:]]*$/d')

  # Compare against first parent so merge commits list what the merge brought in.
  if git rev-parse --verify --quiet "${sha}^" >/dev/null; then
    stats=$(git diff-tree -r --numstat "${sha}^" "$sha")
  else
    stats=$(git diff-tree -r --numstat --root "$sha" | tail -n +2)
  fi
  file_count=$(printf '%s\n' "$stats" | sed '/^$/d' | wc -l | tr -d ' ')
  files=$(printf '%s\n' "$stats" | sed '/^$/d' | awk -F'\t' '{
    if ($1 == "-") printf "- `%s` (binary)\n", $3;
    else printf "- `%s` (+%s / −%s)\n", $3, $1, $2;
  }')

  entry="### ${date} — ${author} · [\`${short}\`](${REPO_URL}/commit/${sha})"
  [[ -n "$PUSHER" ]] && entry+=" · pushed by @${PUSHER}"
  entry+=$'\n\n'"**${subject}**"
  [[ -n "$body" ]] && entry+=$'\n\n'"${body}"
  entry+=$'\n\n'"Files changed (${file_count}):"$'\n'"${files:-- _(none)_}"$'\n\n'
  new_entries+="$entry"
done

# Keep existing entries below the new ones (strip the old header first).
existing=""
if [[ -f "$LOG_FILE" ]]; then
  existing=$(awk 'found{print} /^### /{if(!found){found=1; print}}' "$LOG_FILE")
fi

{
  printf '%s\n' "$HEADER"
  printf '%s' "$new_entries"
  [[ -n "$existing" ]] && printf '%s\n' "$existing"
} > "$LOG_FILE"

echo "Logged $(printf '%s\n' "$shas" | wc -l | tr -d ' ') commit(s) to $LOG_FILE"
