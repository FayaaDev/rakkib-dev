<!-- Managed by Rakkib: agent instructions -->
# Rakkib Managed Device

These rules apply when an agent operates a device configured with Rakkib.

## Operational Standards

- Back up important data before destructive changes and prefer reversible steps.
- Work on one issue at a time and verify each change before continuing.
- For critical operations, state assumptions, impact, commands, verification, and rollback.
- Never expose an administrative or control-plane service without an explicit authentication gate.
- Do not treat a directly exposed host port as protected by reverse-proxy authentication.
- Keep secrets in permission-restricted environment files. Never hardcode secrets in compose files or source code.

## Rakkib Layout

Rakkib normally manages these locations:

```text
<rakkib-checkout>/.venv/       # Rakkib Python environment
/srv/docker/<service>/         # Rendered service configuration
/srv/data/<service>/           # Persistent service data
~/.config/rakkib/              # Rakkib state and answers
~/.local/bin/rakkib            # Rakkib command
srv/apps/source                # Apps building zone
srv/apps/static                # Apps Serving zone
```

Do not assume a specific checkout path, username, hostname, IP address, domain, or timezone. Inspect the current device and Rakkib state first.

## Service Operations

- Use `rakkib add` to synchronize the selected service set.
- Use `rakkib pull --service <id>` and `rakkib add <id> --yes` for focused service deployment.
- Use `rakkib smoke <id>` to verify browser-facing services.
- Use `rakkib remove <id> --yes` for complete service removal.
- Treat deselection and removal as destructive: containers, rendered configuration, service data, generated artifacts, and declared databases or roles may be deleted.
- Prefer Rakkib commands over manual edits to generated files. If manual intervention is necessary, document it and verify that a later Rakkib run will not undo it unexpectedly.

## Network and Security

- Inspect the active reverse proxy, container networks, firewall rules, and bind addresses before changing exposure.
- Prefer proxy-only exposure or loopback binds for local-only services.
- Use least-privilege database users and service credentials.
- Never print, commit, or paste secrets into logs, issues, or agent responses.

## Verification

- Confirm container health and application-level behavior after service changes.
- Use GET-based smoke checks for web applications unless the service explicitly supports reliable HEAD responses.
- Fresh-install validation must use the designated test server, not a developer workstation.
- Remove test services after validation so the server does not accumulate state.

## Installer Safety

- Assume a fresh machine may initially provide only `curl`, `git`, and `python3`.
- Do not assume `pip`, `pytest`, `python3-venv`, or `ensurepip` is already available.
- Keep installer errors actionable and compatible with `curl ... | bash` execution.
