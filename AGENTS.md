# AGENTS.md — AI Development Guidelines

## Project Overview
Unified Social Media Management, Community Management & Customer Support SaaS for Facebook, Instagram, and TikTok.

## Architecture Rules
- **Modular Monolith**: NestJS backend (`apps/backend`) + Next.js App Router frontend (`apps/frontend`) + shared packages (`packages/*`).
- **Strict TypeScript**: No `any` unless explicitly justified; enable `strict: true`.
- **Thin Controllers**: Controllers handle HTTP/validation/auth decorators only; all business logic lives in services.
- **Tenant Isolation**: Every tenant-owned entity is scoped to `workspaceId`. Never trust client-provided `workspaceId` without verifying workspace membership and permissions in the backend.
- **Credential Security**: Never log, return, or expose plaintext social credentials. Encrypt with AES-256-GCM before DB storage.
- **Official APIs Only**: No scraping, no browser automation, no unofficial private APIs, no fake API responses.
- **Definition of Done**: Every feature requires DB model, migration, backend service, API endpoint, authorization, frontend UI, validation, loading/empty/error states, tests, and documentation updates.

## Verification Commands
- Backend typecheck: `npm --workspace=apps/backend run typecheck`
- Backend lint: `npm --workspace=apps/backend run lint`
- Backend tests: `npm --workspace=apps/backend run test`
- Frontend typecheck: `npm --workspace=apps/frontend run typecheck`
- Frontend lint: `npm --workspace=apps/frontend run lint`
- Frontend tests: `npm --workspace=apps/frontend run test`
