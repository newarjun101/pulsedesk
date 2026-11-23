import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '@/common/guards/workspace.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { AcceptInvitationDto, CreateInvitationDto } from './dto/invitation.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('Invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('workspaces/:workspaceId/invitations')
  @UseGuards(WorkspaceGuard, PermissionsGuard)
  @RequirePermissions('team.view')
  @ApiOperation({ summary: 'List pending invitations in workspace' })
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.invitationsService.findAll(workspaceId);
  }

  @Post('workspaces/:workspaceId/invitations')
  @UseGuards(WorkspaceGuard, PermissionsGuard)
  @RequirePermissions('team.invite')
  @ApiOperation({ summary: 'Invite a user to workspace' })
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(workspaceId, user.id, dto);
  }

  @Delete('workspaces/:workspaceId/invitations/:invitationId')
  @UseGuards(WorkspaceGuard, PermissionsGuard)
  @RequirePermissions('team.invite')
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  revoke(
    @Param('workspaceId') workspaceId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.invitationsService.revoke(workspaceId, invitationId);
  }

  @Post('invitations/accept')
  @ApiOperation({ summary: 'Accept a workspace invitation' })
  accept(@CurrentUser() user: AuthenticatedUser, @Body() dto: AcceptInvitationDto) {
    return this.invitationsService.accept(user.id, user.email, dto.token);
  }
}
