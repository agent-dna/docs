---
id: dashboard-authentication
title: Authentication & authorization
sidebar_position: 6
---

# Authentication & authorization

## Two sign-in paths

| | User | Admin |
| --- | --- | --- |
| **Endpoint** | `POST /login` on the dashboard API | `POST /login` on the agent-admin API |
| **Credentials** | email + password | username + password |
| **Response** | Full object: token, did, email, org, api_key, is_admin, access list | A bare JWT string in `data` |
| **Session build** | Fields copied straight from the response | JWT decoded; `sub` without `email` implies admin |

## Token handling

- Stored at `localStorage["agentdna.token"]`; the decoded user at `localStorage["agentdna.user"]`.
- `VITE_DEV_TOKEN` acts as a fallback when storage is empty — a development convenience that **must not** be set in production builds.
- Expiry is enforced client-side from the `exp` claim, re-checked every 30 seconds.
- A 401 raises `ApiError(401)`. By default `skipLogoutOn401` is `true`, so a single failing panel does not eject the user; endpoints that opt out clear the session and fire the unauthorized handler.

## Registration flows

### User self-registration

```
POST /send-otp      { email }                                → OTP emailed, 300s resend countdown
POST /register-user { name?, email, password, orgID, otp }   → { api_key, … }
POST /login         { email, password }                      → session established
GET  /user-profile                                           → patch name + org onto the session
```

### Admin registration

Admin registration spans both services:

```
POST /create-admin   { username, email, orgID, password, otp } → { did }   (dashboard API)
POST /register-admin { did, org_id }                           → whitelist the DID
POST /login          { username, password }                    → JWT       (admin API)
GET  /admin-profile                                            → patch name + org
```

## Authorization surface

- `ProtectedRoute` redirects unauthenticated visitors to `/`, preserving the attempted path, and supports an `adminOnly` flag that bounces non-admins to `/dashboard`.
- Admin-only UI: approve/reject on both request queues, the Users tab, Add User, per-user access management, and agent-policy replacement.
- The pending-requests badge only loads for admins.

:::warning
Client-side gating is a UX affordance, not a security control. Every restricted operation must be enforced server-side.
:::
