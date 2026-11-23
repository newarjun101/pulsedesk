import { Module } from '@nestjs/common';
import { SocialAccountsModule } from '@/social-accounts/social-accounts.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [SocialAccountsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
