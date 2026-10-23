#!/usr/bin/env bash
# Full production for lessons, one at a time: plan → voice → render (vi, en) → Whisper sync QA.
# Each lesson is finished before the next starts, so a failure leaves earlier videos complete.
#   motion/lessons/pipeline/produce-lessons.sh [example-id ...]   (default: every lesson)
set -uo pipefail
cd "$(dirname "$0")/../../.."
export PATH="/opt/homebrew/bin:$PATH" HF_HUB_OFFLINE=1
dir=motion/lessons/pipeline
ids=("$@")
if [ ${#ids[@]} -eq 0 ]; then
  ids=($(ls motion/lessons/content/*.ts | xargs -n1 basename | sed 's/\.ts$//' | grep -v -e '^index$' -e '^define-lesson$'))
fi
failed=()
for id in "${ids[@]}"; do
  echo "=== $id"
  if node $dir/plan-lessons.mjs "$id" && node $dir/voice-lessons.mjs "$id" && node $dir/render-lessons.mjs "$id"; then
    for lang in vi en; do
      motion/.venv/bin/python $dir/check-voice-sync.py "$id" "$lang" 2>&1 | grep -v -i warn || failed+=("$id:$lang:sync")
    done
  else
    failed+=("$id")
  fi
done
echo "=== done: ${#ids[@]} lessons, ${#failed[@]} problems ${failed[*]:-}"
