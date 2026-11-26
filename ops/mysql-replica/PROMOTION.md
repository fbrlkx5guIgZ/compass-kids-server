# Database promotion runbook

The local replica is a manually promoted standby. Never enable it while host
MySQL can still accept writes.

## Preflight

```sh
sudo compass-kids-db-status
sudo compass-kids-db-promote \
  --planned \
  --incident DRILL-YYYYMMDD \
  --dry-run
```

Planned promotion requires `SAFE_TO_PROMOTE=yes`.

## Planned promotion

Schedule a maintenance window, then run:

```sh
sudo compass-kids-db-promote \
  --planned \
  --incident INC-YYYYMMDD-NNN \
  --confirm-promote
```

The script stops application writers, captures the source GTID, stops and
masks host MySQL, waits for the replica, makes it writable, persists HAProxy
and role configuration, starts both applications, and validates the write
path.

Artifacts are written to:

```text
/var/lib/compass-kids-dr/INC-YYYYMMDD-NNN/
```

## Emergency promotion

Use emergency mode only when host MySQL cannot provide its final GTID:

```sh
sudo compass-kids-db-promote \
  --emergency \
  --incident INC-YYYYMMDD-NNN \
  --accept-potential-data-loss \
  --confirm-promote
```

The explicit loss flag acknowledges that transactions not received by the
replica cannot be detected or recovered by the script.

## Failure during promotion

Do not start host MySQL merely because the script stopped. Inspect the
incident's `actions.log`, HAProxy configuration, replica role, and GTIDs.
Starting two writable databases can create split brain.

If failure occurred before the replica became writable and the old primary is
known good, an operator may unmask and start it, restore `haproxy.before.cfg`,
then start the applications. Record that recovery in `ops/CHANGELOG.md`.

## Rejoin and failback

There is no direct failback. Once the promoted database accepts writes, host
MySQL is stale. The safe procedure is:

1. Keep HAProxy on the promoted database.
2. Take a fresh consistent seed from the promoted database.
3. Rebuild host MySQL from that seed as a read-only replica.
4. Establish GTID replication from the promoted database.
5. Verify catch-up, errors, backups, and application accounts.
6. Perform another controlled switchover using the same fencing principles.

`compass-kids-db-failback` is a non-mutating guard that refuses unsafe direct
failback.
