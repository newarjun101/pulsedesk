import { PostStatus, SocialPlatform } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { CredentialEncryptionService } from '@/social-accounts/credential-encryption.service';
import { FacebookAdapter } from '@/integrations/facebook/facebook.adapter';
import { PublishingService } from './publishing.service';

describe('PublishingService', () => {
  let service: PublishingService;
  let prisma: {
    socialPost: { findFirst: jest.Mock; update: jest.Mock };
    postTarget: { update: jest.Mock };
    publishingLog: { create: jest.Mock };
  };
  let encryption: { decrypt: jest.Mock };
  let facebookAdapter: { publishPost: jest.Mock };

  beforeEach(() => {
    prisma = {
      socialPost: {
        findFirst: jest.fn(),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
      postTarget: { update: jest.fn() },
      publishingLog: { create: jest.fn() },
    };
    encryption = { decrypt: jest.fn().mockReturnValue('decrypted-token') };
    facebookAdapter = {
      publishPost: jest.fn().mockResolvedValue({ success: true, externalPostId: 'fb_123' }),
    };
    service = new PublishingService(
      prisma as unknown as PrismaService,
      encryption as unknown as CredentialEncryptionService,
      facebookAdapter as unknown as FacebookAdapter,
    );
  });

  it('marks post as PARTIALLY_PUBLISHED when one target succeeds and another lacks credentials', async () => {
    prisma.socialPost.findFirst.mockResolvedValue({
      id: 'post-1',
      workspaceId: 'ws-1',
      targets: [
        {
          id: 't1',
          platform: SocialPlatform.FACEBOOK,
          socialAccount: {
            platformAccountId: 'page_1',
            credential: {
              id: 'cred-1',
              encryptedAccessToken: 'enc',
              iv: 'iv',
              authTag: 'tag',
            },
          },
        },
        {
          id: 't2',
          platform: SocialPlatform.TIKTOK,
          socialAccount: { credential: null },
        },
      ],
    });

    const result = await service.publishNow('ws-1', 'post-1');
    expect(result.status).toBe(PostStatus.PARTIALLY_PUBLISHED);
    expect(prisma.postTarget.update).toHaveBeenCalledTimes(2);
    expect(prisma.publishingLog.create).toHaveBeenCalledTimes(2);
  });
});
