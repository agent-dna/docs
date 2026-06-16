---
id: cbac
title: CBAC, the authorization check
sidebar_position: 5
---

# CBAC, the authorization check

CoCA proves who acted. CBAC proves they were allowed to. This page covers how the engine in `cbac.py` makes that decision.

## The idea

Every agent has a policy card. Before an agent's action is honored, the CBAC engine fetches the card and checks the intended action against it, taking into account the surrounding context such as the arguments and the next hop. It returns a structured decision:

```python
@dataclass
class CBACResult:
    decision: str   # "allow" | "deny"
    reason:   str   # human-readable explanation
    trace:    list  # per-layer detail, for chain checks
```

## Entry points

The engine offers a few ways to run a check, depending on how much structure the policy has.

- **`fetch_card(nft_address)`** pulls a policy card NFT off the chain and parses it into a `Card`, using `parse_skill_md`.
- **`verify(ctx)`** is the chain-based check. It walks the delegation chain, fetches each layer's card, and runs deterministic checks: is the action in `allowed-actions`, is it in `forbidden-actions`, do the arguments fit the `constraints`, and is the next hop listed in `can-delegate-to`.
- **`verify_async(agent_id, intended_action, ...)`** is a newer path that scores an intended action against a policy's free-form text using lightweight lexical semantics, meaning token overlap. It works even when the policy has no rigid schema.

## What a policy card looks like

A `skill.md` card carries YAML frontmatter for the machine and a markdown body for humans:

```markdown
---
agent-did: did:rubix:abc...
issued-by: did:rubix:admin...
issued-at: 2026-01-01T00:00:00Z
expires-at: 2027-01-01T00:00:00Z
allowed-actions: [create_issue, create_pr]
forbidden-actions: [delete_repo]
constraints:
  allowed-repo: ["acme/*"]
---
This worker may open issues and PRs on Acme repositories on behalf of users.
```

The frontmatter drives the deterministic check, and the body is what the semantic check reads when no schema is present.

## Where CBAC runs in practice

CBAC sits at the boundary where an agent touches the outside world, which is typically inside an MCP tool server. Every tool call is routed through the engine before the real API is reached. If the decision is allow, the action proceeds; if it is deny, the call is stopped.

The decision is then stamped into the agent's `response` block, in a `cbac` field. As a result, the audit trail records not only what happened, but that it was authorized at the moment it happened. The [GithubAgent example](../examples/github-agent.md) shows this enforcement point in a working integration.
