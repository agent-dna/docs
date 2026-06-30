---
id: architecture
title: What runs around your agent
sidebar_position: 4
---

# What runs around your agent

When you adopt AgentDNA, almost everything you write touches one object: the `AgentDNA` instance inside your agent. But that instance does not work alone. This page is a map of what sits around your code, so you know what you depend on and what is optional.

## What lives in your process

The SDK runs inside your agent. When you call `build` or `handle`, the signing, verifying, CBAC checks, and Record writes all happen in-process through the `AgentDNA` object. This is the only part you import and the only surface you program against, as the [package tour](../sdk/package-tour.md) describes. If you understand `build` and `handle`, you understand your half of the system.

## What you depend on

The one thing your agent cannot run without, once the trust layer is switched on, is **Immutable Provenance**. It is a separate process, reached over the `chain_url` you pass when you construct an instance. It is what actually resolves [agent IDs](./mental-model.md#agent-id-the-identity), performs the cryptography, and stores every [Record](../sdk/nfts.md). Your SDK calls into it; you do not implement any of it.

```
   Your agent process
   +--------------------+
   |   your agent       |
   |   build / handle   |
   +---------+----------+
             |  signs, verifies, stores Records
   +---------v----------+
   | Imm. Provenance    |   separate process, set via chain_url
   | Agent IDs + Records|
   +--------------------+
```

If no API key is configured, even this dependency is soft. The application still runs as a plain agentic flow and the trust layer simply switches off, which is the [overlay principle](../intro.md#design-principle-agentdna-is-an-overlay) at work.

## What an organization runs for you

Around Immutable Provenance, an organization that operates AgentDNA at scale may run a small platform: a service that governs which agents exist and what they may do, and a dashboard that shows the history of what happened. You integrate with these, but you do not build them, and your agent code does not change whether they are present or not.

As an adopter, two facts about that platform are worth carrying:

- The **policy** your agent is checked against does not come from your code. It is issued elsewhere and stored in Immutable Provenance, which is the subject of [where your agent's policy comes from](./policy-source.md).
- The **audit trail** your flows produce is readable without any extra work on your part, because the platform observes the Records you already write. You sign and record; the operator reads.

The separation is the point. You can adopt the SDK and Immutable Provenance alone, and the governance and observability pieces can be added later without you rewriting anything.

