import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConversationStatus } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '@/common/guards/workspace.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { InboxService } from './inbox.service';

@ApiTags('Inbox')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller('workspaces/:workspaceId/conversations')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get()
  @RequirePermissions('inbox.view')
  @ApiOperation({ summary: 'List unified inbox conversations' })
  listConversations(
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: ConversationStatus,
  ) {
    return this.inboxService.listConversations(workspaceId, status);
  }

  @Get(':conversationId/messages')
  @RequirePermissions('inbox.view')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  getMessages(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.inboxService.getMessages(workspaceId, conversationId);
  }

  @Post(':conversationId/messages')
  @RequirePermissions('conversations.reply')
  @ApiOperation({ summary: 'Send a reply or internal note in a conversation' })
  sendReply(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { body: string; isInternalNote?: boolean },
  ) {
    return this.inboxService.sendReply(
      workspaceId,
      conversationId,
      user.id,
      body.body,
      body.isInternalNote ?? false,
    );
  }
}
