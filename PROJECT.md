# Unified Social Media Management, Community Management & Customer Support SaaS

A production-ready, multi-tenant SaaS platform for businesses and agencies to manage **Facebook**, **Instagram**, and **TikTok** accounts from one centralized system.

## Tech Stack
- **Backend**: Node.js 22, TypeScript, NestJS, PostgreSQL, Prisma ORM, Redis, BullMQ, Socket.IO, Swagger/OpenAPI, Pino, Argon2, JWT
- **Frontend**: Next.js (App Router), TypeScript, React, Tailwind CSS, TanStack Query, Zustand, React Hook Form, Zod, Lucide Icons
- **Infrastructure**: Docker, Docker Compose, PostgreSQL 16, Redis 7, S3-compatible storage (MinIO), Nginx

## Monorepo Structure
- `apps/backend` — NestJS modular monolith API & background workers
- `apps/frontend` — Next.js App Router SaaS dashboard
- `packages/shared-types` — Shared TypeScript types, enums, and DTO contracts
- `packages/api-contracts` — Shared API request/response schemas
- `packages/shared-utils` — Shared utility functions
- `infrastructure/` — Docker & Nginx configurations
- `.ai/` — Architecture, database, API, security, integration, and roadmap docs

## Getting Started
1. Copy `.env.example` to `.env` and configure secrets.
2. Start infrastructure: `docker compose up -d postgres redis`
3. Install dependencies: `npm install`
4. Run Prisma migrations: `npm --workspace=apps/backend run prisma:migrate`
5. Start backend: `npm run dev:backend`
6. Start frontend: `npm run dev:frontend`
