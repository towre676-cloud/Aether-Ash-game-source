#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
npm test
node -e "import('./src/scenario-sim.mjs').then(m=>console.log(JSON.stringify(m.sampleLoop('replay-5.28'),null,2)))"
