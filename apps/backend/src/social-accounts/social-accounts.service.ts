import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CapabilityStatus,
  ConnectionMethod,
  ConnectionStatus,
  PostStatus,
  SocialPlatform,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/database/prisma.service';
import { FacebookAdapter } from '@/integrations/facebook/facebook.adapter';
import { CredentialEncryptionService } from './credential-encryption.service';
import {
  ManualConnectSocialAccountDto,
  ReplaceCredentialsDto,
  UpdateSocialAccountDto,
} from './dto/social-account.dto';

@Injectable()
export class SocialAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: CredentialEncryptionService,
    private readonly facebookAdapter: FacebookAdapter,
  ) {}

  private deriveCapabilities(platform: SocialPlatform, scopes: string[]) {
    const scopeSet = new Set(scopes);

    if (platform === SocialPlatform.TIKTOK) {
      return [
        {
          capability: 'canPublishVideos',
          status: scopeSet.has('video.publish')
            ? CapabilityStatus.SUPPORTED
            : CapabilityStatus.REQUIRES_PERMISSION,
          reason: scopeSet.has('video.publish') ? null : 'Requires video.publish scope',
        },
        {
          capability: 'canReadAnalytics',
          status: scopeSet.has('user.info.stats')
            ? CapabilityStatus.SUPPORTED
            : CapabilityStatus.REQUIRES_PERMISSION,
          reason: scopeSet.has('user.info.stats') ? null : 'Requires user.info.stats scope',
        },
        {
          capability: 'canBlockUsers',
          status: CapabilityStatus.UNSUPPORTED,
          reason: 'TikTok official API does not support user blocking',
        },
        {
          capability: 'canBanUsers',
          status: CapabilityStatus.UNSUPPORTED,
          reason: 'TikTok official API does not support user banning',
        },
        {
          capability: 'canEditPosts',
          status: CapabilityStatus.UNSUPPORTED,
          reason: 'TikTok official API does not support post editing',
        },
      ];
    }

    if (platform === SocialPlatform.INSTAGRAM) {
      return [
        {
          capability: 'canPublishImages',
          status: scopeSet.has('instagram_content_publish')
            ? CapabilityStatus.SUPPORTED
            : CapabilityStatus.REQUIRES_PERMISSION,
          reason: scopeSet.has('instagram_content_publish')
            ? null
            : 'Requires instagram_content_publish scope',
        },
        {
          capability: 'canReplyToComments',
          status: scopeSet.has('instagram_manage_comments')
            ? CapabilityStatus.SUPPORTED
            : CapabilityStatus.REQUIRES_PERMISSION,
          reason: scopeSet.has('instagram_manage_comments')
            ? null
            : 'Requires instagram_manage_comments scope',
        },
        {
          capability: 'canSendMessages',
          status: scopeSet.has('instagram_manage_messages')
            ? CapabilityStatus.SUPPORTED
            : CapabilityStatus.REQUIRES_PERMISSION,
          reason: scopeSet.has('instagram_manage_messages')
            ? null
            : 'Requires instagram_manage_messages scope',
        },
      ];
    }

    // FACEBOOK
    return [
      {
        capability: 'canPublishText',
        status: scopeSet.has('pages_manage_posts')
          ? CapabilityStatus.SUPPORTED
          : CapabilityStatus.REQUIRES_PERMISSION,
        reason: scopeSet.has('pages_manage_posts')
          ? null
          : 'Requires pages_manage_posts scope',
      },
      {
        capability: 'canReplyToComments',
        status: scopeSet.has('pages_manage_engagement')
          ? CapabilityStatus.SUPPORTED
          : CapabilityStatus.REQUIRES_PERMISSION,
        reason: scopeSet.has('pages_manage_engagement')
          ? null
          : 'Requires pages_manage_engagement scope',
      },
      {
        capability: 'canSendMessages',
        status: scopeSet.has('pages_messaging')
          ? CapabilityStatus.SUPPORTED
          : CapabilityStatus.REQUIRES_PERMISSION,
        reason: scopeSet.has('pages_messaging') ? null : 'Requires pages_messaging scope',
      },
    ];
  }

  async findAll(workspaceId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { workspaceId },
      include: {
        permissions: { where: { granted: true } },
        capabilities: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((a) => ({
      id: a.id,
      workspaceId: a.workspaceId,
      platform: a.platform,
      platformAccountId: a.platformAccountId,
      accountName: a.accountName,
      username: a.username,
      profilePictureUrl: a.profilePictureUrl,
      connectionMethod: a.connectionMethod,
      connectionStatus: a.connectionStatus,
      grantedScopes: a.permissions.map((p) => p.scope),
      capabilities: a.capabilities.map((c) => ({
        capability: c.capability,
        status: c.status,
        reason: c.reason,
      })),
      lastValidatedAt: a.lastValidatedAt,
      lastSyncedAt: a.lastSyncedAt,
      tokenExpiresAt: a.tokenExpiresAt,
      createdAt: a.createdAt,
    }));
  }

  async getOAuthUrl(workspaceId: string, platform: SocialPlatform) {
    const state = randomBytes(24).toString('hex');
    return {
      platform,
      workspaceId,
      state,
      authorizationUrl: `https://oauth.example.com/${platform.toLowerCase()}?state=${state}`,
      note: 'Configure META_APP_ID / TIKTOK_CLIENT_KEY in .env for live OAuth redirects.',
    };
  }

  async connectManual(workspaceId: string, dto: ManualConnectSocialAccountDto) {
    const encrypted = this.encryption.encrypt(dto.accessToken);
    const scopes = dto.grantedScopes ?? [];
    const capabilities = this.deriveCapabilities(dto.platform, scopes);
    const now = new Date();

    const account = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.socialAccount.upsert({
        where: {
          workspaceId_platform_platformAccountId: {
            workspaceId,
            platform: dto.platform,
            platformAccountId: dto.platformAccountId.trim(),
          },
        },
        update: {
          accountName: dto.accountName.trim(),
          username: dto.username?.trim() ?? null,
          connectionMethod: ConnectionMethod.MANUAL,
          connectionStatus: ConnectionStatus.CONNECTED,
          lastValidatedAt: now,
        },
        create: {
          workspaceId,
          platform: dto.platform,
          platformAccountId: dto.platformAccountId.trim(),
          accountName: dto.accountName.trim(),
          username: dto.username?.trim() ?? null,
          connectionMethod: ConnectionMethod.MANUAL,
          connectionStatus: ConnectionStatus.CONNECTED,
          lastValidatedAt: now,
        },
      });

      await tx.socialAccountCredential.upsert({
        where: { socialAccountId: saved.id },
        update: {
          encryptedAccessToken: encrypted.ciphertext,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          keyVersion: encrypted.keyVersion,
          lastValidatedAt: now,
          validationError: null,
        },
        create: {
          socialAccountId: saved.id,
          encryptedAccessToken: encrypted.ciphertext,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          keyVersion: encrypted.keyVersion,
          lastValidatedAt: now,
        },
      });

      await tx.socialAccountPermission.deleteMany({
        where: { socialAccountId: saved.id },
      });
      if (scopes.length > 0) {
        await tx.socialAccountPermission.createMany({
          data: scopes.map((scope) => ({
            socialAccountId: saved.id,
            scope,
            granted: true,
          })),
        });
      }

      await tx.socialAccountCapability.deleteMany({
        where: { socialAccountId: saved.id },
      });
      await tx.socialAccountCapability.createMany({
        data: capabilities.map((c) => ({
          socialAccountId: saved.id,
          capability: c.capability,
          status: c.status,
          reason: c.reason,
        })),
      });

      return saved;
    });

    return {
      id: account.id,
      workspaceId: account.workspaceId,
      platform: account.platform,
      platformAccountId: account.platformAccountId,
      accountName: account.accountName,
      username: account.username,
      connectionMethod: account.connectionMethod,
      connectionStatus: account.connectionStatus,
      grantedScopes: scopes,
      capabilities,
      lastValidatedAt: account.lastValidatedAt,
    };
  }

  async replaceCredentials(
    workspaceId: string,
    accountId: string,
    dto: ReplaceCredentialsDto,
  ) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, workspaceId },
    });
    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    const encrypted = this.encryption.encrypt(dto.accessToken);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.socialAccountCredential.update({
        where: { socialAccountId: account.id },
        data: {
          encryptedAccessToken: encrypted.ciphertext,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          keyVersion: encrypted.keyVersion,
          lastValidatedAt: now,
          validationError: null,
        },
      });

      await tx.socialAccount.update({
        where: { id: account.id },
        data: {
          connectionStatus: ConnectionStatus.CONNECTED,
          lastValidatedAt: now,
        },
      });
    });

    return { success: true, lastValidatedAt: now };
  }

  async updateAccount(
    workspaceId: string,
    accountId: string,
    dto: UpdateSocialAccountDto,
  ) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, workspaceId },
    });
    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    const updated = await this.prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        ...(dto.platformAccountId !== undefined
          ? { platformAccountId: dto.platformAccountId.trim() }
          : {}),
        ...(dto.accountName !== undefined
          ? { accountName: dto.accountName.trim() }
          : {}),
        ...(dto.username !== undefined ? { username: dto.username.trim() || null } : {}),
      },
    });

    if (dto.accessToken && dto.accessToken.trim()) {
      await this.replaceCredentials(workspaceId, account.id, {
        accessToken: dto.accessToken.trim(),
      });
    }

    return updated;
  }

  async getCapabilities(workspaceId: string, accountId: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, workspaceId },
      include: { capabilities: true },
    });
    if (!account) {
      throw new NotFoundException('Social account not found');
    }
    return account.capabilities;
  }

  async disconnect(workspaceId: string, accountId: string): Promise<{ success: boolean }> {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id: accountId, workspaceId },
    });
    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    await this.prisma.socialAccount.delete({ where: { id: account.id } });
    return { success: true };
  }

  async syncAll(workspaceId: string, actorUserId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { workspaceId, connectionStatus: ConnectionStatus.CONNECTED },
      include: { credential: true },
    });

    let postsImported = 0;
    let conversationsImported = 0;
    const errors: { accountId: string; platform: SocialPlatform; error: string }[] = [];

    for (const account of accounts) {
      if (!account.credential) continue;

      const accessToken = this.encryption.decrypt({
        ciphertext: account.credential.encryptedAccessToken,
        iv: account.credential.iv,
        authTag: account.credential.authTag,
      });

      if (account.platform === SocialPlatform.FACEBOOK) {
        const postsRes = await this.facebookAdapter.fetchPosts(
          account.platformAccountId,
          accessToken,
        );
        if (postsRes.error) {
          errors.push({
            accountId: account.id,
            platform: account.platform,
            error: postsRes.error,
          });
        } else {
          for (const p of postsRes.posts) {
            const exists = await this.prisma.postTarget.findFirst({
              where: { socialAccountId: account.id, externalPostId: p.id },
            });
            if (!exists) {
              await this.prisma.socialPost.create({
                data: {
                  workspaceId,
                  authorId: actorUserId,
                  content: p.message ?? '(Media post)',
                  status: PostStatus.PUBLISHED,
                  publishedAt: p.created_time ? new Date(p.created_time) : new Date(),
                  targets: {
                    create: {
                      socialAccountId: account.id,
                      platform: SocialPlatform.FACEBOOK,
                      externalPostId: p.id,
                      caption: p.message ?? '',
                      status: PostStatus.PUBLISHED,
                      publishedAt: p.created_time ? new Date(p.created_time) : new Date(),
                    },
                  },
                },
              });
              postsImported++;
            }
          }
        }

        const convRes = await this.facebookAdapter.fetchConversations(
          account.platformAccountId,
          accessToken,
        );
        if (convRes.error) {
          errors.push({
            accountId: account.id,
            platform: account.platform,
            error: convRes.error,
          });
        } else {
          conversationsImported += convRes.conversations.length;
        }
      }

      await this.prisma.socialAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });
    }

    return {
      syncedAccounts: accounts.length,
      postsImported,
      conversationsImported,
      errors,
    };
  }
}
