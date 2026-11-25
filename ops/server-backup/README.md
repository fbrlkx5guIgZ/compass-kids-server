# Compass Kids backup server

This Compose project runs the disaster-recovery API instance. It has no
published host ports and is reachable only on the external `compass-kids`
Docker network at `172.22.0.4:8080`.

The production environment file is stored at
`/etc/compass-kids/server-backup.env` and is not committed.
