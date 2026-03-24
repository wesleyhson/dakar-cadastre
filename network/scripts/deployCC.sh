#!/bin/bash
# Packages, installs, approves, and commits the cadastre chaincode on all 3 orgs.
# Requires: network up (./scripts/up.sh), Go toolchain, chaincode in ../chaincode/property/
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
REPO_DIR="$(dirname "$NETWORK_DIR")"
BIN_DIR="$NETWORK_DIR/bin"
export PATH="$BIN_DIR:$PATH"
export FABRIC_CFG_PATH="$NETWORK_DIR"

CHANNEL_ID="dakar-cadastre"
CC_NAME="cadastre"
CC_VERSION="1.0"
CC_SEQUENCE=1
CC_PATH="$REPO_DIR/chaincode/property"
ORDERER_TLS_CA="$NETWORK_DIR/crypto-config/ordererOrganizations/dakar.sn/orderers/orderer.dakar.sn/tls/ca.crt"

# ── Package chaincode ──────────────────────────────────────────────────────
echo "==> Vendoring Go dependencies..."
(cd "$CC_PATH" && go mod vendor)

echo "==> Packaging chaincode..."
peer lifecycle chaincode package /tmp/${CC_NAME}.tar.gz \
  --path "$CC_PATH" \
  --lang golang \
  --label ${CC_NAME}_${CC_VERSION}

PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid /tmp/${CC_NAME}.tar.gz)
echo "    Package ID: $PACKAGE_ID"

# ── Helper: set peer env ────────────────────────────────────────────────────
use_peer() {
  local MSPID="$1" ADDR="$2" TLS_CERT="$3" MSP_PATH="$4"
  export CORE_PEER_LOCALMSPID="$MSPID"
  export CORE_PEER_ADDRESS="$ADDR"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_TLS_ROOTCERT_FILE="$TLS_CERT"
  export CORE_PEER_MSPCONFIGPATH="$MSP_PATH"
}

MUNIC_TLS="$NETWORK_DIR/crypto-config/peerOrganizations/municipality.dakar.sn/peers/peer0.municipality.dakar.sn/tls/ca.crt"
MUNIC_MSP="$NETWORK_DIR/crypto-config/peerOrganizations/municipality.dakar.sn/users/Admin@municipality.dakar.sn/msp"
REV_TLS="$NETWORK_DIR/crypto-config/peerOrganizations/revenue.gouv.sn/peers/peer0.revenue.gouv.sn/tls/ca.crt"
REV_MSP="$NETWORK_DIR/crypto-config/peerOrganizations/revenue.gouv.sn/users/Admin@revenue.gouv.sn/msp"
OBS_TLS="$NETWORK_DIR/crypto-config/peerOrganizations/observer.dakar.sn/peers/peer0.observer.dakar.sn/tls/ca.crt"
OBS_MSP="$NETWORK_DIR/crypto-config/peerOrganizations/observer.dakar.sn/users/Admin@observer.dakar.sn/msp"
ORDERER_FLAGS="--orderer localhost:7050 --ordererTLSHostnameOverride orderer.dakar.sn --tls --cafile $ORDERER_TLS_CA"

# ── Install on all peers ───────────────────────────────────────────────────
echo "==> Installing on peer0.municipality.dakar.sn..."
use_peer MunicipalityMSP localhost:7051 "$MUNIC_TLS" "$MUNIC_MSP"
peer lifecycle chaincode install /tmp/${CC_NAME}.tar.gz

echo "==> Installing on peer0.revenue.gouv.sn..."
use_peer NationalRevenueMSP localhost:9051 "$REV_TLS" "$REV_MSP"
peer lifecycle chaincode install /tmp/${CC_NAME}.tar.gz

echo "==> Installing on peer0.observer.dakar.sn..."
use_peer CivilSocietyMSP localhost:10051 "$OBS_TLS" "$OBS_MSP"
peer lifecycle chaincode install /tmp/${CC_NAME}.tar.gz

# ── Approve for each org ───────────────────────────────────────────────────
echo "==> Approving for MunicipalityMSP..."
use_peer MunicipalityMSP localhost:7051 "$MUNIC_TLS" "$MUNIC_MSP"
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 --ordererTLSHostnameOverride orderer.dakar.sn \
  --tls --cafile "$ORDERER_TLS_CA" \
  --channelID "$CHANNEL_ID" --name "$CC_NAME" --version "$CC_VERSION" \
  --package-id "$PACKAGE_ID" --sequence "$CC_SEQUENCE"

echo "==> Approving for NationalRevenueMSP..."
use_peer NationalRevenueMSP localhost:9051 "$REV_TLS" "$REV_MSP"
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 --ordererTLSHostnameOverride orderer.dakar.sn \
  --tls --cafile "$ORDERER_TLS_CA" \
  --channelID "$CHANNEL_ID" --name "$CC_NAME" --version "$CC_VERSION" \
  --package-id "$PACKAGE_ID" --sequence "$CC_SEQUENCE"

echo "==> Approving for CivilSocietyMSP..."
use_peer CivilSocietyMSP localhost:10051 "$OBS_TLS" "$OBS_MSP"
peer lifecycle chaincode approveformyorg \
  -o localhost:7050 --ordererTLSHostnameOverride orderer.dakar.sn \
  --tls --cafile "$ORDERER_TLS_CA" \
  --channelID "$CHANNEL_ID" --name "$CC_NAME" --version "$CC_VERSION" \
  --package-id "$PACKAGE_ID" --sequence "$CC_SEQUENCE"

# ── Check commit readiness ─────────────────────────────────────────────────
echo "==> Checking commit readiness..."
use_peer MunicipalityMSP localhost:7051 "$MUNIC_TLS" "$MUNIC_MSP"
peer lifecycle chaincode checkcommitreadiness \
  --channelID "$CHANNEL_ID" --name "$CC_NAME" --version "$CC_VERSION" \
  --sequence "$CC_SEQUENCE" --output json

# ── Commit ─────────────────────────────────────────────────────────────────
echo "==> Committing chaincode definition..."
use_peer MunicipalityMSP localhost:7051 "$MUNIC_TLS" "$MUNIC_MSP"
peer lifecycle chaincode commit \
  -o localhost:7050 --ordererTLSHostnameOverride orderer.dakar.sn \
  --tls --cafile "$ORDERER_TLS_CA" \
  --channelID "$CHANNEL_ID" --name "$CC_NAME" --version "$CC_VERSION" \
  --sequence "$CC_SEQUENCE" \
  --peerAddresses localhost:7051 --tlsRootCertFiles "$MUNIC_TLS" \
  --peerAddresses localhost:9051 --tlsRootCertFiles "$REV_TLS" \
  --peerAddresses localhost:10051 --tlsRootCertFiles "$OBS_TLS"

echo ""
echo "==> Chaincode '$CC_NAME' committed on channel '$CHANNEL_ID'."
echo "    You can now start the gateway: cd ../gateway && npm start"
