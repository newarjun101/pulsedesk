import { CapabilityStatus, SocialPlatform } from '@social-platform/shared-types';

export interface PlatformProfile {
  platformAccountId: string;
  accountName: string;
  username: string | null;
  profilePictureUrl: string | null;
}

export interface PlatformCapabilityResult {
  capability: string;
  status: CapabilityStatus;
  reason: string | null;
}

export interface CredentialValidationResult {
  valid: boolean;
  profile?: PlatformProfile;
  grantedScopes: string[];
  capabilities: PlatformCapabilityResult[];
  error?: string;
}

export interface SocialPlatformAdapter {
  readonly platform: SocialPlatform;
  getAuthorizationUrl(state: string, redirectUri: string): string;
  validateCredentials(
    platformAccountId: string,
    accessToken: string,
    grantedScopes?: string[],
  ): Promise<CredentialValidationResult>;
  getCapabilities(grantedScopes: string[]): PlatformCapabilityResult[];
}
