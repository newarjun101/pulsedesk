# API Contracts

Base Path: `/api/v1`

## Phase 1 Endpoints
- `GET /api/v1/health` — Service health & DB connectivity check
- `POST /api/v1/auth/register` — Register user
- `POST /api/v1/auth/login` — Login & issue access + refresh tokens
- `POST /api/v1/auth/refresh` — Rotate refresh token & issue new access token
- `POST /api/v1/auth/logout` — Revoke current session & refresh token
- `POST /api/v1/auth/forgot-password` — Request password reset
- `POST /api/v1/auth/reset-password` — Reset password with token
- `GET /api/v1/auth/sessions` — List active sessions
- `DELETE /api/v1/auth/sessions/:id` — Revoke a specific session
- `GET /api/v1/users/me` — Get current user profile
- `PATCH /api/v1/users/me` — Update current user profile
- `POST /api/v1/users/me/change-password` — Change password
- `GET /api/v1/workspaces` — List workspaces for current user
- `POST /api/v1/workspaces` — Create a new workspace
- `GET /api/v1/workspaces/:id` — Get workspace details (member-only)
- `PATCH /api/v1/workspaces/:id` — Update workspace details (owner/admin-only)

Swagger/OpenAPI documentation is served at `/api/docs`.
