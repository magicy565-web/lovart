#!/usr/bin/env bash
set -euo pipefail

skill_dir="$(cd "$(dirname "$0")/.." && pwd)"
project_dir="$(cd "$skill_dir/../.." && pwd)"

"$project_dir/node_modules/.bin/tsc" -p "$skill_dir/tsconfig.test.json"
node --test \
  "/tmp/lovart-design-reinforcement-tests/skills/design-reinforcement/tests/evidence-grounding.test.js" \
  "/tmp/lovart-design-reinforcement-tests/skills/design-reinforcement/tests/deterministic-output.test.js" \
  "/tmp/lovart-design-reinforcement-tests/skills/design-reinforcement/tests/product-brief-gate.test.js"
