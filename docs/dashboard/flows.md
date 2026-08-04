---
id: dashboard-flows
title: Key end-to-end flows
sidebar_position: 7
---

# Key end-to-end flows

## Sign in

```
Landing (/) → pick role → submit credentials
  → POST /login (dashboard or admin API)
  → store token + user in localStorage
  → background GET /user-profile | /admin-profile → patch name + org
  → DirectoryProvider walks agents/tools/users → DID→name map
  → IntentNumbersProvider walks intents → stable intent numbers
  → redirect to the originally attempted path, else /dashboard
```

## Request an agent deployment

```
User: /requests → "New request" → AgentRequestModal
  fields: agentName (required), agentID?, requestInfo?, policy file (.md/.txt) or text
  → POST /agents-creation-requests-create  (multipart) → { requestID }
  → row appears as "pending"; the user may edit it while pending
     via POST /agents-creation-requests-edit

Admin: sidebar badge shows the pending count
  → /requests → Creation tab → review name, requester, policy
  → Approve → POST /agent-creation-request-result-submit { requestID, "approved" }
  → DeployAgentModal shows loading → success | error
  → list reloads; the new agent appears under /agents
```

## Request access to an existing agent

```
User: /agents → pick an agent → "Request access" → AccessRequestModal
  → POST /agent-access-request-create { agentDID, agentName?, requestInfo? }

Admin: /requests → Org access requests
  → POST /agent-access-request-submit { requestID, "approved" | "rejected" }
  → the agent joins the user's agent_access_list
```

## Investigate an intent

```
/dashboard or /intents → click an intent
  → /intents/:id
      GET /intent-info                        header + status + provenance
      GET /interactions-list?intentID=&page=  ledger (all pages walked to derive participants)
      → Interactions tab: row → interaction drawer (full IDs, threat, block type)
      → Agents & Apps tab: derived participants → agent page or tool drawer
  → "View flow" → /graph/:id
      GET /intent-diagram       preferred: real messages + typed hops
      GET /intent-block-data    fallback: signed block chain → trace spans
      → animated canvas + step rail + TraceInspector (input/output/model/signature/raw JSON)
  → "Export PDF" → jsPDF report generated in the browser
```

## Update an agent policy

```
Admin: /agents/:id → "Edit policy" → EditAgentPolicyModal → pick .md/.txt
  → POST /upload-agent-policy (multipart agentDID + file)
  → Policy History tab reloads: GET /agent-policy-history
  → click a version: GET /agent-policy-update?agentDID=&updateID= → ViewPolicyModal
```

## Export reports

| Export | Where | Contents |
| --- | --- | --- |
| Agent PDF | Agent detail | Summary, score, interactions, intents, policy history |
| Intent PDF | Intent detail | Intent header, interaction list, participant rollup |
| List PDF | Agents & Apps | The visible agent or app table, with status colouring |
| Dashboard CSV | Home | Summary block plus the full agent list |

All exports are generated client-side (jsPDF for PDF, a Blob download for CSV) at A4, 40 pt margins, with a navy/blue/red palette matching the UI. **No data leaves the browser.**
