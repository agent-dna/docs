---
id: policy-source
title: Where your agent's policy comes from
sidebar_position: 7
---

# Where your agent's policy comes from

When you construct an agent you can hand it a `policy_file`, and [CBAC](./coca-and-cbac.md#cbac-context-based-access-control) checks each action against a [card](./mental-model.md#card-the-policy). It is natural to assume the card is yours to write. For local development it effectively is. But in a real deployment the policy your agent is judged against is not authored by the agent, and understanding that is part of understanding why the check means anything.

## An agent does not author its own permissions

The card CBAC trusts is signed by an administrator, a separate identity with its own [agent ID](./mental-model.md#agent-id-the-identity), and stored in Immutable Provenance as a [Record](../sdk/nfts.md). This separation is deliberate. Your agent is the thing being constrained, so if it could set its own constraints the constraint would be worthless. The authoritative answer to "what may this agent do" lives somewhere your agent cannot quietly edit.

The card records this lineage in its own frontmatter:

```markdown
---
agent-did:  did:rubix:abc...
issued-by:  did:rubix:admin...     # the admin who vouched for this card
issued-at:  2026-01-01T00:00:00Z
expires-at: 2027-01-01T00:00:00Z
allowed-actions:   [create_issue, create_pr]
forbidden-actions: [delete_repo]
---
```

Because the card is signed and in Immutable Provenance, the `issued-by` signature and the time bounds cannot be altered after the fact. A card whose `expires-at` has passed is no longer a valid grant, so authority can be made temporary by design rather than by remembering to revoke it.

## What this means for you as an adopter

A few practical consequences follow from the policy living outside your code.

- **You request capability, you do not grant it.** If your agent needs to perform a new action, the path is to have the policy updated by whoever issues it, not to widen a list in your own source.
- **A denial is not a bug in your agent.** When CBAC returns `deny`, it usually means the deployed card does not permit the action, even if your code is correct. The fix is at the policy layer, not the call site.
- **The local `policy_file` is a convenience.** It lets you develop and test against a card without a full deployment. The card that governs the agent in production is the one an admin signed in Immutable Provenance.

## Why it belongs in the trust layer

[CoCA](./coca-and-cbac.md#coca-chain-of-custody-and-authenticity) proves who acted; CBAC proves they were allowed. That second proof is only as trustworthy as the policy it checks against. By forcing the card to be issued by a separate signing authority and stored where it cannot be edited, AgentDNA makes sure the rule your agent is measured against is one a human deliberately put there, not one the agent wrote for itself.
