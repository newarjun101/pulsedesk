import { Injectable } from '@nestjs/common';
import { ConnectionStatus, PostStatus, SocialPlatform, TicketStatus } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { CredentialEncryptionService } from '@/social-accounts/credential-encryption.service';
import { FacebookAdapter } from '@/integrations/facebook/facebook.adapter';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: CredentialEncryptionService,
    private readonly facebookAdapter: FacebookAdapter,
  ) {}

  async getOverview(workspaceId: string) {
    const [
      connectedAccounts,
      totalPosts,
      publishedPosts,
      scheduledPosts,
      openConversations,
      openTickets,
      resolvedTickets,
    ] = await Promise.all([
      this.prisma.socialAccount.count({ where: { workspaceId } }),
      this.prisma.socialPost.count({ where: { workspaceId } }),
      this.prisma.socialPost.count({
        where: { workspaceId, status: PostStatus.PUBLISHED },
      }),
      this.prisma.socialPost.count({
        where: { workspaceId, status: PostStatus.SCHEDULED },
      }),
      this.prisma.conversation.count({ where: { workspaceId } }),
      this.prisma.ticket.count({
        where: { workspaceId, status: TicketStatus.OPEN },
      }),
      this.prisma.ticket.count({
        where: { workspaceId, status: TicketStatus.RESOLVED },
      }),
    ]);

    return {
      connectedAccounts,
      publishing: {
        totalPosts,
        publishedPosts,
        scheduledPosts,
      },
      inbox: {
        totalConversations: openConversations,
      },
      tickets: {
        openTickets,
        resolvedTickets,
      },
    };
  }

  async getPublishingAnalytics(workspaceId: string) {
    const [total, published, scheduled, failed, byPlatform] = await Promise.all([
      this.prisma.socialPost.count({ where: { workspaceId } }),
      this.prisma.socialPost.count({ where: { workspaceId, status: PostStatus.PUBLISHED } }),
      this.prisma.socialPost.count({ where: { workspaceId, status: PostStatus.SCHEDULED } }),
      this.prisma.socialPost.count({ where: { workspaceId, status: PostStatus.FAILED } }),
      this.prisma.postTarget.groupBy({
        by: ['platform', 'status'],
        where: { post: { workspaceId } },
        _count: { _all: true },
      }),
    ]);

    return {
      total,
      published,
      scheduled,
      failed,
      byPlatform: byPlatform.map((row) => ({
        platform: row.platform,
        status: row.status,
        count: row._count._all,
      })),
    };
  }

  async getInboxAnalytics(workspaceId: string) {
    const [totalConversations, totalMessages] = await Promise.all([
      this.prisma.conversation.count({ where: { workspaceId } }),
      this.prisma.message.count({ where: { conversation: { workspaceId } } }),
    ]);

    return { totalConversations, totalMessages };
  }

  async getTicketAnalytics(workspaceId: string) {
    const [total, open, resolved, byPriority] = await Promise.all([
      this.prisma.ticket.count({ where: { workspaceId } }),
      this.prisma.ticket.count({ where: { workspaceId, status: TicketStatus.OPEN } }),
      this.prisma.ticket.count({ where: { workspaceId, status: TicketStatus.RESOLVED } }),
      this.prisma.ticket.groupBy({
        by: ['priority'],
        where: { workspaceId },
        _count: { _all: true },
      }),
    ]);

    return {
      total,
      open,
      resolved,
      byPriority: byPriority.map((row) => ({
        priority: row.priority,
        count: row._count._all,
      })),
    };
  }

  async getSocialInsights(workspaceId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { workspaceId, connectionStatus: ConnectionStatus.CONNECTED },
      include: { credential: true },
    });

    const results = [];
    for (const acc of accounts) {
      if (!acc.credential || acc.platform !== SocialPlatform.FACEBOOK) continue;
      const token = this.encryption.decrypt({
        ciphertext: acc.credential.encryptedAccessToken,
        iv: acc.credential.iv,
        authTag: acc.credential.authTag,
      });
      const insights = await this.facebookAdapter.fetchPageInsights(
        acc.platformAccountId,
        token,
      );
      results.push({
        accountId: acc.id,
        accountName: acc.accountName,
        platform: acc.platform,
        reach: insights.metrics.page_impressions_unique ?? 0,
        impressions: insights.metrics.page_impressions ?? 0,
        engagement: insights.metrics.page_post_engagements ?? insights.metrics.page_engaged_users ?? 0,
        fans: insights.metrics.page_fans ?? 0,
        pageViews: insights.metrics.page_views_total ?? 0,
        error: insights.error ?? null,
      });
    }

    return results;
  }
}
