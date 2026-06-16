---
id: nfts
title: NFTs and on-chain storage
sidebar_position: 4
---

# NFTs and on-chain storage

AgentDNA uses NFTs as its on-chain database. Identities, policies, and finished audit trails all live on the Rubix chain as NFTs, which is what makes them durable and tamper-evident.

## The four kinds

| NFT | What it holds | Created by |
| --- | --- | --- |
| **Agent identity NFT** (`type: "agent_nft"`) | The agent's DID, its metadata, and its policy, stored as a base64-encoded `skill.md`. | `deploy_agent_nft()` / `deploy_card()` |
| **User identity NFT** (`type: "user_nft"`) | The user's DID and a free-form profile. | `deploy_user_nft()` |
| **Policy card NFT** | A standalone, admin-signed `skill.md` card. | `deploy_card(admin_dna, "skills/flight.md")` |
| **Audit NFT** (`type: "intent_nft"`) | The final, signed interaction chain, meaning the whole nested tree. | written automatically by `handle()` when a flow completes |

## Two properties worth knowing

### Identifiers are deterministic

An identity NFT's address is derived from `sha256(did + alias)`. Re-running an application does not create duplicates, because the deterministic address resolves to the NFT that already exists. The on-disk cache in `agent_info.json` makes that lookup fast, so startup stays cheap even after the first run.

### Policy is just text

An agent's policy is stored as base64-encoded content inside its NFT. The format is intentionally open. A `skill.md` file with YAML frontmatter and a markdown body works, and so does plain JSON or plain text. This flexibility is what lets the [CBAC engine](./cbac.md) support both a deterministic, schema-driven check and a semantic check over free-form policy text.
