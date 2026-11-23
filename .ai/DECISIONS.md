# Architectural Decisions

1. **Monorepo with npm workspaces**: Zero-config, native to Node.js 22 / npm 10.9.2.
2. **Modular Monolith in NestJS**: Avoids premature microservice overhead while enforcing clean module boundaries.
3. **Argon2 for password & refresh token hashing**: Memory-hard, resistant to GPU cracking.
4. **Prisma ORM with PostgreSQL**: Strong type safety, explicit migrations, UUID primary keys.
