# dakar-cadastre — Claude Context

## What this is
Hyperledger Fabric permissioned blockchain for property registration, taxation,
and transparent revenue disbursement in Dakar, Senegal. Part of a sovereign
geospatial + fiscal infrastructure stack for informal urban settlements.

## Companion repos
- `~/Desktop/graph-address/` — spatial data collection + addressing system
  - Provides building IDs, GPS coords, H3 indices, property data
  - Building IDs are the anchor keys on this ledger
- `~/Desktop/zstratum/` — vector tile server (serves graph-address spatial data)
  - Tile DB: `~/Desktop/dakar_tiles.db`

## Stack
- Hyperledger Fabric 2.5 (permissioned blockchain)
- Go chaincode (fabric-contract-api-go)
- CouchDB state database (enables rich JSON queries by zone/year)
- Docker Compose for local dev network
- Python sync script to pull from graph-address SQLite DB

## 3 organisations on the network
1. **Municipality** (municipality.dakar.sn) — WRITE all, primary data entry
2. **National Revenue / DGID** (revenue.gouv.sn) — WRITE tax records, READ all
3. **Civil Society observer** (observer.dakar.sn) — READ only, public accountability

## 4 chaincode contracts
- `PropertyContract` — register/update buildings, transfer ownership
- `TaxContract` — annual assessments + payment recording
- `DisbursementContract` — where collected revenue is spent (public accountability)
- `ZoneContract` — H3-9 zone tax rates and zoning class

## Key design decisions
- Building ID from graph-address (`BLUE-FISH-42@8954ac27307ffff`) is the
  permanent on-chain key — encodes both identity and H3 zone
- CouchDB enables `QueryByZone(h3_9)` rich queries without secondary indices
- Civil society observer node = any NGO/journalist can verify the ledger
- Public explorer (to build) = zero-auth read API for citizen transparency

## Current status
- Chaincode: written, not yet deployed
- Network: docker-compose config written, not yet spun up
- Integration: sync_properties.py written, not yet tested against live Fabric
- Next step: `docker-compose -f network/docker-compose.yml up` + deploy chaincode

## Start local dev network
```bash
cd ~/Desktop/dakar-cadastre/network
# Prerequisites: Docker Desktop, Hyperledger Fabric binaries in PATH
# Download fabric binaries: curl -sSL https://bit.ly/2ysbOFE | bash -s
docker-compose up -d
```
