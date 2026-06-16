---
id: envelope-and-chain
title: The envelope and chain model
sidebar_position: 3
---

# The envelope and chain model

This is the concept that makes AgentDNA work, so it is worth taking slowly. The short version: every signed message wraps the message before it, and the result is a history that cannot be edited without breaking.

## A single block

Every signed message has this shape, simplified for clarity:

```json
{
  "agent":     "<DID of signer>",
  "name":      "WorkerAgent",
  "direction": "outbound",
  "type":      "execute",
  "envelope": {
    "payload":      { "...the actual message...": true },
    "parent_block": { "...the block this one wraps...": true }
  },
  "signature": "<proof>"
}
```

The `direction` field records whether the hop is sending a request outbound or returning a result inbound. The `parent_block` field, nested inside the envelope, is the link to the previous hop.

## Block types

The `type` field tells you what role a hop plays. You will see these constantly when reading a chain.

| Type | Direction | Meaning |
| --- | --- | --- |
| `intent` | outbound | A user's original request, the innermost block. |
| `delegate` | outbound | An agent handing work to a downstream agent. |
| `execute` | outbound | The last agent before a tool or app, running the action. |
| `response` | inbound | An agent returning a result back up the chain. |
| `verify` | inbound | The user or system verifying the final result and writing the NFT, the outermost block. |
| `trigger` | outbound | Like `intent`, but for system-initiated flows such as webhooks or cron, with no human. |
| `approval` | outbound | A second user co-signing someone else's intent. |

## How nesting works

Suppose a user asks a coordinator, which delegates to a worker. Each new block wraps the previous one inside its own envelope before it is signed:

```
Worker's execute block
  envelope.parent_block = Coordinator's delegate block
    envelope.parent_block = User's intent block   (the root, no parent)
```

Because the worker signs over the coordinator's block, which signed over the user's, you cannot tamper with any earlier hop without invalidating every signature above it. That single property is the entire security guarantee.

## Walking the chain

To read the history, follow `parent_block` inward until there is none left. That is what `_walk_chain()` does in `core.py`:

```python
def walk_chain(block):
    chain = []
    current = block
    while current is not None:
        chain.append(current)
        current = current.get("envelope", {}).get("parent_block")
    return chain   # [outermost, ..., root]
```

`chain[0]` is the most recent signer and `chain[-1]` is the original user intent at the root. Reverse the list and you get a clean timeline, from the moment the user asked to the moment the result returned.

:::note
The full block and payload schema for every flow, covering the simple, delegated, CBAC, fan-out, retry, multi-user, and system-triggered cases, is documented in the `NFT_CHAIN_SPEC.md` reference. Treat that document as the authoritative wire format. This page is the intuition behind it.
:::
