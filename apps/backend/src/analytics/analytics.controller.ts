import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '@/common/guards/workspace.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller('workspaces/:workspaceId/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @RequirePermissions('analytics.view')
  @ApiOperation({ summary: 'Get workspace analytics overview' })
  getOverview(@Param('workspaceId') workspaceId: string) {
    return this.analyticsService.getOverview(workspaceId);
  }

  @Get('publishing')
  @RequirePermissions('analytics.view')
  @ApiOperation({ summary: 'Get publishing analytics by platform and status' })
  getPublishing(@Param('workspaceId') workspaceId: string) {
    return this.analyticsService.getPublishingAnalytics(workspaceId);
  }

  @Get('inbox')
  @RequirePermissions('analytics.view')
  @ApiOperation({ summary: 'Get inbox conversation and message analytics' })
  getInbox(@Param('workspaceId') workspaceId: string) {
    return this.analyticsService.getInboxAnalytics(workspaceId);
  }

  @Get('tickets')
  @RequirePermissions('analytics.view')
  @ApiOperation({ summary: 'Get support ticket analytics by priority and status' })
  getTickets(@Param('workspaceId') workspaceId: string) {
    return this.analyticsService.getTicketAnalytics(workspaceId);
  }

  @Get('social')
  @RequirePermissions('analytics.view')
  @ApiOperation({ summary: 'Get live social media reach, impressions, engagement, and fans' })
  getSocialInsights(@Param('workspaceId') workspaceId: string) {
    return this.analyticsService.getSocialInsights(workspaceId);
  }
}
