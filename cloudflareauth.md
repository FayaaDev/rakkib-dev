# Cloudflare authorization before installation

## Goal

Make `rakkib init` a deployment-ready installation command. Cloudflare
authorization happens beforehand through `rakkib auth --cloudflare`, alongside
the existing sudo and Docker access preparation.

## User flow

For a Cloudflare deployment, the operator runs:

```bash
rakkib auth --cloudflare
rakkib init
```

`rakkib auth --cloudflare` must:

1. Validate sudo without storing the password.
2. Prepare Docker access for the invoking admin user when needed.
3. Ensure `cloudflared` is installed for that user.
4. Run `cloudflared tunnel login` as that user.
5. Show Cloudflare's approval URL and Rakkib's QR code on headless hosts.
6. Wait for the operator to approve access and select the Cloudflare domain.
7. Verify that `~/.cloudflared/cert.pem` exists and that `cloudflared tunnel list` succeeds.

`rakkib init` then records configuration, creates or finds the named tunnel,
renders its configuration, and deploys it. It must not open a Cloudflare login
flow or request another browser approval.

## Implementation

### `src/rakkib/cli.py`

- Add a `--cloudflare` boolean option to the `auth` command.
- Extend `_run_auth_setup()` to receive that option while retaining its current
  sudo and Docker behavior.
- Add the Cloudflare authorization sequence after host authorization succeeds.
- Use the invoking non-root admin user's home for both the cloudflared binary
  and its credentials. Do not silently authenticate as root when the command is
  launched through `sudo`.
- Surface the failing `cloudflared` stderr and identify the expected certificate
  path when login or verification fails.

### `src/rakkib/steps/cloudflare.py`

- Remove browser login, QR rendering, and authentication repair from `run()`.
- Continue copying or using the already-authenticated certificate as required
  by Rakkib's managed cloudflared data directory.
- If the certificate is missing, unreadable, or `cloudflared tunnel list`
  fails, stop with actionable guidance to run `rakkib auth --cloudflare`.
- Keep tunnel creation, discovery, DNS routing, credentials-file handling, and
  container deployment in this step.

### `src/rakkib/data/questions/04-cloudflare.md`

- Remove the claim that the Cloudflare step is a blocking browser-approval
  handoff.
- Keep the normal browser-login authentication method and new-tunnel strategy
  as state configuration.
- Explain that browser authorization must be completed with
  `rakkib auth --cloudflare` before running `rakkib init`.

### Documentation

- Update the command reference to show `rakkib auth --cloudflare`.
- Document the Cloudflare sequence separately from internal-only installations.
- Retain the normal-user requirement: Cloudflare credentials belong to the
  admin account, not root.

## Tests and verification

Add or update tests for:

- successful `rakkib auth --cloudflare` login and validation;
- cloudflared installation failure, login failure, absent `cert.pem`, and
  failed `tunnel list`, including the diagnostic output;
- invoking the command through sudo while preserving the configured admin
  user's home;
- `rakkib init` and the Cloudflare deployment step never starting an
  interactive login;
- missing Cloudflare authentication during deployment directing the operator to
  `rakkib auth --cloudflare`.

Before completion, run:

```bash
python3 -m py_compile <changed-python-files>
.venv/bin/python -m pytest tests/test_cli.py tests/test_steps_cloudflare.py
```

Fresh-server validation remains a separate user-run check after publishing the
runtime repository.
