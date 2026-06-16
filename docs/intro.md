---
id: intro
title: Introduction
sidebar_position: 1
slug: /intro
---

# Introduction to AgentDNA

AgentDNA is a trust layer for multi-agent AI systems. It gives every agent a verifiable identity, cryptographically signs every message that agents exchange, and records the full interaction as a tamper-proof audit trail on the Rubix blockchain.

Modern AI systems are rarely a single model. They are teams of agents that hand work to one another. A user asks for something, a coordinator agent breaks the request down, a worker agent calls a tool, and a result flows back up the line. That structure is powerful, but it raises three questions that are hard to answer after the fact:

- **Who acted?** If an agent created a GitHub issue or sent an email, can you prove which agent, acting on whose behalf, did it?
- **Was it allowed?** An agent being able to call a tool does not mean it should. Something needs to check.
- **What actually happened?** When a flow goes wrong, can you replay the full chain of who asked whom, and trust that the record was not edited afterward?

AgentDNA answers these with two pillars.

| Pillar | Question it answers | How |
| --- | --- | --- |
| **CoCA** (Chain of Custody and Authenticity) | Who acted, and on whose behalf? | Every hop is cryptographically signed and nested into a verifiable chain. |
| **CBAC** (Context-Based Access Control) | Was the agent allowed to do this? | Each agent carries a policy card; the intended action is checked against it before it runs. |

The audit trail is written to an NFT on Rubix, so the record is immutable once a flow completes.

## Where to start

If you are new to AgentDNA, read the documentation in order:

1. [The problem it solves](./concepts/the-problem.md) explains why a trust layer is needed.
2. [The mental model](./concepts/mental-model.md) covers the five terms everything else builds on.
3. [CoCA and CBAC](./concepts/coca-and-cbac.md) describes the two guarantees in detail.

Once the concepts are clear, the [SDK guide](./sdk/build-and-handle.md) shows how to put them to work, and the [GithubAgent example](./examples/github-agent.md) walks through a complete integration.

## Design principle: AgentDNA is an overlay

AgentDNA is meant to sit alongside an existing agent system, not replace it. An application can run end to end as a plain agentic flow, and the trust layer switches on when it is configured. This soft-fail behavior is deliberate. It lets teams adopt provenance incrementally rather than rewriting their stack first.
