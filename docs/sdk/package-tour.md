---
id: package-tour
title: Package tour
sidebar_position: 2
---

# Package tour

The SDK lives in the `agentdna/` package. This page describes what each module is responsible for and how the layers call into one another.

## The modules

| File | Responsibility |
| --- | --- |
| `core.py` | The heart of the SDK. Defines the `AgentDNA` class with `build()`, `handle()`, NFT deploy and execute, and chain walking. Also holds the `SignedEnvelope`, `VerifyResult`, and `RequestContext` data types. |
| `trust.py` | `RubixTrustService`, the low-level bridge to Rubix. Performs the actual signing, verifying, and DID resolution. `AgentDNA` calls into this. |
| `cbac.py` | The CBAC engine. Fetches policy cards, parses `skill.md`, and decides allow or deny for an action. |
| `agent.py` | Thin helpers for the agent identity NFT, such as `deploy_card` and `identity_payload`. |
| `user.py` | Thin helpers for the user identity NFT, such as `deploy_user_nft`. |
| `__init__.py` | The public API, defining what adopters import. |

## How the layers fit

Calls flow downward. Your agent code talks only to `AgentDNA`, which orchestrates the trust service and the CBAC engine, both of which sit on top of the underlying Rubix SDK.

```
   Your agent code
   dna.build(...) / await dna.handle(...)
            |
   +--------v---------+
   |     AgentDNA     |   core.py, orchestrates everything
   +--------+---------+
            |
   +--------v---------+   +------------------+
   | RubixTrustService|   |   CBAC engine    |   trust.py + cbac.py
   | sign / verify    |   | policy decisions |
   +--------+---------+   +------------------+
            |
   +--------v---------+
   |   rubix-py SDK   |   RubixClient / Signer / Querier, talks to the chain
   +------------------+
```

The separation matters for two reasons. It keeps the cryptography and the policy logic in distinct modules that can be reasoned about independently, and it means an integration only ever depends on the `AgentDNA` surface, not on the layers beneath it.
