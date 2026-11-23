# Database Schema

Using PostgreSQL + Prisma ORM with UUID primary keys, explicit foreign keys, indexes, and timestamps.

## Phase 1 Models
- `User`: id, email (unique), passwordHash, firstName, lastName, avatarUrl, isEmailVerified, isSuspended, lastLoginAt, createdAt, updatedAt
- `Session`: id, userId, userAgent, ipAddress, expiresAt, revokedAt, createdAt
- `RefreshToken`: id, userId, sessionId, tokenHash, expiresAt, revokedAt, replacedByTokenId, createdAt
- `Workspace`: id, name, slug (unique), timezone, logoUrl, ownerId, createdAt, updatedAt, deletedAt
- `WorkspaceMember`: id, workspaceId, userId, role (enum: WORKSPACE_OWNER, ADMIN, MANAGER, MODERATOR, SUPPORT_AGENT, CONTENT_CREATOR, ANALYST, VIEWER), status (ACTIVE, SUSPENDED), joinedAt, createdAt, updatedAt
- `Invitation`: id, workspaceId, email, role, tokenHash, invitedById, expiresAt, acceptedAt, createdAt
- `AuditLog`: id, workspaceId, actorId, action, entityType, entityId, metadata, ipAddress, createdAt

## Future Phases
- Phase 2: Custom `Role`, `Permission`, `RolePermission`, `MemberRole`, `Department`, `DepartmentMember`.
- Phase 3+: `SocialAccount`, `SocialAccountCredential` (AES-256-GCM), `SocialAccountCapability`, `SocialPost`, `PostTarget`, `MediaAsset`, `Conversation`, `Message`, `Comment`, `Ticket`, `TicketSlaPolicy`, `AutomationRule`, `Notification`, `WebhookEvent`.
