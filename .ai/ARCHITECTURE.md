# Architecture

## System Overview
- **Modular Monolith (`apps/backend`)**: Clean module boundaries with NestJS DI.
  - `config/`: Zod-validated environment configuration.
  - `database/`: PrismaService with PostgreSQL connection lifecycle.
  - `auth/`: JWT access tokens + rotating refresh tokens (Argon2-hashed), session tracking, rate limiting.
  - `users/`: User profile & password management.
  - `workspaces/`: Multi-tenant workspace CRUD, membership verification, tenant isolation guards.
  - `health/`: Liveness & readiness checks (`/api/v1/health`).
- **Frontend (`apps/frontend`)**: Next.js App Router, Tailwind CSS, TanStack Query, Zustand, React Hook Form + Zod.
- **Shared Packages (`packages/*`)**: `shared-types`, `api-contracts`, `shared-utils`.

## Tenant Isolation
- Every tenant-owned table has `workspaceId` (UUID, indexed, FK to `Workspace`).
- `WorkspaceGuard` verifies that the authenticated `userId` is an active member of the requested `workspaceId` (from route param `:workspaceId` or `x-workspace-id` header).
- Services always scope queries by `workspaceId` and never trust client-supplied IDs without membership verification.
