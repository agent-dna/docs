---
id: agent-user
title: Securing User-Agent and Agent-Agent Interaction
sidebar_position: 1
---

# Getting Started

To install AgentDNA, run the following:

```bash
pip install agent-dna
```

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

AgentDNA answers these questions through three operations: `build()`, `verify()` and `record()`.

## Initialize the participants

Every participant in a workflow is represented by an `AgentDNA` instance. For this example, we'll create one human and one AI agent.

```python
from agentdna.core import AgentDNA

user = AgentDNA(
    name="Alice",
    type="user",
    api_key="<Optional, only required for Beta (Explained later)>",
    provenance_layer_url="<Optional, Provenance Layer URL>",
)

assistant = AgentDNA(
    name="Assistant",
    type="agent",
    api_key="<Optional, only required for Beta (Explained later)>",
    provenance_layer_url="<Optional, Provenance Layer URL>",
    admin_server_url="<Optional, Admin Server URL. Used for Agent whitelist verification>",
)
```

Supported Actor types are `user`, `agent` and `tool`.

## Step 1. Build the initial workflow

Alice creates the first signed [Envelope](../concepts/mental-model.md#envelope) containing her request.

```python
workflow = user.build(
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
from agentdna.error import RESULT_OK

verification_code = assistant.verify(workflow)

if verification_code != RESULT_OK:
    invalid_workflow_record = assistant.build(
        payload="invalid workflow received",
        verification_code=verification_code,
    )

    # Record the details on the immutable Provenance Layer
    assistant.record(invalid_workflow_record)

    raise RuntimeError("Invalid AgentDNA workflow")
```

This verifies the chain of custody and evaluates whether the request should be accepted according to the Assistant's policy. The returned value is one of the Envelope [status codes](../concepts/mental-model.md#status-codes).

Only after successful verification should the Assistant perform its work. When verification fails, the failure should be recorded before the request is rejected.

## Step 3. Build the response

Once the summary has been generated, the Assistant appends its own signed Envelope to the existing workflow.

```python
workflow = assistant.build(
    payload='{"summary":"..."}',
    previous_workflows=workflow,
)
```

The workflow now contains two linked Envelopes:

```text
Alice ─────────▶ Assistant ─────────▶ Alice
```

Notice that the original request is preserved. The Assistant simply appends a new signed Envelope, extending the chain of custody.

## Step 4. Store the completed workflow

After the interaction is complete, the workflow can be committed to the Provenance Layer.

```python
workflow_card_id = user.record(workflow)
```

This creates an immutable Workflow Provenance [Card](../concepts/mental-model.md#workflow-provenance-card) containing the complete interaction between Alice and the Assistant.

The same pattern scales naturally to Multi-Agent Systems. Every participant follows the same sequence:

```text
Receive workflow
        │
        ▼
    verify()
        │
Perform work
        │
        ▼
    build()
        │
Forward workflow
```

As the workflow propagates between Actors, each Actor appends a signed Envelope. By the time the workflow completes, the nested Envelopes form a verifiable chain of custody that records every participant, every decision and every interaction from the original request to the final response. Remember, workflow provenance is created for both successful and failed interactions between Actors.

The same mechanism used to secure human-agent communication can also be applied to agent-agent communication. To secure an Agent's access to external resources such as MCP servers, see [Securing Agent-Resource Interaction](./agent-resource-interaction.md).
