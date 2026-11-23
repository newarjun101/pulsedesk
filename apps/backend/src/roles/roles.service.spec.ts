import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: { role: { findFirst: jest.Mock; delete: jest.Mock } };

  beforeEach(() => {
    prisma = {
      role: {
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new RolesService(prisma as unknown as PrismaService);
  });

  it('prevents deleting a system role', async () => {
    prisma.role.findFirst.mockResolvedValue({ id: 'r1', isSystem: true });
    await expect(service.remove('ws-1', 'r1')).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when role does not exist in workspace', async () => {
    prisma.role.findFirst.mockResolvedValue(null);
    await expect(service.remove('ws-1', 'missing')).rejects.toThrow(NotFoundException);
  });
});
