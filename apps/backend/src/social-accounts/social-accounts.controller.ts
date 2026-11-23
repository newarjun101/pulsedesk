import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SocialPlatform } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '@/common/guards/workspace.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import {
  ManualConnectSocialAccountDto,
  ReplaceCredentialsDto,
  UpdateSocialAccountDto,
} from './dto/social-account.dto';
import { SocialAccountsService } from './social-accounts.service';

@ApiTags('Social Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller('workspaces/:workspaceId/social-accounts')
export class SocialAccountsController {
  constructor(private readonly socialAccountsService: SocialAccountsService) {}

  @Get()
  @RequirePermissions('social_accounts.view')
  @ApiOperation({ summary: 'List connected social accounts in workspace' })
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.socialAccountsService.findAll(workspaceId);
  }

  @Post('sync')
  @RequirePermissions('social_accounts.view')
  @ApiOperation({ summary: 'Sync posts and messages from all connected social accounts' })
  syncAll(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.socialAccountsService.syncAll(workspaceId, user.id);
  }

  @Get('connect/:platform')
  @RequirePermissions('social_accounts.connect')
  @ApiOperation({ summary: 'Generate OAuth authorization URL with CSRF state' })
  getOAuthUrl(
    @Param('workspaceId') workspaceId: string,
    @Param('platform', new ParseEnumPipe(SocialPlatform)) platform: SocialPlatform,
  ) {
    return this.socialAccountsService.getOAuthUrl(workspaceId, platform);
  }

  @Post('manual')
  @RequirePermissions('social_accounts.connect')
  @ApiOperation({ summary: 'Connect a social account using manual API credentials' })
  connectManual(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: ManualConnectSocialAccountDto,
  ) {
    return this.socialAccountsService.connectManual(workspaceId, dto);
  }

  @Patch(':accountId')
  @RequirePermissions('social_accounts.manage')
  @ApiOperation({ summary: 'Update social account Page ID, name, username, or token' })
  updateAccount(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateSocialAccountDto,
  ) {
    return this.socialAccountsService.updateAccount(workspaceId, accountId, dto);
  }

  @Patch(':accountId/credentials')
  @RequirePermissions('social_accounts.manage')
  @ApiOperation({ summary: 'Replace encrypted credentials for a social account' })
  replaceCredentials(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @Body() dto: ReplaceCredentialsDto,
  ) {
    return this.socialAccountsService.replaceCredentials(workspaceId, accountId, dto);
  }

  @Get(':accountId/capabilities')
  @RequirePermissions('social_accounts.view')
  @ApiOperation({ summary: 'Get discovered capabilities for a social account' })
  getCapabilities(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.socialAccountsService.getCapabilities(workspaceId, accountId);
  }

  @Delete(':accountId')
  @RequirePermissions('social_accounts.disconnect')
  @ApiOperation({ summary: 'Disconnect and remove a social account' })
  disconnect(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.socialAccountsService.disconnect(workspaceId, accountId);
  }
}
