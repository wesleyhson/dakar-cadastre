# Integration Notes

## Current state
- graph-address has ~900k+ buildings digitised on Dakar peninsula
- building_properties table stores: owner, use_type, floors, notes
- H3-9 sector hierarchy already built (used for Properties pane navigation)

## Sync pipeline
1. Field teams collect data via graph-address digitize mode
2. Properties pane used to fill in owner, use_type, floors, notes
3. sync_properties.py pushes records to Fabric via API gateway
4. On-chain PropertyContract.RegisterProperty anchors the record permanently

## Next milestones
- [ ] Deploy Fabric test network (docker-compose up)
- [ ] Deploy chaincode to test channel
- [ ] Build Node.js API gateway (Fabric SDK -> REST)
- [ ] Extend building_properties with: national_id, phone, tenure_type, area_m2
- [ ] Build public explorer frontend (read-only, zero auth required)
- [ ] Define zone policies for Dakar H3-9 cells (tax rates per zone class)
- [ ] Pilot with one H3-9 zone (~1,800 buildings) end-to-end

## Fiscal impact estimate (Dakar peninsula)
- ~900,000 buildings
- Average assessed value: ~3M CFA (~$5,000) per property
- Average tax rate: 0.5%
- Annual tax per property: ~15,000 CFA (~$25)
- Total potential annual revenue: ~13.5B CFA (~$22M) conservative
- At higher density zones: up to $500M–$1B with commercial properties included
