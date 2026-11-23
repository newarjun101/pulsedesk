import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string) {
    const departments = await this.prisma.department.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return departments.map((d) => ({
      id: d.id,
      workspaceId: d.workspaceId,
      name: d.name,
      description: d.description,
      memberCount: d._count.members,
      createdAt: d.createdAt,
    }));
  }

  async create(workspaceId: string, dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findUnique({
      where: {
        workspaceId_name: { workspaceId, name: dto.name.trim() },
      },
    });
    if (existing) {
      throw new ConflictException('A department with this name already exists');
    }

    const department = await this.prisma.department.create({
      data: {
        workspaceId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
      },
    });

    return {
      ...department,
      memberCount: 0,
    };
  }

  async update(workspaceId: string, departmentId: string, dto: UpdateDepartmentDto) {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, workspaceId },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return this.prisma.department.update({
      where: { id: department.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
      },
    });
  }

  async remove(workspaceId: string, departmentId: string): Promise<{ success: boolean }> {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, workspaceId },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    await this.prisma.department.delete({ where: { id: department.id } });
    return { success: true };
  }

  async assignMember(workspaceId: string, departmentId: string, memberId: string) {
    const [department, member] = await Promise.all([
      this.prisma.department.findFirst({ where: { id: departmentId, workspaceId } }),
      this.prisma.workspaceMember.findFirst({ where: { id: memberId, workspaceId } }),
    ]);

    if (!department) throw new NotFoundException('Department not found');
    if (!member) throw new NotFoundException('Workspace member not found');

    return this.prisma.departmentMember.upsert({
      where: {
        departmentId_memberId: { departmentId, memberId },
      },
      update: {},
      create: { departmentId, memberId },
    });
  }

  async removeMember(workspaceId: string, departmentId: string, memberId: string) {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, workspaceId },
    });
    if (!department) throw new NotFoundException('Department not found');

    await this.prisma.departmentMember.deleteMany({
      where: { departmentId, memberId },
    });
    return { success: true };
  }
}
