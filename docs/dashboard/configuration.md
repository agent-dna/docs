---
id: dashboard-configuration
title: Configuration & deployment
sidebar_position: 8
---

# Configuration & deployment

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Yes | Base URL of the dashboard middleware API, e.g. `http://host:9000/dashboard/v1/`. A trailing slash is stripped. Falls back to `http://localhost:9000` |
| `VITE_ADMIN_API_BASE_URL` | Yes | Base URL of the agent-admin API, e.g. `http://host:8001/agent-admin/v1`. Falls back to `http://localhost:8000/agent-admin/v1` |
| `VITE_DUMMY` | No | `true`/`1` runs entirely on mock data with no backend |
| `VITE_PORT` | No | Dev-server port, default `4009` (`strictPort` is on, so a busy port fails loudly) |
| `VITE_DEV_TOKEN` | No | Fallback bearer token when `localStorage` has none. Development only |

### Resolution order

```
window.__ENV__.VITE_API_BASE_URL      ← runtime, written by the Docker entrypoint
  ?? import.meta.env.VITE_API_BASE_URL ← build time, baked in by Vite
  ?? "http://localhost:9000"           ← last-resort default
```

This is what makes one image deployable to many environments: `index.html` loads `/env-config.js` before the bundle, so the runtime value is present before the first request.

:::caution
The admin base URL currently reads only from `import.meta.env`, so changing it requires a rebuild.
:::

Dev-server `allowedHosts` is pinned to `dashboard-dev.agentdna.io` and `dashboard.agentdna.io`.

## Local development

```bash
npm install
cp .env.sample .env      # fill in the two base URLs
npm run dev              # http://localhost:4009
npm run build            # tsc -b && vite build → dist/
npm run preview
npm run lint
```

## Docker

```bash
# Build (multi-stage: node:22-alpine → nginx:1.27-alpine)
docker build -t agentdna-dashboard -f docker/Dockerfile .

# Run — configuration happens at runtime, not build time
docker run -p 80:80 \
  -e VITE_API_BASE_URL=http://your-backend-ip:9000/dashboard/v1/ \
  -e VITE_ADMIN_API_BASE_URL=http://your-backend-ip:8001/agent-admin/v1 \
  -e VITE_DUMMY=false \
  agentdna-dashboard
```

`docker/entrypoint.sh` writes the runtime config before starting nginx:

```js
window.__ENV__ = {
  VITE_API_BASE_URL: "…",
  VITE_ADMIN_API_BASE_URL: "…",
  VITE_DUMMY: "false"
};
```

The nginx layer serves `dist/` with an SPA fallback (`try_files $uri $uri/ /index.html`), gzip for text assets, and `Cache-Control: public, immutable` with a one-year expiry for hashed assets.

:::note Host networking
On macOS and Windows, a backend on the same machine is reachable as `host.docker.internal`, not `localhost`. On Linux, use the host's LAN IP.
:::

## Dummy / demo mode

With `VITE_DUMMY=true` the transport layer never reaches the network. Every request is offered to `src/data/dummyRouter.ts`, which serves 10-item pages from `src/data/dummy.json` and logs each intercepted call as `[DUMMY <METHOD> <path>]`. Auth is stubbed with a fixed demo user, so sign-in succeeds with any credentials.

The volume chart is bucketed from the seeded interaction timestamps — anchored on the latest seeded time rather than "now", so the window is always full — and layered with a deterministic baseline so the chart is never flat.

Useful for demos, design review, front-end work while the backend is unavailable, and capturing consistent documentation screenshots.
