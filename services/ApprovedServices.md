# Approved Services

This file tracks services that exist in `src/rakkib/data/registry.yaml` and their validation status.

Status meanings:
- `Implemented and tested`: committed, pushed, synced to `runtime`, and validated on the test server.
- `Implemented, pending testing`: registry/templates/hooks exist, but the service has not yet completed the current test-server validation flow.

## Implemented And Tested

| Service | Registry ID | Notes |
| --- | --- | --- |
| Homarr | `homarr` | Tested on the bare-metal server with `rakkib add homarr --yes`, `rakkib smoke homarr`, remove, re-add, Cloudflare mode, and internal LAN mode on `13008`. |
| NocoDB | `nocodb` | Tested on the bare-metal server with installer-first runtime sync, `rakkib add nocodb --yes`, readiness wait, `rakkib smoke nocodb`, remove, re-add, and re-smoke in Cloudflare mode. |
| Homepage | `homepage` | Tested on the bare-metal server with installer-first runtime sync, `rakkib add homepage --yes`, readiness wait, `rakkib smoke homepage`, remove, re-add, and re-smoke in Cloudflare mode. |
| Uptime Kuma | `uptime-kuma` | Tested on the bare-metal server with installer-first runtime sync, `rakkib add uptime-kuma --yes`, readiness wait, `rakkib smoke uptime-kuma`, monitor sync, remove, re-add, and re-smoke in Cloudflare mode. |
| Dockge | `dockge` | Tested on the bare-metal server with installer-first runtime sync, `rakkib add dockge --yes`, readiness wait, `rakkib smoke dockge`, remove, re-add, and re-smoke in Cloudflare mode. |

## Implemented, Pending Testing

| Service | Registry ID | Bucket |
| --- | --- | --- |
| Caddy | `caddy` | always |
| Cloudflared | `cloudflared` | always |
| PostgreSQL | `postgres` | always |
| n8n | `n8n` | selected_services |
| Immich | `immich` | selected_services |
| transfer.sh | `transfer` | selected_services |
| Jellyfin | `jellyfin` | selected_services |
| File Browser | `filebrowser` | selected_services |
| WebDAV | `webdav` | selected_services |
| IT-Tools | `it-tools` | selected_services |
| CyberChef | `cyberchef` | selected_services |
| Whoami | `whoami` | selected_services |
| PairDrop | `pairdrop` | selected_services |
| Moodist | `moodist` | selected_services |
| Hermes Agent | `hermes-agent` | selected_services |
| Chatpad AI | `chatpad` | selected_services |
| Lobe Chat | `lobe-chat` | selected_services |
| Open WebUI | `open-webui` | selected_services |
| Forgejo | `forgejo` | selected_services |
| Draw.io | `drawio` | selected_services |
| Excalidraw | `excalidraw` | selected_services |
| OpenClaw | `openclaw` | selected_services |
| Claude | `claude` | selected_services |
| Codex | `codex` | selected_services |
| Cheshire Cat AI | `cheshire-cat-ai` | selected_services |
| Flowise | `flowise` | selected_services |
| Serge | `serge` | selected_services |
| Anse | `anse` | selected_services |
| Homer | `homer` | selected_services |
| Dozzle | `dozzle` | selected_services |
| Glance | `glance` | selected_services |
| Dashy | `dashy` | selected_services |
| Beszel | `beszel` | selected_services |
| Autoheal | `autoheal` | selected_services |
| Watchtower | `watchtower` | selected_services |
| FreshRSS | `freshrss` | selected_services |
| Actual Budget | `actual-budget` | selected_services |
| RSSHub | `rsshub` | selected_services |
| Vaultwarden | `vaultwarden` | selected_services |
| AdGuard Home | `adguard` | selected_services |
| Whoogle | `whoogle` | selected_services |
| Stirling-PDF | `stirling-pdf` | selected_services |
| Mealie | `mealie` | selected_services |
| Gitea | `gitea` | selected_services |
| PrivateBin | `privatebin` | selected_services |
| Ollama (CPU) | `ollama-cpu` | selected_services |
| Ollama (AMD) | `ollama-amd` | selected_services |
| Ollama (NVIDIA) | `ollama-nvidia` | selected_services |
