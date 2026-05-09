# Rakkib — Production-Hardening Plan

## Context

Rakkib is a bare-metal home-server installer driven by `curl … | bash`. Code is ~8,700 LOC of
Python plus a 333-line `install.sh`. The user (solo senior eng) asked for a comprehensive
audit of redundancy, weak spots, and simplification opportunities, and a plan for an
"air-tight, production-ready" product. Three Explore agents mapped the codebase; one Plan
agent stress-tested sequencing. This document is the consolidated, sequenced execution plan.

The codebase is already structurally sound: registry-driven services, no `if svc_id == …`
branches in step code, clean `run/verify` step contract, `install.sh` robust on bare metal.
The work below is **hardening + decomposition**, not a rewrite.

Status note: critical hardening work landed in `4ccb699` and was synced to `runtime` in
`40ff4f8`. Explicit Cloudflare service routing and internal exposure mode landed in
`db69a12`; the MIT license landed in `6af5ba5`. Items marked `[x]` are implemented;
`[~]` means partially covered but not fully matching the original PR-plan scope.

Hot files by size:
`cli.py` 1473, `steps/cloudflare.py` 905, `hooks/services.py` 884, `steps/services.py` 723,
`doctor.py` 713, `interview.py` 637, `web/api.py` 480, `web/answers.py` 437.

---

## Findings (severity-graded; reordered after sequencing critique)

### CRITICAL — security / data-loss

- [x] **C1. Auth bypass via query-string token.** `web/app.py:42-48` + `web/auth.py:43-47` accept
  `?token=ABC` for `/setup/*`. URL ends up in browser history, server logs, `Referer`.
  → Drop `request.query_params.get("token")` in `allow_setup_route`. SPA must POST the
  token to `/api/session/bootstrap` only.
- [x] **C2. CSRF on state-mutating endpoints.** `web/auth.py:75` is `samesite="lax"`; nothing in
  `web/api.py` (`PATCH /api/state`, `POST /api/questions/phases/{n}/answers`,
  `POST /api/run/start`) checks a CSRF token.
  → `samesite="strict"`; issue a per-session CSRF token at bootstrap, require
  `X-CSRF-Token` header on every POST/PATCH/DELETE.
- [x] **C3. State file written world-readable + non-atomic.** `state.py:50`
  `save_path.write_text(yaml.safe_dump(...))` has no `chmod` and no atomic rename; the
  state contains `secrets.values.POSTGRES_PASSWORD`, `N8N_ENCRYPTION_KEY`, Cloudflare
  tunnel data. A power-cut mid-write produces an unparseable YAML.
  → Write to `<path>.tmp`, `chmod(0o600)`, `os.replace()`. Add a `verify` check that
  refuses a state file with mode broader than `0o600`.
- [x] **C4. Cloudflare DNS records orphaned on service removal.** `steps/cloudflare.py` (905
  LOC) has no DNS-delete path; `hooks/services.py:880` `REMOVE_HOOKS` only covers
  openclaw/claude/codex teardown. Deselecting `vaultwarden` leaves
  `vault.example.com` resolving to the tunnel — subdomain hijacking / routing ambiguity
  vector when a different service later reuses the subdomain.
  → DNS deletion is implemented through `cloudflare.delete_dns_route(state, fqdn)`, and
  `cloudflare_dns_delete` still stays registry-driven through removal hooks. Local ingress
  is unpublished before the Cloudflare DNS delete attempt; failures return an actionable
  warning instead of re-exposing the removed service.
- [x] **C5. Postgres role/password embedded in SQL via f-string.** `steps/postgres.py:84-91`
  and `steps/services.py:347-350` interpolate `role`, `password`, `db_name` directly. Today
  mitigated only because `secrets.generate_password()` is alphanumeric; the `role`/`db`
  identifier path is unchecked — a registry author could write `role: "x; --"` legally.
  → Dollar-quote passwords (`PASSWORD $${pw}$$`); regex-validate identifiers
  (`^[a-z][a-z0-9_]{0,62}$`) at registry-load time and at SQL-emit time.
- [x] **C6. `shell=True` on schema-loaded strings.** Five sites total — wider than the audit
  initially noted: `interview.py:287-289` (detect), `interview.py:559, 568, 576`
  (host_default), `web/answers.py:357-376`. Today the schema is in-repo (trusted) but the
  pattern is a footgun.
  → `shlex.split()` + `shell=False` everywhere. Reject any token with `;|&$\`(){}<>`
  on parse to keep the contract tight.
- [x] **C7. Unchecked sudo chown.** `steps/services.py:274-285` ignores `returncode` on
  `sudo -n chown -R …`. Without passwordless sudo, chown silently fails and downstream
  ops mount with the wrong owner.
  → Check returncode; raise `RuntimeError(stderr.strip())`.

### HIGH — correctness

- [x] **H1. `remove` not idempotent.** `steps/services.py:384` `route_path.unlink()` raises on
  second run. → `unlink(missing_ok=True)`.
- [x] **H2. Postgres init SQL file written without chmod.** `steps/postgres.py:180` writes a
  plaintext-password file with default umask. → `chmod(0o600)` after write.
- [x] **H3. No session revocation.** `web/auth.py` has no logout. → `POST /api/session/logout`
  removes the id from `_sessions` and clears the cookie.
- [x] **H4. Service-catalog side-effects diverge between web and CLI.** `web/answers.py:53-55,
  220-308` sets `confirmed=False` and `web_deployment.status="stale"`; the CLI
  (`interview.py:127-204`) does not. Same data, two code paths.
  → Shared `service_catalog` side-effect helpers are consumed by web, CLI, and the
  interactive interview path. This landed ahead of M5 as a focused state-shape fix.
- [~] **H5. Web API has zero tests.** `web/api.py` (480 LOC) and `web/auth.py` are
  untested — C1 and C2 would have been caught.
  → New `tests/test_web_api.py` with `fastapi.testclient.TestClient`. **Land first**, with
  failing regression tests for C1 + C2; the C1/C2 PRs flip them green.
- [x] **H6. Doctor `--fix` pipes scripts from the internet without checksums.**
  `doctor.py:607-673` runs `curl … | sh` for cloudflared and the Compose plugin.
  → Pin SHA256 for cloudflared release + Compose plugin URL. For `get.docker.com` keep
  but document the trust boundary.
- [x] **H7. Render leaves `{{ KEY }}` literals on missing variables.** `render.py:21` uses
  `DebugUndefined`; a missing `N8N_ENCRYPTION_KEY` ships as the literal `{{ N8N_ENCRYPTION_KEY }}`
  into `.env`. → In `steps/verify.py`, refuse rendered `.env`/`Caddyfile`/compose files
  containing the substring `{{ ` and emit a clear error with the offending key.
- [x] **H8. `runtime-branch.sh` push without `--force-with-lease`.** Two engineers running
  `sync --push` simultaneously can lose commits. → Use `git push --force-with-lease` at
  `scripts/runtime-branch.sh:255`.
- [x] **H9. `web/run.py` orphans subprocesses.** `WebRunManager` has no kill path — if
  `rakkib pull` hangs (cloudflared login waiting forever), the user's only recovery is
  restarting `rakkib web`, leaving an orphan child. → `POST /api/run/cancel` →
  `process.terminate()`; track child PID in state for visibility.
- [x] **H10. Wildcard Cloudflare/Caddy routing exposed every subdomain.** The old
  `*.domain` tunnel ingress plus Caddy wildcard fallback made any DNS record under the
  domain hit the server. `db69a12` removes wildcard ingress/fallback, adds
  `exposure_mode`, skips Cloudflare for internal installs, creates explicit service DNS
  routes after deploy, tracks `cloudflare.published_services`, and rerenders/reloads
  cloudflared when services are unpublished.

### MEDIUM — maintainability (no behavior change)

- [x] **M1. Decompose `cli.py` (1473 → ~600 LOC).** 27 helpers live above the `@cli.group`
  decorator. Move:
  - service-selection helpers (lines ~120–264, 301–354, 644–691) → `steps/services.py`
    (or a new `services_cli.py`)
  - docker-prereq logic (lines 365–501) → `doctor.py`
  - state helpers (93–117) → methods on `State`
  - small utilities (`_web_url`, `_checkout_dir`, `_default_host_gateway`,
    `_detect_lan_ip`) → new `util.py`
  **Do this before M2/M3/M4** — they all touch `cli.py`.
- [x] **M2. Consolidate `_resolve_admin_user` (cli.py:68-78) + `_docker_access_user`
  (cli.py:365-373).** Single `resolve_user(state, *, explicit=None, require=False)`.
- [x] **M3. Consolidate `_build_add_choices` (cli.py:120-174) + `_build_restart_choices`
  (cli.py:177-238).** ~90% identical; parameterize with a `PickerOptions` dataclass.
- [x] **M4. Stop reaching for `data_root` and `repo_dir` everywhere.** 7+ inlined
  `Path(state.get("data_root", "/srv"))`, 6+ inlined `Path(__file__).resolve().parent.parent / "data"`.
  Add `state.data_root` property and a module-level `RAKKIB_DATA_DIR` constant; sweep
  `steps/*.py` and `cli.py`.
- [~] **M5. Web/TUI validation duplication.** Text validator (`web/answers.py:199-217` vs
  `interview.py:585-613`), confirm (`135-162` vs `350-379`), secret group (`89-111` vs
  `448-463`), single-/multi-select. Extract `src/rakkib/validators.py` with pure functions;
  consume from both call sites. `db69a12` adds shared subdomain validation in
  `service_catalog.py`, but the broader validator extraction remains open.
- **M6. Decompose `steps/cloudflare.py` (905 LOC).** Split into:
  - `cloudflare/client.py` — typed `cloudflared` wrapper (list/create/get tunnel,
    create DNS route, publish/unpublish service ingress)
  - `cloudflare/auth.py` — three auth methods
  - `cloudflare/credentials.py` — discovery, ownership/perm repair
  - `cloudflare/verify.py` — metrics + edge-health (absorbs `doctor.py:412-536`
    `check_cloudflare_readiness`)
  - `steps/cloudflare.py` — orchestration + state mutation only
  Each ≤ 250 LOC. H10's explicit-route helpers move into `cloudflare/client.py` cleanly.
- [x] **M7. `HookContext` for hooks.** All hooks in `hooks/services.py` take 6 args; most use
  one. Replace with `@dataclass class HookContext` (state, svc, repo, data_root, log_path,
  registry). Sweep all hook signatures.
- [x] **M8. Per-fragment Caddy validation.** `steps/caddy.py:69` only validates the assembled
  Caddyfile — error messages don't identify the broken service. After rendering each
  fragment, validate against a synthetic Caddyfile containing just that fragment; report
  service id on failure. Bundle with H7.
- [x] **M9. Cycle detection in service-dependency topo-sort.** `steps/__init__.py:97-98`
  silently appends remaining nodes. → Detect remaining-after-Kahn = cycle; raise
  `RegistryError("dependency cycle: …")`.
- [x] **M10. install.sh signal handling.** Ctrl-C mid-`pip install` leaves a half-installed
  venv at `${INSTALL_DIR}/.venv`. Add `trap` for INT/TERM/ERR that warns the user the
  venv is incomplete and points at the recovery command (`rm -rf ${INSTALL_DIR}/.venv &&
  rerun`). (Promoted from LOW.)
- [x] **M11. Subprocess error messages truncate stderr.** `docker.py:_error_message`
  (around lines 257–261) — when a service fails to start during a fresh-server install,
  truncated `stderr` is what gates 80% of user support cost. Include up to 2 KB of
  `stderr.strip()`. (Promoted from LOW.)

### LOW — polish (bundle as one PR)

- [x] **L1.** Drop `main()` wrapper in `cli.py`; point `pyproject.toml` `[project.scripts]
  rakkib = "rakkib.cli:cli"` directly.
- [x] **L2.** Promote `"always"`/`"foundation_services"`/`"selected_services"` to a `StateBucket`
  `StrEnum` in `state.py`.
- [x] **L3.** `extra_templates` missing-file check in `steps/services.py:288-293` — raise
  with the registry-author–facing message (which `svc_id`, which path).
- [x] **L4.** Path-traversal defense for `caddy.template`: reject names containing `/` or `..`
  in `steps/services.py:245-259`. (Defense-in-depth; registry is in-repo.)
- **L5.** Ollama variants (`registry.yaml:1715-1764`) — three near-identical entries differ
  only in `image`. Optional `gpu_variant` field with an `image_variants` map.
- **L6.** Test fixture consolidation into `tests/conftest.py`. (Lands as part of PR-01.)
- [x] **L7.** Add an MIT `LICENSE`. Landed in `6af5ba5`.

### Dropped from earlier draft

- **`_run_steps` per-step rollback** (originally M13) — already documented intent of the
  `run/verify` contract; one-paragraph addition to CLAUDE.md is enough.
- **`cli.py:544-547` verify-break** — flagged in critique but the early-break already has
  a comment (`already ran _collect_verifications`); not a bug.
- **OpenClaw timeouts to registry** (M8 in earlier draft) — three constants in one hook;
  cost of registry schema extension > readability win until other host services
  accumulate similar magic numbers.
- **Snapshot-test brittleness** — keep until a flake instance materializes.

---

## Sequenced PR plan (each <60 min review)

The order matters because some refactors enable others. **PR-01 first** so C1/C2 land
under regression coverage.

1. [~] **PR-01 — Web API test scaffold (H5 + L6).** `tests/conftest.py` shared fixtures;
   `tests/test_web_api.py` covers health, bootstrap, state GET/PATCH, phases GET/POST,
   run start. Includes failing regressions for C1 and C2. Pure-test PR, no source edits.
2. [x] **PR-02 — C1 (auth bypass).** `web/app.py:42-48` + `web/auth.py:43-47`. C1 tests pass.
3. [x] **PR-03 — C2 (CSRF + samesite=strict).** `web/auth.py:69-78` cookie flags;
   `csrf_token` issued at bootstrap; `X-CSRF-Token` enforced in `web/api.py` POSTs/PATCHes.
4. [x] **PR-04 — C3 (state file).** `state.py:37-50`: tmp + chmod + `os.replace`. New
   `tests/test_state.py::test_save_creates_0o600`. Add a `verify` check.
5. [x] **PR-05 — C5 (postgres SQL).** Add `_postgres_quote.py` with identifier validator and
   dollar-quoter; rewrite `steps/postgres.py:84-91` and `steps/services.py:347-350`.
6. [x] **PR-06 — C6 (shell=True sweep).** All five sites in `interview.py` and `web/answers.py`.
   Switch to `shlex.split` + `shell=False`; assert with each detect string in
   `data/questions/*.md`.
7. [x] **PR-07 — C4 + C7 + H1 + H2 (service-removal correctness).** Coherent
   "teardown/hygiene" theme: local Cloudflare route unpublish, DNS deletion attempt,
   sudo-chown returncode, `unlink(missing_ok=True)`, `init.sql` chmod.
8. [x] **PR-08 — H3 + H6 + H7 + H9 (web + render hardening).** Logout endpoint,
   pinned-checksum doctor fixes, refuse `{{ ` literals in rendered output, run-cancel
   endpoint.
9. [x] **PR-09 — H8 + M10 + M11 (install / subprocess polish).** `--force-with-lease`,
   install.sh trap, `_error_message` keeps 2 KB of stderr.
10. [~] **PR-10 — M5 (validators extraction).** `db69a12` adds shared subdomain
    validation helpers. The broad text/confirm/secret/single-/multi-select validator
    extraction remains open; mirror coverage in a new `tests/test_validators.py`.
11. [x] **PR-11 — H4 (ServiceCatalogHandler).** Now consumes shared service-catalog helpers. Land the
     behavior unification (CLI gains `confirmed=False`/`web_deployment.status="stale"`
     semantics under explicit flag).
12. [x] **PR-12 — Explicit Cloudflare service routes.** `db69a12` adds `exposure_mode`,
    skips Cloudflare for internal installs, removes wildcard routing, prompts/validates
    per-service subdomains, publishes service DNS routes after deploy, and unpublishes
    local service ingress on removal.
13. [x] **PR-13 — M1 (cli.py decomposition).** ~600 LOC moved across new homes; commands
    stay in `cli.py`.
14. [x] **PR-14 — M2 + M3 + M4 (dedupe inside the new structure).** Cheap once M1 is in.
15. [ ] **PR-15 — M6 (Cloudflare split).** Absorbs `check_cloudflare_readiness` from
    `doctor.py`. H10's explicit-route helpers move into `cloudflare/client.py` cleanly.
16. [x] **PR-16 — M7 (HookContext).** Touches every hook — sweep is mechanical.
17. [x] **PR-17 — M8 + M9 (Caddy per-fragment validate + cycle detection).**
18. [~] **PR-18 — LOW polish bundle (L1–L5).** L1-L4 are implemented; L5 remains optional.

---

## Critical files to modify (top of each PR's diff)

- `src/rakkib/web/auth.py`, `src/rakkib/web/api.py`, `src/rakkib/web/app.py`,
  `src/rakkib/web/answers.py`, `src/rakkib/web/run.py`
- `src/rakkib/state.py`
- `src/rakkib/steps/postgres.py`, `src/rakkib/steps/services.py`,
  `src/rakkib/steps/cloudflare.py`, `src/rakkib/steps/caddy.py`, `src/rakkib/steps/verify.py`,
  `src/rakkib/steps/__init__.py`
- `src/rakkib/hooks/services.py`
- `src/rakkib/data/registry.yaml` (`hooks.remove: [cloudflare_dns_delete]` entries remain
  registry-driven; the hook now unpublishes local Cloudflare routing and warns about stale DNS)
- `src/rakkib/render.py`, `src/rakkib/interview.py`, `src/rakkib/cli.py`,
  `src/rakkib/docker.py`, `src/rakkib/doctor.py`
- `install.sh`, `scripts/runtime-branch.sh`, `pyproject.toml`
- `tests/test_web_api.py` (new), `tests/test_validators.py` (new),
  `tests/test_service_catalog.py` (new), `tests/conftest.py` (consolidate)

## Reuse — don't reinvent

- `rakkib.normalize.eval_when` already evaluates conditional expressions for both web and
  CLI paths; the `ServiceCatalogHandler` (H4) must consume it, not reimplement.
- `rakkib.docker.docker_run` is the right wrapper for any new subprocess call (handles
  log redirection, permission-error detection); use it for Cloudflare DNS route creation,
  local unpublish/reload work, and any future DNS-delete implementation.
- `rakkib.secrets.ensure_secrets` already handles conditional secrets and propagation —
  M7's `HookContext` should expose its results, not regenerate.
- `rakkib.render.flatten_state` + `render_file` are the rendering surface; H7's strict
  check belongs at the `render_file` boundary so all callers benefit.
- The orphan-worktree pattern in `scripts/runtime-branch.sh` (lines 209–235) is the
  reference for any future "promote to runtime" tooling — do not invent a parallel path.

## Acceptance criteria for the four ship-blockers

**C1 (auth bypass):** `[x] implemented; root still serves the public SPA shell, but server-side setup authorization no longer accepts query tokens.`
- [~] `GET /` and `GET /setup/...` with `?token=$VALID` → 401 unless also presenting a session
  cookie or `Authorization: Bearer`.
- [x] `auth.allow_setup_route` no longer reads `request.query_params`.
- [x] New tests: `?token=` → 401; `Authorization: Bearer $T` → 200; bootstrap+cookie → 200.

**C2 (CSRF):** `[x] implemented`
- [x] `samesite="strict"` on session cookie.
- [x] `csrf_token` issued at bootstrap, stored server-side keyed by session id.
- [x] All POST/PATCH/DELETE endpoints in `web/api.py` require `X-CSRF-Token`.
- [~] Test: valid session cookie + missing/wrong `X-CSRF-Token` → 403 on `PATCH /api/state`,
  `POST /api/questions/phases/{n}/answers`, `POST /api/run/start`.

**C3 (state file):** `[x] implemented`
- [x] Save uses `tmp = path.with_suffix(path.suffix + ".tmp")`; `os.chmod(tmp, 0o600)` before
  `os.replace(tmp, path)`.
- [x] Test: after `State.save()`, `(stat.st_mode & 0o777) == 0o600`.
- [x] `verify` step fails if existing `.fss-state.yaml` has wider mode.

**C4 (DNS cleanup):** `[x] implemented; manual bare-metal smoke remains open.`
- [x] `cloudflare.delete_dns_route(state, fqdn)` calls
  `cloudflared tunnel route dns delete <tunnel> <fqdn>`.
- [x] Wildcard `*.domain` Cloudflare ingress and Caddy wildcard fallback are removed.
- [x] `cloudflare.publish_service(state, svc)` creates explicit per-service DNS routes only
  after successful deploy and tracks `cloudflare.published_services`.
- [x] `cloudflare.unpublish_service(state, svc, warn=True)` removes local service ingress,
  rerenders/reloads cloudflared, and attempts to delete the Cloudflare DNS record.
- [x] `registry.yaml` keeps `hooks.remove: [cloudflare_dns_delete]` registry-driven for
  services with `default_subdomain`; the hook delegates to `unpublish_service`.
- [x] Tests assert explicit route creation and exact `cloudflared tunnel route dns delete` argv.
- [ ] Manual smoke (bare-metal box): deploy with vaultwarden, confirm it resolves and serves,
  remove it, then confirm `vault.<domain>` no longer serves vaultwarden. If DNS deletion is
  reintroduced, also confirm `dig vault.<domain>` no longer resolves via the tunnel.

---

## Verification (end-to-end)

Per CLAUDE.md, **do not run install.sh / `rakkib pull` / docker / cloudflared on this dev
machine**. The full functional bar is exercised on a fresh Ubuntu 24.04 bare-metal target;
this dev box runs only static checks and pytest.

On this dev machine, after each PR:

```
# install dev deps once
python3 -m venv .venv && .venv/bin/pip install -e '.[dev]'

# unit + web TestClient suite
.venv/bin/pytest -q

# install.sh shellcheck
shellcheck install.sh scripts/runtime-branch.sh

# registry consistency (already a test; ensures no broken depends_on, hook names, templates)
.venv/bin/pytest -q tests/test_registry_consistency.py
```

On the bare-metal target after the security PRs (PR-02 through PR-08) ship to `runtime`:

```
curl -fsSL https://raw.githubusercontent.com/FayaaDev/Rakkib/main/install.sh | bash
rakkib init && rakkib pull
rakkib add        # deselect a service that has a Cloudflare subdomain
curl -i https://<removed>.<domain>   # must return 404/not service content
stat -c '%a' ~/Rakkib/.fss-state.yaml   # must be 600
curl -i 'http://<server>/setup/?token=$BOOTSTRAP'   # must be 401 without bootstrap POST
```

After M-series refactors land, rerun the same bare-metal smoke to prove behavior parity.

After every PR that touches `install.sh`, `pyproject.toml`, or `src/rakkib/**`, regenerate
the runtime branch:

```
scripts/runtime-branch.sh sync --push
```

(Never hand-edit `runtime`; only `main` is the development branch.)
