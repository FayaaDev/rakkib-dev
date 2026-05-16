# Rakkib — Agent Rules

## This project boots new servers

Assume the target machine is **bare metal** — only `curl`, `git`, and `python3` may be present. The `install.sh` script is the sole entry point. It must bring up everything else (venv, pip, rakkib CLI) without pre-existing tooling.

Dont debug and run tests on current machine, the app is being tested on a bare metal machine. Not this one

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
- **Unchecked services are fully removed.** The `rakkib add` sync flow is destructive for deselected services: it tears down containers, removes rendered config, removes service data directories, deletes related generated artifacts, and drops service-specific Postgres databases/roles when declared in the registry.
- **New services must work with both `pull` and `rakkib add`.** A service is not complete unless it can be selected in the `rakkib add` TUI, deployed through that flow, and cleanly removed again through deselection.
- **Use the project-local skill** `.opencode/skills/rakkib-add-service/SKILL.md` when adding a new service so registry fields, templates, hooks, and verification updates are handled consistently.
- **Keep verification aligned with the registry architecture.** At minimum, make sure any new registry references resolve cleanly and update snapshot or fixture expectations when rendered outputs change materially.
