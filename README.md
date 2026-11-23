# PulseDesk — Unified Social Media Management, Community Management & Customer Support SaaS

A production-ready, multi-tenant SaaS platform for businesses and agencies to manage **Facebook**, **Instagram**, and **TikTok** accounts, publish content, manage unified customer conversations, moderate communities, and handle customer support tickets from one centralized application.

---

## Tech Stack

- **Backend (`apps/backend`)**: Node.js 22, TypeScript, NestJS, PostgreSQL 16, Prisma ORM, Redis 7, Swagger/OpenAPI, Pino, Argon2id, JWT
- **Frontend (`apps/frontend`)**: Next.js (App Router), TypeScript, React, Tailwind CSS, TanStack Query, Zustand, React Hook Form, Zod, Lucide Icons
- **Shared Packages (`packages/*`)**: `@social-platform/shared-types`
- **Infrastructure**: Docker, Docker Compose, PostgreSQL 16, Redis 7

---

## Monorepo Structure

```text
social-media/
├── apps/
│   ├── backend/          # NestJS modular monolith API
│   │   ├── prisma/       # Prisma schema & migrations
│   │   └── src/          # Auth, Users, Workspaces, RBAC, Social Accounts,
│   │                     # Integrations, Webhooks, Media, Publishing,
│   │                     # Inbox, Tickets, Analytics, Health
│   └── frontend/         # Next.js App Router SaaS dashboard
├── packages/
│   └── shared-types/     # Shared TypeScript enums & API contracts
├── .ai/                  # Architecture, DB schema, API, Security & Roadmap docs
├── docker-compose.yml    # PostgreSQL 16 & Redis 7
├── .env.example          # Environment variable template
├── AGENTS.md             # AI & engineering guidelines
└── PROJECT.md            # Project overview
```

---

## Quick Start

### 1. Configure Environment
```bash
cp .env.example .env
cp .env apps/backend/.env
```
Update `apps/backend/.env` and `apps/frontend/.env.local` if needed (e.g. `BACKEND_PORT=4001`, `NEXT_PUBLIC_API_URL=http://localhost:4001/api/v1`).

### 2. Start Infrastructure (PostgreSQL & Redis)
```bash
docker compose up -d
```

### 3. Install Dependencies & Build Shared Types
```bash
npm install
npm --workspace=packages/shared-types run build
```

### 4. Run Database Migrations
```bash
npm --workspace=apps/backend run prisma:generate
npm --workspace=apps/backend run prisma:migrate
```

### 5. Start Development Servers
```bash
# Terminal 1: Backend API
npm run dev:backend

# Terminal 2: Frontend Dashboard
npm run dev:frontend
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4001/api/v1
- **Swagger / OpenAPI Docs**: http://localhost:4001/api/docs

---

## Core Features

### Multi-Tenant Workspaces & RBAC
- User registration, login, logout, session listing/revocation, forgot/reset password.
- Multi-workspace creation, switching, and strict `WorkspaceGuard` tenant isolation.
- Team invitations, departments, custom roles, and granular permission matrix (`PermissionsGuard`).

### Social Account Management & Official Integrations
- **Facebook** (Meta Graph API v21.0), **Instagram** (Instagram Graph API), and **TikTok** (TikTok Open API v2).
- OAuth authorization URLs with CSRF state & manual credential configuration.
- Per-account **Capability Registry** (`SUPPORTED`, `UNSUPPORTED`, `REQUIRES_PERMISSION`).
- **Credential Security**: Tokens are encrypted at rest using **HKDF-SHA256** (per-encryption 16-byte random salt) + **AES-256-GCM** and are never exposed to the frontend.

### Publishing, Media Library & Comments
- Multi-platform post composer with image/video upload, scheduling, duplication, and per-target non-atomic publishing (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `FAILED`, `PARTIALLY_PUBLISHED`).
- Paginated post list with search, platform tabs, status filters, and `DESC`/`ASC` sorting.
- Post details with live Facebook comments, nested replies, `@Mention` insertion, edit, delete, and pagination.
- Paginated Media Library with image/GIF previews and `<video controls>` playback.
- Built-in **LinkedIn Poster** generator.

### Unified Inbox, Support Tickets & Analytics
- **Unified Inbox**: Conversations, replies, internal notes, and automatic ticket creation/reopening on new messages.
- **Jira-Style Support Board**: 4-column Kanban board (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), priority badges (`URGENT`, `HIGH`, `NORMAL`, `LOW`), SLA deadlines, and team member assignment.
- **Analytics**: Workspace overview, publishing/inbox/ticket breakdowns, and live Meta Page Insights (Reach, Impressions, Engagement, Page Views) with bar charts.

---

## Verification Commands

```bash
# Typechecks
npm --workspace=apps/backend run typecheck
npm --workspace=apps/frontend run typecheck

# Unit tests
npm --workspace=apps/backend run test

# Production build
npm run build
```

---

## Documentation Index

- [AGENTS.md](file:///Users/monkey.d.luffy/Desktop/coding-with-ai/social-media/AGENTS.md) — Engineering & security rules
- [PROJECT.md](file:///Users/monkey.d.luffy/Desktop/coding-with-ai/social-media/PROJECT.md) — Project overview
- [.ai/ARCHITECTURE.md](file:///Users/monkey.d.luffy/Desktop/coding-with-ai/social-media/.ai/ARCHITECTURE.md) — System architecture & tenant isolation
- [.ai/DATABASE_SCHEMA.md](file:///Users/monkey.d.luffy/Desktop/coding-with-ai/social-media/.ai/DATABASE_SCHEMA.md) — PostgreSQL & Prisma schema
- [.ai/API_CONTRACTS.md](file:///Users/monkey.d.luffy/Desktop/coding-with-ai/social-media/.ai/API_CONTRACTS.md) — REST API endpoints
- [.ai/INTEGRATION_GUIDE.md](file:///Users/monkey.d.luffy/Desktop/coding-with-ai/social-media/.ai/INTEGRATION_GUIDE.md) — Official Meta & TikTok API scopes
- [.ai/SECURITY.md](file:///Users/monkey.d.luffy/Desktop/coding-with-ai/social-media/.ai/SECURITY.md) — Security & encryption design
