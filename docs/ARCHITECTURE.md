# dakar-cadastre — Architecture

## Overview

A Hyperledger Fabric permissioned blockchain for property registration,
taxation, and revenue transparency in Dakar, Senegal. Designed for informal
urban settlement contexts where trust in government fiscal systems is low.

## Network topology

```
+-------------------------------------------------------------+
|                    DakarCadastre Channel                     |
|                                                              |
|  +--------------+  +--------------+  +------------------+  |
|  | Municipality |  |   National   |  |  Civil Society   |  |
|  |   (2 peers)  |  |  Revenue     |  |   (observer)     |  |
|  |              |  |  (1 peer)    |  |   (1 peer)       |  |
|  | WRITE: all   |  | WRITE: tax   |  | WRITE: none      |  |
|  | READ: all    |  | READ: all    |  | READ: all        |  |
|  +--------------+  +--------------+  +------------------+  |
|                                                              |
|  Orderer (Raft consensus): orderer.dakar.sn:7050             |
|  State DB: CouchDB (enables rich JSON queries by zone)       |
+-------------------------------------------------------------+
```

## Chaincode contracts

| Contract | Purpose |
|---|---|
| PropertyContract | Register/update buildings, transfer ownership, query by zone |
| TaxContract | Create assessments, record payments, query zone revenue |
| DisbursementContract | Approve spending, mark complete, attach evidence |
| ZoneContract | Set H3-zone tax rates, zoning class, permitted uses |

## Trust model

- **Municipality** (Dakar city) — primary data entry (assessors, collectors)
- **National Revenue** (DGID) — co-signs tax assessments, audit access
- **Civil Society** — read-only observer node; any NGO/journalist can run one
- **Public explorer** — unauthenticated read API; anyone can query any property

## Integration with graph-address

graph-address provides the **spatial truth**: GPS coordinates, H3 indices,
building IDs, satellite-derived footprints, and field-collected property data.

dakar-cadastre provides the **fiscal truth**: immutable ownership records,
tax assessments, payment history, and disbursement accountability.

The building ID (`WORD-WORD-NN@H3CELL`) is the permanent anchor key shared
between both systems.
