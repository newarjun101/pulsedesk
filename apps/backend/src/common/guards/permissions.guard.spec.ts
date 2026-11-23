import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { PermissionsGuard } from './permissions.guard';
import { WorkspaceRequest } from './workspace.guard';

describe('PermissionsGuard (RBAC)', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let prisma: { workspaceMember: { findUnique: jest.Mock } };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    prisma = { workspaceMember: { findUnique: jest.fn() } };
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService,
    );
  });

  const createContext = (req: Partial<WorkspaceRequest>): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    }) as unknown as ExecutionContext;

  it('allows when no permissions are required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = createContext({});
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('denies VIEWER from team.invite', async () => {
    reflector.getAllAndOverride.mockReturnValue(['team.invite']);
    prisma.workspaceMember.findUnique.mockResolvedValue({ customRoles: [] });

    const ctx = createContext({
      user: { id: 'u1', email: 'a@b.com', sessionId: 's1' },
      workspaceId: 'ws-1',
      workspaceRole: WorkspaceRole.VIEWER,
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows VIEWER when custom role grants team.invite', async () => {
    reflector.getAllAndOverride.mockReturnValue(['team.invite']);
    prisma.workspaceMember.findUnique.mockResolvedValue({
      customRoles: [
        {
          role: {
            permissions: [{ permission: { key: 'team.invite' } }],
          },
        },
      ],
    });

    const ctx = createContext({
      user: { id: 'u1', email: 'a@b.com', sessionId: 's1' },
      workspaceId: 'ws-1',
      workspaceRole: WorkspaceRole.VIEWER,
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
