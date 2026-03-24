#!/bin/bash
# Generates crypto material + channel genesis block.
# Run from network/ directory: ./scripts/generate.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$NETWORK_DIR/bin"
export PATH="$BIN_DIR:$PATH"
export FABRIC_CFG_PATH="$NETWORK_DIR"

CHANNEL_ID="dakar-cadastre"

echo "==> Checking for Fabric binaries..."
if ! command -v cryptogen &>/dev/null; then
  echo "    cryptogen not found. Run: ./scripts/install-fabric.sh"
  exit 1
fi

echo "==> Cleaning previous artifacts..."
rm -rf "$NETWORK_DIR/crypto-config"
rm -rf "$NETWORK_DIR/channel-artifacts"
mkdir -p "$NETWORK_DIR/channel-artifacts"

echo "==> Generating crypto material with cryptogen..."
cryptogen generate \
  --config="$NETWORK_DIR/crypto-config.yaml" \
  --output="$NETWORK_DIR/crypto-config"

echo "==> Generating channel genesis block..."
configtxgen \
  -profile DakarCadastreChannel \
  -outputBlock "$NETWORK_DIR/channel-artifacts/${CHANNEL_ID}.block" \
  -channelID "$CHANNEL_ID"

echo ""
echo "==> Generated:"
echo "    crypto-config/   — MSP + TLS certificates for all orgs"
echo "    channel-artifacts/${CHANNEL_ID}.block — channel genesis block"
