---
id: dashboard-limitations
title: Known limitations
sidebar_position: 9
---

# Known limitations

Where the front-end compensates for a missing backend capability, it is listed here rather than left implicit. This prevents bug reports about numbers that "don't match".

| Area | Current state |
| --- | --- |
| Heatmap (`fetchHeatmap`) | Returns an empty array — no endpoint yet |
| Logs (`fetchLogs`) | Returns an empty array — no endpoint yet |
| Alerts | No dedicated endpoint; threats are the interaction feed filtered client-side, so counts reflect the fetched page, not the org |
| Intent participants | Derived client-side by walking every page of the intent's interactions — expensive for large intents |
| Directory & intent numbering | Walks every page of four collections on login; fine for current org sizes, a scaling concern later |
| Intent list filters | Applied to the current page only |
| Agent/tool classification | Inferred from the `bafy` DID prefix where the backend does not label the side |
| Status thresholds | Hard-coded in the client (agents > 5 threats, tools > 4) |
| Access management endpoints | Three endpoints wired but marked proposed |
| Unrouted pages | `AlertsPage` and `LandingPage` exist but are not in the route table |
| Admin base URL | Build-time only — not runtime-configurable like the main API URL |

:::note No shared cache
There is no request de-duplication or cache layer. Navigating away and back refetches every time. This keeps data fresh at the cost of repeat traffic — size your backend accordingly.
:::
