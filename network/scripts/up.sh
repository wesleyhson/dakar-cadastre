#!/bin/bash
# Starts the Dakar Cadastre Fabric network, creates the channel,
# and joins all peers. Requires crypto material to already exist (run generate.sh first).
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$NETWORK_DIR/bin"
export PATH="$BIN_DIR:$PATH"
export FABRIC_CFG_PATH="$NETWORK_DIR"

CHANNEL_ID="dakar-cadastre"
ORDERER_TLS_CA="$NETWORK_DIR/crypto-config/ordererOrganizations/dakar.sn/orderers/orderer.dakar.sn/tls/ca.crt"
ORDERER_ADMIN_TLS_CA="$NETWORK_DIR/crypto-config/ordererOrganizations/dakar.sn/ca/ca.dakar.sn-cert.pem"

# ── Preflight ──────────────────────────────────────────────────────────────
if [ ! -d "$NETWORK_DIR/crypto-config" ]; then
  echo "ERROR: crypto-config/ not found. Run ./scripts/generate.sh first."
  exit 1
fi

# ── Start containers ───────────────────────────────────────────────────────
echo "==> Starting containers..."
docker-compose -f "$NETWORK_DIR/docker-compose.yml" up -d
echo "    Waiting 5s for containers to initialise..."
sleep 5

# ── Create channel on orderer (channel participation API) ──────────────────
echo "==> Joining orderer to channel via osnadmin..."
osnadmin channel join \
  --channelID "$CHANNEL_ID" \
  --config-block "$NETWORK_DIR/channel-artifacts/${CHANNEL_ID}.block" \
  -o localhost:7053 \
  --ca-file "$ORDERER_TLS_CA" \
  --client-cert "$NETWORK_DIR/crypto-config/ordererOrganizations/dakar.sn/orderers/orderer.dakar.sn/tls/server.crt" \
  --client-key "$NETWORK_DIR/crypto-config/ordererOrganizations/dakar.sn/orderers/orderer.dakar.sn/tls/server.key"

sleep 2

# ── Join peers ─────────────────────────────────────────────────────────────
join_peer() {
  local ORG="$1" MSPID="$2" PEER_ADDR="$3" PEER_PORT="$4" DOMAIN="$5"
  echo "==> Joining peer0.$DOMAIN..."
  export CORE_PEER_LOCALMSPID="$MSPID"
  export CORE_PEER_ADDRESS="$PEER_ADDR"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK_DIR/crypto-config/peerOrganizations/$DOMAIN/peers/peer0.$DOMAIN/tls/ca.crt"
  export CORE_PEER_MSPCONFIGPATH="$NETWORK_DIR/crypto-config/peerOrganizations/$DOMAIN/users/Admin@$DOMAIN/msp"

  peer channel join \
    -b "$NETWORK_DIR/channel-artifacts/${CHANNEL_ID}.block" \
    --orderer localhost:7050 \
    --ordererTLSHostnameOverride orderer.dakar.sn \
    --tls --cafile "$ORDERER_TLS_CA"
}

join_peer "municipality" "MunicipalityMSP" "localhost:7051" "7051"  "municipality.dakar.sn"
join_peer "revenue"      "NationalRevenueMSP" "localhost:9051" "9051" "revenue.gouv.sn"
join_peer "observer"     "CivilSocietyMSP"    "localhost:10051" "10051" "observer.dakar.sn"

# Join peer1.municipality
echo "==> Joining peer1.municipality.dakar.sn..."
export CORE_PEER_LOCALMSPID="MunicipalityMSP"
export CORE_PEER_ADDRESS="localhost:8051"
export CORE_PEER_TLS_ROOTCERT_FILE="$NETWORK_DIR/crypto-config/peerOrganizations/municipality.dakar.sn/peers/peer1.municipality.dakar.sn/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="$NETWORK_DIR/crypto-config/peerOrganizations/municipality.dakar.sn/users/Admin@municipality.dakar.sn/msp"
peer channel join \
  -b "$NETWORK_DIR/channel-artifacts/${CHANNEL_ID}.block" \
  --orderer localhost:7050 \
  --ordererTLSHostnameOverride orderer.dakar.sn \
  --tls --cafile "$ORDERER_TLS_CA"

echo ""
echo "==> Network is up. Channel: $CHANNEL_ID"
echo "    Run ./scripts/deployCC.sh to install and commit the cadastre chaincode."
