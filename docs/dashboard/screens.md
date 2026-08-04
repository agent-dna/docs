---
id: dashboard-screens
title: Page reference
sidebar_position: 4
---

# Page reference

A screen-by-screen tour of the Dashboard Portal.

## Landing & authentication — `/`

The public entry point. Combines marketing surface with the full auth experience.

- **Live stats strip** — `/global-stats` (unauthenticated) supplies Agents, Users, Interactions, Intents and Threats, abbreviated as `1.2K` / `3.4M`.
- **Role switch** — User or Admin.
- **Sign in** — user sign-in goes to the dashboard API; admin sign-in goes to the agent-admin API.
- **Register** (user role only) — email, name, password, confirm, and an emailed OTP. **Send OTP** starts a 300-second countdown before a resend is allowed.
- **Forgot password** — a separate screen: request an OTP, then submit OTP + new password.
- **Post-auth redirect** — an already-signed-in visitor is redirected to the path they originally attempted, or `/dashboard`.

Default org for self-service user registration is `AGENT_DNA_BETA`.

## Home — `/dashboard`

| | |
| --- | --- |
| **Data sources** | `/home-metrics`, `/interactions-list`, `/interactions/series?range=30d`, `/agents-apps-metrics` |
| **Empty state** | When `agentCount` is 0 after loading, the page replaces itself with a "get started" panel instead of showing zeroed tiles |

- **KPI tiles** — Active Agents, Total Intents, Total Interactions, Threats Detected.
- **Volume chart** — 30-day series split into safe vs threat, with total derived client-side. Renders as area, line or bar according to the chart-style tweak.
- **Top agents / Top apps** — a toggle between the two leaderboards from `/agents-apps-metrics`; rows link through to the relevant detail page.
- **Bottom ledger** — tabbed *Interactions* / *Threats*. Interactions are server-paginated; threats are the same feed filtered client-side on the threat flag. Clicking a row opens the interaction drawer.
- **CSV export** — builds a two-section CSV (summary block, then the agent list) entirely in the browser and downloads it as `agentdna-dashboard-YYYY-MM-DD.csv`.

## Intents — `/intents`

Server-paginated intent table with client-side filter pills: *All*, *Threats*, *Safe*.

Columns: Intent ID (truncated chip with hover tooltip), Status chip (`completed` green, `running` blue, `failed` red, `pending` amber), Initiator, Agents/Apps touched, Interactions, Threats, Started. Header cells with a comparator are sortable. Summary tiles above the table aggregate the current page.

:::caution
The filter pills operate on the **current page only**, because filtering is not pushed to the API. Users may see fewer "Threats" rows than the org total.
:::

## Intent detail — `/intents/:intentId`

| | |
| --- | --- |
| **Data sources** | `/intent-info` + paginated `/interactions-list?intentID=` |
| **Tabs** | **Interactions** (paginated ledger) · **Agents & Apps** (participants) |
| **Tiles** | Interactions · Agents touched · Apps touched · Threats |
| **Actions** | Export a PDF report · jump to the Flow view · open any row in the drawer |

Participant rows are **derived, not fetched**: the client walks every page of the intent's interactions, drops the initiator, groups the remaining actors by DID, and counts appearances, threats and last-seen time. Agent-vs-tool classification uses the `bafy` DID prefix.

Runtime is computed as `endedAt − startedAt`; an intent with no `endedAt` shows a runtime of zero.

## Agents & Apps — `/agents`

- **Header cards** — Top Agents and Top Apps by interaction volume, plus org totals and average reliability from `/agents-apps-metrics`.
- **Tabbed table** — *Agents* and *Apps*, each server-paginated with its own page state. Agent rows navigate to `/agents/:id`; app rows navigate to `/tools/:name` (URL-encoded).
- **Actions** — request an agent deployment (`AgentRequestModal`), request access to an existing agent (`AccessRequestModal`), and export the visible list as a PDF.

## Agent detail — `/agents/:agentId`

| | |
| --- | --- |
| **Data sources** | `/agent-info`, `/agent-interactions`, `/agent-intents`, `/agent-policy-history`, `/agent-policy-update` |
| **Tabs** | **Interactions** · **Intents** · **Policy History** |
| **Tiles** | Interactions · Threats · Intents handled (plus reliability score bar) |

- **Header** — name, shortened DID with copy, deployer, org, created-ago, status chip.
- **Policy viewer** — the current policy text from `/agent-info`; empty when none is uploaded. Admins can replace it via `EditAgentPolicyModal` (multipart `.md`/`.txt` upload).
- **Policy History** — history entries sorted oldest-first to assign a change number, then displayed newest-first. Selecting an entry fetches that version's full text and opens it in `ViewPolicyModal`.
- **PDF export** — one report bundling the agent summary, interactions, intents and policy history.

## App detail — `/tools/:toolId`

The route parameter can be either a DID or a tool name; the data layer inspects it (`bafy` prefix or a `did:` substring means DID) and sends `toolDID` or `name` accordingly. A single `/tool-info` call returns the summary plus both paginated sub-collections, so the *Interactions* and *Intents* tabs each drive their own page parameter on the same endpoint.

## User detail — `/users/:userId`

One `/user-info` call returns the user record plus four independently paginated collections. Tabs: **Interactions**, **Intents**, **Threats**, **Agents Deployed** — each with its own page parameter, all sent on every request.

Header stats: interactions, threats, intents, agents deployed, agents accessible, active flag, created and last-active times.

## Interactions — `/interactions`

The complete org ledger, server-paginated. The `LedgerTable` columns are: Interaction ID, Initiator, Interacted with, Intent, Threat, Time. Every row opens the interaction drawer, which shows the full IDs, both counterparties, the intent link, the threat verdict, the block type and the timestamp.

## Flow — `/graph/:intentId`

The most involved screen: an animated reconstruction of how an intent moved through the network.

### Source precedence

1. **`/intent-diagram`** — preferred. Carries real messages, typed hops (`trigger`, `delegate`, `tool_call`, `response`, `execute`) and correct tree structure.
2. **`/interactions-list` + `/intent-block-data`** — fallback. The flow graph is built from the interaction list, and the trace is enriched by flattening the `parent_block` chain into an oldest→newest sequence.

When the diagram endpoint answers, its trace is *not* overridden by block data — block messages are placeholders and would degrade the display.

### Model

```ts
Flow {
  intentId, intent,
  nodes: FlowNode[]     // kind: human | agent | tool, tier-laid-out x/y
  edges: [from, to][]   // unique directed pairs
  steps: FlowStep[]     // ordered hops: dir (request|response), title, summary,
                        // verdict (allowed|blocked), checks {identity,trust,scope},
                        // latency, spanId
  status: "halted" | "completed"
  trace: FlowTrace      // span tree + totals (tokens in/out, cost, ids)
  rawDiagram?: unknown  // raw API payload, shown verbatim in the JSON tab
}
```

### Interaction model

- **Canvas** — nodes laid out in tiers (initiator → agents → tools), edges highlighted as the active step advances, threat hops marked.
- **Step rail** — a scrollable list of hops; the active card auto-scrolls into view. Clicking a step jumps to it and pauses playback.
- **Playback** — auto-advance every 2.4 s, wrapping at the end. The current step index is persisted to `localStorage["flow.step"]` and clamped when the flow changes.
- **TraceInspector** — an OpenTelemetry-style span tree per step: input, output, model, status, signature, metadata, plus a raw-JSON tab.

## Requests — `/requests`

| Tab | Visible to | Endpoint |
| --- | --- | --- |
| Creation requests | All | `/agents-creation-requests-list` (admin) or `…-list-user` |
| Org access requests | All | `/agent-access-requests-list-org` |
| My access requests | All | `/agent-access-requests-list-user` |
| Users | **Admin** | `/users-list` |

- Rows show request type, agent name, requester (DID resolved to a name), status chip (pending / approved / rejected), created time, and the attached policy.
- Admins get approve and reject actions per row; the list reloads afterwards.
- Users can create a new agent request and edit their own pending ones.
- Approving a deployment opens `DeployAgentModal`, which shows the deployment phase (loading / success / error) rather than a bare toast.
- A backend `no_did` error is handled as its own empty state — the account has no DID yet, which is a distinct situation from "no requests".
- The Users tab lists org members with intent and threat counts and accessible-agent counts, offers `AddUserModal` for admins, and opens `UserAccessDrawer` to manage per-agent access.

## Profile — `/profile`

Loads `/admin-profile` or `/user-profile` depending on the role, plus `/token-usage`. Shows name, email, organization, role, member-since, and the API key — masked as `abcd••••••••wxyz` with reveal and copy actions. Token usage renders as a used/limit meter with a reset date. Inline editing of name and email posts to `/update-profile`; a separate form posts to `/change-password`. A support contact block and sign-out complete the page.
