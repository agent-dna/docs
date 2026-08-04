---
id: dashboard-concepts
title: Concepts & glossary
sidebar_position: 2
---

# Concepts & glossary

The vocabulary used throughout the Dashboard Portal.

| Term | Meaning in this product |
| --- | --- |
| **DID** | Decentralized identifier — the primary key for every actor (agent, app, user). Long opaque string; the UI shortens it to `first12…last6` and resolves it to a human name wherever possible. Agent DIDs in this deployment start with `bafy`, which the client uses to distinguish agents from tools when the backend does not label the side. |
| **Agent** | An autonomous deployed actor owned by the org. Carries a name, a deployer, a creation time, a policy document, and running counters (interactions, threats, reliability score). |
| **App / Tool** | An external capability an agent calls (e.g. a weather service). Identified by `toolDID`; the UI derives a "provider" by taking the part of the tool name before the first dot. Labelled **Apps** in the interface, `Tool` in the type system. |
| **Intent** | One user-initiated task and the entire agent chain it triggers. Has an initiator, a start (and optionally end) time, a status (`completed` / `running` / `failed` / `pending`), a threat flag, a chain depth, and a provenance record ID. |
| **Interaction** | A single hop inside an intent: one actor sending to another at a point in time, with a threat verdict and an optional block type. |
| **Policy** | A Markdown or plain-text document attached to an agent (or user) describing what it may do. Versioned — each upload becomes a history entry with an `updateID` and timestamp. |
| **Threat** | An interaction the platform flagged as unsafe. Threat counts roll up to agents, apps, intents, users, and the org. |
| **Score / reliability** | A backend-computed 0–100 trust value per agent and app, rendered as a score bar. |
| **Provenance record ID** | Chain reference proving the intent's execution record. |
| **Block / block chain data** | The signed per-step record of an intent (`trigger`, `delegate`, `tool_call`, `execute`, `response`, `verify`), linked by `parent_block`. Powers the trace inspector. |
| **Request** | An approval workflow item. Two kinds: `deploy_agent` (create a new agent) and `agent_access` (grant a user access to an existing one). |
| **Intent number** | A client-side convenience: intents are sorted oldest-first and numbered #1, #2, … so humans can refer to them without quoting a hash. Purely presentational — every API call still uses the real `intentID`. |

:::tip Apps vs Tool
The interface says **Apps**; the code and type system say `Tool`. They are the same thing.
:::
