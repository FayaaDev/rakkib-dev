# Rakkib — Agent Rules

## bd Task Tracking (Brief)

- Use `bd` for ALL task/issue tracking. Do not keep markdown TODO lists.
- Start work by checking what is unblocked: `bd ready --json`
- Create work items as needed:
  - `bd create "Title" --description "Context" -t task|bug|feature -p 0-4 --json`
  - Use stdin for descriptions with tricky quoting: `printf '%s' '...' | bd create "Title" --description=- --json`
- Claim/update non-interactively (do NOT use `bd edit`):
  - `bd update <id> --claim --json`
  - `bd update <id> --notes "..." --acceptance "..." --priority 1 --json`
- Close when done: `bd close <id> --reason "Done" --json`

## Follow these THREE rules. Treat them as your bible. 

## Rule 1 — Think Before Coding.
No silent assumptions. State what you're assuming. Surface tradeoffs. Ask before guessing. Push back when a simpler approach exists.

## Rule 2 — Simplicity First.
Minimum code that solves the problem. No speculative features. No abstractions for single-use code. If a senior engineer would call it overcomplicated — simplify.

## Rule 3 — Surgical Changes.
Touch only what you must. Don't "improve" adjacent code, comments, or formatting. Don't refactor what isn't broken. Match existing style.

## This project boots new servers

Assume the target machine is **bare metal** — only `curl`, `git`, and `python3` may be present. The `install.sh` script is the sole entry point. It must bring up everything else (venv, pip, rakkib CLI) without pre-existing tooling.

sshpass -p 'z45rdKUe' ssh -o StrictHostKeyChecking=accept-new root@174.138.183.153 'set -euo pipefail; /root/.local/bin/rakkib --help | sed -n "1,220p"'

- Bare-metal install and runtime validation happen on the test server, not the dev workstation. Do not treat local tests as a substitute for fresh-server validation.
- `192.168.0.235` (Fayaalink) is the dev workstation, not the validation target. Never run service-validation or test-server deployment workflows on `192.168.0.235`.
- Local developer regression baseline after Python changes: run `python3 -m py_compile <changed-python-files>` and the relevant pytest target through the project venv, usually `.venv/bin/python -m pytest <target>`.
- Install local test tooling with `python3 -m venv .venv && .venv/bin/python -m pip install -e '.[test]'` when `.venv` or pytest is missing. Keep this dev-only; do not assume pytest exists on bare-metal target hosts.

Solo one-line command:
curl -fsSL https://install.rakkib.app | bash

## GitHub Runtime Publishing

- Private development repository: `FayaaDev/rakkib-dev`, branch `main`. Local `origin` must point to `git@github.com:FayaaDev/rakkib-dev.git`.
- Public runtime repository: `FayaaDev/rakkib`, branch `main`. Local `public` should point to `git@github.com:FayaaDev/rakkib.git`.
- The public runtime repo is generated only. Never hand-edit it, never develop there, and do not recreate the old same-repo `runtime` branch workflow.
- Public runtime contents are allowlisted to `.gitignore`, `README.md`, `LICENSE`, `install.sh`, `pyproject.toml`, and `src/rakkib/**`. Public `README.md` comes from `docs/public/README.md`.
- `install.sh` and `https://install.rakkib.app` default to cloning `https://github.com/FayaaDev/rakkib.git` branch `main`. The installer migrates old `FayaaDev/Rakkib` origins to the public runtime repo.
- Normal release order: validate locally, commit to private `main`, push `origin main`, run `scripts/publish-runtime-repo.sh sync --push`, then validate the public installer on the test server.
- When `install.sh`, `pyproject.toml`, `LICENSE`, `docs/public/README.md`, or `src/rakkib/**` changes, publish `FayaaDev/rakkib` before installer-first or service validation because `curl -fsSL https://install.rakkib.app | bash` installs from the public repo.
- Use `scripts/publish-runtime-repo.sh sync` for a preview, `scripts/publish-runtime-repo.sh sync --push` to publish, and `scripts/publish-runtime-repo.sh verify --public-dir <path>` to verify a public checkout.
- Public runtime commits must preserve source traceability: `Publish runtime from <short-sha>` with `Source: FayaaDev/rakkib-dev@<full-sha>` in the commit body.
- Use `RAKKIB_REPO=git@github.com:FayaaDev/rakkib-dev.git RAKKIB_BRANCH=main` only when intentionally installing the full private development tree.

## Guidelines

- **`install.sh` is sacred.** Any change must pass on a fresh Ubuntu 24.04 server. Test by running `bash install.sh` in a clean checkout.
- **Assume nothing about the host.** No `python3-venv`, no `pip`, no `ensurepip`. The `ensure_python3_and_venv()` function handles all of this — keep it bulletproof.
- **Check both `venv` and `ensurepip`.** The venv module can import while `ensurepip` is broken. Always check `import venv, ensurepip` when validating the Python toolchain.
- **No fancy shell constructs.** The script runs under `set -Eeuo pipefail`. Keep it POSIX-compatible (no arrays in `/bin/sh`, though `bash` features are fine since shebang is `#!/usr/bin/env bash`).
- **Error messages must be actionable.** Every `die()` call should tell the user exactly what command to run to fix it.
- **The venv lives at `<repo>/.venv`**, not system-wide.
- **The rakkib symlink goes to `~/.local/bin/rakkib`**, and `ensure_shell_path()` adds that to PATH in `~/.bashrc`, `~/.zshrc`, and `~/.profile`.
- **curl-pipe safety:** The script is designed to be piped from `curl ... | bash`. Never add prompts that require `/dev/tty` when stdin is a pipe.

## Service Additions

- **Service additions are registry-driven.** Prefer declarative changes in `src/rakkib/data/registry.yaml`, templates under `src/rakkib/data/templates/`, and hook wiring in `src/rakkib/hooks/services.py`.
- **Do not add new hardcoded `if svc_id == ...` branches** in Python unless the behavior genuinely cannot be expressed through registry fields, templates, or hooks.
- **`rakkib add` is part of the contract.** It now opens a registry-driven checkbox TUI that lists all services from `src/rakkib/data/registry.yaml`, marks already-installed services with `[X]`, and syncs the server to match the final selection.
- **Use non-interactive service validation for waves.** Prefer `rakkib pull --service <id>`, `rakkib add <id> --yes`, and `rakkib smoke <id>` when validating one service at a time on the test server.
- **Remove validated services immediately.** After a service passes validation and evidence is captured, run `rakkib remove <id> --yes` so the test server does not accumulate validated services.
- **Full `rakkib pull` is whole-server validation.** It skips selected services that are already installed and running, but it still runs global setup; do not use it as the default loop for a single service on a reused test server.
- **Unchecked services are fully removed.** The `rakkib add` sync flow is destructive for deselected services: it tears down containers, removes rendered config, removes service data directories, deletes related generated artifacts, and drops service-specific Postgres databases/roles when declared in the registry.
- **New services must work with both `pull` and `rakkib add`.** A service is not complete unless it can be selected in the `rakkib add` TUI, deployed through that flow, and cleanly removed again through deselection.
- **Browser-facing services need smoke checks.** Add registry `smoke.path` and `smoke.expected_text` so `rakkib smoke <id>` can confirm the public URL returns the expected app HTML. Use GET-based checks, not `HEAD`, because some apps return misleading `HEAD` responses.
- **Use the project-local skill** `.opencode/skills/rakkib-add-service/SKILL.md` when adding a new service so registry fields, templates, hooks, and verification updates are handled consistently.
- **Keep verification aligned with the registry architecture.** At minimum, make sure any new registry references resolve cleanly and update snapshot or fixture expectations when rendered outputs change materially.
