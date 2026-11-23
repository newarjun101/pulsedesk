import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PrismaService } from '@/database/prisma.service';
import { WebhooksService } from './webhooks.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: {
    webhookEvent: { findUnique: jest.Mock; create: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      webhookEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    const configService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        if (key === 'META_WEBHOOK_VERIFY_TOKEN') return 'verify-secret';
        if (key === 'META_APP_SECRET') return 'app-secret';
        return defaultVal;
      }),
    } as unknown as ConfigService;

    service = new WebhooksService(
      prisma as unknown as PrismaService,
      configService,
    );
  });

  it('verifies Meta challenge when token matches', () => {
    expect(service.verifyMetaChallenge('subscribe', 'verify-secret', '12345')).toBe(
      '12345',
    );
  });

  it('throws ForbiddenException when Meta verify token is invalid', () => {
    expect(() =>
      service.verifyMetaChallenge('subscribe', 'wrong-token', '12345'),
    ).toThrow(ForbiddenException);
  });

  it('rejects Meta webhook with invalid HMAC signature', async () => {
    await expect(
      service.ingestMetaEvent('{"object":"page"}', 'sha256=invalid', {
        object: 'page',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deduplicates Meta webhook events with valid signature', async () => {
    const raw = '{"id":"evt_1","object":"page"}';
    const sig =
      'sha256=' + createHmac('sha256', 'app-secret').update(raw).digest('hex');

    prisma.webhookEvent.findUnique.mockResolvedValue({ id: 'existing-id' });
    const res = await service.ingestMetaEvent(raw, sig, {
      id: 'evt_1',
      object: 'page',
    });

    expect(res).toEqual({ deduplicated: true, id: 'existing-id' });
    expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
  });
});
