import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CapabilityStatus, SocialPlatform } from '@social-platform/shared-types';
import {
  CredentialValidationResult,
  PlatformCapabilityResult,
  SocialPlatformAdapter,
} from '../contracts/social-platform-adapter.interface';

@Injectable()
export class TikTokAdapter implements SocialPlatformAdapter {
  readonly platform = SocialPlatform.TIKTOK;

  constructor(private readonly configService: ConfigService) {}

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const clientKey = this.configService.get<string>('TIKTOK_CLIENT_KEY', '');
    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: redirectUri,
      state,
      scope: 'user.info.basic,user.info.stats,video.publish',
      response_type: 'code',
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  }

  async validateCredentials(
    platformAccountId: string,
    accessToken: string,
    grantedScopes: string[] = [],
  ): Promise<CredentialValidationResult> {
    try {
      const res = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!res.ok) {
        return {
          valid: false,
          grantedScopes: [],
          capabilities: [],
          error: `TikTok API returned HTTP ${res.status}`,
        };
      }
      const body = (await res.json()) as {
        data?: { user?: { open_id: string; display_name: string; avatar_url?: string } };
      };
      const user = body.data?.user;
      return {
        valid: true,
        profile: {
          platformAccountId: user?.open_id ?? platformAccountId,
          accountName: user?.display_name ?? platformAccountId,
          username: null,
          profilePictureUrl: user?.avatar_url ?? null,
        },
        grantedScopes,
        capabilities: this.getCapabilities(grantedScopes),
      };
    } catch (err) {
      return {
        valid: false,
        grantedScopes: [],
        capabilities: [],
        error: err instanceof Error ? err.message : 'Failed to validate TikTok token',
      };
    }
  }

  getCapabilities(grantedScopes: string[]): PlatformCapabilityResult[] {
    const scopes = new Set(grantedScopes);
    return [
      {
        capability: 'canPublishVideos',
        status: scopes.has('video.publish')
          ? CapabilityStatus.SUPPORTED
          : CapabilityStatus.REQUIRES_PERMISSION,
        reason: scopes.has('video.publish') ? null : 'Requires video.publish scope',
      },
      {
        capability: 'canReadAnalytics',
        status: scopes.has('user.info.stats')
          ? CapabilityStatus.SUPPORTED
          : CapabilityStatus.REQUIRES_PERMISSION,
        reason: scopes.has('user.info.stats') ? null : 'Requires user.info.stats scope',
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
}
