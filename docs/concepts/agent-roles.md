---
id: agent-roles
title: Host and remote agents
sidebar_position: 5
---

# Host and remote agents

A chain is built by participants passing signed work back and forth. AgentDNA gives each participant one of two roles for any given exchange, and the role decides which half of the work it does. Understanding the split makes the [build and handle](../sdk/build-and-handle.md) methods fall into place, because each role uses them in a mirror-image way.

## The two roles

A role is chosen when an `AgentDNA` instance is constructed, and it describes a participant's position in a single request and response.

### The host

The **host** initiates an exchange. It signs the outbound request, sends it, waits for a reply, and then verifies that the reply is genuine. When the flow finishes, the host is also the one that writes the audit [Record](../sdk/nfts.md). In practice the host is whichever side started the conversation: a user kicking off an intent, or a coordinator agent delegating a task downstream.

Its work, in order, is to **sign out**, then **verify in**, then **record**.

### The remote

The **remote** responds to an exchange. It receives an inbound request, verifies that the sender and the chain behind it are genuine, does its actual work, and signs a reply on the way back. A worker agent that carries out a task is a remote. So is any agent being delegated to.

Its work is the mirror image: **verify in**, then **sign out**.

## The roles are relative, not fixed

A single agent is rarely only a host or only a remote. In a delegated flow, the middle agent is a remote to the user above it and a host to the worker below it. It verifies the request that arrived, then turns around and signs a new request of its own.

```
USER ----request---->  COORDINATOR  ----request---->  WORKER
(host)             (remote here,                    (remote)
                    host there)
```

The coordinator wears both hats in the same flow. This is why the SDK does not force you to pick a permanent identity for an agent. You hold one `AgentDNA` instance and call `handle` when you are receiving and `build` when you are sending; the role is simply which of those you are doing at the moment.

## Why the symmetry matters

Because every hop is a host on one side and a remote on the other, the [chain](./mental-model.md#chain-the-linked-history) closes with no gaps. Every request that one side signs is verified by the side that receives it, and every reply is verified by the side that asked. There is no hop where a message is trusted without being checked, which is exactly what the [CoCA guarantee](./coca-and-cbac.md#coca-chain-of-custody-and-authenticity) needs in order to hold from the user's intent all the way to the final result.
