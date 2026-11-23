import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { DepartmentsModule } from './departments/departments.module';
import { MembersModule } from './members/members.module';
import { InvitationsModule } from './invitations/invitations.module';
import { SocialAccountsModule } from './social-accounts/social-accounts.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { MediaModule } from './media/media.module';
import { PublishingModule } from './publishing/publishing.module';
import { InboxModule } from './inbox/inbox.module';
import { TicketsModule } from './tickets/tickets.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: ['req.headers.authorization', 'req.body.password', 'req.body.refreshToken'],
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    PermissionsModule,
    RolesModule,
    DepartmentsModule,
    MembersModule,
    InvitationsModule,
    SocialAccountsModule,
    IntegrationsModule,
    WebhooksModule,
    MediaModule,
    PublishingModule,
    InboxModule,
    TicketsModule,
    AnalyticsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
