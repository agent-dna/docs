---
id: build-and-handle
title: build and handle
sidebar_position: 1
---

# The two core methods

Most of the SDK reduces to two methods on the `AgentDNA` class. If you understand `build` and `handle`, you understand how an agent participates in a chain. Everything else, such as `initialise_intent`, `sign_response`, and `verify_reply`, is a convenience wrapper around these two.

## Creating an AgentDNA instance

You construct one `AgentDNA` per identity:

```python
from agentdna import AgentDNA

dna = AgentDNA(
    alias="WorkerAgent",            # the agent's name
    api_key=AGENTDNA_API_KEY,       # required, get one at agentdna.io
    kind="agent",                   # "agent" or "user"
    chain_url="http://...",         # the Rubix node
    cbac=True,                      # run policy checks during handle()
    policy_file="worker/skills.md", # this agent's policy card, agents only
)
```

When the instance is created, it lazily ensures that an identity NFT exists for its DID. The result is cached on disk in `~/.agentdna/agent_info.json`, so the NFT is minted only once and later runs reuse it.

### Two kinds of identity

The `kind` argument decides where the identity sits in a chain.

- **`kind="user"`** represents a human, or the system standing in for one. Users sit at the root of a chain and sign intents, meaning statements of what they want. They do not carry policy cards, because they have wishes rather than job descriptions.
- **`kind="agent"`** acts on behalf of a user. It carries a policy card, supplied through `policy_file`, that describes what it may do, and it performs the actual work.

## build, sign and send

`build` takes a payload, signs it, and returns a wire-ready envelope, a `SignedEnvelope`. An agent calls it whenever it emits a message, whether that is a fresh request, a delegation to another agent, or a reply.

```python
envelope = dna.build({"action": "create_issue", "repo": "acme/web"})
```

When you are continuing a chain rather than starting one, you pass the verified context of the message you received so the new block wraps it:

```python
env = dna.build(spec, parent=ctx, recipient_name="WorkerAgent")
```

The `parent` argument is what links the new block to the previous one. It is the mechanism behind the nesting described in [the envelope and chain model](./envelope-and-chain.md).

## handle, verify what you received

`handle` takes an incoming envelope, checks every signature in the chain, which is the CoCA guarantee, optionally runs CBAC policy checks, and returns a verified `RequestContext` that you can trust.

```python
ctx = await dna.handle(incoming_envelope)   # flags the chain if any signature is bad

ctx.user_intent   # what the original user actually asked for
ctx.verified      # True if the whole chain checks out
ctx.cbac_result   # the policy decision, when CBAC is enabled
```

A typical agent node does the two in sequence: it calls `handle` to verify what arrived, does its own work, then calls `build` to sign and forward the result. Chaining those steps across several agents is exactly what produces a complete, verifiable interaction.
