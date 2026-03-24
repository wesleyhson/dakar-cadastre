"""
sync_properties.py — Push building records from graph-address SQLite DB
to the dakar-cadastre Hyperledger Fabric API gateway.

Run: python3 sync_properties.py --db ~/Desktop/graph-address/backend/data/dakar.db \
                                  --api http://localhost:3000 \
                                  --dry-run
"""
import argparse
import json
import sqlite3
import sys
import time
import urllib.request
import urllib.error


def get_db(path):
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    return db


def push_property(api_url, building, dry_run=False):
    """POST a property registration to the Fabric API gateway."""
    payload = {
        "id": building["id"],
        "lat": building["lat"],
        "lon": building["lon"],
        "h3_9": building["h3_9"] or "",
        "h3_11": building["h3_11"] or "",
        "useType": building.get("use_type") or "residential",
        "dataSource": building.get("data_source") or "imported",
        "status": "active",
        # Ownership and valuation filled in via property pane in graph-address
        "ownerName": building.get("owner") or "",
        "tenureType": "informal_occupancy",
        "assessedValueCFA": 0,
        "valuationMethod": "proxy",
    }
    if dry_run:
        print(f"  [dry-run] Would register: {payload['id']}")
        return True
    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            f"{api_url}/properties/register",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except urllib.error.URLError as e:
        print(f"  [warn] Failed to push {payload['id']}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Sync graph-address buildings to dakar-cadastre Fabric ledger")
    parser.add_argument("--db",      default="~/Desktop/graph-address/backend/data/dakar.db")
    parser.add_argument("--api",     default="http://localhost:3000")
    parser.add_argument("--limit",   type=int, default=0, help="0 = all")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--h3-zone", help="Only sync buildings in this H3-9 zone")
    args = parser.parse_args()

    import os
    db_path = os.path.expanduser(args.db)
    db = get_db(db_path)

    query = "SELECT n.*, p.owner, p.use_type, p.floors, p.notes FROM nodes n LEFT JOIN building_properties p ON p.node_id = n.id"
    params = []
    if args.h3_zone:
        query += " WHERE n.h3_9 = ?"
        params.append(args.h3_zone)
    if args.limit:
        query += f" LIMIT {args.limit}"

    rows = db.execute(query, params).fetchall()
    db.close()

    print(f"Syncing {len(rows)} buildings {'(dry run)' if args.dry_run else ''}")
    ok = failed = 0
    for i, row in enumerate(rows):
        success = push_property(args.api, dict(row), args.dry_run)
        if success:
            ok += 1
        else:
            failed += 1
        if (i + 1) % 100 == 0:
            print(f"  {i+1}/{len(rows)} — {ok} ok, {failed} failed")
        if not args.dry_run:
            time.sleep(0.02)  # don't hammer the API

    print(f"\nDone: {ok} synced, {failed} failed")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
