# Public Explorer (stub)

## Purpose

A zero-authentication read-only web interface for citizen access to the
dakar-cadastre ledger. Anyone can look up any property, view its ownership
history, check tax payment status, and see how revenue collected in their
zone has been spent.

## Planned API endpoints (via Node.js gateway)

```
GET /property/:id                    — property record
GET /property/:id/history            — full ownership + update history
GET /property/:id/assessments        — all tax assessments
GET /zone/:h3_9/properties           — all properties in zone
GET /zone/:h3_9/revenue/:year        — total tax collected
GET /zone/:h3_9/disbursements/:year  — spending in zone
GET /search?q=...                    — search by owner name / street name
```

## Trust model

The explorer reads directly from Fabric via the API gateway using a
read-only identity. No private keys on the public-facing service.
CivilSociety org runs its own peer — even if the gateway is compromised,
the ledger is independently verifiable.

## Status

Not yet built. Next milestone after API gateway.
