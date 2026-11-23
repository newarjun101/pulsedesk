import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';
import { PERMISSION_GROUPS } from '@social-platform/shared-types';
import { PrismaService } from '@/database/prisma.service';
import { PERMISSIONS_KEY } from '@/common/decorators/require-permissions.decorator';
import { WorkspaceRequest } from './workspace.guard';

const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).flat();

const DEFAULT_ROLE_PERMISSIONS: Record<WorkspaceRole, string[]> = {
  WORKSPACE_OWNER: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS.filter((p) => p !== 'workspace.billing'),
  MANAGER: [
    'dashboard.view',
    'social_accounts.view',
    'posts.view',
    'posts.create',
    'posts.edit',
    'posts.publish',
    'posts.schedule',
    'media.view',
    'media.upload',
    'inbox.view',
    'inbox.view_all',
    'conversations.reply',
    'conversations.assign',
    'comments.view',
    'comments.reply',
    'tickets.view',
    'tickets.view_all',
    'tickets.create',
    'tickets.assign',
    'team.view',
    'team.invite',
    'analytics.view',
    'workspace.view',
  ],
  MODERATOR: [
    'dashboard.view',
    'comments.view',
    'comments.reply',
    'comments.hide',
    'comments.delete',
    'moderation.view',
    'moderation.block',
    'moderation.unblock',
    'moderation.ban',
    'moderation.report',
  ],
  SUPPORT_AGENT: [
    'dashboard.view',
    'inbox.view',
    'conversations.reply',
    'tickets.view',
    'tickets.create',
    'tickets.reply',
    'tickets.close',
  ],
  CONTENT_CREATOR: [
    'dashboard.view',
    'posts.view',
    'posts.create',
    'posts.edit',
    'posts.schedule',
    'media.view',
    'media.upload',
  ],
  ANALYST: ['dashboard.view', 'analytics.view', 'analytics.export'],
  VIEWER: ['dashboard.view', 'posts.view', 'media.view', 'analytics.view', 'workspace.view'],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<WorkspaceRequest>();
    const user = request.user;
    const workspaceId = request.workspaceId;
    const workspaceRole = request.workspaceRole;

    if (!user || !workspaceId || !workspaceRole) {
      throw new ForbiddenException('Workspace context is required');
    }

    const effective = new Set<string>(DEFAULT_ROLE_PERMISSIONS[workspaceRole] ?? []);

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: user.id },
      },
      include: {
        customRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (member) {
      for (const mr of member.customRoles) {
        for (const rp of mr.role.permissions) {
          effective.add(rp.permission.key);
        }
      }
    }

    const hasAll = required.every((perm) => effective.has(perm));
    if (!hasAll) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }

    return true;
  }
}
