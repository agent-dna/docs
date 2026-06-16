---
id: glossary
title: Glossary
sidebar_position: 1
---

# Glossary

| Term | Plain meaning |
| --- | --- |
| **DID** | A cryptographic identity (`did:rubix:...`) for an agent or a user. |
| **CoCA** | Chain of Custody and Authenticity, the guarantee of who signed what. |
| **CBAC** | Context-Based Access Control, the check of whether an action was allowed. |
| **Envelope** | A message plus metadata that gets signed. |
| **Block** | A signed envelope, of the form `{agent, type, envelope, signature}`. |
| **Chain** | Blocks nested through `parent_block`, forming a tamper-proof history. |
| **`parent_block`** | The previous block, tucked inside and signed over by the current one. |
| **Card / `skill.md`** | An agent's policy, or job description. |
| **Identity NFT** | The on-chain record of an agent's or user's identity and policy. |
| **Audit NFT** | The on-chain record of a completed interaction chain. |
| **`build()`** | Sign and emit an envelope. |
| **`handle()`** | Verify an inbound envelope, running CoCA and optional CBAC. |
| **`kind`** | Either `"user"`, which signs intents, or `"agent"`, which does work and carries a policy. |
| **MCP** | The tool-server boundary where agents touch external APIs, and where CBAC is enforced. |
