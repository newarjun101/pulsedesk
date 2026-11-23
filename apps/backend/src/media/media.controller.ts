import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '@/common/guards/workspace.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { RegisterMediaAssetDto, UpdateMediaAssetDto } from './dto/media.dto';
import { MediaService } from './media.service';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller('workspaces/:workspaceId/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @RequirePermissions('media.view')
  @ApiOperation({ summary: 'List paginated media assets in workspace' })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Query('folder') folder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.mediaService.findAll(
      workspaceId,
      folder,
      page ? Number(page) : 1,
      limit ? Number(limit) : 9,
    );
  }

  @Post()
  @RequirePermissions('media.upload')
  @ApiOperation({ summary: 'Register an uploaded media asset' })
  register(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: RegisterMediaAssetDto,
  ) {
    return this.mediaService.register(workspaceId, dto);
  }

  @Patch(':mediaId')
  @RequirePermissions('media.upload')
  @ApiOperation({ summary: 'Update a media asset' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('mediaId') mediaId: string,
    @Body() dto: UpdateMediaAssetDto,
  ) {
    return this.mediaService.update(workspaceId, mediaId, dto);
  }

  @Delete(':mediaId')
  @RequirePermissions('media.delete')
  @ApiOperation({ summary: 'Delete a media asset' })
  remove(@Param('workspaceId') workspaceId: string, @Param('mediaId') mediaId: string) {
    return this.mediaService.remove(workspaceId, mediaId);
  }
}
