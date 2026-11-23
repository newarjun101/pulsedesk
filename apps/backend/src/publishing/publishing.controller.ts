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
import { PostStatus, SocialPlatform } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { WorkspaceGuard } from '@/common/guards/workspace.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { CreatePostDto, UpdatePostDto } from './dto/publishing.dto';
import { PublishingService } from './publishing.service';

@ApiTags('Publishing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard, PermissionsGuard)
@Controller('workspaces/:workspaceId/posts')
export class PublishingController {
  constructor(private readonly publishingService: PublishingService) {}

  @Get()
  @RequirePermissions('posts.view')
  @ApiOperation({ summary: 'List paginated, filtered, and sorted posts in workspace' })
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Query('status') status?: PostStatus,
    @Query('platform') platform?: SocialPlatform,
    @Query('search') search?: string,
    @Query('sort') sort?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.publishingService.findAll(
      workspaceId,
      status,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      platform,
      search,
      sort === 'asc' ? 'asc' : 'desc',
    );
  }

  @Get(':postId')
  @RequirePermissions('posts.view')
  @ApiOperation({ summary: 'Get full details of a single post' })
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
  ) {
    return this.publishingService.findOne(workspaceId, postId);
  }

  @Post()
  @RequirePermissions('posts.create')
  @ApiOperation({ summary: 'Create a draft or scheduled post' })
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostDto,
  ) {
    return this.publishingService.create(workspaceId, user.id, dto);
  }

  @Patch(':postId')
  @RequirePermissions('posts.edit')
  @ApiOperation({ summary: 'Update a draft or scheduled post' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.publishingService.update(workspaceId, postId, dto);
  }

  @Post(':postId/publish')
  @RequirePermissions('posts.publish')
  @ApiOperation({ summary: 'Publish post to all configured targets' })
  publishNow(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
  ) {
    return this.publishingService.publishNow(workspaceId, postId);
  }

  @Post(':postId/duplicate')
  @RequirePermissions('posts.create')
  @ApiOperation({ summary: 'Duplicate an existing post as a draft' })
  duplicate(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.publishingService.duplicate(workspaceId, postId, user.id);
  }

  @Delete(':postId')
  @RequirePermissions('posts.delete')
  @ApiOperation({ summary: 'Delete a post' })
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
  ) {
    return this.publishingService.remove(workspaceId, postId);
  }

  @Get(':postId/comments')
  @RequirePermissions('comments.view')
  @ApiOperation({ summary: 'Fetch paginated live comments for a published post' })
  getComments(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.publishingService.getPostComments(
      workspaceId,
      postId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 5,
    );
  }

  @Post(':postId/comments')
  @RequirePermissions('comments.reply')
  @ApiOperation({ summary: 'Add a top-level comment on a published post' })
  addComment(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
    @Body() dto: { message: string },
  ) {
    return this.publishingService.addPostComment(workspaceId, postId, dto.message);
  }

  @Post(':postId/comments/:commentId/reply')
  @RequirePermissions('comments.reply')
  @ApiOperation({ summary: 'Reply to a comment on a published post' })
  replyToComment(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Body() dto: { message: string },
  ) {
    return this.publishingService.replyToPostComment(
      workspaceId,
      postId,
      commentId,
      dto.message,
    );
  }

  @Patch(':postId/comments/:commentId')
  @RequirePermissions('comments.manage')
  @ApiOperation({ summary: 'Update a comment on a published post' })
  updateComment(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Body() dto: { message: string },
  ) {
    return this.publishingService.updatePostComment(
      workspaceId,
      postId,
      commentId,
      dto.message,
    );
  }

  @Delete(':postId/comments/:commentId')
  @RequirePermissions('comments.delete')
  @ApiOperation({ summary: 'Delete a comment on a published post' })
  deleteComment(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.publishingService.deletePostComment(workspaceId, postId, commentId);
  }
}
