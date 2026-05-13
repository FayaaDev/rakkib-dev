# Approved Services

This file tracks services that exist in `src/rakkib/data/registry.yaml` and their validation status.

Status meanings:
- `Implemented and tested`: committed, pushed, synced to `runtime`, and validated on the test server.
- `Implemented, pending testing`: registry/templates/hooks exist, but the service has not yet completed the current test-server validation flow.

## Implemented And Tested

| Service | Registry ID |
| --- | --- |
| Homarr | `homarr` |
| NocoDB | `nocodb` |
| Homepage | `homepage` |
| Uptime Kuma | `uptime-kuma` |
| Dockge | `dockge` |
| transfer.sh | `transfer` |
| File Browser | `filebrowser` |
| WebDAV | `webdav` |
| IT-Tools | `it-tools` |
| CyberChef | `cyberchef` |
| Whoami | `whoami` |
| Moodist | `moodist` |
| PairDrop | `pairdrop` |
| Draw.io | `drawio` |
| Excalidraw | `excalidraw` |
| Whoogle | `whoogle` |
| PrivateBin | `privatebin` |
| Homer | `homer` |
| Glance | `glance` |
| Dashy | `dashy` |
| Dozzle | `dozzle` |
| Glances | `glances` |
| Grafana | `grafana` |
| OpenBooks | `openbooks` |
| DailyTxT | `dailytxt` |
| Wallos | `wallos` |
| n8n | `n8n` |
| FreshRSS | `freshrss` |
| Vaultwarden | `vaultwarden` |
| Immich | `immich` |
| Jellyfin | `jellyfin` |
| Chatpad AI | `chatpad` |
| Hermes Agent | `hermes-agent` |
| Lobe Chat | `lobe-chat` |
| Beszel | `beszel` |
| Watchtower | `watchtower` |
| Actual Budget | `actual-budget` |
Validation notes:
- OpenBooks: `rakkib add openbooks --yes`, `rakkib smoke openbooks`, `rakkib remove openbooks --yes`, and re-add passed on the test server using `https://openbooks.vazhs.com/`.
- DailyTxT: `rakkib add dailytxt --yes`, `rakkib smoke dailytxt`, `rakkib remove dailytxt --yes`, and re-add passed on the test server using `https://dailytxt.vazhs.com/`.
- n8n: installer-first `rakkib add n8n --yes`, internal LAN smoke, `rakkib remove n8n --yes` cleanup, re-add, and final smoke passed on the test server using `http://174.138.183.153:13004/`.
- FreshRSS: installer-first `rakkib add freshrss --yes`, internal LAN smoke, `rakkib remove freshrss --yes` cleanup, re-add, and final smoke passed on the test server using `http://174.138.183.153:13032/`.
- Vaultwarden: installer-first `rakkib add vaultwarden --yes`, internal LAN smoke, `rakkib remove vaultwarden --yes` cleanup, re-add, and final smoke passed on the test server using `http://174.138.183.153:13035/`.
- Immich: installer-first `rakkib add immich --yes`, internal LAN smoke, `rakkib remove immich --yes` cleanup, re-add, and final smoke passed on the rebuilt test server using `http://174.138.183.153:13005/`; service leaves the small test server under heavy memory/swap pressure.
- Jellyfin: after removing the approved Immich test deployment to free resources, installer-first `rakkib add jellyfin --yes`, internal LAN smoke, `rakkib remove jellyfin --yes` cleanup, re-add, and final smoke passed on the rebuilt test server using `http://174.138.183.153:13007/`.
- Chatpad AI: installer-first `rakkib add chatpad --yes`, internal LAN smoke, `rakkib remove chatpad --yes` cleanup, re-add, and final smoke passed on the test server using `http://174.138.183.153:13017/`.
- Hermes Agent: installer-first `rakkib add hermes-agent --yes`, internal LAN smoke, `rakkib remove hermes-agent --yes` cleanup, re-add, and final smoke passed on the test server using `http://174.138.183.153:13016/` after fixing root UID handling and internal dashboard port mapping.
- Lobe Chat: installer-first `rakkib add lobe-chat --yes`, internal LAN smoke, `rakkib remove lobe-chat --yes` cleanup, re-add, and final smoke passed on the test server using `http://174.138.183.153:13018/`.
- Beszel: installer-first `rakkib add beszel --yes`, internal LAN smoke, `rakkib remove beszel --yes` cleanup, re-add, and final smoke passed on the test server using `http://174.138.183.153:13031/` after fixing internal `APP_URL` rendering.
- Watchtower: installer-first `rakkib add watchtower --yes`, healthy container/log checks, `rakkib remove watchtower --yes` cleanup, and re-add passed on the test server; logs confirmed label-scoped operation without touching unrelated containers.
- Actual Budget: installer-first `rakkib add actual-budget --yes`, internal LAN smoke, `rakkib remove actual-budget --yes` cleanup, re-add, and final smoke passed on the test server using `http://174.138.183.153:13033/`.

## Implemented, Pending Testing

| Service | Registry ID | Bucket |
| --- | --- | --- |
| Caddy | `caddy` | always |
| Cloudflared | `cloudflared` | always |
| PostgreSQL | `postgres` | always |
| Open WebUI | `open-webui` | selected_services |
| Forgejo | `forgejo` | selected_services |
| OpenClaw | `openclaw` | selected_services |
| Claude | `claude` | selected_services |
| Codex | `codex` | selected_services |
| Cheshire Cat AI | `cheshire-cat-ai` | selected_services |
| Flowise | `flowise` | selected_services |
| Serge | `serge` | selected_services |
| Anse | `anse` | selected_services |
| Autoheal | `autoheal` | selected_services |
| RSSHub | `rsshub` | selected_services |
| AdGuard Home | `adguard` | selected_services |
| Stirling-PDF | `stirling-pdf` | selected_services |
| Mealie | `mealie` | selected_services |
| Gitea | `gitea` | selected_services |
