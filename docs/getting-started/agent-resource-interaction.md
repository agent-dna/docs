---
id: agent-resource-interaction
title: Securing Agent-Resource Interaction
sidebar_position: 2
---

# Securing Agent-Resource Interaction

Agentic applications frequently allow an Agent to access external resources on behalf of a user. This introduces additional security risks: an Agent may be manipulated by an untrusted Actor or induced to access resources beyond the authority granted by the user.

This is where [CoCA and CBAC](../concepts/coca-and-cbac.md) become relevant.

We have already seen CoCA in action in the [previous topic](./agent-user-interaction.md). CBAC provides an authorization decision for resource access based on the request context and the configured authorization policies.

Consider the previous example with an MCP server added as the resource provider:

```text
Alice ─────────▶ Assistant ─────────▶ MCP Server
```

To secure this interaction, AgentDNA must be integrated at three layers:

1. The LLM execution layer
2. The MCP client layer
3. The MCP server layer

## 1. LLM invocation

Assume the Assistant uses LangGraph to invoke the LLM:

```python
result = await workflow.ainvoke({"messages": [HumanMessage(content=task)]})
final_message = result["messages"][-1]
```

AgentDNA provides `agentdna_context()` for maintaining the current workflow state during Agent execution. MCP client integrations use this context to retrieve the current workflow and propagate it to MCP requests.

`agentdna_context()` takes two parameters:

- The `AgentDNA` instance representing the current Actor
- The current `IntentWorkflow`

```python
from agentdna.core import AgentDNA
from agentdna.mcp.context import agentdna_context

AGENT = AgentDNA(...)

with agentdna_context(AGENT, existing_intent_workflow) as ctx:
    result = await workflow.ainvoke({"messages": [HumanMessage(content=task)]})
    final_message = result["messages"][-1]

    # ctx.workflows holds the updated IntentWorkflow(s) propagated
    # from the MCP server
    if len(ctx.workflows) == 0:
        raise RuntimeError("No workflows were created during agent execution")

    # Use ctx.workflows to build the IntentWorkflow and pass it to the next Actor
    workflow_from_agent = AGENT.build(
        payload=str(final_message.content),
        previous_workflows=ctx.workflows,
    )
```

## 2. MCP client adapter

AgentDNA provides framework-specific MCP client adapters that intercept MCP tool calls and propagate the current `IntentWorkflow` through MCP request metadata.

The adapter should be installed in the application before the MCP client is used.

For instance, when using `langchain-mcp-adapters` to build the MCP client:

```python
from __future__ import annotations

from langchain_core.tools import BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.sessions import StreamableHttpConnection

from config import settings

# Import and install the AgentDNA MCP client adapter
from agentdna.mcp.client.langchain import install_mcp_client
install_mcp_client()

def build_client() -> MultiServerMCPClient:
    return MultiServerMCPClient(
        {
            "rss": StreamableHttpConnection(
                transport="streamable_http",
                url=settings.rss_mcp_url,
                timeout=settings.mcp_timeout_seconds,
                sse_read_timeout=settings.mcp_timeout_seconds,
            )
        },
    )


async def load_tools() -> list[BaseTool]:
    """Discover the configured RSS server's tools; direct network access is prohibited for agents."""
    return await build_client().get_tools()
```

The adapter adds the workflow to the MCP request `_meta` field. The MCP server can then extract and verify the workflow before executing the requested tool.

Currently supported MCP client integrations:

| Framework | Import |
| --- | --- |
| [LangChain MCP Adapters](https://github.com/langchain-ai/langchain-mcp-adapters) | `from agentdna.mcp.client.langchain import install_mcp_client` |
| [CrewAI Tools](https://github.com/crewAIInc/crewAI/tree/main/lib/crewai-tools) | `from agentdna.mcp.client.crewai import install_mcp_client` |

## 3. MCP server middleware

`AgentDNAMCPMiddleware` intercepts protected MCP requests on the server side and performs security checks before allowing the underlying MCP handler to execute.

The security checks include:

- Agent whitelisting
- CoCA verification
- CBAC verification

Failures are reported using the Envelope [status codes](../concepts/mental-model.md#status-codes).

Use `AgentDNAMCPMiddleware` as follows:

```python
# mcp_server.py

from fastmcp import FastMCP

from agentdna.core import AgentDNA
from agentdna.mcp.server.fastmcp import AgentDNAMCPMiddleware
# AgentDNA-provided CBAC authorization function.
# This can be replaced with a custom CBAC server's authorize function.
from cbac import authorize

# Define the AgentDNA instance for the MCP server
mcp_server_dna = AgentDNA(
    name="GitHub MCP",
    type="tool",
    api_key="<AgentDNA API Key>",
    provenance_layer_url="<Provenance Layer URL, if any>",
    admin_server_url="<Admin Server URL, if any. Used for Agent whitelist verification>",
)

mcp = FastMCP("<App Name>")

# Add the AgentDNA MCP middleware
#
# AgentDNAMCPMiddleware takes the following arguments:
#   - MCP server AgentDNA instance
#   - (Optional) CBAC authorization function
mcp.add_middleware(
    AgentDNAMCPMiddleware(
        mcp_server_dna,
        authorize
    )
)

###### ---- Rest of the business logic remains unchanged ---- ######
```

Currently supported MCP server integrations:

| Framework | Usage |
| --- | --- |
| [FastMCP](https://github.com/PrefectHQ/fastmcp) | `from agentdna.mcp.server.fastmcp import AgentDNAMCPMiddleware` |
| [MCP v2 Python SDK](https://github.com/modelcontextprotocol/python-sdk) | See the [complete usage example](https://github.com/agent-dna/agentdna/blob/main/examples/rss_research_agent/mcp_server_mcp2.py) |

## Custom CBAC

CBAC verification is configurable. AgentDNA provides a [CBAC Service](https://github.com/agent-dna/cbac-server), but organizations can use their own policy methodology and run a custom CBAC server. The custom CBAC integration must provide a function matching the `CbacFn` contract:

```python
# agentdna/mcp/server/types.py

CbacFn: TypeAlias = Callable[
    [
        # Agent ID: Agent which is making the request to the resource
        str,

        # MCP Server ID: The identifier or address of the MCP server sending the request
        str,

        # Tool Name: Name of the tool being invoked
        str,

        # Tool Arguments: Arguments passed to the tool
        dict[str, Any],

        # User Intent: The intent of the user making the request
        str | None,

        # Tool Description: Description of the tool being invoked.
        # It is normally taken from the tool's comments, hence
        # empty values are accepted.
        str | None,

        # Intent ID: The identifier of the user intent associated with the request
        str | None,
    ],
    Awaitable[
        tuple[
            # Decision: The decision made by the CBAC server.
            # The value "allow" must be sent for an Allow decision, since
            # the AgentDNA middleware relies on this value to enforce access control.
            str,

            # Status Code: The HTTP-like status code representing the result of the CBAC decision
            int,

            # Message Hash: The hash of the message associated with the CBAC decision.
            # Sharing the actual message is discouraged, since it may contain
            # PII, which should not be stored directly on the Provenance Layer.
            str
        ]
    ]
]
```

For more detailed implementations, refer to the [examples in the AgentDNA repository](https://github.com/agent-dna/agentdna/tree/main/examples).
