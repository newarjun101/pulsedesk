import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  private toSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async findAll(workspaceId: string) {
    const roles = await this.prisma.role.findMany({
      where: { workspaceId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return roles.map((r) => ({
      id: r.id,
      workspaceId: r.workspaceId,
      name: r.name,
      slug: r.slug,
      description: r.description,
      isSystem: r.isSystem,
      permissions: r.permissions.map((rp) => rp.permission.key),
      createdAt: r.createdAt,
    }));
  }

  async create(workspaceId: string, dto: CreateRoleDto) {
    const slug = this.toSlug(dto.name);
    if (!slug) {
      throw new BadRequestException('Invalid role name');
    }

    const existing = await this.prisma.role.findUnique({
      where: { workspaceId_slug: { workspaceId, slug } },
    });
    if (existing) {
      throw new ConflictException('A role with this name already exists in this workspace');
    }

    const permissionRecords = await this.prisma.permission.findMany({
      where: { key: { in: dto.permissions } },
    });

    return this.prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          workspaceId,
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim(),
          isSystem: false,
        },
      });

      if (permissionRecords.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionRecords.map((p) => ({
            roleId: role.id,
            permissionId: p.id,
          })),
        });
      }

      return {
        ...role,
        permissions: permissionRecords.map((p) => p.key),
      };
    });
  }

  async update(workspaceId: string, roleId: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, workspaceId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be modified');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.role.update({
        where: { id: role.id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        },
      });

      let permKeys: string[] = [];
      if (dto.permissions !== undefined) {
        const permissionRecords = await tx.permission.findMany({
          where: { key: { in: dto.permissions } },
        });
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        if (permissionRecords.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionRecords.map((p) => ({
              roleId: role.id,
              permissionId: p.id,
            })),
          });
        }
        permKeys = permissionRecords.map((p) => p.key);
      } else {
        const current = await tx.rolePermission.findMany({
          where: { roleId: role.id },
          include: { permission: true },
        });
        permKeys = current.map((c) => c.permission.key);
      }

      return {
        ...updated,
        permissions: permKeys,
      };
    });
  }

  async remove(workspaceId: string, roleId: string): Promise<{ success: boolean }> {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, workspaceId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be deleted');
    }

    await this.prisma.role.delete({ where: { id: role.id } });
    return { success: true };
  }
}
