---
id: github-agent
title: The GithubAgent example
sidebar_position: 1
---

# The GithubAgent example

Theory is easier to follow against a real application. The GithubAgent, found at `Agentic-Workflows-Examples/GithubAgent`, is a reference integration that lets a user create GitHub issues and pull requests in plain English, with full AgentDNA provenance on every step.

## What it does

A user types a request such as "Create an issue in acme/web titled 'Login bug' with body '...'". The system parses that request, opens the issue through the GitHub API, and returns the URL. Every hop along the way is signed and recorded.

## The cast

The example is built on LangGraph, with Gemini as the language model, and wires two agents in a simple line:

```
START -> coordinator -> worker -> END
```

| Agent | Role | Policy (`skills.md`) | Tools |
| --- | --- | --- | --- |
| **Coordinator** | Interprets the user's request and turns it into a clean task spec. | Language understanding only, no tools. | none |
| **Worker** | Carries out the task by calling GitHub tools. | May call only `create_issue` and `create_pr`, always through the MCP server. | `create_issue`, `create_pr` |

There are three processes running:

1. The LangGraph app, which provides the interface and the two agents.
2. A GitHub MCP server, the tool boundary where CBAC is enforced.
3. The Rubix node, which signs, verifies, and stores NFTs.

## How AgentDNA is wired in

The trust layer is kept cleanly separated under `app/integrations/agentdna/`:

- **`registry.py`** is a singleton cache of agent identities. Calling `get("worker_agent", policy_file="worker/skills.md")` returns a ready `AgentDNA`, or `None` if the API key is unset, in which case the app soft-fails and runs without the trust layer.
- **`user_session.py`** mints or loads the user identity and signs the intent through `UserSession.open(intent)`. Its `.close(reply)` verifies the final result and writes the audit NFT.
- **`sealer.py`** assembles the final signed reply that closes the chain.
- **`warmup.py`** pre-builds identities at startup so the first request is not slow.
- **`agentdna_helpers.py`** holds small wrappers such as `verify_inbound`, `sign_forward`, `sign_execute`, and `sign_response` that the agent nodes call.

## The end-to-end flow

Here is a single request, hop by hop. Each step either verifies what arrived or signs what leaves.

```
1. USER signs an INTENT
   UserSession.open({"intent": "github_task", "request_preview": "..."})
   -> user.initialise_intent(...)  ->  signed `intent` block
        delegate_to: CoordinatorAgent

2. COORDINATOR verifies the user, then DELEGATES
   ctx = await dna.handle(user_envelope)        # CoCA: is the user real?
   spec = llm(...)                              # parse intent into a task spec
   env  = dna.build(spec, parent=ctx,           # sign a `delegate` block,
                    recipient_name=WorkerAgent) # wrapping the user's block

3. WORKER verifies the coordinator, then EXECUTES
   ctx = await dna.handle(coordinator_envelope) # CoCA again
   exec_env = dna.build(action, parent=ctx,     # sign an `execute` block
                        block_type="execute")
   # calls the MCP tool, passing exec_env along

4. MCP SERVER enforces CBAC
   The create_issue tool routes the call through the CBAC engine before
   hitting GitHub. CBAC checks the worker's policy and returns allow or deny.
   If allowed, the GitHub API is called and the decision is returned.

5. WORKER signs a RESPONSE, with the CBAC decision attested
   reply = dna.build(result, ctx=ctx, downstream=exec_env,
                     extra={"cbac": decision})  # `response` block, cbac stamped

6. SEAL and CLOSE
   The orchestrator builds the final reply. UserSession.close(reply) verifies
   the whole chain back to the user and writes the AUDIT NFT.
```

The result is a single nested chain, the delegated-plus-CBAC case from the spec:

```
verify(user) -> response(Coordinator) -> response(Worker)[cbac] -> execute(Worker) -> delegate(Coordinator) -> intent(user)
```

The sample `intermediate_envelope.json` in the example captures the outbound half mid-flight: the worker's `execute` block, wrapping the coordinator's `delegate` block, wrapping the user's `intent` block, exactly the nesting described in [the envelope and chain model](../sdk/envelope-and-chain.md).

## Running it

```bash
# 1. install and configure
pip install -r requirements.txt
cp .env.sample .env        # set GEMINI_API_KEY, GITHUB_TOKEN, and
                           # optionally AGENTDNA_API_KEY + AGENTDNA_CHAIN_URL

# 2. start the tool server (terminal 1)
python scripts/start_mcp.py

# 3a. run headless (terminal 2)
python scripts/run_flow.py "Create an issue in acme/web titled 'Bug' with body '...'"

# 3b. or run the web UI
streamlit run ui/streamlit_app.py
```

:::tip
Leave `AGENTDNA_API_KEY` blank and the app still runs end to end as a plain agentic flow. The trust layer simply switches off. That soft-fail design is deliberate, because AgentDNA is an overlay rather than a hard dependency.
:::
