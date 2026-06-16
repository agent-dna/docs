# AgentDNA — Onboarding Guide
---

## 1. The one-sentence version

**AgentDNA is a trust layer for multi-agent AI systems.** It gives every agent a
verifiable identity, cryptographically signs every message agents exchange, and
records the whole interaction as a tamper-proof audit trail on the Rubix
blockchain.

---

## 2. The problem it solves

Modern AI systems aren't one model — they're **teams of agents** that hand work to
each other. A user asks for something, a coordinator agent breaks it down, a
worker agent calls a tool, and a result flows back.

That raises uncomfortable questions:

- **Who actually did this?** If an agent created a GitHub issue or sent an email,
  can you *prove* which agent, acting for which user, did it?
- **Was it allowed?** Just because an agent *can* call a tool doesn't mean it
  *should*. Who checks?
- **What happened, exactly?** When something goes wrong, can you replay the full
  chain of who-asked-whom, and trust that the record wasn't edited after the fact?

AgentDNA answers all three with two pillars:

| Pillar | Answers | How |
|--------|---------|-----|
| **CoCA** (Chain of Custody & Authenticity) | *Who* acted, and on whose behalf? | Every hop is cryptographically signed and nested into a verifiable chain. |
| **CBAC** (Context-Based Access Control) | *Was the agent allowed* to do this? | Each agent carries a policy ("skill card"); the action is checked against it before it runs. |

The audit trail itself is written to an **NFT** on Rubix, so it's immutable.

---

## 3. The mental model (5 words you must know)

Before any code, internalize these five terms. Everything else builds on them.

### DID — *the identity*
A **Decentralized Identifier** is an agent's (or user's) unique cryptographic
identity, like `did:rubix:abc...`. It's backed by a keypair: the agent signs with
its private key, and anyone can verify using the public key resolved from the chain.

### Envelope — *one signed message*
When an agent sends a message, it doesn't send raw text. It wraps the message in
an **envelope**: the payload + metadata (IDs, timestamps), then **signs** it. The
signed result is a **block**:

```
block = {
  "agent":     "did:rubix:...",   // who signed
  "name":      "WorkerAgent",     // human-readable
  "type":      "execute",         // what kind of hop (see §6)
  "envelope":  { ...the signed content... },
  "signature": "3045...",         // proof it was really them
}
```

### Chain — *the linked history*
Agents pass work down a line: user → coordinator → worker. Each block tucks the
**previous** block inside itself (in a field called `parent_block`) *before*
signing. So the signature covers the whole history underneath it — you can't edit
an earlier hop without breaking every signature above it. That nested structure is
the **chain**.

### Card (skill.md) — *the policy*
Each agent has a **card** describing what it's allowed to do (its skills,
permissions, constraints). Think of it as the agent's job description, signed by an
admin and stored on-chain.

### NFT — *the permanent record*
Identities, policy cards, and the final audit trail are all stored as **NFTs** on
the Rubix chain. NFT = the immutable, on-chain home for a piece of AgentDNA data.

---

## 4. The two verbs you'll use 95% of the time

The whole SDK boils down to two methods on the `AgentDNA` class. If you understand
these, you understand AgentDNA.

### `build(...)` — *"sign and send"*
Takes a payload, signs it, returns a wire-ready **envelope** (a `SignedEnvelope`).
Used whenever an agent emits a message — a fresh request, a delegation, or a reply.

```python
envelope = dna.build({"action": "create_issue", "repo": "acme/web"})
```

### `handle(...)` — *"verify what I received"*
Takes an incoming envelope, checks every signature in the chain (this is **CoCA**),
optionally runs **CBAC** policy checks, and hands you back a verified
`RequestContext` you can trust.

```python
ctx = await dna.handle(incoming_envelope)   # raises/flags if signatures are bad
ctx.user_intent     # what the original user actually asked for
ctx.verified        # True if the whole chain checks out
ctx.cbac_result     # the policy decision, if CBAC is on
```

Everything else (`initialise_intent`, `sign_response`, `verify_reply`, …) is a
convenience wrapper around these two.

---

## 5. The building blocks (package tour)

The SDK lives in `agentdna/`. Here's what each file is for:

| File | What's in it |
|------|--------------|
| [`core.py`](../agentdna/core.py) | The heart. The `AgentDNA` class — `build()`, `handle()`, NFT deploy/execute, chain walking. Also the `SignedEnvelope`, `VerifyResult`, and `RequestContext` data types. |
| [`trust.py`](../agentdna/trust.py) | `RubixTrustService` — the low-level bridge to Rubix. Does the actual signing, verifying, and DID resolution. `AgentDNA` calls into this. |
| [`cbac.py`](../agentdna/cbac.py) | The **CBAC** engine — fetches policy cards, parses `skill.md`, and decides allow/deny for an action. |
| [`agent.py`](../agentdna/agent.py) | Thin helpers for the **agent** identity NFT (`deploy_card`, `identity_payload`). |
| [`user.py`](../agentdna/user.py) | Thin helpers for the **user** identity NFT (`deploy_user_nft`). |
| [`__init__.py`](../agentdna/__init__.py) | The public API — what adopters import. |

### The layering (top calls down)

```
   Your agent code
   dna.build(...) / await dna.handle(...)
            │
   ┌────────▼─────────┐
   │     AgentDNA     │   core.py — orchestrates everything
   └────────┬─────────┘
            │
   ┌────────▼─────────┐   ┌──────────────────┐
   │ RubixTrustService│   │   CBAC engine    │   trust.py + cbac.py
   │ sign / verify    │   │ policy decisions │
   └────────┬─────────┘   └──────────────────┘
            │
   ┌────────▼─────────┐
   │   rubix-py SDK   │   RubixClient / Signer / Querier — talks to the chain
   └──────────────────┘
```

### The `AgentDNA` class — how you create one

```python
from agentdna import AgentDNA

dna = AgentDNA(
    alias="WorkerAgent",          # the agent's name
    api_key=AGENTDNA_API_KEY,     # required — get one at agentdna.io
    kind="agent",                 # "agent" or "user" (see below)
    chain_url="http://...",       # the Rubix node
    cbac=True,                    # turn on policy checks during handle()
    policy_file="worker/skills.md",  # this agent's policy card (agents only)
)
```

**Two `kind`s of identity:**

- **`kind="user"`** — a human (or the thing standing in for one). Users sit at the
  **root** of a chain. They sign *intents* ("I want X"). They don't carry policy
  cards — they have wishes, not job descriptions.
- **`kind="agent"`** — acts *on behalf of* a user. Carries a policy card
  (`policy_file=`) describing what it may do. Does the actual work.

When you construct an `AgentDNA`, it lazily ensures an **identity NFT** exists for
that DID (cached on disk in `~/.agentdna/agent_info.json`, so it's only minted
once).

---

## 6. The envelope & chain model (the important part)

This is the concept that makes AgentDNA tick, so let's go slow.

### A single block

Every signed message has this shape (simplified):

```
{
  "agent":     "<DID of signer>",
  "name":      "WorkerAgent",
  "direction": "outbound",        // sending a request | "inbound" = returning a result
  "type":      "execute",         // the role of this hop
  "envelope": {
    "payload":      { ...the actual message... },
    "parent_block": { ...the block this one wraps... }   // the magic
  },
  "signature": "<proof>"
}
```

### The block `type`s (the verbs of a conversation)

`type` tells you what role a hop plays. You'll see these constantly:

| Type | Direction | Meaning |
|------|-----------|---------|
| `intent` | outbound | A user's original request — the innermost block. |
| `delegate` | outbound | An agent handing work to a *downstream* agent. |
| `execute` | outbound | The last agent before a tool/app — it runs the action. |
| `response` | inbound | An agent returning a result back up the chain. |
| `verify` | inbound | The user/system verifying the final result and writing the NFT — the outermost block. |
| `trigger` | outbound | Like `intent`, but for system-initiated flows (webhooks, cron) with no human. |
| `approval` | outbound | A second user co-signing someone else's intent. |

### How nesting works

Say the user asks the Coordinator, who delegates to the Worker. Each new block
**wraps the previous one inside its own envelope before signing**:

```
Worker's execute block
└── envelope.parent_block = Coordinator's delegate block
    └── envelope.parent_block = User's intent block   ← the root, no parent
```

Because the Worker signs *over* the Coordinator's block (which signs over the
user's), **you cannot tamper with any earlier hop** without invalidating every
signature above it. That's the whole security guarantee in one idea.

### Walking the chain

To read the history, you follow `parent_block` inward until there's none left.
That's exactly what `_walk_chain()` does (in [`core.py`](../agentdna/core.py)):

```python
def walk_chain(block):
    chain = []
    current = block
    while current is not None:
        chain.append(current)
        current = current.get("envelope", {}).get("parent_block")
    return chain   # [outermost, ..., root]
```

`chain[0]` is the most recent signer; `chain[-1]` is the original user (the root
**intent**). Reverse it and you get a clean timeline from "user asked" to "result
returned."

> 📖 The full block/payload schema for every flow (simple, delegated, CBAC,
> fan-out, retry, multi-user, system-triggered) is documented in
> [`docs/NFT_CHAIN_SPEC.md`](NFT_CHAIN_SPEC.md). Treat that as the reference; this
> guide is the intuition.

---

## 7. NFTs — where everything is stored

AgentDNA uses NFTs as its on-chain database. There are four kinds:

| NFT | Holds | Created by |
|-----|-------|------------|
| **Agent identity NFT** (`type: "agent_nft"`) | The agent's DID + metadata + its **policy** (base64-encoded `skill.md`). | `deploy_agent_nft()` / `deploy_card()` |
| **User identity NFT** (`type: "user_nft"`) | The user's DID + a free-form profile. | `deploy_user_nft()` |
| **Policy card NFT** | A standalone, admin-signed `skill.md` card. | `deploy_card(admin_dna, "skills/flight.md")` |
| **Audit NFT** (`type: "intent_nft"`) | The final, signed interaction chain (the whole §6 tree). | written automatically by `handle()` when the flow completes |

Two things worth knowing:

1. **IDs are deterministic.** An identity NFT's address is derived from
   `sha256(did + alias)`. So re-running your app doesn't create duplicates — it
   finds the existing one. (Caching on disk in `agent_info.json` makes this fast.)
2. **Policy is just text.** An agent's policy is stored as base64-encoded content
   in its NFT. The format is deliberately open — `skill.md` (markdown +
   frontmatter), JSON, or plain text all work. (This flexibility matters for the
   CBAC engine; see next.)

---

## 8. CBAC — the "are you allowed?" check

CoCA proves *who* acted. **CBAC proves they were *allowed* to.**

The idea: every agent has a **policy card**. Before an agent's action is honored, the
CBAC engine fetches that card and checks the intended action against it. It returns
a decision:

```python
@dataclass
class CBACResult:
    decision: str   # "allow" | "deny"
    reason:   str   # human-readable explanation
    trace:    list  # per-layer detail (for chain checks)
```

The engine ([`cbac.py`](../agentdna/cbac.py)) offers a few entry points:

- **`fetch_card(nft_address)`** — pull a policy card NFT off the chain and parse it
  into a `Card` (via `parse_skill_md`).
- **`verify(ctx)`** — the chain-based check: walk the delegation chain, fetch each
  layer's card, and run **deterministic** checks (is the action in
  `allowed-actions`? in `forbidden-actions`? do the args fit `constraints`? is the
  next hop in `can-delegate-to`?).
- **`verify_async(agent_id, intended_action, ...)`** — a newer path that scores an
  intended action against a policy's *free-form text* using lightweight lexical
  semantics (token overlap), so it works even when the policy has no rigid schema.

A policy card (`skill.md`) looks like this — YAML frontmatter for the machine,
markdown body for humans:

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

> **Where CBAC runs in practice:** it sits at the boundary where an agent touches
> the outside world — typically inside an **MCP tool server** (see the GithubAgent
> example below). Every tool call is routed through the CBAC engine *before* the
> real API is hit. The allow/deny decision is then stamped into the agent's
> `response` block (the `cbac` field) so the audit trail records not just *what*
> happened, but that it was *authorized*.

---

## 9. Putting it together — the GithubAgent example

Theory is easier with a real app. The **GithubAgent**
(`Agentic-Workflows-Examples/GithubAgent`) is a reference integration that lets a
user create GitHub issues/PRs in plain English, with full AgentDNA provenance.

### What it does

> A user types *"Create an issue in acme/web titled 'Login bug' with body
> '...'"*. The system parses that, opens the issue via GitHub's API, and returns
> the URL — and **every hop along the way is signed and recorded**.

### The cast

It's built on **LangGraph** (with Gemini as the LLM) and has two agents wired in a
simple line:

```
START → coordinator → worker → END
```

| Agent | Role | Policy (`skills.md`) | Tools |
|-------|------|----------------------|-------|
| **Coordinator** | Understands the user's request and turns it into a clean task spec. | "language understanding only — **no tools**". | none |
| **Worker** | Executes the task by calling GitHub tools. | "may **only** call `create_issue` / `create_pr`, always through the MCP server". | `create_issue`, `create_pr` |

There are **three processes**:
1. The **LangGraph app** (UI/CLI + the two agents).
2. A **GitHub MCP server** (the tool boundary where CBAC is enforced).
3. The **Rubix node** (signs, verifies, stores NFTs).

### How AgentDNA is wired in

The example keeps the trust layer cleanly separated under
`app/integrations/agentdna/`:

- **`registry.py`** — a singleton cache of agent identities. `get("worker_agent",
  policy_file="worker/skills.md")` returns a ready `AgentDNA` (or `None` if the API
  key is unset — the app **soft-fails** gracefully without the trust layer).
- **`user_session.py`** — `UserSession.open(intent)` mints/loads the user identity
  and signs their intent; `.close(reply)` verifies the final result and writes the
  audit NFT.
- **`sealer.py`** — assembles the final signed reply that closes the chain.
- **`warmup.py`** — pre-builds identities at startup so the first request isn't slow.
- **`agentdna_helpers.py`** — tiny wrappers (`verify_inbound`, `sign_forward`,
  `sign_execute`, `sign_response`) the agent nodes call.

### The end-to-end flow (follow the signatures)

Here's a single request, hop by hop. Match this against the real sample envelope in
[`intermediate_envelope.json`](../../Agentic-Workflows-Examples/GithubAgent/intermediate_envelope.json).

```
1. USER signs an INTENT
   UserSession.open({"intent": "github_task", "request_preview": "..."})
   → user.initialise_intent(...)  →  signed `intent` block
        │ delegate_to: CoordinatorAgent
        ▼
2. COORDINATOR verifies the user, then DELEGATES
   ctx = await dna.handle(user_envelope)        # CoCA: is the user real?
   spec = llm(...)                              # parse intent → task spec
   env  = dna.build(spec, parent=ctx,           # sign a `delegate` block...
                    recipient_name=WorkerAgent) # ...wrapping the user's block
        │
        ▼
3. WORKER verifies the coordinator, then EXECUTES
   ctx = await dna.handle(coordinator_envelope) # CoCA again
   exec_env = dna.build(action, parent=ctx,     # sign an `execute` block
                        block_type="execute")
   # calls the MCP tool, passing exec_env along
        │
        ▼
4. MCP SERVER enforces CBAC
   The create_issue tool routes the call through the CBAC engine *before*
   hitting GitHub. CBAC checks the Worker's policy → allow/deny.
   If allowed, the GitHub API is called; the decision is returned.
        │
        ▼
5. WORKER signs a RESPONSE (with the CBAC decision attested)
   reply = dna.build(result, ctx=ctx, downstream=exec_env,
                     extra={"cbac": decision})  # `response` block, cbac stamped
        │
        ▼
6. SEAL + CLOSE
   The orchestrator builds the final reply; UserSession.close(reply) verifies
   the whole chain back to the user and writes the AUDIT NFT.
```

The result is one nested chain (a "Flow 4 — Delegated + CBAC" in the spec):

```
verify(user) → response(Coordinator) → response(Worker)[cbac] → execute(Worker) → delegate(Coordinator) → intent(user)
```

The sample `intermediate_envelope.json` captures the *outbound* half mid-flight:
the Worker's `execute` block, wrapping the Coordinator's `delegate` block, wrapping
the user's `intent` block — exactly the §6 nesting.

### Running it

```bash
# 1. install + configure
pip install -r requirements.txt
cp .env.sample .env        # set GEMINI_API_KEY, GITHUB_TOKEN,
                           # and optionally AGENTDNA_API_KEY + AGENTDNA_CHAIN_URL

# 2. start the tool server (terminal 1)
python scripts/start_mcp.py

# 3a. run headless (terminal 2)
python scripts/run_flow.py "Create an issue in acme/web titled 'Bug' with body '...'"

# 3b. ...or the web UI
streamlit run ui/streamlit_app.py
```

> **Tip:** leave `AGENTDNA_API_KEY` blank and the app still works end-to-end as a
> plain agentic flow — the trust layer just switches off. That soft-fail design is
> deliberate: AgentDNA is an *overlay*, not a hard dependency.

---

## 10. Quick glossary

| Term | Plain meaning |
|------|---------------|
| **DID** | A cryptographic identity (`did:rubix:...`) for an agent or user. |
| **CoCA** | Chain of Custody & Authenticity — the "who signed what" guarantee. |
| **CBAC** | Context-Based Access Control — the "was it allowed" policy check. |
| **Envelope** | A message + metadata that gets signed. |
| **Block** | A signed envelope (`{agent, type, envelope, signature}`). |
| **Chain** | Blocks nested via `parent_block`, forming a tamper-proof history. |
| **`parent_block`** | The previous block, tucked inside (and signed over by) the current one. |
| **Card / `skill.md`** | An agent's policy / job description. |
| **Identity NFT** | On-chain record of an agent's or user's identity + policy. |
| **Audit NFT** | On-chain record of a completed interaction chain. |
| **`build()`** | Sign and emit an envelope. |
| **`handle()`** | Verify an inbound envelope (CoCA + optional CBAC). |
| **`kind`** | `"user"` (signs intents) or `"agent"` (does work, carries a policy). |
| **MCP** | The tool-server boundary where agents touch external APIs — and where CBAC is enforced. |

---

## 11. Where to go next

- **Want the exact wire format?** → [`docs/NFT_CHAIN_SPEC.md`](NFT_CHAIN_SPEC.md)
  (every block type + 8 worked flow examples).
- **Want the architecture diagram?** → [`docs/ARCHITECTURE.md`](ARCHITECTURE.md).
- **Want to see real integration code?** → the GithubAgent example, especially
  `app/integrations/agentdna/` and `app/agents/{coordinator,worker}/agent.py`.
- **Want to understand policy decisions?** → read [`cbac.py`](../agentdna/cbac.py)
  top-to-bottom; it's well-commented and self-contained.

Welcome to the team. 👋
