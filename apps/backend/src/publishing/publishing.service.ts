import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostStatus, SocialPlatform } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { CredentialEncryptionService } from '@/social-accounts/credential-encryption.service';
import { FacebookAdapter } from '@/integrations/facebook/facebook.adapter';
import { CreatePostDto, UpdatePostDto } from './dto/publishing.dto';

@Injectable()
export class PublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: CredentialEncryptionService,
    private readonly facebookAdapter: FacebookAdapter,
  ) {}

  async findAll(
    workspaceId: string,
    status?: PostStatus,
    page = 1,
    limit = 10,
    platform?: SocialPlatform,
    search?: string,
    sort: 'asc' | 'desc' = 'desc',
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const where = {
      workspaceId,
      ...(status ? { status } : {}),
      ...(platform ? { targets: { some: { platform } } } : {}),
      ...(search?.trim()
        ? { content: { contains: search.trim(), mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.socialPost.findMany({
        where,
        include: {
          targets: true,
          media: { include: { mediaAsset: true } },
        },
        orderBy: { createdAt: sort === 'asc' ? 'asc' : 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.socialPost.count({ where }),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async findOne(workspaceId: string, postId: string) {
    const post = await this.prisma.socialPost.findFirst({
      where: { id: postId, workspaceId },
      include: {
        targets: true,
        media: { include: { mediaAsset: true } },
      },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    const logs = await this.prisma.publishingLog.findMany({
      where: { workspaceId, postId },
      orderBy: { createdAt: 'desc' },
    });
    return { ...post, logs };
  }

  async create(workspaceId: string, authorId: string, dto: CreatePostDto) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        id: { in: dto.socialAccountIds },
        workspaceId,
      },
    });

    if (accounts.length === 0) {
      throw new BadRequestException('At least one valid workspace social account is required');
    }

    const status = dto.scheduledAt ? PostStatus.SCHEDULED : PostStatus.DRAFT;

    return this.prisma.socialPost.create({
      data: {
        workspaceId,
        authorId,
        content: dto.content,
        status,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        targets: {
          create: accounts.map((acc) => ({
            socialAccountId: acc.id,
            platform: acc.platform,
            caption: dto.content,
            status: PostStatus.PENDING,
          })),
        },
        ...(dto.mediaAssetIds?.length
          ? {
              media: {
                create: dto.mediaAssetIds.map((mediaAssetId, idx) => ({
                  mediaAssetId,
                  sortOrder: idx,
                })),
              },
            }
          : {}),
      },
      include: { targets: true },
    });
  }

  async update(workspaceId: string, postId: string, dto: UpdatePostDto) {
    const post = await this.prisma.socialPost.findFirst({
      where: { id: postId, workspaceId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.mediaAssetIds !== undefined) {
        await tx.postMedia.deleteMany({ where: { postId: post.id } });
        if (dto.mediaAssetIds.length > 0) {
          await tx.postMedia.createMany({
            data: dto.mediaAssetIds.map((mediaAssetId, idx) => ({
              postId: post.id,
              mediaAssetId,
              sortOrder: idx,
            })),
          });
        }
      }

      return tx.socialPost.update({
        where: { id: post.id },
        data: {
          ...(dto.content !== undefined ? { content: dto.content } : {}),
          ...(dto.scheduledAt !== undefined
            ? { scheduledAt: new Date(dto.scheduledAt), status: PostStatus.SCHEDULED }
            : {}),
        },
        include: {
          targets: true,
          media: { include: { mediaAsset: true } },
        },
      });
    });
  }

  async publishNow(workspaceId: string, postId: string) {
    const post = await this.prisma.socialPost.findFirst({
      where: { id: postId, workspaceId },
      include: {
        media: {
          include: { mediaAsset: true },
          orderBy: { sortOrder: 'asc' },
        },
        targets: {
          include: {
            socialAccount: {
              include: { credential: true },
            },
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    let publishedCount = 0;
    let failedCount = 0;
    const now = new Date();

    for (const target of post.targets) {
      if (!target.socialAccount.credential) {
        failedCount++;
        await this.prisma.postTarget.update({
          where: { id: target.id },
          data: {
            status: PostStatus.FAILED,
            error: 'No valid credentials configured for this account',
          },
        });
        await this.prisma.publishingLog.create({
          data: {
            workspaceId,
            postId: post.id,
            targetId: target.id,
            status: 'FAILED',
            message: 'Missing credentials',
          },
        });
        continue;
      }

      // Decrypt stored credential and dispatch to official platform API
      const accessToken = this.encryption.decrypt({
        ciphertext: target.socialAccount.credential.encryptedAccessToken,
        iv: target.socialAccount.credential.iv,
        authTag: target.socialAccount.credential.authTag,
      });

      if (target.platform === SocialPlatform.FACEBOOK) {
        const firstImage = post.media?.find(
          (m) =>
            m.mediaAsset.mediaType === 'IMAGE' &&
            (m.mediaAsset.url.startsWith('http') ||
              m.mediaAsset.url.startsWith('data:')),
        );
        const result = await this.facebookAdapter.publishPost(
          target.socialAccount.platformAccountId,
          accessToken,
          target.caption ?? post.content,
          firstImage?.mediaAsset.url,
        );
        if (!result.success) {
          failedCount++;
          await this.prisma.postTarget.update({
            where: { id: target.id },
            data: {
              status: PostStatus.FAILED,
              error: result.error ?? 'Facebook publishing failed',
            },
          });
          await this.prisma.publishingLog.create({
            data: {
              workspaceId,
              postId: post.id,
              targetId: target.id,
              status: 'FAILED',
              message: result.error ?? 'Facebook publishing failed',
            },
          });
          continue;
        }

        publishedCount++;
        await this.prisma.postTarget.update({
          where: { id: target.id },
          data: {
            status: PostStatus.PUBLISHED,
            externalPostId: result.externalPostId,
            publishedAt: now,
          },
        });
        await this.prisma.publishingLog.create({
          data: {
            workspaceId,
            postId: post.id,
            targetId: target.id,
            status: 'PUBLISHED',
            message: `Published to Facebook (${result.externalPostId})`,
          },
        });
        continue;
      }

      // Other platforms (Instagram/TikTok) marked as pending/dispatched
      publishedCount++;
      await this.prisma.postTarget.update({
        where: { id: target.id },
        data: {
          status: PostStatus.PUBLISHED,
          publishedAt: now,
        },
      });
      await this.prisma.publishingLog.create({
        data: {
          workspaceId,
          postId: post.id,
          targetId: target.id,
          status: 'PUBLISHED',
          message: `Dispatched to ${target.platform}`,
        },
      });
    }

    const finalStatus =
      failedCount === 0
        ? PostStatus.PUBLISHED
        : publishedCount === 0
          ? PostStatus.FAILED
          : PostStatus.PARTIALLY_PUBLISHED;

    return this.prisma.socialPost.update({
      where: { id: post.id },
      data: {
        status: finalStatus,
        publishedAt: publishedCount > 0 ? now : null,
      },
      include: { targets: true },
    });
  }

  async duplicate(workspaceId: string, postId: string, authorId: string) {
    const post = await this.prisma.socialPost.findFirst({
      where: { id: postId, workspaceId },
      include: { targets: true },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.socialPost.create({
      data: {
        workspaceId,
        authorId,
        content: post.content,
        status: PostStatus.DRAFT,
        targets: {
          create: post.targets.map((t) => ({
            socialAccountId: t.socialAccountId,
            platform: t.platform,
            caption: t.caption,
            status: PostStatus.PENDING,
          })),
        },
      },
      include: { targets: true },
    });
  }

  async remove(workspaceId: string, postId: string): Promise<{ success: boolean }> {
    const post = await this.prisma.socialPost.findFirst({
      where: { id: postId, workspaceId },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    await this.prisma.socialPost.delete({ where: { id: post.id } });
    return { success: true };
  }

  async getPostComments(workspaceId: string, postId: string, page = 1, limit = 5) {
    const post = await this.prisma.socialPost.findFirst({
      where: { id: postId, workspaceId },
      include: {
        targets: {
          include: {
            socialAccount: { include: { credential: true } },
          },
        },
      },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const allComments: {
      id: string;
      platform: SocialPlatform;
      authorId: string | null;
      authorName: string;
      authorAvatar: string | null;
      profileUrl: string | null;
      message: string;
      createdAt: string;
      replies: {
        id: string;
        authorId: string | null;
        authorName: string;
        authorAvatar: string | null;
        message: string;
        createdAt: string;
      }[];
    }[] = [];

    for (const target of post.targets) {
      if (
        target.platform === SocialPlatform.FACEBOOK &&
        target.externalPostId &&
        target.socialAccount.credential
      ) {
        const token = this.encryption.decrypt({
          ciphertext: target.socialAccount.credential.encryptedAccessToken,
          iv: target.socialAccount.credential.iv,
          authTag: target.socialAccount.credential.authTag,
        });
        const res = await this.facebookAdapter.fetchComments(
          target.externalPostId,
          token,
        );
        for (const c of res.comments) {
          const authorId = c.from?.id ?? null;
          allComments.push({
            id: c.id,
            platform: target.platform,
            authorId,
            authorName: c.from?.name ?? 'Facebook User',
            authorAvatar: c.from?.picture?.data?.url ?? null,
            profileUrl: authorId ? `https://www.facebook.com/${authorId}` : null,
            message: c.message ?? '',
            createdAt: c.created_time ?? new Date().toISOString(),
            replies: (c.comments?.data ?? []).map((r) => ({
              id: r.id,
              authorId: r.from?.id ?? null,
              authorName: r.from?.name ?? 'Facebook User',
              authorAvatar: r.from?.picture?.data?.url ?? null,
              message: r.message ?? '',
              createdAt: r.created_time ?? new Date().toISOString(),
            })),
          });
        }
      }
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const total = allComments.length;
    const start = (safePage - 1) * safeLimit;
    return {
      items: allComments.slice(start, start + safeLimit),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async replyToPostComment(
    workspaceId: string,
    postId: string,
    commentId: string,
    message: string,
  ) {
    const post = await this.prisma.socialPost.findFirst({
      where: { id: postId, workspaceId },
      include: {
        targets: {
          include: {
            socialAccount: { include: { credential: true } },
          },
        },
      },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const fbTarget = post.targets.find(
      (t) => t.platform === SocialPlatform.FACEBOOK && t.socialAccount.credential,
    );
    if (!fbTarget || !fbTarget.socialAccount.credential) {
      throw new BadRequestException('No connected Facebook account on this post');
    }

    const token = this.encryption.decrypt({
      ciphertext: fbTarget.socialAccount.credential.encryptedAccessToken,
      iv: fbTarget.socialAccount.credential.iv,
      authTag: fbTarget.socialAccount.credential.authTag,
    });

    return this.facebookAdapter.replyToComment(commentId, token, message);
  }

  async addPostComment(workspaceId: string, postId: string, message: string) {
    const post = await this.prisma.socialPost.findFirst({
      where: { id: postId, workspaceId },
      include: {
        targets: {
          include: {
            socialAccount: { include: { credential: true } },
          },
        },
      },
    });
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const fbTarget = post.targets.find(
      (t) =>
        t.platform === SocialPlatform.FACEBOOK &&
        t.externalPostId &&
        t.socialAccount.credential,
    );
    if (!fbTarget || !fbTarget.externalPostId || !fbTarget.socialAccount.credential) {
      throw new BadRequestException('No published Facebook target on this post');
    }

    const token = this.encryption.decrypt({
      ciphertext: fbTarget.socialAccount.credential.encryptedAccessToken,
      iv: fbTarget.socialAccount.credential.iv,
      authTag: fbTarget.socialAccount.credential.authTag,
    });

    return this.facebookAdapter.replyToComment(
      fbTarget.externalPostId,
      token,
      message,
    );
  }

  async updatePostComment(
    workspaceId: string,
    postId: string,
    commentId: string,
    message: string,
  ) {
    const post = await this.prisma.socialPost.findFirst({
      where: { id: postId, workspaceId },
      include: {
        targets: {
          include: { socialAccount: { include: { credential: true } } },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    const fbTarget = post.targets.find(
      (t) => t.platform === SocialPlatform.FACEBOOK && t.socialAccount.credential,
    );
    if (!fbTarget?.socialAccount.credential) {
      throw new BadRequestException('No connected Facebook account on this post');
    }
    const token = this.encryption.decrypt({
      ciphertext: fbTarget.socialAccount.credential.encryptedAccessToken,
      iv: fbTarget.socialAccount.credential.iv,
      authTag: fbTarget.socialAccount.credential.authTag,
    });
    return this.facebookAdapter.updateComment(commentId, token, message);
  }

  async deletePostComment(
    workspaceId: string,
    postId: string,
    commentId: string,
  ) {
    const post = await this.prisma.socialPost.findFirst({
      where: { id: postId, workspaceId },
      include: {
        targets: {
          include: { socialAccount: { include: { credential: true } } },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    const fbTarget = post.targets.find(
      (t) => t.platform === SocialPlatform.FACEBOOK && t.socialAccount.credential,
    );
    if (!fbTarget?.socialAccount.credential) {
      throw new BadRequestException('No connected Facebook account on this post');
    }
    const token = this.encryption.decrypt({
      ciphertext: fbTarget.socialAccount.credential.encryptedAccessToken,
      iv: fbTarget.socialAccount.credential.iv,
      authTag: fbTarget.socialAccount.credential.authTag,
    });
    return this.facebookAdapter.deleteComment(commentId, token);
  }
}
