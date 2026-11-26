# MySQL replica

This Compose project creates the local MySQL 8 read-only replica at
`172.22.0.3:3306`. Its volume is separate from the frozen MySQL 5.7 snapshot.

Runtime secrets are stored in `/etc/compass-kids/mysql-replica.env`. The
replication password is not committed.

Replication resumes automatically after a normal container restart. Promotion
must fence the old primary, catch up relay logs, stop replication, turn off
both read-only variables, and explicitly switch HAProxy. Do not configure
automatic promotion in this two-node topology.

`compass-kids-db-replica-check.timer` validates the container, replication
threads, errors, GTID application, and read-only state every minute. A failed
unit must be connected to the production alerting system; the timer alone only
records failure in systemd/journald.

Operational commands:

```text
compass-kids-db-status    Read-only source, replica, GTID, and HAProxy status
compass-kids-db-promote   Guarded planned or emergency promotion
compass-kids-db-failback  Non-mutating guard against unsafe direct failback
```

Read `PROMOTION.md` and run promotion with `--dry-run` before scheduling a
production exercise.
