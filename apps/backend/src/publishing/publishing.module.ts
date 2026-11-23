import { Module } from '@nestjs/common';
import { SocialAccountsModule } from '@/social-accounts/social-accounts.module';
import { PublishingController } from './publishing.controller';
import { PublishingService } from './publishing.service';

@Module({
  imports: [SocialAccountsModule],
  controllers: [PublishingController],
  providers: [PublishingService],
  exports: [PublishingService],
})
export class PublishingModule {}
