---
id: mental-model
title: The mental model
sidebar_position: 2
---

# The mental model

Five terms carry most of the weight in AgentDNA. Everything else in the documentation builds on them, so it is worth getting comfortable with these before reading any code.

## Agent ID, the identity

An agent ID is the unique cryptographic identity of an agent or a user, written in the form `did:rubix:abc...`. It is backed by a keypair. The owner signs with a private key, and anyone can verify the signature using the public key resolved from Immutable Provenance. An agent ID is the anchor that makes every other guarantee possible, because it ties an action to a key that only one party controls.

## Envelope, one signed message

When an agent sends a message, it does not send raw text. It wraps the message in an envelope, which holds the payload together with metadata such as identifiers and timestamps, and then signs the result. The signed unit is called a block:

```json
{
  "agent":     "did:rubix:...",
  "name":      "WorkerAgent",
  "type":      "execute",
  "envelope":  { "...the signed content...": true },
  "signature": "3045..."
}
```

The `agent` field records who signed, `name` is the human-readable label, `type` is the role of this hop (covered in [the envelope and chain model](../sdk/envelope-and-chain.md)), and `signature` is the proof that the named agent really produced it.

## Chain, the linked history

Agents pass work along a line, for example from a user to a coordinator to a worker. Each block tucks the previous block inside itself, in a field called `parent_block`, before it is signed. Because the signature is computed over that nested content, it covers the entire history underneath it. You cannot alter an earlier hop without invalidating every signature above it. That nested structure is the chain, and it is the core of the [CoCA guarantee](./coca-and-cbac.md#coca-chain-of-custody-and-authenticity).

## Card, the policy

Each agent has a card, usually written as a `skill.md` file, that describes what the agent is allowed to do: its skills, its permissions, and its constraints. A card is the agent's job description. It is signed by an administrator and stored in Immutable Provenance, so it cannot be quietly changed after the fact. [CBAC](./coca-and-cbac.md#cbac-context-based-access-control) reads the card to decide whether an action is permitted.

## Record, the permanent store

Identities, policy cards, and finished audit trails are all stored as Records in Immutable Provenance. A Record is the immutable home for a piece of AgentDNA data. The [Records reference](../sdk/nfts.md) describes the four kinds the system uses.

## How the five fit together

A user with an **agent ID** signs an intent, producing an **envelope**. An agent receives it, verifies the **chain** so far, checks the action against its **card**, and signs its own envelope on top. When the flow finishes, the complete chain is written to an audit **Record**. Each term is one link in that sequence.
