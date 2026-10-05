---
id: mental-model
title: Core Data Structures
sidebar_position: 3
---

# Core Data Structures

AgentDNA revolves around the following core data structures.

## Actor

Every participant in a workflow is an `Actor`, identified by a globally unique Actor ID. AgentDNA currently supports three Actor types:

- `user`
- `agent`
- `tool`

Envelopes reference Actors by their ID.

## Envelope

An `Envelope` captures a single interaction between two Actors.

Every Envelope is digitally signed by the sender and references its parent Envelopes, allowing workflows to be represented as a cryptographically verifiable chain.

```json
{
  "from": "coordinator_actor_id",
  "to": "worker_actor_id",
  "payload": "{\"action\":\"produce_task_spec\"}",
  "epoch": 1782668362,
  "status_code": 1000,
  "hash": "<Hash of the Envelope's content>",
  "signature": "3046022100...",
  "parent_envelope": [ ... ]
}
```

| Field | Description |
| --- | --- |
| `from` | ID of the Actor building the Envelope |
| `to` | (Optional) ID of the Actor receiving the Envelope |
| `payload` | Action or message exchanged between Actors |
| `epoch` | Unix timestamp of Envelope formation |
| `status_code` | Status code for errors that occurred while the Envelope was formed |
| `hash` | Hash of the Envelope's content, which is signed and verified |
| `signature` | Hex-encoded signature by the Actor building the Envelope |
| `parent_envelope` | List of Envelopes upon which the current Envelope is built |

### Status codes

The following status codes are set on an Envelope:

| Code | Description |
| --- | --- |
| `1000` | No issues found |
| `1001` | Agent not whitelisted |
| `1002` | Error while performing Agent whitelist verification |
| `2001` | Envelope verification failed under `light` mode |
| `2002` | Envelope verification failed under `heavy` mode |
| `2003` | Envelope verification failed under `boundary` mode |
| `2999` | CoCA verification failure for an unknown reason |
| `4001` | MCP Tool execution error. A special case where the workflow isn't interrupted |
| `4002` | Generic Middleware execution error |

## IntentWorkflow

An `IntentWorkflow` represents the complete lifecycle of an intent.

Rather than storing a sequence of events, AgentDNA stores the latest `Envelope`. Every Envelope recursively references its parents, allowing the entire chain of custody to be reconstructed from a single object.

`IntentWorkflow` is a DTO (Data Transfer Object) that is passed between the Actors of an agentic workflow.

For example:

```json
{
  "type": "intent_workflow",
  "version": "1.0",
  "remarks": "",
  "info": {},
  "envelope": {
    "from": "worker_actor_id",
    "to": "coordinator_actor_id",
    "payload": "{\"status\":\"completed\"}",
    "epoch": 1782668370,
    "status_code": 1000,
    "hash": "<Hash of the Envelope's content>",
    "signature": "...",
    "parent_envelope": [
      {
        "from": "coordinator_actor_id",
        "to": "worker_actor_id",
        "payload": "{\"action\":\"produce_task_spec\"}",
        "epoch": 1782668362,
        "status_code": 1000,
        "hash": "<Hash of the Envelope's content>",
        "signature": "...",
        "parent_envelope": []
      }
    ]
  }
}
```

Each `parent_envelope` links to the previous interactions, forming a nested chain that captures the complete journey of an intent from its origin to its final outcome.

## Cards

Cards are immutable records stored on the Provenance Layer. They represent persistent identities and completed workflows that can be independently retrieved and verified. They can be thought of as immutable append-log files, where the only way to edit information is to append new information. This allows us to version check the changes made on a Card. One such instance is the Agent Card, where every entry reflects a policy change of the Agent.

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
| `type` | Card type. Supported values: `user`, `agent` and `tool` |
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

It stores the final `IntentWorkflow`, including the nested Envelope chain and all associated signatures. Since each Envelope references its parents, the stored workflow preserves the complete chain of custody from the initiating Human through every participating Agent and tool to the final response.

This immutable record allows the entire workflow to be independently verified and audited at any point in the future.
