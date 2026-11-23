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
import {
  AssignDepartmentMemberDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from './dto/department.dto';
import { DepartmentsService } from './departments.service';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller('workspaces/:workspaceId/departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermissions('team.view')
  @ApiOperation({ summary: 'List all departments in workspace' })
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.departmentsService.findAll(workspaceId);
  }

  @Post()
  @RequirePermissions('team.manage')
  @ApiOperation({ summary: 'Create a department in workspace' })
  create(@Param('workspaceId') workspaceId: string, @Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(workspaceId, dto);
  }

  @Patch(':departmentId')
  @RequirePermissions('team.manage')
  @ApiOperation({ summary: 'Update a department' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('departmentId') departmentId: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(workspaceId, departmentId, dto);
  }

  @Delete(':departmentId')
  @RequirePermissions('team.manage')
  @ApiOperation({ summary: 'Delete a department' })
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.departmentsService.remove(workspaceId, departmentId);
  }

  @Post(':departmentId/members')
  @RequirePermissions('team.manage')
  @ApiOperation({ summary: 'Assign a member to a department' })
  assignMember(
    @Param('workspaceId') workspaceId: string,
    @Param('departmentId') departmentId: string,
    @Body() dto: AssignDepartmentMemberDto,
  ) {
    return this.departmentsService.assignMember(workspaceId, departmentId, dto.memberId);
  }

  @Delete(':departmentId/members/:memberId')
  @RequirePermissions('team.manage')
  @ApiOperation({ summary: 'Remove a member from a department' })
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('departmentId') departmentId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.departmentsService.removeMember(workspaceId, departmentId, memberId);
  }
}
