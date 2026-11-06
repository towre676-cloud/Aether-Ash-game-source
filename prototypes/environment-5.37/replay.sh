#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
npm test
python -m unittest discover -s production/tests -v
python production/BUILD_STANDALONE_PREVIEW.py
