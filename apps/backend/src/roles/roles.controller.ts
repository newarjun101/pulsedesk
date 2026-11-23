import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '@/common/guards/workspace.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller('workspaces/:workspaceId/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.view')
  @ApiOperation({ summary: 'List custom roles in workspace' })
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.rolesService.findAll(workspaceId);
  }

  @Post()
  @RequirePermissions('roles.create')
  @ApiOperation({ summary: 'Create a custom role in workspace' })
  create(@Param('workspaceId') workspaceId: string, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(workspaceId, dto);
  }

  @Patch(':roleId')
  @RequirePermissions('roles.edit')
  @ApiOperation({ summary: 'Update a custom role' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(workspaceId, roleId, dto);
  }

  @Delete(':roleId')
  @RequirePermissions('roles.delete')
  @ApiOperation({ summary: 'Delete a custom role' })
  remove(@Param('workspaceId') workspaceId: string, @Param('roleId') roleId: string) {
    return this.rolesService.remove(workspaceId, roleId);
  }
}
