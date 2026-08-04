---
id: mental-model
title: Core Data Structures
sidebar_position: 2
---

# Core Data Structures

AgentDNA revolves around three core data structures.

## Actor

Every participant in a workflow is represented by an `Actor`.

An Actor represents the digital identity of a participant involved in a workflow. AgentDNA currently supports three Actor types:

- `human`
- `agent`
- `app`

Each Actor contains:

```json
{
  "id": "bafybmifqa6ctol2tl5lksiufnnijfpcwhnocukud5bncbd55bbsfvn7upy",
  "name": "CoordinatorAgent",
  "type": "agent",
  "metadata": {}
}
```

| Field | Description |
| --- | --- |
| `id` | Globally unique Actor identifier |
| `name` | Human-readable Actor name |
| `type` | `human`, `agent` or `app` |
| `metadata` | Optional Actor-specific metadata |

## Envelope

An `Envelope` captures a single interaction between two Actors.

Every Envelope is digitally signed by the sender and references its parent Envelope, allowing workflows to be represented as a cryptographically verifiable chain.

```json
{
  "from": {
    "id": "...",
    "name": "CoordinatorAgent",
    "type": "agent",
    "metadata": {}
  },
  "to": {
    "id": "...",
    "name": "WorkerAgent",
    "type": "agent",
    "metadata": {}
  },
  "payload": "{\"action\":\"produce_task_spec\"}",
  "epoch": 1782668362,
  "metadata": {},
  "signature": "3046022100...",
  "issues": [],
  "parent_envelope": { ... }
}
```

| Field | Description |
| --- | --- |
| `from` | Sender Actor |
| `to` | Recipient Actor |
| `payload` | Action or message exchanged between Actors |
| `epoch` | Unix timestamp |
| `metadata` | Optional metadata |
| `signature` | Digital signature over the Envelope |
| `issues` | Verification or authorization findings |
| `parent_envelope` | Previous Envelope in the workflow |

## IntentWorkflow

An `IntentWorkflow` represents the complete lifecycle of an intent.

Rather than storing a sequence of events, AgentDNA stores the latest `Envelope`. Every Envelope recursively references its parent, allowing the entire chain of custody to be reconstructed from a single object.

For example:

```json
{
  "type": "intent_workflow",
  "version": "1.0",
  "remarks": "",
  "info": {},
  "envelope": {
    "from": {
      "id": "worker_actor_id",
      "name": "WorkerAgent",
      "type": "agent",
      "metadata": {}
    },
    "to": {
      "id": "coordinator_actor_id",
      "name": "CoordinatorAgent",
      "type": "agent",
      "metadata": {}
    },
    "payload": "{\"status\":\"completed\"}",
    "epoch": 1782668370,
    "metadata": {},
    "signature": "...",
    "issues": [],
    "parent_envelope": {
      "from": {
        "id": "coordinator_actor_id",
        "name": "CoordinatorAgent",
        "type": "agent",
        "metadata": {}
      },
      "to": {
        "id": "worker_actor_id",
        "name": "WorkerAgent",
        "type": "agent",
        "metadata": {}
      },
      "payload": "{\"action\":\"produce_task_spec\"}",
      "epoch": 1782668362,
      "metadata": {},
      "signature": "...",
      "issues": [],
      "parent_envelope": {
        "... previous envelope ..."
      }
    }
  }
}
```

Each `parent_envelope` links to the previous interaction, forming a nested chain that captures the complete journey of an intent from its origin to its final outcome.

## Cards

Cards are immutable records stored on the Provenance Layer. They represent persistent identities and completed workflows that can be independently retrieved and verified. These can thought of as immutable append-log files, where the only way to edit information is to append new information. This allows us to version check on the changes made on a card. One such instance is Agent Card, where every entry reflects the policy change of the Agent.

### UserCard

A `UserCard` represents a Human identity.

```python
@dataclass
class UserCard:
    type: str
    id: str
    metadata: dict[str, Any] = field(default_factory=dict)
```

| Field | Description |
| --- | --- |
| `type` | Card type. Supported values: `human`, `agent` and `app` |
| `id` | Unique identifier of the User Card. |
| `metadata` | Optional metadata associated with the user identity. |

### AgentCard

An `AgentCard` represents a deployed AI Agent.

```python
@dataclass
class AgentCard:
    type: str
    id: str
    metadata: dict[str, Any] = field(default_factory=dict)
    policy: str = ""
```

| Field | Description |
| --- | --- |
| `type` | Card type. For example, `agent`. |
| `id` | Unique identifier of the Agent Card. |
| `metadata` | Optional metadata describing the deployed Agent. |
| `policy` | The Agent's policy document captured at deployment time. |

### Workflow Provenance Card

A Workflow Provenance Card represents a completed `IntentWorkflow`.

Unlike User and Agent Cards, which represent identities, a Workflow Provenance Card captures a complete execution of an intent.

It stores the final `IntentWorkflow`, including the nested Envelope chain and all associated signatures. Since each Envelope references its parent, the stored workflow preserves the complete chain of custody from the initiating Human through every participating Agent and application to the final response.

This immutable record allows the entire workflow to be independently verified and audited at any point in the future.
