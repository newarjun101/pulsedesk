export enum WorkspaceRole {
  WORKSPACE_OWNER = 'WORKSPACE_OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  MODERATOR = 'MODERATOR',
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  CONTENT_CREATOR = 'CONTENT_CREATOR',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER',
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum SocialPlatform {
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  TIKTOK = 'TIKTOK',
}

export enum ConnectionMethod {
  OAUTH = 'OAUTH',
  MANUAL = 'MANUAL',
}

export enum ConnectionStatus {
  CONNECTED = 'CONNECTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  ERROR = 'ERROR',
  DISCONNECTED = 'DISCONNECTED',
}

export enum CapabilityStatus {
  SUPPORTED = 'SUPPORTED',
  UNSUPPORTED = 'UNSUPPORTED',
  REQUIRES_PERMISSION = 'REQUIRES_PERMISSION',
  REQUIRES_APPROVAL = 'REQUIRES_APPROVAL',
  ACCOUNT_INELIGIBLE = 'ACCOUNT_INELIGIBLE',
  TEMPORARILY_UNAVAILABLE = 'TEMPORARILY_UNAVAILABLE',
}

export enum PostStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  SCHEDULED = 'SCHEDULED',
  PROCESSING = 'PROCESSING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PARTIALLY_PUBLISHED = 'PARTIALLY_PUBLISHED',
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export const PERMISSION_GROUPS: Record<string, string[]> = {
  Dashboard: ['dashboard.view'],
  Social: [
    'social_accounts.view',
    'social_accounts.connect',
    'social_accounts.disconnect',
    'social_accounts.manage',
  ],
  Posts: [
    'posts.view',
    'posts.create',
    'posts.edit',
    'posts.delete',
    'posts.publish',
    'posts.schedule',
  ],
  Media: ['media.view', 'media.upload', 'media.delete'],
  Inbox: [
    'inbox.view',
    'inbox.view_all',
    'conversations.reply',
    'conversations.assign',
    'conversations.archive',
    'conversations.manage',
  ],
  Comments: [
    'comments.view',
    'comments.reply',
    'comments.hide',
    'comments.delete',
    'comments.manage',
  ],
  Moderation: [
    'moderation.view',
    'moderation.block',
    'moderation.unblock',
    'moderation.ban',
    'moderation.report',
  ],
  Tickets: [
    'tickets.view',
    'tickets.view_all',
    'tickets.create',
    'tickets.edit',
    'tickets.delete',
    'tickets.reply',
    'tickets.assign',
    'tickets.close',
    'tickets.escalate',
  ],
  Teams: ['team.view', 'team.invite', 'team.remove', 'team.manage'],
  Roles: [
    'roles.view',
    'roles.create',
    'roles.edit',
    'roles.delete',
    'permissions.assign',
  ],
  Analytics: ['analytics.view', 'analytics.export'],
  Workspace: ['workspace.view', 'workspace.settings', 'workspace.billing'],
};

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  logoUrl: string | null;
  role: WorkspaceRole;
  createdAt: string;
}

export interface PermissionSummary {
  id: string;
  key: string;
  group: string;
  description: string | null;
}

export interface RoleSummary {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
}

export interface DepartmentSummary {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
}

export interface MemberSummary {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: WorkspaceRole;
  status: MemberStatus;
  customRoles: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  joinedAt: string;
}

export interface InvitationSummary {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface PlatformCapabilityEntry {
  capability: string;
  status: CapabilityStatus;
  reason: string | null;
}

export interface SocialAccountSummary {
  id: string;
  workspaceId: string;
  platform: SocialPlatform;
  platformAccountId: string;
  accountName: string;
  username: string | null;
  profilePictureUrl: string | null;
  connectionMethod: ConnectionMethod;
  connectionStatus: ConnectionStatus;
  grantedScopes: string[];
  capabilities: PlatformCapabilityEntry[];
  lastValidatedAt: string | null;
  lastSyncedAt: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
}

export interface MediaAssetSummary {
  id: string;
  workspaceId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  mediaType: MediaType;
  url: string;
  folder: string | null;
  createdAt: string;
}

export interface PostTargetSummary {
  id: string;
  socialAccountId: string;
  platform: SocialPlatform;
  caption: string | null;
  externalPostId: string | null;
  status: PostStatus;
  error: string | null;
  publishedAt: string | null;
}

export interface SocialPostSummary {
  id: string;
  workspaceId: string;
  content: string;
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  targets: PostTargetSummary[];
  createdAt: string;
}
