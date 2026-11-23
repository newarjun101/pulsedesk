import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberStatus, WorkspaceRole } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '@/database/prisma.service';
import { CreateInvitationDto } from './dto/invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async findAll(workspaceId: string) {
    return this.prisma.invitation.findMany({
      where: { workspaceId, acceptedAt: null },
      select: {
        id: true,
        workspaceId: true,
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(workspaceId: string, invitedById: string, dto: CreateInvitationDto) {
    if (dto.role === WorkspaceRole.WORKSPACE_OWNER) {
      throw new ForbiddenException('Cannot invite a user as WORKSPACE_OWNER');
    }

    const email = dto.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMember = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: existingUser.id },
        },
      });
      if (existingMember) {
        throw new ConflictException('User is already a member of this workspace');
      }
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.create({
      data: {
        workspaceId,
        email,
        role: dto.role,
        tokenHash,
        invitedById,
        expiresAt,
      },
      select: {
        id: true,
        workspaceId: true,
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
      },
    });

    return {
      invitation,
      inviteToken: rawToken,
    };
  }

  async accept(userId: string, userEmail: string, rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation || invitation.acceptedAt !== null || invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    if (invitation.email !== userEmail.toLowerCase().trim()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    return this.prisma.$transaction(async (tx) => {
      const member = await tx.workspaceMember.upsert({
        where: {
          workspaceId_userId: { workspaceId: invitation.workspaceId, userId },
        },
        update: { status: MemberStatus.ACTIVE },
        create: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
          status: MemberStatus.ACTIVE,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return member;
    });
  }

  async revoke(workspaceId: string, invitationId: string): Promise<{ success: boolean }> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, workspaceId },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    await this.prisma.invitation.delete({ where: { id: invitation.id } });
    return { success: true };
  }
}
