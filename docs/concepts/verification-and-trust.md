---
id: verification-and-trust
title: Verification and trust
sidebar_position: 6
---

# Verification and trust

The [CoCA guarantee](./coca-and-cbac.md#coca-chain-of-custody-and-authenticity) says a chain can be verified. This page is about what verification actually does when an agent calls `handle`, how thorough it chooses to be, and what happens when something does not check out.

## What verification produces

Verifying a chain is not a yes-or-no event that throws an exception. It produces a result you can read. Every check appends to a `trust_issues` list, and the chain is considered trustworthy only when that list is empty:

```python
ctx = await dna.handle(incoming_envelope)

ctx.verified       # True only if every checked signature was valid
ctx.trust_issues   # human-readable reasons it failed, empty when clean
ctx.user_intent    # the original request, recovered from the root block
```

A bad signature does not halt the program. It adds an entry such as `Invalid signature from did:rubix:...` to `trust_issues` and sets `verified` to `False`. The calling agent decides what to do with that, which keeps the failure visible in the audit record rather than swallowed.

## Light and heavy modes

Verifying every signature in a long chain costs a round trip to Immutable Provenance for each one. Because that is not always necessary, `handle` accepts a `verify_mode`.

| Mode | What it checks | When to use it |
| --- | --- | --- |
| **`light`** (default) | The outermost signature, plus the root user block. Intermediate signers are trusted transitively. | Normal operation, where speed matters and the structure is well-formed. |
| **`heavy`** | Every layer of the chain, from the outermost signer down to the root, one signature at a time. | Audits, disputes, or any moment where you want to prove the whole history independently. |

The reason light mode is safe is the nesting itself. Because each outer signature is computed over the block beneath it, a valid outer signature already commits to the inner block's exact contents. Checking the outermost and the root is usually enough to catch tampering anywhere between them. Heavy mode simply removes the word "usually" by checking each link explicitly.

## Why failure is soft, not fatal

AgentDNA is an [overlay](../intro.md#design-principle-agentdna-is-an-overlay), and that principle reaches all the way down to verification. If the trust layer is not configured, an application still runs as a plain agentic flow. If a signature is bad, the flow can still complete, but the audit trail now carries the evidence that it was bad.

This is a deliberate stance. A trust layer that crashes the application on the first anomaly is one that teams switch off under pressure. A trust layer that records the anomaly and lets a human decide is one they leave on. The goal is an honest record, and an honest record is more useful than a hard stop: it shows what happened, including the parts that should not have.

## Where authorization fits

Verification answers whether the chain is authentic. It runs first, because there is no point checking a policy against signers you cannot trust. Only once CoCA passes does [CBAC](./coca-and-cbac.md#cbac-context-based-access-control) run, asking the separate question of whether the verified actor was allowed to do what it did. The two checks are sequential and independent, and both of their outcomes land in the same audit trail.
