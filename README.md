# dakar-cadastre

Hyperledger Fabric network and chaincode for sovereign property registration,
taxation, and transparent fiscal governance in Dakar, Senegal.

**Part of the graph-address sovereign geospatial stack.**

## The problem

Dakar peninsula has ~900,000+ buildings. The majority are in informal
settlements with no formal addresses, no ownership records, and no property
tax base. Municipal governments rely on central transfers rather than local
fiscal capacity. Citizens have no visibility into how collected revenue is spent.

## What this does

1. **Property registration** — every building gets a permanent on-chain record
   anchored to its graph-address phonetic ID and GPS coordinates
2. **Tax assessment** — zone-level policies define rates; proxy valuation formula
   uses floor area x zone factor x use multiplier
3. **Payment recording** — collectors record payments (cash, Orange Money, Wave)
   on-chain with receipts
4. **Disbursement transparency** — every CFA spent is recorded with purpose,
   zone, contractor, and evidence hash (IPFS photos/invoices)
5. **Public accountability** — civil society observer node + public read API;
   anyone can audit the full chain from payment to project completion

## Network

3 organisations, 4 peers, Raft orderer:
- **Municipality of Dakar** — primary data entry (assessors, collectors)
- **DGID / National Revenue** — audit and co-endorsement
- **Civil Society observer** — read-only accountability node

## Chaincode

| Contract | Key functions |
|---|---|
| PropertyContract | RegisterProperty, UpdateProperty, TransferOwnership, QueryByZone |
| TaxContract | CreateAssessment, RecordPayment, GetZoneRevenue |
| DisbursementContract | ApproveDisbursement, MarkComplete, GetZoneDisbursements |
| ZoneContract | SetZonePolicy, GetZonePolicy |

## Quick start (local dev)

```bash
# Prerequisites: Docker Desktop, Go 1.21+
# Download Hyperledger Fabric 2.5 binaries
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0

cd network
docker-compose up -d

# Deploy chaincode (after network is up)
./scripts/deploy-chaincode.sh
```

## Integration with graph-address

```bash
# Sync buildings from graph-address DB to ledger
cd integration
python3 sync_properties.py \
  --db ~/Desktop/graph-address/backend/data/dakar.db \
  --h3-zone 8954ac27307ffff \
  --dry-run
```

## Fiscal impact (conservative estimate)

| Metric | Value |
|---|---|
| Buildings on peninsula | ~900,000 |
| Average assessed value | 3M CFA (~$5,000) |
| Annual tax rate | 0.5% |
| Revenue per property | 15,000 CFA (~$25/yr) |
| Total annual potential | 13.5B CFA (~$22M) |
| With commercial premium | Up to $500M–$1B |

Current Dakar municipal budget: ~$200–300M/yr.
A functioning cadastre could triple it.

## Roadmap

- [x] Chaincode data model (property, tax, disbursement, zone policy)
- [x] Network config (3 orgs, Raft orderer, CouchDB state)
- [x] Integration sync script (graph-address -> Fabric)
- [ ] Deploy test network
- [ ] Node.js API gateway (Fabric SDK -> REST)
- [ ] Public explorer frontend
- [ ] Zone policy definitions for Dakar H3-9 cells
- [ ] Pilot: one H3-9 zone (~1,800 buildings) end-to-end
- [ ] Mobile collector app (PWA)
- [ ] DGID integration

## License
MIT — designed for reuse by any municipality
