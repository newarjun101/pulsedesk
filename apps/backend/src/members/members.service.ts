import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { AssignMemberRolesDto, UpdateMemberDto } from './dto/member.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        customRoles: {
          include: {
            role: { select: { id: true, name: true } },
          },
        },
        departments: {
          include: {
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.user.id,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      status: m.status,
      customRoles: m.customRoles.map((cr) => cr.role),
      departments: m.departments.map((dm) => dm.department),
      joinedAt: m.joinedAt,
    }));
  }

  async update(
    workspaceId: string,
    memberId: string,
    actorRole: WorkspaceRole,
    dto: UpdateMemberDto,
  ) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === WorkspaceRole.WORKSPACE_OWNER) {
      throw new ForbiddenException('Workspace owner cannot be modified or suspended');
    }

    if (
      dto.role === WorkspaceRole.WORKSPACE_OWNER &&
      actorRole !== WorkspaceRole.WORKSPACE_OWNER
    ) {
      throw new ForbiddenException('Only the workspace owner can transfer ownership');
    }

    return this.prisma.workspaceMember.update({
      where: { id: member.id },
      data: {
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  async assignCustomRoles(
    workspaceId: string,
    memberId: string,
    dto: AssignMemberRolesDto,
  ) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const validRoles = await this.prisma.role.findMany({
      where: { id: { in: dto.roleIds }, workspaceId },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.memberRole.deleteMany({ where: { memberId: member.id } });
      if (validRoles.length > 0) {
        await tx.memberRole.createMany({
          data: validRoles.map((r) => ({
            memberId: member.id,
            roleId: r.id,
          })),
        });
      }
    });

    return { success: true, assignedRoleIds: validRoles.map((r) => r.id) };
  }

  async remove(workspaceId: string, memberId: string): Promise<{ success: boolean }> {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === WorkspaceRole.WORKSPACE_OWNER) {
      throw new ForbiddenException('Workspace owner cannot be removed');
    }

    await this.prisma.workspaceMember.delete({ where: { id: member.id } });
    return { success: true };
  }
}
