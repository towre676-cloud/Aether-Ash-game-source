#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
python3 -m http.server 8000
