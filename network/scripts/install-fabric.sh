#!/bin/bash
# Downloads Hyperledger Fabric binaries (cryptogen, configtxgen, osnadmin, peer, orderer)
# into network/bin/ — only needs to run once.
set -e

FABRIC_VERSION=2.5.9
CA_VERSION=1.5.9
ARCH=$(uname -m)
OS=$(uname -s | tr '[:upper:]' '[:lower:]')

case "$ARCH" in
  arm64|aarch64) ARCH=arm64 ;;
  x86_64)        ARCH=amd64 ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$NETWORK_DIR/bin"

mkdir -p "$BIN_DIR"

echo "==> Downloading Fabric $FABRIC_VERSION binaries for $OS/$ARCH..."
FABRIC_URL="https://github.com/hyperledger/fabric/releases/download/v${FABRIC_VERSION}/hyperledger-fabric-${OS}-${ARCH}-${FABRIC_VERSION}.tar.gz"
curl -fsSL "$FABRIC_URL" | tar -xz -C "$NETWORK_DIR"

echo "==> Downloading Fabric CA $CA_VERSION binaries..."
CA_URL="https://github.com/hyperledger/fabric-ca/releases/download/v${CA_VERSION}/hyperledger-fabric-ca-${OS}-${ARCH}-${CA_VERSION}.tar.gz"
curl -fsSL "$CA_URL" | tar -xz -C "$NETWORK_DIR"

echo "==> Pulling Fabric Docker images..."
for image in peer orderer tools; do
  docker pull hyperledger/fabric-${image}:${FABRIC_VERSION}
done
docker pull hyperledger/fabric-ca:${CA_VERSION}
docker pull couchdb:3.3.2

echo ""
echo "==> Done. Fabric binaries installed in $BIN_DIR"
echo "    Add to PATH: export PATH=\"$BIN_DIR:\$PATH\""
