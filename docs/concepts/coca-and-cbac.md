---
id: coca-and-cbac
title: CoCA and CBAC
sidebar_position: 3
---

# CoCA and CBAC

AgentDNA rests on two guarantees. They are independent, and together they answer the two questions that matter most in a multi-agent system: who acted, and whether they were allowed to.

## CoCA, Chain of Custody and Authenticity

CoCA establishes who performed each step and on whose behalf. It works through the nested chain described in [the mental model](./mental-model.md#chain-the-linked-history).

Each agent signs its envelope over the block it received, so the signature at the top of the chain transitively covers every earlier hop. Verifying a chain means checking each signature in turn, from the most recent signer back to the original user intent at the root. If any block was modified after it was signed, the verification fails at that block.

The practical effect is that the final record is self-proving. You do not need to trust a logging service or a database. The chain itself demonstrates that the user really made the request, that each agent really received what the one before it sent, and that nothing was edited along the way.

CoCA runs whenever an agent calls `handle()` on an incoming envelope. See [build and handle](../sdk/build-and-handle.md) for the API.

## CBAC, Context-Based Access Control

CoCA proves who acted. CBAC proves they were allowed to.

Every agent carries a policy card. Before an agent's action is honored, the CBAC engine fetches that card and checks the intended action against it. The check considers the action itself and the context around it, such as the arguments being passed and which downstream agent the work is going to. The engine returns a decision:

```python
@dataclass
class CBACResult:
    decision: str   # "allow" | "deny"
    reason:   str   # human-readable explanation
    trace:    list  # per-layer detail, for chain checks
```

A policy can be enforced in two ways. A deterministic check matches the action against explicit lists in the card, such as `allowed-actions`, `forbidden-actions`, and `constraints`. A semantic check scores the intended action against the free-form text of the policy, which is useful when a card has no rigid schema. Both paths are covered in detail in the [CBAC guide](../sdk/cbac.md).

In practice CBAC runs at the boundary where an agent touches the outside world, which is typically inside an MCP tool server. Every tool call is routed through the engine before the real API is reached, and the resulting decision is recorded in the agent's response block. The audit trail then shows not only what happened, but that it was authorized.

## Why both are needed

Authenticity without authorization tells you who did something but not whether they should have. Authorization without authenticity tells you a rule was checked but not who it was checked against. AgentDNA keeps the two separate so each can be reasoned about on its own, and combines them so a finished audit trail records a complete, verifiable account of an interaction.
