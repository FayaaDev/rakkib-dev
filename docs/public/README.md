# Rakkib

Rakkib is a wizard-driven personal server installer for fresh Ubuntu servers. It records your setup choices, renders service configuration, and applies verified setup steps for the selected services.

## Install

```bash
curl -fsSL https://install.rakkib.app | bash
```

Fallback:

```bash
curl -fsSL https://raw.githubusercontent.com/FayaaDev/rakkib/main/install.sh | bash
```

Then authorize and initialize. Cloudflare public HTTPS and internal-only installs use different first commands:

```bash
# Public HTTPS through Cloudflare
rakkib auth --cloudflare
rakkib init

# Internal-only (no public routes)
rakkib auth
rakkib init
```

Cloudflare credentials belong to the admin account, not root. Run these commands as the sudo-capable admin user.

After confirmation, `rakkib init` installs missing prerequisites and deploys the selected services. It does not open a Cloudflare login flow. Use `rakkib pull` later to reapply the confirmed configuration.

## Update

```bash
rakkib update
```

## Demo

Watch the setup demo from the public release page:

https://github.com/FayaaDev/rakkib/releases/tag/Demo

## Requirements

- Ubuntu 24.04 is the tested production deployment target.
- macOS is supported for local CLI and web UI use.
- A sudo-capable admin user is recommended; avoid running as root unless you intentionally accept root-owned install paths.
- A Cloudflare-managed domain is required for public HTTPS routes.

## Development

This repository is the generated public runtime snapshot for Rakkib installs. Runtime releases are published from the private development repository and should not be edited here directly.

## License

MIT
