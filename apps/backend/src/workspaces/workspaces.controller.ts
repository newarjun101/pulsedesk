import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '@/common/guards/workspace.guard';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/workspace.dto';
import { WorkspacesService } from './workspaces.service';

@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all workspaces the current user belongs to' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.workspacesService.findAllForUser(user.id);
  }

  @Get(':id')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'Get workspace details (requires active membership)' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workspacesService.findOneForMember(id, user.id);
  }

  @Patch(':id')
  @UseGuards(WorkspaceGuard)
  @ApiOperation({ summary: 'Update workspace settings (owner or admin only)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(id, user.id, dto);
  }
}
