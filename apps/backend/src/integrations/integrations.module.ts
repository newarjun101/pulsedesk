import { Global, Module } from '@nestjs/common';
import { FacebookAdapter } from './facebook/facebook.adapter';
import { InstagramAdapter } from './instagram/instagram.adapter';
import { TikTokAdapter } from './tiktok/tiktok.adapter';
import { PlatformAdapterRegistry } from './platform-adapter.registry';

@Global()
@Module({
  providers: [
    FacebookAdapter,
    InstagramAdapter,
    TikTokAdapter,
    PlatformAdapterRegistry,
  ],
  exports: [
    FacebookAdapter,
    InstagramAdapter,
    TikTokAdapter,
    PlatformAdapterRegistry,
  ],
})
export class IntegrationsModule {}
