#!/bin/sh
set -eu
cd "$(dirname "$0")"
python build-standalone.py
node --test tests/*.test.mjs
