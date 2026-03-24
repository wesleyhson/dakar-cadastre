#!/bin/bash
# Tears down the network and optionally removes all data volumes.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Stopping containers..."
docker-compose -f "$NETWORK_DIR/docker-compose.yml" down

if [ "$1" = "--clean" ]; then
  echo "==> Removing volumes and crypto artifacts..."
  docker-compose -f "$NETWORK_DIR/docker-compose.yml" down -v
  rm -rf "$NETWORK_DIR/crypto-config"
  rm -rf "$NETWORK_DIR/channel-artifacts"
  echo "    Done. Run ./scripts/generate.sh to recreate crypto material."
fi
