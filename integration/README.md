# Integration: graph-address -> dakar-cadastre

## sync_properties.py

Reads building records from the graph-address SQLite database and registers
them on the Hyperledger Fabric ledger via the API gateway.

```bash
# Dry run — shows what would be pushed, no writes
python3 sync_properties.py --dry-run

# Sync a single H3-9 zone
python3 sync_properties.py --h3-zone 8954ac27307ffff

# Full sync (thousands of buildings — run overnight)
python3 sync_properties.py --db ~/Desktop/graph-address/backend/data/dakar.db
```

## Data flow

```
graph-address digitize -> dakar.db (nodes + building_properties)
                              |
                    sync_properties.py
                              |
              Fabric API gateway (port 3000)
                              |
        PropertyContract.RegisterProperty(id, json)
                              |
    Immutable ledger entry — Municipality + Revenue + CivilSociety peers
```

## Building ID as anchor

The graph-address phonetic ID (e.g. `BLUE-FISH-42@8954ac27307ffff`) is the
permanent key on the ledger. It encodes both the unique identifier and the
H3-9 zone, enabling zone-level queries without secondary indices.
