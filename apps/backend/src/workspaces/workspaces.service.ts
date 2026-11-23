import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberStatus, WorkspaceRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/database/prisma.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const suffix = randomBytes(3).toString('hex');
    return `${base || 'workspace'}-${suffix}`;
  }

  async create(userId: string, dto: CreateWorkspaceDto) {
    const slug = dto.slug ? dto.slug.toLowerCase().trim() : this.generateSlug(dto.name);

    const existing = await this.prisma.workspace.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException('A workspace with this slug already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: dto.name.trim(),
          slug,
          timezone: dto.timezone ?? 'UTC',
          logoUrl: dto.logoUrl ?? null,
          ownerId: userId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId,
          role: WorkspaceRole.WORKSPACE_OWNER,
          status: MemberStatus.ACTIVE,
        },
      });

      return {
        ...workspace,
        role: WorkspaceRole.WORKSPACE_OWNER,
      };
    });
  }

  async findAllForUser(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: {
        userId,
        status: MemberStatus.ACTIVE,
        workspace: { deletedAt: null },
      },
      include: {
        workspace: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      timezone: m.workspace.timezone,
      logoUrl: m.workspace.logoUrl,
      role: m.role,
      createdAt: m.workspace.createdAt,
    }));
  }

  async findOneForMember(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
      include: {
        workspace: true,
      },
    });

    if (!membership || membership.workspace.deletedAt !== null) {
      throw new NotFoundException('Workspace not found');
    }

    return {
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      timezone: membership.workspace.timezone,
      logoUrl: membership.workspace.logoUrl,
      role: membership.role,
      createdAt: membership.workspace.createdAt,
    };
  }

  async update(workspaceId: string, userId: string, dto: UpdateWorkspaceDto) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    if (
      !membership ||
      (membership.role !== WorkspaceRole.WORKSPACE_OWNER && membership.role !== WorkspaceRole.ADMIN)
    ) {
      throw new ForbiddenException('Only workspace owners or admins can update workspace settings');
    }

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
      },
    });
  }
}
