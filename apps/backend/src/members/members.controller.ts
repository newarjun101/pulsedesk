import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkspaceRole } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { WorkspaceGuard, WorkspaceRequest } from '@/common/guards/workspace.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { AssignMemberRolesDto, UpdateMemberDto } from './dto/member.dto';
import { MembersService } from './members.service';

@ApiTags('Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller('workspaces/:workspaceId/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @RequirePermissions('team.view')
  @ApiOperation({ summary: 'List all members in workspace' })
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.membersService.findAll(workspaceId);
  }

  @Patch(':memberId')
  @RequirePermissions('team.manage')
  @ApiOperation({ summary: 'Update member role or status' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Req() req: WorkspaceRequest,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membersService.update(
      workspaceId,
      memberId,
      req.workspaceRole ?? WorkspaceRole.VIEWER,
      dto,
    );
  }

  @Put(':memberId/roles')
  @RequirePermissions('permissions.assign')
  @ApiOperation({ summary: 'Assign custom roles to a workspace member' })
  assignRoles(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @Body() dto: AssignMemberRolesDto,
  ) {
    return this.membersService.assignCustomRoles(workspaceId, memberId, dto);
  }

  @Delete(':memberId')
  @RequirePermissions('team.remove')
  @ApiOperation({ summary: 'Remove a member from workspace' })
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.membersService.remove(workspaceId, memberId);
  }
}
