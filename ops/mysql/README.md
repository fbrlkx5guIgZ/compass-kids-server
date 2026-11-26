# Host MySQL

The production database runs as the host `mysql.service`. The main host
application connects through `127.0.0.1:3306`; the Docker backup application
connects through `172.22.0.1:3306`.

UFW must allow TCP 3306 only from the fixed backup application address
`172.22.0.4` on the `compass-kids` bridge. MySQL must never listen on a public
host address.

Runtime database credentials remain in `/etc/compass-kids/server.env` and
`/etc/compass-kids/server-backup.env`.

Install the tracked files as follows:

```text
compass-kids.cnf               -> /etc/mysql/mysql.conf.d/zz-compass-kids.cnf
compass-kids-db-backup         -> /usr/local/sbin/compass-kids-db-backup
compass-kids-db-backup.service -> /etc/systemd/system/
compass-kids-db-backup.timer   -> /etc/systemd/system/
```

Backups are stored under `/var/backups/compass-kids/mysql`, with mode `0600`
and 14 daily copies retained. A backup on the same host is not an off-site
disaster-recovery copy.
