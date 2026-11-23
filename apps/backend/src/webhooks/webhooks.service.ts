import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SocialPlatform } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  verifyMetaChallenge(mode?: string, token?: string, challenge?: string): string {
    const verifyToken = this.configService.get<string>('META_WEBHOOK_VERIFY_TOKEN', '');
    if (mode === 'subscribe' && verifyToken && token === verifyToken && challenge) {
      return challenge;
    }
    throw new ForbiddenException('Invalid Meta webhook verification token');
  }

  verifyMetaSignature(rawBody: string, signatureHeader?: string): boolean {
    const appSecret = this.configService.get<string>('META_APP_SECRET', '');
    if (!appSecret || !signatureHeader || !signatureHeader.startsWith('sha256=')) {
      return false;
    }

    const expected =
      'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');

    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  }

  async ingestMetaEvent(
    rawBody: string,
    signatureHeader: string | undefined,
    payload: Record<string, unknown>,
  ) {
    const valid = this.verifyMetaSignature(rawBody, signatureHeader);
    if (!valid) {
      throw new UnauthorizedException('Invalid Meta webhook signature');
    }

    const externalEventId =
      typeof payload.id === 'string'
        ? payload.id
        : createHmac('sha256', 'dedup').update(rawBody).digest('hex');

    return this.recordEvent(
      SocialPlatform.FACEBOOK,
      externalEventId,
      String(payload.object ?? 'meta_event'),
      payload,
      true,
    );
  }

  async ingestTikTokEvent(
    externalEventId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    return this.recordEvent(
      SocialPlatform.TIKTOK,
      externalEventId,
      eventType,
      payload,
      true,
    );
  }

  private async recordEvent(
    platform: SocialPlatform,
    externalEventId: string,
    eventType: string,
    payload: Record<string, unknown>,
    signatureValid: boolean,
  ) {
    const existing = await this.prisma.webhookEvent.findUnique({
      where: {
        platform_externalEventId: { platform, externalEventId },
      },
    });

    if (existing) {
      return { deduplicated: true, id: existing.id };
    }

    const created = await this.prisma.webhookEvent.create({
      data: {
        platform,
        externalEventId,
        eventType,
        payload: payload as Prisma.InputJsonValue,
        signatureValid,
      },
    });

    return { deduplicated: false, id: created.id };
  }
}
