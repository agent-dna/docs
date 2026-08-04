---
id: dashboard-overview
title: What is the Dashboard Portal
sidebar_position: 1
---

# What is the Dashboard Portal

The AgentDNA Dashboard Portal is a web-based monitoring and analytics interface for autonomous agent networks. An organization deploys agents; those agents talk to each other and to external tools (called **Apps** in the UI) in order to fulfil user-initiated tasks. Every one of those hops is recorded. The dashboard is the window onto that record.

## What the product answers

| Question | Where it is answered |
| --- | --- |
| What is my agent network doing right now? | Home dashboard — KPI tiles, 30-day volume chart, live interaction ledger |
| Which agents and apps are most active, and which are risky? | Agents & Apps page — top-N cards, reliability score, threat counts |
| What happened during one specific task? | Intent detail + Flow graph — participants, ordered interactions, animated replay |
| Who talked to whom, and was it blocked? | Interactions ledger + interaction drawer |
| What is this agent allowed to do, and when did that change? | Agent detail — policy viewer and policy-history tab |
| Who is asking to deploy an agent or get access to one? | Requests page — creation and access approval queues |
| What has a particular person in my org been doing? | User detail — interactions, intents, threats, agents deployed |

## Two audiences, one app

- **Users** see their own activity, can browse the org's agents and apps, request an agent deployment, and request access to an existing agent.
- **Admins** additionally approve or reject those requests, create org users, manage per-user agent access, and upload/replace agent policies.

Role is carried on the session as `is_admin` and gates UI at render time (`ProtectedRoute` plus per-component checks).

:::warning Client-side gating is not a security boundary
Role checks in the interface are a UX affordance only. Every restricted operation is enforced server-side by the backend.
:::

## Scope

This section describes the **front-end only**. Backend implementation details (databases, chain writes, threat-detection logic) are out of scope; the dashboard consumes them purely over HTTP. Where the front-end compensates for a missing backend capability, that is called out explicitly — see [Known limitations](./limitations.md).

:::note Source
This section is derived from the AgentDNA Dashboard Portal technical specification.
[Download the full spec (PDF)](/assets/AgentDNA-Dashboard-Technical-Spec.pdf)
:::
