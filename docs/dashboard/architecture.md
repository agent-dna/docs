---
id: dashboard-architecture
title: Architecture
sidebar_position: 3
---

# Architecture

## Technology stack

| Concern | Choice | Notes |
| --- | --- | --- |
| UI framework | React 19 | Function components + hooks only; `StrictMode` enabled |
| Language | TypeScript ~5.9 | Strict project references (`tsconfig.app.json` / `tsconfig.node.json`) |
| Bundler / dev server | Vite 7 | Dev port `4009` by default, `strictPort`, host exposed |
| Routing | react-router-dom 7 | `BrowserRouter` + nested layout route |
| Styling | Tailwind CSS 4 + custom CSS | Tailwind via `@tailwindcss/vite`; most visual identity lives in CSS custom properties in `src/index.css` |
| Charts | Recharts 3 | Area/line/bar volume chart, sparklines |
| Animation | Framer Motion 12 | Flow graph transitions, drawer/modal motion |
| Icons | lucide-react | Wrapped by `src/components/Icon.tsx` with a named icon registry |
| PDF generation | jsPDF 4 | Client-side report export — no server involvement |
| Lint | ESLint 9 + typescript-eslint | Includes react-hooks and react-refresh plugins |
| Production server | nginx 1.27 (alpine) | Static files, SPA fallback, gzip, immutable asset caching |
| State management | React Context + local hooks | Deliberately no Redux / Zustand / React Query |

### NPM scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `npm run dev` | `vite` | Dev server with HMR |
| `npm run build` | `tsc -b && vite build` | Type-check then bundle to `dist/` |
| `npm run preview` | `vite preview` | Serve the production bundle locally |
| `npm run lint` | `eslint .` | Lint the whole repo |

## System architecture

The dashboard is a **stateless client**. It owns no persistence beyond browser `localStorage` (session token, cached user, UI preferences). Everything displayed comes from two HTTP services.

```
Browser — single-page app served by nginx

main.tsx
  └ BrowserRouter
      └ AuthProvider
          └ DirectoryProvider
              └ IntentNumbersProvider
                  └ TweaksProvider
                      └ DrawerProvider
                          └ Routes
                              ├ /        LockedPage
                              ├ /login   LoginPage
                              └ ProtectedRoute → App shell
                                    └ Outlet → feature pages

— Presentation —
Pages (src/pages) • Components (src/components)
        │ consume
        ▼
— Access —
Hooks (src/data/hooks.ts) — useAsync: data/loading/error/refetch
        │ call
        ▼
— Domain —
src/data/api.ts     wire → domain mapping, derived aggregates
src/api/*.ts        thin per-feature endpoint wrappers
        │ call
        ▼
— Transport —
src/api/client.ts   base URL • Bearer token • envelope unwrap
                    401 handling • logging • dummy short-circuit
        │
        ├──────────────────────┬──────────────────────
        ▼                      ▼
VITE_API_BASE_URL       VITE_ADMIN_API_BASE_URL
Dashboard middleware    Agent-admin API
/dashboard/v1/…         /agent-admin/v1/…
(everything except      (admin login &
 admin login)            admin register)
```

### Layering contract

1. **Pages never call `fetch`.** They call a hook or a data-layer function. No page constructs a URL or knows about the token.
2. **`src/data/api.ts` owns every wire→domain mapping.** If the backend renames a field, that file is the only place that should need editing.
3. **`src/api/client.ts` is the only transport.** It is the single place that knows the base URL, the auth header, and the response envelope.
4. **Types flow one way.** Wire interfaces (`ApiAgent`, `ApiIntent`, …) are private to the data layer; the rest of the app only ever sees the domain types from `src/types.ts`.

### Request lifecycle

Every call goes through `apiRequest<T>(path, opts)`:

1. **Dummy short-circuit** — if `VITE_DUMMY` is on and the mock router recognizes the path, the mock response is returned immediately and logged as `[DUMMY …]`.
2. **URL assembly** — `new URL(BASE + path)`; query params are appended, skipping `null`/`undefined`/empty values.
3. **Headers** — always `Accept: application/json`; `Content-Type: application/json` only when a body is present; `Authorization: Bearer <token>` unless `auth: false`.
4. **Timing & logging** — start time is captured and every outcome (success, network failure, non-OK, invalid JSON) is logged with elapsed milliseconds. This is intentional: the console is the primary field-debugging tool.
5. **401 handling** — throws `ApiError("Unauthorized", 401)`. If `skipLogoutOn401` is false, the token is cleared and the registered unauthorized handler fires, signing the user out.
6. **Envelope unwrap** — the body is parsed as `{ status, data, message }`. A non-OK HTTP status *or* `status: false` throws `ApiError(message, httpStatus)`. Otherwise the inner `data` is returned.

File uploads use `apiUpload<T>(path, formData)`, which is the same pipeline minus the `Content-Type` header, so the browser can set the multipart boundary itself.

:::note Error model
A single `ApiError` class carries `message` and `status`. Network failures surface as status `0`. Many read paths in the data layer deliberately swallow errors and return an empty result so one failing panel cannot blank the whole page; write paths always propagate so the UI can show a real message.
:::

## Application bootstrap & provider tree

`src/main.tsx` mounts the app and declares the entire route table. The provider order matters:

| Provider | Responsibility | Why at this level |
| --- | --- | --- |
| `AuthProvider` | Session, token storage, JWT decode/expiry, login/register/logout | Outermost — everything else may depend on who is signed in |
| `DirectoryProvider` | Builds a `DID → { name, kind }` map by walking every page of agents, tools and users | Needs auth; every table below it wants name resolution |
| `IntentNumbersProvider` | Walks every intent and assigns stable sequential numbers (oldest = #1) | Needs auth; used by intent chips everywhere |
| `TweaksProvider` | UI preferences — density, sidebar state, chart style, font — persisted to `localStorage` | Pure presentation, no data dependency |
| `DrawerProvider` | Global right-hand detail drawer: `{ kind, entity }` plus open/close | Innermost — the drawer is rendered by the app shell |

The authenticated area is a single nested route: `<ProtectedRoute><App /></ProtectedRoute>`. `App.tsx` renders the persistent chrome and an `<Outlet />` for the active page.

### App shell

- **Sidebar** — logo, a *Workspace* group (Home, Intents, Agents & Apps, Flow, Requests, Interactions) and an *Account* group (Profile), plus a footer showing the signed-in identity and org. Collapsible; the collapsed state is a tweak.
- **Requests badge** — for admins only, the shell fetches page 1 of both request queues on mount and shows the combined count of `pending` items next to the Requests nav item.
- **Topbar** — sidebar toggle, breadcrumb (`ORG / Section`, derived from the current path), and global search.
- **Global search** — 300 ms debounce, hits `/search?q=`, renders a `SearchDropdown` grouped into Agents / Apps / Intents; selecting a result navigates and clears the query. Closes on outside click or `Escape`.
- **Drawer host** — one `<Drawer>` whose body is chosen from the drawer kind: `agent`/`tool` → `EntityDetail`, `interaction` → `InteractionDetail`, `intent` → `IntentDetail`.
- **Font injection** — the selected tweak font is written to the `--font-body` CSS variable on the document element.

## Repository structure

```
agentdna-dashboard/
├── docker/
│   ├── Dockerfile          multi-stage node build → nginx serve
│   └── entrypoint.sh       writes env-config.js at container start
├── nginx.conf              reference SPA config (SPA fallback, gzip, caching)
├── vite.config.ts          react + tailwind plugins, dev port, allowed hosts
├── index.html              loads /env-config.js before the bundle
├── public/
└── src/
    ├── main.tsx            provider tree + route table
    ├── App.tsx             authenticated shell
    ├── types.ts            domain types
    ├── index.css           design tokens + component styles
    │
    ├── api/                transport + thin per-feature wrappers
    │   ├── client.ts       apiRequest / apiUpload / token / ApiError
    │   ├── auth.ts         login, admin login, register, OTP, password reset
    │   ├── profile.ts      user & admin profile, update, change password
    │   ├── users.ts        org users, create user, access grant/revoke
    │   ├── requests.ts     agent-creation & agent-access workflows
    │   ├── policy.ts       policy fetch/upload/history
    │   └── keys.ts         API key lifecycle, token usage
    │
    ├── data/
    │   ├── api.ts          domain data layer + wire→domain mappers
    │   ├── hooks.ts        useAsync + all useX hooks
    │   ├── dummyRouter.ts  offline mock router
    │   └── dummy.json      seed data
    │
    ├── context/
    │   ├── AuthContext.tsx
    │   ├── DirectoryContext.tsx
    │   ├── IntentNumbersContext.tsx
    │   ├── DrawerContext.tsx
    │   └── TweaksContext.tsx
    │
    ├── components/         shared UI
    │   ├── drawer/         EntityDetail, InteractionDetail, IntentDetail, DrawerSection
    │   └── forms/          modals & pickers
    │
    ├── lib/
    │   ├── exportAgentPdf.ts • exportIntentPdf.ts • exportListPdf.ts
    │   └── format.ts       timeAgo, fmtRuntime, initials
    │
    └── pages/
        ├── LockedPage.tsx  public landing + auth
        ├── LoginPage.tsx
        ├── HomePage.tsx
        ├── IntentsPage.tsx • IntentDetailPage.tsx
        ├── AgentsToolsPage.tsx • AgentDetailPage.tsx • ToolDetailPage.tsx
        ├── UserDetailPage.tsx
        ├── InteractionsPage.tsx • AlertsPage.tsx
        ├── RequestsPage.tsx • requests/UsersTab.tsx
        ├── ProfilePage.tsx
        └── flow/           FlowPage.tsx • FlowCanvas.tsx • flowData.ts
```

## Routing map

| Path | Component | Access | Purpose |
| --- | --- | --- | --- |
| `/` | LockedPage | Public | Landing page with live global stats and the full auth experience |
| `/login` | LoginPage | Public | Standalone sign-in screen |
| `/dashboard` | HomePage | Auth | Org overview |
| `/intents` | IntentsPage | Auth | Intent list |
| `/intents/:intentId` | IntentDetailPage | Auth | One intent in depth |
| `/agents` | AgentsToolsPage | Auth | Agents and Apps inventory |
| `/agents/:agentId` | AgentDetailPage | Auth | One agent in depth |
| `/tools/:toolId` | ToolDetailPage | Auth | One app in depth (param may be a name or a DID) |
| `/users/:userId` | UserDetailPage | Auth | One org user in depth |
| `/graph` | FlowPage | Auth | Flow graph, no intent selected |
| `/graph/:intentId` | FlowPage | Auth | Animated replay of one intent |
| `/requests` | RequestsPage | Auth | Approval queues; the Users tab is admin-only |
| `/interactions` | InteractionsPage | Auth | Full interaction ledger |
| `/profile` | ProfilePage | Auth | Account, API key, usage, security |
| `*` | → `/dashboard` | Auth | Catch-all redirect |

Unauthenticated visitors hitting a protected path are redirected to `/` with the attempted path preserved in router state, so they land where they meant to go after signing in. `AlertsPage` and `LandingPage` exist in the tree but are not currently routed.

## State management & contexts

### AuthContext

Owns the session. Exposes `user`, `token`, `loading`, and the actions `login`, `loginAdmin`, `registerAdmin`, `registerUser`, `logout`, `patchUser`.

- Persists the JWT at `localStorage["agentdna.token"]` and the decoded user at `localStorage["agentdna.user"]`.
- On boot it restores the stored user, falling back to decoding the stored token.
- `decodeJwt` base64url-decodes the payload. A token whose `exp` has passed yields `null` — an expired token is never treated as a session.
- A 30-second interval re-checks the token and signs the user out the moment it expires, rather than waiting for the next 401.
- Registers itself as the client's unauthorized handler so a hard 401 clears the session.
- Admin JWTs carry `sub` (username) and no `email`; user JWTs carry `email`. When `is_admin` is absent the context infers admin from that shape.
- After any successful sign-in it fetches the matching profile in the background and patches `name` and `org_id` onto the session.

### DirectoryContext

Interaction records carry DIDs, not names. On mount this provider walks *every page* of `/agents-list`, `/tools-list` and `/users-list` (capped at 200 pages each, stopping early on an empty page or when `totalPages` is reached) and builds a `Map<DID, { name, kind }>`. Each of the three fetches fails independently and degrades to an empty list rather than breaking the map.

`useResolveName()` returns a lookup that falls back to a shortened DID for unknown entries. Tables prefer the directory name, then any backend-supplied name on the record, then the shortened DID.

### IntentNumbersContext

Loads all intents once, sorts oldest-first, and exposes `Map<intentID, number>`. Also exports `IntentIdChip`, which renders a truncated ID (`abcd...xyz`) with a hover tooltip showing the full value, positioned in the viewport so it is never clipped by a table's overflow.

### DrawerContext & TweaksContext

`DrawerContext` holds at most one `{ kind, entity }` pair; any table row can open a detail panel without prop-drilling. `TweaksContext` holds four presentation preferences — density (`compact`/`comfortable`/`spacious`), sidebar (`expanded`/`collapsed`), chart style (`area`/`line`/`bar`) and font (Inter, Geist, IBM Plex Sans, Manrope, DM Sans) — persisted to `localStorage["agentdna.tweaks"]`.

### The `useAsync` primitive

```ts
interface AsyncState<T> {
  data: T;              // always defined — callers supply an initial value
  loading: boolean;
  error: Error | null;
  refetch: () => void;  // bumps an internal nonce to re-run the effect
}
```

Every data hook is one line on top of this. Stale responses are discarded via a `cancelled` flag, so rapid pagination cannot render an out-of-order page.

:::warning No shared cache
There is no request de-duplication or cache layer. Navigating away and back refetches. This keeps the mental model simple and the data fresh, at the cost of repeat traffic — size your backend accordingly.
:::
