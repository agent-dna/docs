---
id: quickstart
title: Getting Started
sidebar_position: 1
---

# Getting Started

Let's walk through a simple example involving a human and a single AI agent.

Suppose Alice wants an AI assistant to summarize a document.

```text
Alice (Human)
      │
      │ "Summarize this document."
      ▼
Assistant Agent
      │
      │ Generates summary
      ▼
Alice (Human)
```

Although this appears to be a simple request, several important questions arise:

- How does the Assistant know the request genuinely came from Alice?
- How can the Assistant verify that the request has not been modified?
- How can Alice later prove what was requested and what response was returned?

AgentDNA answers these questions through three operations: `build()`, `handle()` and `create_workflow_provenance()`.

## Initialize the participants

Every participant in a workflow is represented by an `AgentDNA` instance. For this example, we'll create one human and one AI agent.

```python
from agentdna import AgentDNA

human = AgentDNA(
    name="Alice",
    type="human",
    api_key="<Optional, only required for Beta (Explained later)>"
)

assistant = AgentDNA(
    name="Assistant",
    type="agent",
    api_key="<Optional, only required for Beta (Explained later)>"
)
```

Supported Actor types are `human`, `agent` and `app`.

## Step 1. Build the initial workflow

Alice creates the first signed [Envelope](../concepts/mental-model.md#envelope) and sends it to the Assistant.

```python
workflow = human.build(
    recipient_actor_id=assistant.get_actor_id(),
    recipient_actor_name=assistant.name,
    recipient_actor_type="agent",
    payload='{"request":"Summarize this document."}'
)
```

The workflow now contains a single signed Envelope:

```text
Alice ─────────▶ Assistant
```

## Step 2. Verify before acting

Before processing the request, the Assistant verifies the workflow.

```python
result = assistant.handle(workflow)

if not result.verification.valid:
    return
```

This verifies the chain of custody and evaluates whether the request should be accepted according to the Assistant's policy. Only after successful verification should the Assistant perform its work; otherwise, it can return the response as-is.

## Step 3. Build the response

Once the summary has been generated, the Assistant appends its own signed Envelope to the existing workflow.

```python
workflow = assistant.build(
    recipient_actor_id=human.get_actor_id(),
    recipient_actor_name=human.name,
    recipient_actor_type="human",
    payload='{"summary":"..."}',
    workflow=workflow,
)
```

The workflow now contains two linked Envelopes:

```text
Alice ─────────▶ Assistant
                     │
                     ▼
Alice ◀──────── Assistant
```

Notice that the original request is preserved. The Assistant simply appends a new signed Envelope, extending the chain of custody.

## Step 4. Store the completed workflow

After the interaction is complete, the workflow can be committed to the Provenance Layer.

```python
workflow_card_id = human.create_workflow_provenance(workflow)
```

This creates an immutable Workflow Provenance [Card](../concepts/mental-model.md#workflow-provenance-card) containing the complete interaction between Alice and the Assistant.

The same pattern scales naturally to Multi-Agent Systems. Every participant follows the same sequence:

```text
Receive workflow
        │
        ▼
    handle()
        │
Perform work
        │
        ▼
    build()
        │
Forward workflow
```

By the time the workflow completes, the nested Envelopes form a verifiable chain of custody that records every participant, every decision and every interaction from the original request to the final response. Remember, creation of workflow provenance covers both success and failures between Actors.

For more detailed implementations, refer to the examples in the AgentDNA repository.
