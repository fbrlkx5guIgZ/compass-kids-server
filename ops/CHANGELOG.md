# Production operations log

This is the append-only handoff log for application and infrastructure work.
Newest entries go first. Product release notes remain in `/CHANGELOG.md`.

Do not include secrets. Use paths and environment variable names instead.

## 2026-11-26 20:32 CST - Codex - Add guarded database promotion tooling

Status: completed

Objective:
Turn the manual database promotion procedure into an auditable, guarded
operation without enabling automatic failover or unsafe direct failback.

Changes:
- Added `compass-kids-db-status`, a read-only report covering source state,
  source and replica GTIDs, replica health and errors, read-only variables, and
  HAProxy backend roles. It returns success only when planned promotion
  prerequisites are satisfied.
- Added `compass-kids-db-promote` with planned and emergency modes, an incident
  identifier, a non-mutating dry run, an exclusive `flock`, and explicit
  confirmation flags.
- Planned promotion stops application writers, records the final source GTID,
  stops and masks host MySQL, waits for GTID application, promotes the
  replica, persists the writable role and HAProxy configuration, restarts the
  applications, and verifies a rollback write transaction.
- Emergency mode requires both `--accept-potential-data-loss` and
  `--confirm-promote`. It still requires a healthy replica with all received
  GTIDs applied.
- Promotion artifacts and action logs are written under
  `/var/lib/compass-kids-dr/<incident>/`.
- Added `compass-kids-db-failback`, a non-mutating guard that rejects direct
  failback to a stale former primary.
- Added `PROMOTION.md` with planned, emergency, failure recovery, and safe
  rejoin guidance.

Validation:
- Target-server `bash -n` passed for all three scripts. ShellCheck was not
  installed, so ShellCheck validation was unavailable.
- `compass-kids-db-status` reported `SAFE_TO_PROMOTE=yes`.
- Planned `--dry-run` printed every mutation stage without changing services
  or configuration file hashes.
- A promotion invocation without `--confirm-promote` exited with status 2.
- The failback guard exited with status 2 and made no changes.
- An isolated role rehearsal kept the replica out of HAProxy, stopped
  replication, temporarily disabled both read-only variables, executed an
  application-account transaction that changed zero rows and rolled back,
  then restored double read-only and both replication threads.
- After rehearsal, GTIDs remained caught up, replication errors remained zero,
  `host_mysql` was `UP/L4OK`, and `docker_mysql` remained `MAINT`.

Rollback:
- Remove the three commands from `/usr/local/sbin` and retain the runbook.
- No production role switch or committed data mutation occurred during this
  change.

Remaining:
- Schedule a maintenance window for a full production promotion exercise.
  That exercise changes the active database and requires a fresh-seed rejoin
  procedure before switching back.
- Add ShellCheck to CI and connect promotion/replica events to external
  alerting.

## 2026-11-26 20:00 CST - Codex - Create real-time local MySQL replica

Status: completed

Objective:
Create a current local database standby without modifying the frozen MySQL 5.7
migration snapshot or enabling unsafe automatic database promotion.

Changes:
- Pulled and verified the exact MySQL 8.0.46 container image, pinned in Compose
  by digest.
- Enabled GTID consistency and GTID mode online on host MySQL. Host MySQL was
  not restarted and the application remained available.
- Made the source replication settings persistent in
  `/etc/mysql/mysql.conf.d/zz-compass-kids.cnf`, including row binlogs, GTID,
  seven-day binlog retention, and durable binlog flushing.
- Created the restricted `compass_repl@172.22.0.3` account and a UFW rule
  allowing only the fixed replica address to reach host MySQL port 3306.
- Stored generated replica runtime credentials in the root-only
  `/etc/compass-kids/mysql-replica.env`.
- Renamed the stopped old container to `ck-db-mysql57-snapshot`, changed its
  restart policy to `no`, and retained its original anonymous Docker volume.
- Created `ck-db-replica` at `172.22.0.3` with the new
  `compass_kids_mysql_replica` volume, 768 MiB memory limit, health check, and
  MySQL 8.0.46.
- Seeded the replica from an online GTID consistent dump and started automatic
  GTID replication from `172.22.0.1:3306`.
- Enforced `read_only=ON` and `super_read_only=ON`, persisted in replica
  configuration. Replication resumes automatically after container restart.
- Added both application accounts on the replica for source `172.22.0.1` with
  only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` privileges.
- Added `docker_mysql` to the HAProxy database backend as `disabled`; it is
  visible as `MAINT` and cannot receive application traffic before promotion.
- Installed `compass-kids-db-replica-check.timer` to check the replica every
  minute.

Validation:
- Replica container recreation completed healthy and automatically resumed
  both replication threads.
- Replication I/O and SQL states were `ON`, with zero connection or worker
  errors.
- Source GTIDs were fully received and executed.
- A temporary probe table and row were created on the source, observed on the
  replica in under one second, then dropped and confirmed removed on the
  replica.
- Replica application accounts successfully read the expected 981 users while
  both read-only variables remained enabled.
- HAProxy reported `host_mysql` as `UP/L4OK` and `docker_mysql` as `MAINT`.
- The replica check service completed successfully and the public application
  path remained HTTP 200.

Rollback:
- The live primary and HAProxy active backend were not changed.
- Stop and remove `ck-db-replica`, remove its named volume only after explicit
  approval, drop the replication account/rule, and disable the replica timer.
- The independent `ck-db-mysql57-snapshot` container and original data volume
  remain untouched.

Remaining:
- Write and rehearse a guarded promotion/failback runbook. Promotion must fence
  the old primary before making the replica writable.
- Connect failed replica-check units to an external alert destination.
- Add a replica on a second server; the local replica does not protect against
  host or disk loss.

## 2026-11-26 19:23 CST - Codex - Add stable HAProxy database endpoint

Status: completed

Objective:
Decouple both applications from the physical MySQL address so a future
database promotion will not require application configuration changes.

Changes:
- Added HAProxy TCP listener `compass_kids_mysql` on `127.0.0.1:3307` and
  `172.22.0.1:3307`.
- The only database backend is the current primary at `127.0.0.1:3306`.
  No stale or automatic standby backend was configured.
- Saved the prior runtime HAProxy configuration as
  `/etc/haproxy/haproxy.cfg.before-mysql-proxy-20261126-192128`.
- Added a UFW rule allowing only `172.22.0.4` on the Compass Kids bridge to
  reach `172.22.0.1:3307`.
- Added the existing backup application account at MySQL host `localhost`
  with the same minimal `SELECT`, `INSERT`, `UPDATE`, and `DELETE` privileges.
- Changed `DB_PORT` to `3307` in both application environment files.
- Recreated the Docker backup application and restarted the host application.
- Removed the old bridge rule permitting direct access to host MySQL port
  3306, and removed the obsolete MySQL account at host `172.22.0.4`.

Validation:
- HAProxy configuration validation succeeded before a graceful reload.
- Both application accounts queried MySQL 8 through port 3307.
- HAProxy reported `host_mysql` as `UP/L4OK` with both application connections
  passing through the proxy.
- A direct connection from the backup container to bridge port 3306 was
  blocked, while its configured connection through port 3307 succeeded.
- Host and backup health checks and the public HAProxy path returned HTTP 200.
- `mysql`, `haproxy`, and `compass-kids-server` remained active; the backup
  container remained healthy.

Rollback:
- Restore `/etc/haproxy/haproxy.cfg.before-mysql-proxy-20261126-192128`.
- Restore the application environment backups:
  `/etc/compass-kids/server.env.before-mysql-proxy-20261126-192240` and
  `/etc/compass-kids/server-backup.env.before-mysql-proxy-20261126-192220`.
- Re-add the restricted bridge UFW rule for port 3306 and the corresponding
  least-privilege MySQL account before recreating the backup application.

Remaining:
- Rebuild `ck-db` as a current MySQL 8 read-only GTID replica.
- Add it to HAProxy only as a disabled standby controlled by an explicit,
  tested promotion procedure. Do not enable automatic database failover with
  the current two-node topology.

## 2026-11-26 18:24 CST - Codex - Cut production over to host MySQL 8

Status: completed

Objective:
Move production database traffic from the MySQL 5.7 `ck-db` container to host
MySQL 8 with the shortest practical write outage.

Changes:
- Saved `/etc/compass-kids/server.env` as
  `/etc/compass-kids/server.env.before-host-mysql-20261126-182258`.
- Stopped the host and Docker backup applications at 18:23:09 CST and
  confirmed no remaining business sessions on `ck-db`.
- Created and validated the final consistent dump at
  `/var/lib/compass-kids-migration/final-compass-kids-20261126-182258.sql.zst`.
- Replaced the test `compass_kids` database on host MySQL with the final dump.
- Changed the host application's `DB_HOST` to `127.0.0.1`.
- Started both applications; service was restored at 18:23:47 CST. The
  application outage was approximately 38 seconds.
- Stopped `ck-db` after validation. Its container and Docker volume remain as a
  frozen rollback snapshot.
- Ran a new post-cutover host backup:
  `/var/backups/compass-kids/mysql/compass-kids-20261126-182431.sql.zst`.

Validation:
- Final source and destination counts matched for sampled tables: `users` 981,
  `userlesson` 65352, and `userview` 13801.
- Host and Docker backup applications both returned HTTP 200 for `/healthz`.
- HAProxy returned HTTP 200 and reported both backends `UP/L7OK`.
- MySQL 8 showed the host application connected from `localhost` and the
  Docker backup application from `172.22.0.4`.
- A transaction using the application account exercised `DELETE` permission
  against zero rows and was rolled back.
- All checks remained healthy after `ck-db` stopped.
- The post-cutover backup passed `zstd -t`.

Rollback:
- Stop both applications.
- Start `ck-db`.
- Restore both timestamped environment backups, or set their `DB_HOST` values
  to `172.22.0.3`.
- Start the host application and recreate the Docker backup application.
- Treat any writes made on MySQL 8 after this cutover as needing reconciliation
  before rollback.

Remaining:
- Observe errors, latency, memory, and backup execution.
- The stopped `ck-db` is a point-in-time rollback snapshot and will become
  stale. Rebuild it on MySQL 8 and configure replication before describing it
  as a current disaster-recovery replica.
- Add an encrypted off-host backup destination.

## 2026-11-26 18:21 CST - Codex - Switch Docker backup app to host MySQL

Status: completed

Objective:
Validate the host MySQL path with the Docker backup application before
switching the production host application.

Changes:
- Backed up `/etc/compass-kids/server-backup.env` to
  `/etc/compass-kids/server-backup.env.before-host-mysql-20261126-182100`.
- Changed only `DB_HOST` in the active backup environment to `172.22.0.1`.
- Recreated `compass-kids-server-backup` with the existing Compose project and
  image; the image was not rebuilt.

Validation:
- The recreated container reached `healthy`.
- Direct `/healthz` and `/` requests to `172.22.0.4:8080` returned HTTP 200.
- Host MySQL showed an authenticated `compass_kids_backup` connection from
  `172.22.0.4`; old `ck-db` showed zero sessions for that user.
- HAProxy reported both `host_app` and `docker_backup` as `UP/L7OK`.
- `mysql`, `compass-kids-server`, and `haproxy` remained active.

Rollback:
- Restore the timestamped environment backup and run
  `sudo docker compose up -d --force-recreate --no-build server-backup` from
  `/home/ubuntu/docker/compass-kids-backup`.

Remaining:
- The host and backup applications temporarily use different databases. The
  backup is not safe to promote during this interval because its MySQL 8 copy
  is only the earlier test import.
- Complete the final synchronized import and switch the host application as
  soon as the maintenance window begins.

## 2026-11-26 18:16 CST - Codex - Complete database cutover prerequisites

Status: prepared

Objective:
Make both application backends capable of reaching host MySQL 8 securely and
establish a tested host backup before production traffic is switched.

Changes:
- Added `/etc/mysql/mysql.conf.d/zz-compass-kids.cnf`.
- MySQL listens on `127.0.0.1:3306` for the host application and
  `172.22.0.1:3306` for the Docker backup application. MySQL X remains
  loopback-only.
- Set `innodb_buffer_pool_size=384M` and `max_connections=100`.
- Added a UFW rule allowing TCP 3306 on bridge `br-451edfffa313` only from the
  fixed backup application address `172.22.0.4`.
- Created least-privilege MySQL 8 accounts for the host and backup applications
  using credentials from their existing environment files. Both accounts have
  only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on `compass_kids`.
- Installed and enabled `compass-kids-db-backup.timer`. It runs daily at 03:17
  CST with up to 15 minutes random delay, low CPU/I/O priority, compression
  validation, and 14-day retention.

Validation:
- Host application credentials connected through `127.0.0.1` and queried
  MySQL 8 successfully.
- The running Docker backup application image connected through `172.22.0.1`
  and queried MySQL 8 successfully without changing its active environment.
- The backup service completed successfully and produced
  `compass-kids-20261126-181548.sql.zst` (7.1 MiB).
- The current production host application and Docker backup application still
  point to `ck-db`; no traffic has been switched.

Rollback:
- Remove the bridge UFW rule and `zz-compass-kids.cnf`, then restart host
  MySQL. The live application is still using `ck-db`.

Remaining:
- Stop application writes briefly, take and import a final consistent dump,
  update both environment files, restart the host application and recreate the
  Docker backup application, then validate reads and writes through HAProxy.
- Freeze `ck-db` after successful cutover as a rollback snapshot. It will
  become stale and must not be described as a live disaster-recovery replica.
- After an observation period, rebuild the database container on MySQL 8 and
  configure replication or a tested scheduled refresh if a current database
  standby is required.
- Add an encrypted off-host copy of host backups.

## Entry template

```text
## YYYY-MM-DD HH:MM TZ - actor - short title

Status: prepared | completed | rolled back | blocked

Objective:
Changes:
Validation:
Rollback:
Remaining:
```

## 2026-11-26 13:12 CST - Codex - Increase host swap capacity

Status: completed

Objective:
Provide memory-pressure headroom before running MySQL 8 and the application on
the same 3.3 GiB host.

Changes:
- Retained the existing 256 MiB `/dev/zram0` swap device at priority 100.
- Created a 2 GiB `/swapfile`, mode `0600`, at priority -2.
- Added `/swapfile none swap sw,pri=-2 0 0` to `/etc/fstab`.
- Added `vm.swappiness=10` in `/etc/sysctl.d/99-swap.conf`.

Validation:
- `swapon --show` reported both devices and 2.2 GiB total swap.
- `mysql`, Docker, `ck-db`, Nginx, and `compass-kids-server-backup` remained
  active; the application container stayed healthy.

Rollback:
- Run `swapoff /swapfile`, remove its `/etc/fstab` entry and sysctl file, then
  remove `/swapfile`.

Remaining:
- Monitor memory and swap after the database traffic switch.

## 2026-11-26 13:08 CST - Codex - Import database migration test

Status: prepared

Objective:
Prepare migration from the MySQL 5.7 `ck-db` container to host MySQL 8 while
retaining `ck-db` as a rollback/disaster-recovery source.

Changes:
- Imported only `compass_kids` and `compass_kids_test` into host MySQL.
- Deliberately did not import the MySQL 5.7 `mysql` system schema.
- Did not change application traffic, credentials, or container lifecycle.

Validation:
- Both databases imported without SQL compatibility errors and contain 14
  tables each.
- Exact counts matched for sampled high-value tables: `userlesson` 65352,
  `users` 981, and `userview` 13801.
- Application configuration was found at
  `/etc/compass-kids/server-backup.env`, loaded by
  `/home/ubuntu/docker/compass-kids-backup/compose.yaml`.
- The application supports `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and
  `DB_PASSWORD`; no source change is required for the switch.

Rollback:
- The running `ck-db` container and its Docker volume were not changed.

Remaining:
- The import is a point-in-time test copy, not the final synchronized copy.
- Before switching, stop application writes, perform a final dump/import,
  create least-privilege MySQL 8 users, update the environment file, recreate
  the application container, and verify health and writes.
- Determine a replication or scheduled-refresh policy before calling `ck-db`
  a current disaster-recovery database. A stopped static container is only a
  rollback snapshot.

## 2026-11-26 13:03 CST - Codex - Install host MySQL and create baseline backup

Status: completed

Objective:
Prepare the host database service without affecting the live container.

Changes:
- Installed Ubuntu MySQL Server and Client 8.0.46.
- Enabled and started `mysql.service`.
- Confirmed MySQL listens only on `127.0.0.1:3306`.
- Created `/var/lib/compass-kids-migration` and
  `/var/backups/compass-kids/mysql`, both restricted to root.
- Created
  `/var/backups/compass-kids/mysql/pre-migration-20261126-130208.sql.zst`
  from all databases in `ck-db`, mode `0600`.

Validation:
- Both host MySQL and container MySQL returned `mysqld is alive`.
- The 6.4 MiB compressed baseline passed `zstd -t`; its uncompressed stream is
  79,888,516 bytes.

Rollback:
- The old database container and volume remain intact. Host MySQL can be
  stopped and disabled without changing the application's current connection.

Remaining:
- Add a tested host backup timer and off-host copy.

## 2026-11-26 12:50 CST - Codex - Confirm public database forwarding is blocked

Status: completed

Objective:
Prevent public access to the Docker-published MySQL port without restarting the
live database.

Changes:
- No new firewall change was necessary. Existing nftables table
  `compass_docker_guard` already drops traffic entering on `eth0` and forwarded
  to `172.22.0.3:3306`.

Validation:
- The drop rule had packet hits.
- Docker's NAT mapping `31011 -> 172.22.0.3:3306` still exists, but external
  forwarding is blocked.
- Internal application database connections and `mysqladmin ping` remained
  healthy.

Rollback:
- Not applicable; this entry records an existing protection.

Remaining:
- Remove the Docker port publishing when `ck-db` is rebuilt or retired.
