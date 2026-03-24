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
echo "    Waiting for orderer to be ready..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:7053/participation/v1/channels >/dev/null 2>&1; then
    echo "    Orderer ready after ${i}s"
    break
  fi
  sleep 1
done

# ── Create channel on orderer (channel participation API) ──────────────────
echo "==> Joining orderer to channel via osnadmin..."
osnadmin channel join \
  --channelID "$CHANNEL_ID" \
  --config-block "$NETWORK_DIR/channel-artifacts/${CHANNEL_ID}.block" \
  -o localhost:7053

sleep 2

# ── Copy genesis block + admin MSPs into containers, then join ─────────────
echo "==> Copying genesis block and admin MSPs into peer containers..."
for CONTAINER in peer0.municipality.dakar.sn peer1.municipality.dakar.sn peer0.revenue.gouv.sn peer0.observer.dakar.sn; do
  docker cp "$NETWORK_DIR/channel-artifacts/${CHANNEL_ID}.block" "${CONTAINER}:/tmp/"
done
docker cp "$NETWORK_DIR/crypto-config/peerOrganizations/municipality.dakar.sn/users/Admin@municipality.dakar.sn/msp" peer0.municipality.dakar.sn:/tmp/admin-msp
docker cp "$NETWORK_DIR/crypto-config/peerOrganizations/municipality.dakar.sn/users/Admin@municipality.dakar.sn/msp" peer1.municipality.dakar.sn:/tmp/admin-msp
docker cp "$NETWORK_DIR/crypto-config/peerOrganizations/revenue.gouv.sn/users/Admin@revenue.gouv.sn/msp"           peer0.revenue.gouv.sn:/tmp/admin-msp
docker cp "$NETWORK_DIR/crypto-config/peerOrganizations/observer.dakar.sn/users/Admin@observer.dakar.sn/msp"       peer0.observer.dakar.sn:/tmp/admin-msp

join_peer_docker() {
  local CONTAINER="$1" MSPID="$2" ADDR="$3"
  echo "==> Joining $CONTAINER..."
  docker exec \
    -e CORE_PEER_LOCALMSPID="$MSPID" \
    -e CORE_PEER_TLS_ENABLED=true \
    -e CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt \
    -e CORE_PEER_MSPCONFIGPATH=/tmp/admin-msp \
    -e CORE_PEER_ADDRESS="$ADDR" \
    "$CONTAINER" \
    peer channel join \
      -b "/tmp/${CHANNEL_ID}.block" \
      --orderer orderer.dakar.sn:7050 \
      --ordererTLSHostnameOverride orderer.dakar.sn \
      --tls --cafile /etc/hyperledger/fabric/tls/ca.crt
}

join_peer_docker peer0.municipality.dakar.sn MunicipalityMSP  peer0.municipality.dakar.sn:7051
join_peer_docker peer1.municipality.dakar.sn MunicipalityMSP  peer1.municipality.dakar.sn:8051
join_peer_docker peer0.revenue.gouv.sn       NationalRevenueMSP peer0.revenue.gouv.sn:9051
join_peer_docker peer0.observer.dakar.sn     CivilSocietyMSP  peer0.observer.dakar.sn:10051

echo ""
echo "==> Network is up. Channel: $CHANNEL_ID"
echo "    Run ./scripts/deployCC.sh to install and commit the cadastre chaincode."
