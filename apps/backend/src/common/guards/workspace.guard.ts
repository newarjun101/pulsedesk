import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { MemberStatus, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { AuthenticatedUser } from '@/common/decorators/current-user.decorator';

export interface WorkspaceRequest {
  user?: AuthenticatedUser;
  params?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
  workspaceId?: string;
  workspaceRole?: WorkspaceRole;
}

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<WorkspaceRequest>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const headerWorkspaceId = request.headers['x-workspace-id'];
    const workspaceId =
      request.params?.workspaceId ??
      request.params?.id ??
      (Array.isArray(headerWorkspaceId) ? headerWorkspaceId[0] : headerWorkspaceId);

    if (!workspaceId) {
      throw new BadRequestException('Workspace ID is required');
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      include: {
        workspace: {
          select: { deletedAt: true },
        },
      },
    });

    if (!membership || membership.workspace.deletedAt !== null) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    if (membership.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException('Your membership in this workspace is suspended');
    }

    request.workspaceId = workspaceId;
    request.workspaceRole = membership.role;
    return true;
  }
}
