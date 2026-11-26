# Production operations

The committed files in this directory are the declarative sources for the
Compass Kids production services. Runtime secrets remain under
`/etc/compass-kids` and are not committed.

Before changing production, read `CHANGELOG.md`. Every application or
infrastructure change must be appended there according to `/AGENTS.md`.

## Request path

1. Nginx Proxy Manager terminates TLS for `compass-kids.com` and
   `www.compass-kids.com`, forwarding both hosts to `127.0.0.1:8081`.
2. HAProxy sends traffic to the host service at `127.0.0.1:8080`.
3. If the host health check fails, HAProxy uses the Docker backup at
   `172.22.0.4:8080`.

The Nginx Proxy Manager database and generated proxy-host files are runtime
state and are intentionally not tracked here.

## Firewall

UFW allows inbound TCP 22, 80, and 443. The nftables unit blocks public
forwarding to the Docker MySQL publishing while preserving container traffic.

## Database

Host MySQL configuration and backup units are tracked in `mysql/`. The main
application connects to the HAProxy MySQL endpoint at `127.0.0.1:3307`; the
Docker backup application uses the restricted bridge endpoint at
`172.22.0.1:3307`. HAProxy forwards both to the active host MySQL at
`127.0.0.1:3306`.

The database proxy currently has only one backend. A standby must not be added
as an automatically selected backup until it is a current MySQL 8 replica and
the promotion procedure prevents split brain.

The local MySQL 8 replica is tracked in `mysql-replica/` and runs at
`172.22.0.3:3306`. It is a GTID, read-only replica and appears in HAProxy as
the disabled `docker_mysql` backend. It must be explicitly promoted before
HAProxy enables it. The stopped `ck-db-mysql57-snapshot` container and its old
volume are retained separately as the migration rollback snapshot.

## Secrets

The host service reads `/etc/compass-kids/server.env`; the backup reads
`/etc/compass-kids/server-backup.env`. Both require database credentials and
`JWT_SECRET`.

Offline dashboard and maintenance scripts read database and Tencent COS
settings from the environment. `offline-tools.env.example` lists the required
variable names using placeholders only; keep real values outside Git.
