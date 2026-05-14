#!/bin/bash
cd "$(dirname "$0")"
# Build first if dist doesn't exist, then start server
if [ ! -d "dist" ]; then
  pnpm run build
fi
node server.cjs
