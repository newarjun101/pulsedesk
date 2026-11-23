# Security Architecture

- **Password Hashing**: Argon2id.
- **JWT**: Short-lived access tokens (15m) + rotating refresh tokens (7d) stored as Argon2 hashes in `RefreshToken` with reuse detection.
- **HTTP Security**: Helmet headers, strict CORS, global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`), rate limiting via `@nestjs/throttler`.
- **Tenant Isolation**: `WorkspaceGuard` + service-level `workspaceId` scoping on all queries.
- **Credential Encryption (Phase 3)**: AES-256-GCM envelope encryption with key versioning (`CREDENTIALS_ENCRYPTION_KEY_VERSION`). Never log or return plaintext tokens.
