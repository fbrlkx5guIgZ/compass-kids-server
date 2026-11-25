# Production operations

The committed files in this directory are the declarative sources for the
Compass Kids production services. Runtime secrets remain under
`/etc/compass-kids` and are not committed.

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

## Secrets

The host service reads `/etc/compass-kids/server.env`; the backup reads
`/etc/compass-kids/server-backup.env`. Both require database credentials and
`JWT_SECRET`.
