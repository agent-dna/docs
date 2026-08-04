---
id: dashboard-api-reference
title: API reference
sidebar_position: 5
---

# API reference

## Conventions

- **Base URLs** — everything except admin sign-in/registration is relative to `VITE_API_BASE_URL`; admin sign-in uses `VITE_ADMIN_API_BASE_URL`.
- **Envelope** — every response is `{ status: boolean, data: T, message?: string }`. The client returns `data` and throws on `status: false`.
- **Auth** — `Authorization: Bearer <jwt>` on all authenticated calls.
- **Pagination** — list responses carry `{ <items>, total, page, pageSize, totalPages }`. Default page size is 10.
- **Uploads** — multipart `FormData`; the client omits `Content-Type` so the browser sets the boundary.

## Authentication & account

| Method | Endpoint | Auth | Request → Response |
| --- | --- | --- | --- |
| POST | `/login` | No | `{ email, password }` → `{ token, did, email, org_id, api_key, nft_id?, is_admin, agent_access_list? }` |
| POST | `/login` *(admin base)* | No | `{ username, password }` → JWT string in `data` |
| POST | `/register-user` | No | `{ name?, email, password, orgID, otp }` → `{ api_key, name, email, orgID }` |
| POST | `/create-admin` | No | `{ username, email, orgID, password, otp }` → `{ did }` |
| POST | `/register-admin` | No | `{ did, org_id }` → same. Whitelists a newly created admin DID in the middleware |
| POST | `/send-otp` | No | `{ email }` → `{ message }` |
| POST | `/forgot-password` | No | `{ email }` → `{ message }` |
| POST | `/reset-password` | No | `{ email, otp, new_password }` → `{ message }` |
| GET | `/user-profile` | Yes | → `{ name, email, apiKey, organizationID, createdAt, adminEmail }` |
| GET | `/admin-profile` | **Admin** | → `{ name, email, organizationID, apiKey, agentCount, intentCount, threatCount, totalUsers, createdAt }` (`createdAt` = epoch seconds) |
| PATCH | `/update-profile` | Yes | `{ name?, email? }` → `{ message }` |
| POST | `/change-password` | Yes | `{ currentPassword, newPassword }` → `{ message }` |
| POST | `/generate-api-key` | Yes | → `{ api_key }` |
| POST | `/revoke-api-key` | Yes | → void |
| GET | `/token-usage` | Yes | → `{ tokensUsed, tokensLimit, resetAt? }` |

## Metrics

| Method | Endpoint | Response & consumer |
| --- | --- | --- |
| GET | `/global-stats` | `{ totalUsers, totalAgents, totalInteractions, totalIntents, totalThreats }` — public landing page, no auth |
| GET | `/home-metrics?page=` | `{ agentCount, intentCount, interactionsCount, threatCount, page, agentList[] }` where each entry is `{ agentID, agentName, totalInteractions, totalThreats }` |
| GET | `/agents-apps-metrics` | `{ topAgents[], topApps[], metrics: { totalInteractions, totalThreats, totalAgents, totalApps, avgReliability } }` |
| GET | `/interactions/series?range=` | `{ safe: number[], threats: number[] }`; `total` is summed client-side. `range ∈ 24h \| 7d \| 30d`. Failure degrades to empty arrays |

## Lists

| Method | Endpoint | Item shape |
| --- | --- | --- |
| GET | `/agents-list?page=` | `agentsList[]`: `{ agentID, agentName, createdAt, deployer, policy, totalInteractions, totalThreats, score }` |
| GET | `/tools-list?page=` | `toolsList[]`: `{ toolDID, toolName, totalInteractions, totalThreats, score }` |
| GET | `/intent-list?page=` | `intentsList[]`: `{ intentID, initiatorDID, initiatorName?, startedAt, endedAt?, status, threatDetected, threatCount?, flowType?, executor?, chainDepth?, interactionsCount?, agentsCount?, toolsCount?, provenanceRecordID? }` |
| GET | `/interactions-list?page=&intentID=` | `interactionList[]`: `{ interactionID, from, to, fromName?, toName?, threat, intentID, time, blockType? }`. `intentID` is optional and scopes the feed to one intent |
| GET | `/users-list?page=` | `usersList[]`: `{ userID, userName, createdAt, totalIntents, totalThreats, accessAgentCount }` |
| GET | `/search?q=` | `{ agents: [{ did, name, orgID }], apps: [{ did, name }], intents: [{ intentID, flowType, status, threatDetected, startedAt }] }` |

## Detail

| Method | Endpoint | Response |
| --- | --- | --- |
| GET | `/agent-info?agentDID=` | `{ agentDID, agentName, createdAt, deployerDID, policy?, orgID, totalInteractions, totalThreats, score }` |
| GET | `/agent-interactions?agentDID=&page=` | `interactionsList[]` + pagination |
| GET | `/agent-intents?agentDID=&page=` | `intentsList[]` + pagination |
| GET | `/tool-info?toolDID=\|name=&interactionsPage=&intentsPage=` | `{ toolDID, toolName, totalInteractions, totalThreats, totalIntents, totalAgents, score, interactions:{list,…}, intents:{list,…} }` |
| GET | `/user-info?userID=&interactionsPage=&intentsPage=&threatsPage=&agentsPage=` | `{ user:{…}, interactions:{…}, intents:{…}, threats:{…}, agents:{…} }` — four independently paginated collections in one call |
| GET | `/intent-info?intentID=` | `{ intentID, initiatorDID, initiatorName?, startedAt, endedAt?, status, threatDetected, provenanceRecordID?, interactions? }` |
| GET | `/intent-diagram?intentID=` | `{ basicInfo: { intentID, initiatorDID, initiatorName, flowType, status, threatDetected, chainDepth, interactionsCount, agentsCount, toolsCount, startedAt }, interactions: [{ interactionID, initiator, initiatorName, to, toName, type, message, intentID, threat, epoch }] }` |
| GET | `/intent-block-data?intent_id=` | A recursive `IntentBlock`: `{ id, block_index, agent_did, agent_name, direction, block_type, message, response, delegate_to, received_from, cbac_app, cbac_decision, threat_detected, trust_issues[], signature, created_at, parent_block }` |

:::caution Parameter casing
`/intent-block-data` takes `intent_id` (snake case) while every other intent endpoint takes `intentID`.
:::

## Policy

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/agent-policy-history?agentDID=` | `{ agentDID?, nftID?, history: [{ updateID, time }] }` — `time` is epoch seconds |
| GET | `/agent-policy-update?agentDID=&updateID=` | `{ updateID, time, policy }` — full text of one version |
| GET | `/user-policy?userDID=` | `{ filename?, content, uploadedAt? }` |
| POST | `/upload-agent-policy` | multipart `agentDID` + `file` (`.md`/`.txt`) — admin only |
| POST | `/upload-user-policy` | multipart `userDID` + `file` |

## Requests & user administration

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/agents-creation-requests-list?page=` | **Admin** — every creation request in the org |
| GET | `/agents-creation-requests-list-user?page=` | The caller's own creation requests |
| POST | `/agents-creation-requests-create` | multipart `agentName` (required), `agentID?`, `requestInfo?`, `policy` (file or plain text) → `{ requestID }` |
| POST | `/agents-creation-requests-edit` | `{ requestID, agentName, policy, requestInfo?, agentID? }` → `{ requestID }` |
| POST | `/agent-creation-request-result-submit` | **Admin** — `{ requestID, status: "approved"\|"rejected" }` |
| GET | `/agent-access-requests-list-org?page=` | **Admin** — org-wide access requests |
| GET | `/agent-access-requests-list-user?page=` | The caller's own access requests |
| POST | `/agent-access-request-create` | `{ agentDID, agentName?, requestInfo? }` → `{ requestID }` |
| POST | `/agent-access-request-submit` | **Admin** — `{ requestID, status }` |
| POST | `/create-user` | **Admin** — `{ did, name?, email, password, orgID }`. `nft_id` and `api_key` are generated server-side; a blank name auto-assigns `user_1`, `user_2`, … |

### Request record shape

Both queues share one shape:

```json
{
  "requestID": "...",
  "requestType": "deploy_agent | agent_access",
  "policy": "...",
  "creatorDID": "...",
  "agentDID": "...",
  "agentName": "...",
  "requestInfo": "...",
  "status": "pending | approved | rejected",
  "createdAt": "..."
}
```

:::warning Proposed, not guaranteed
`/user-access-list`, `/admin-grant-agent-access` and `/admin-revoke-agent-access` are wired in the client but may not exist on every backend build. Treat them as provisional.
:::

## Domain types

```ts
type Status = "safe" | "warn" | "threat";

interface Agent {
  id; name; score; created;        // created = minutes since creation
  interactions; threats; connected;
  status: Status; env; owner;      // env = orgID, owner = deployer DID
  policy?: string;                 // raw .md/.txt text, "" when none
}

interface Tool {
  id; name; score; created;
  interactions; threats; connected;
  status: Status; scope; provider; // provider = tool name before the first "."
}

interface Intent {
  id; name;                        // name carries the status string
  initiator: Agent;                // stub Agent built from the initiator DID
  runtime;                         // ms, endedAt − startedAt (0 if unfinished)
  started;                         // minutes ago
  agentsInteracted; toolsInteracted; interactionsCount;
  threats; score; status: Status;
  provenanceRecordID; signature?;
}

interface Interaction {
  id; initiator: EntityRef; target: EntityRef;
  targetType: "agent" | "tool";
  intent: { id; name };
  runtime; threat: boolean; created;   // created = minutes ago
  blockType?: string;
}
```

Also defined: `TimeSeries`, `HeatmapRow`, `LogEntry`, `IntentParticipant`, `HomeMetrics`, `HomeAgentSummary`, `PublicMetrics`.

### Mapping conventions

| Convention | Detail |
| --- | --- |
| Timestamps → minutes-ago | `isoToMinutesAgo` converts every ISO timestamp to an integer number of minutes at map time. The UI formats it with `timeAgo`. Invalid or missing dates become `0` |
| DID shortening | Anything longer than 24 characters renders as `first12…last6` |
| Name resolution order | Directory map → backend-supplied `fromName`/`toName` → shortened DID |
| Derived status | Agents flip to `warn` above 5 threats; tools above 4. These thresholds live in the client |
| Agent vs tool | Determined by the `bafy` DID prefix wherever the backend does not label the side |
| Full-collection walks | `fetchAllAgents`, `fetchAllTools`, `fetchAllIntents`, `listAllUsers` loop pages up to a 200-page ceiling, stopping on an empty page or at `totalPages` |
| Defensive reads | Detail and series fetches catch and return `null` or an empty result so a single failing panel does not blank the page |

### Hook catalogue

| Hook | Returns |
| --- | --- |
| `useHomeMetrics(page)` | Home KPI payload + agent summary list |
| `useAgentsAppsMetrics()` | Top agents/apps and org rollups |
| `useSeries(range)` | Interaction time series for `24h` / `7d` / `30d` |
| `useAgents` / `useAgentsPaged(page)` | Agent list, plain or with pagination metadata |
| `useTools` / `useToolsPaged(page)` | App list |
| `useIntents` / `useIntentsPaged(page)` | Intent list |
| `useInteractions` / `useInteractionsPaged(page)` | Interaction ledger |
| `useAlerts(page)` | Interactions filtered to threats (client-side) |
| `useUsers(page)` | Org users |
| `useAgent(id)` | Single agent |
| `useAgentInteractions` / `useAgentIntents(id)` | Agent sub-collections |
| `useAgentPolicyHistory(id)` | Policy version list |
| `useIntent(id)` | Intent header with derived participant counts |
| `useIntentInteractionsPaged(id, page)` | Interactions inside one intent |
| `useIntentParticipants(id)` | Derived participant rollup |
| `useIntentDiagram(id)` / `useIntentBlockData(id)` | Flow graph sources |
| `useToolInfo(nameOrDid, …)` | App detail with both sub-collections |
| `useUserInfo(userID, …4 page params)` | User detail with all four sub-collections |

`useHeatmap` and `useLogs` exist but currently resolve to empty arrays — no backend endpoint yet.
