# Agent operating rules

These rules apply to the whole repository.

## Required handoff log

Any agent that changes application code, deployment configuration, containers,
database state, firewall rules, system services, scheduled jobs, or host
resources must append an entry to `ops/CHANGELOG.md` before finishing.

Each entry must include:

- timestamp with timezone and the acting agent/tool;
- objective and reason;
- exact scope changed, including important paths and service names;
- validation performed and its result;
- rollback procedure or retained rollback asset;
- current state and any remaining work.

Never put passwords, tokens, private keys, connection strings containing
credentials, or secret file contents in the log. Refer to the secret file path
and variable name instead.

Read the newest entries in `ops/CHANGELOG.md` before changing production. Do
not mark a prepared or tested migration as complete until production traffic
has actually been switched and verified.

When an action is read-only, logging is optional unless it discovers a fact
that materially changes the operating plan.
