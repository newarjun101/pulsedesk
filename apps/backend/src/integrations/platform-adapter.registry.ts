import { Injectable, NotFoundException } from '@nestjs/common';
import { SocialPlatform } from '@social-platform/shared-types';
import { SocialPlatformAdapter } from './contracts/social-platform-adapter.interface';
import { FacebookAdapter } from './facebook/facebook.adapter';
import { InstagramAdapter } from './instagram/instagram.adapter';
import { TikTokAdapter } from './tiktok/tiktok.adapter';

@Injectable()
export class PlatformAdapterRegistry {
  private readonly adapters = new Map<SocialPlatform, SocialPlatformAdapter>();

  constructor(
    facebook: FacebookAdapter,
    instagram: InstagramAdapter,
    tiktok: TikTokAdapter,
  ) {
    this.adapters.set(SocialPlatform.FACEBOOK, facebook);
    this.adapters.set(SocialPlatform.INSTAGRAM, instagram);
    this.adapters.set(SocialPlatform.TIKTOK, tiktok);
  }

  getAdapter(platform: SocialPlatform): SocialPlatformAdapter {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new NotFoundException(`No adapter registered for platform ${platform}`);
    }
    return adapter;
  }
}
