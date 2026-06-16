---
id: the-problem
title: The problem it solves
sidebar_position: 1
---

# The problem it solves

A single language model is straightforward to reason about. You send a prompt, you get a response, and the boundary of trust is the model itself. Real systems rarely stay that simple. They grow into teams of agents that delegate work to one another.

Consider a common shape. A user asks for something. A coordinator agent interprets the request and turns it into a task. A worker agent carries out the task by calling an external tool. The result then travels back up the same path to the user. Each step is a separate process, often a separate model, sometimes running on separate machines.

This delegation is what makes agentic systems useful, and it is also what makes them hard to trust.

## Three questions that get harder with every hop

### Who acted, and for whom?

When an agent takes an action in the outside world, such as opening a GitHub issue or sending an email, the receiving system sees the action but not its lineage. It cannot tell which agent performed it, or which user the agent was acting for. Logs can record a claim, but a claim is not proof. Anyone with write access to the log can change it.

### Was the action allowed?

An agent that holds an API token can usually do everything that token permits. There is no built-in notion of "this worker may open issues but may never delete a repository." Capability and permission collapse into the same thing. Without a separate policy check, the only limit on an agent is the breadth of its credentials.

### What actually happened?

After a flow completes, reconstructing it means stitching together logs from several processes and trusting that none of them were altered. The further back you look, the weaker that trust becomes. There is usually no single artifact that captures the entire interaction and proves it has not been edited.

## What a trust layer needs to provide

To answer those questions, a system needs three properties working together:

1. **Identity.** Every participant, whether a human user or an agent, must have an identity that others can verify independently.
2. **Authenticity.** Every message must carry proof of who produced it, and that proof must cover the history that led to it.
3. **Authorization.** Before an action reaches the outside world, it must be checked against a policy that says whether the actor was permitted to take it.

AgentDNA provides all three. [CoCA](./coca-and-cbac.md#coca-chain-of-custody-and-authenticity) covers identity and authenticity. [CBAC](./coca-and-cbac.md#cbac-context-based-access-control) covers authorization. The next page introduces the vocabulary these guarantees are built from.
