import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CapabilityStatus, SocialPlatform } from '@social-platform/shared-types';
import {
  CredentialValidationResult,
  PlatformCapabilityResult,
  SocialPlatformAdapter,
} from '../contracts/social-platform-adapter.interface';

@Injectable()
export class FacebookAdapter implements SocialPlatformAdapter {
  readonly platform = SocialPlatform.FACEBOOK;
  private readonly graphBaseUrl = 'https://graph.facebook.com/v21.0';

  constructor(private readonly configService: ConfigService) {}

  getAuthorizationUrl(state: string, redirectUri: string): string {
    const appId = this.configService.get<string>('META_APP_ID', '');
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_manage_engagement',
      'pages_messaging',
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
      const url = `${this.graphBaseUrl}/${encodeURIComponent(platformAccountId)}?fields=id,name,username,picture{url}&access_token=${encodeURIComponent(accessToken)}`;
      const res = await fetch(url);
      if (!res.ok) {
        return {
          valid: false,
          grantedScopes: [],
          capabilities: [],
          error: `Meta Graph API returned HTTP ${res.status}`,
        };
      }
      const data = (await res.json()) as {
        id: string;
        name: string;
        username?: string;
        picture?: { data?: { url?: string } };
      };
      return {
        valid: true,
        profile: {
          platformAccountId: data.id,
          accountName: data.name,
          username: data.username ?? null,
          profilePictureUrl: data.picture?.data?.url ?? null,
        },
        grantedScopes,
        capabilities: this.getCapabilities(grantedScopes),
      };
    } catch (err) {
      return {
        valid: false,
        grantedScopes: [],
        capabilities: [],
        error: err instanceof Error ? err.message : 'Failed to validate Facebook token',
      };
    }
  }

  getCapabilities(grantedScopes: string[]): PlatformCapabilityResult[] {
    const scopes = new Set(grantedScopes);
    return [
      {
        capability: 'canPublishText',
        status: scopes.has('pages_manage_posts')
          ? CapabilityStatus.SUPPORTED
          : CapabilityStatus.REQUIRES_PERMISSION,
        reason: scopes.has('pages_manage_posts') ? null : 'Requires pages_manage_posts',
      },
      {
        capability: 'canReplyToComments',
        status: scopes.has('pages_manage_engagement')
          ? CapabilityStatus.SUPPORTED
          : CapabilityStatus.REQUIRES_PERMISSION,
        reason: scopes.has('pages_manage_engagement')
          ? null
          : 'Requires pages_manage_engagement',
      },
      {
        capability: 'canSendMessages',
        status: scopes.has('pages_messaging')
          ? CapabilityStatus.SUPPORTED
          : CapabilityStatus.REQUIRES_PERMISSION,
        reason: scopes.has('pages_messaging') ? null : 'Requires pages_messaging',
      },
    ];
  }

  async publishPost(
    pageId: string,
    accessToken: string,
    message: string,
    imageUrl?: string,
  ): Promise<{ success: boolean; externalPostId?: string; error?: string }> {
    try {
      const endpoint = imageUrl
        ? `${this.graphBaseUrl}/${encodeURIComponent(pageId)}/photos`
        : `${this.graphBaseUrl}/${encodeURIComponent(pageId)}/feed`;

      let res: Response;
      if (imageUrl?.startsWith('data:')) {
        const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          return { success: false, error: 'Invalid base64 image data URL' };
        }
        const mimeType = match[1];
        const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
        const buffer = Buffer.from(match[2], 'base64');
        const formData = new FormData();
        formData.append('access_token', accessToken);
        formData.append('caption', message);
        formData.append('source', new Blob([buffer], { type: mimeType }), `upload.${ext}`);
        res = await fetch(endpoint, { method: 'POST', body: formData });
      } else {
        const body = new URLSearchParams({
          access_token: accessToken,
          ...(imageUrl ? { url: imageUrl, caption: message } : { message }),
        });

        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
      }

      const data = (await res.json()) as { id?: string; error?: { message?: string } };
      if (!res.ok || !data.id) {
        return {
          success: false,
          error: data.error?.message ?? `Meta Graph API returned HTTP ${res.status}`,
        };
      }

      return { success: true, externalPostId: data.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to publish to Facebook',
      };
    }
  }

  async fetchPosts(
    pageId: string,
    accessToken: string,
  ): Promise<{
    posts: { id: string; message?: string; created_time?: string }[];
    error?: string;
  }> {
    try {
      const url = `${this.graphBaseUrl}/${encodeURIComponent(pageId)}/posts?fields=id,message,created_time&limit=25&access_token=${encodeURIComponent(accessToken)}`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        data?: { id: string; message?: string; created_time?: string }[];
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          posts: [],
          error: data.error?.message ?? `Meta Graph API returned HTTP ${res.status}`,
        };
      }
      return { posts: data.data ?? [] };
    } catch (err) {
      return {
        posts: [],
        error: err instanceof Error ? err.message : 'Failed to fetch Facebook posts',
      };
    }
  }

  async fetchConversations(
    pageId: string,
    accessToken: string,
  ): Promise<{
    conversations: {
      id: string;
      messages?: { data?: { id: string; message?: string; from?: { id: string; name?: string } }[] };
    }[];
    error?: string;
  }> {
    try {
      const url = `${this.graphBaseUrl}/${encodeURIComponent(pageId)}/conversations?fields=id,updated_time,messages{id,message,from,created_time}&limit=25&access_token=${encodeURIComponent(accessToken)}`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        data?: {
          id: string;
          messages?: { data?: { id: string; message?: string; from?: { id: string; name?: string } }[] };
        }[];
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          conversations: [],
          error: data.error?.message ?? `Meta Graph API returned HTTP ${res.status}`,
        };
      }
      return { conversations: data.data ?? [] };
    } catch (err) {
      return {
        conversations: [],
        error: err instanceof Error ? err.message : 'Failed to fetch Facebook conversations',
      };
    }
  }

  async fetchPageInsights(
    pageId: string,
    accessToken: string,
  ): Promise<{ metrics: Record<string, number>; error?: string }> {
    try {
      const url = `${this.graphBaseUrl}/${encodeURIComponent(pageId)}/insights?metric=page_impressions,page_impressions_unique,page_post_engagements,page_views_total&period=day&access_token=${encodeURIComponent(accessToken)}`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        data?: { name: string; values?: { value: number }[] }[];
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          metrics: {},
          error: data.error?.message ?? `Meta Graph API returned HTTP ${res.status}`,
        };
      }
      const metrics: Record<string, number> = {};
      for (const item of data.data ?? []) {
        const latest = item.values?.[item.values.length - 1]?.value;
        if (typeof latest === 'number') {
          metrics[item.name] = latest;
        }
      }
      return { metrics };
    } catch (err) {
      return {
        metrics: {},
        error: err instanceof Error ? err.message : 'Failed to fetch Facebook insights',
      };
    }
  }

  async fetchComments(
    externalPostId: string,
    accessToken: string,
  ): Promise<{
    comments: {
      id: string;
      message?: string;
      from?: { id?: string; name?: string; picture?: { data?: { url?: string } } };
      created_time?: string;
      comments?: {
        data?: {
          id: string;
          message?: string;
          from?: { id?: string; name?: string; picture?: { data?: { url?: string } } };
          created_time?: string;
        }[];
      };
    }[];
    error?: string;
  }> {
    try {
      const url = `${this.graphBaseUrl}/${encodeURIComponent(externalPostId)}/comments?fields=id,message,from{id,name,picture{url}},created_time,comments{id,message,from{id,name,picture{url}},created_time}&access_token=${encodeURIComponent(accessToken)}`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        data?: {
          id: string;
          message?: string;
          from?: { id?: string; name?: string; picture?: { data?: { url?: string } } };
          created_time?: string;
          comments?: {
            data?: {
              id: string;
              message?: string;
              from?: { id?: string; name?: string; picture?: { data?: { url?: string } } };
              created_time?: string;
            }[];
          };
        }[];
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          comments: [],
          error: data.error?.message ?? `Meta Graph API returned HTTP ${res.status}`,
        };
      }
      return { comments: data.data ?? [] };
    } catch (err) {
      return {
        comments: [],
        error: err instanceof Error ? err.message : 'Failed to fetch Facebook comments',
      };
    }
  }

  async replyToComment(
    commentId: string,
    accessToken: string,
    message: string,
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const url = `${this.graphBaseUrl}/${encodeURIComponent(commentId)}/comments`;
      const body = new URLSearchParams({ access_token: accessToken, message });
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const data = (await res.json()) as { id?: string; error?: { message?: string } };
      if (!res.ok || !data.id) {
        return {
          success: false,
          error: data.error?.message ?? `Meta Graph API returned HTTP ${res.status}`,
        };
      }
      return { success: true, id: data.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to reply to comment',
      };
    }
  }

  async updateComment(
    commentId: string,
    accessToken: string,
    message: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.graphBaseUrl}/${encodeURIComponent(commentId)}`;
      const body = new URLSearchParams({ access_token: accessToken, message });
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!res.ok) {
        return { success: false, error: `Meta Graph API returned HTTP ${res.status}` };
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update comment',
      };
    }
  }

  async deleteComment(
    commentId: string,
    accessToken: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.graphBaseUrl}/${encodeURIComponent(commentId)}?access_token=${encodeURIComponent(accessToken)}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        return { success: false, error: `Meta Graph API returned HTTP ${res.status}` };
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete comment',
      };
    }
  }
}
