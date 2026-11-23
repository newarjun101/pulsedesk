import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CapabilityStatus, SocialPlatform } from '@social-platform/shared-types';
import {
  CredentialValidationResult,
  PlatformCapabilityResult,
  SocialPlatformAdapter,
} from '../contracts/social-platform-adapter.interface';

@Injectable()
export class InstagramAdapter implements SocialPlatformAdapter {
  readonly platform = SocialPlatform.INSTAGRAM;
  private readonly graphBaseUrl = 'https://graph.facebook.com/v21.0';

  constructor(private readonly configService: ConfigService) {}

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const appId = this.configService.get<string>('META_APP_ID', '');
    const scopes = [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_comments',
      'instagram_manage_messages',
    ].join(',');
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      scope: scopes,
      response_type: 'code',
    });
    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
  }

  async validateCredentials(
    platformAccountId: string,
    accessToken: string,
    grantedScopes: string[] = [],
  ): Promise<CredentialValidationResult> {
    try {
      const url = `${this.graphBaseUrl}/${encodeURIComponent(platformAccountId)}?fields=id,name,username,profile_picture_url&access_token=${encodeURIComponent(accessToken)}`;
      const res = await fetch(url);
      if (!res.ok) {
        return {
          valid: false,
          grantedScopes: [],
          capabilities: [],
          error: `Instagram Graph API returned HTTP ${res.status}`,
        };
      }
      const data = (await res.json()) as {
        id: string;
        name?: string;
        username?: string;
        profile_picture_url?: string;
      };
      return {
        valid: true,
        profile: {
          platformAccountId: data.id,
          accountName: data.name ?? data.username ?? data.id,
          username: data.username ?? null,
          profilePictureUrl: data.profile_picture_url ?? null,
        },
        grantedScopes,
        capabilities: this.getCapabilities(grantedScopes),
      };
    } catch (err) {
      return {
        valid: false,
        grantedScopes: [],
        capabilities: [],
        error: err instanceof Error ? err.message : 'Failed to validate Instagram token',
      };
    }
  }

  getCapabilities(grantedScopes: string[]): PlatformCapabilityResult[] {
    const scopes = new Set(grantedScopes);
    return [
      {
        capability: 'canPublishImages',
        status: scopes.has('instagram_content_publish')
          ? CapabilityStatus.SUPPORTED
          : CapabilityStatus.REQUIRES_PERMISSION,
        reason: scopes.has('instagram_content_publish')
          ? null
          : 'Requires instagram_content_publish',
      },
      {
        capability: 'canReplyToComments',
        status: scopes.has('instagram_manage_comments')
          ? CapabilityStatus.SUPPORTED
          : CapabilityStatus.REQUIRES_PERMISSION,
        reason: scopes.has('instagram_manage_comments')
          ? null
          : 'Requires instagram_manage_comments',
      },
      {
        capability: 'canSendMessages',
        status: scopes.has('instagram_manage_messages')
          ? CapabilityStatus.SUPPORTED
          : CapabilityStatus.REQUIRES_PERMISSION,
        reason: scopes.has('instagram_manage_messages')
          ? null
          : 'Requires instagram_manage_messages',
      },
    ];
  }
}
