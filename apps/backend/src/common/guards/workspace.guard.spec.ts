import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MemberStatus, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { WorkspaceGuard, WorkspaceRequest } from './workspace.guard';

describe('WorkspaceGuard (Tenant Isolation)', () => {
  let guard: WorkspaceGuard;
  let prisma: { workspaceMember: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = {
      workspaceMember: {
        findUnique: jest.fn(),
      },
    };
    guard = new WorkspaceGuard(prisma as unknown as PrismaService);
  });

  const createContext = (req: Partial<WorkspaceRequest>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as unknown as ExecutionContext;

  it('denies access when user is not a member of the workspace', async () => {
    prisma.workspaceMember.findUnique.mockResolvedValue(null);
    const ctx = createContext({
      user: { id: 'user-1', email: 'a@b.com', sessionId: 's1' },
      params: { id: 'ws-other' },
      headers: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('denies access when membership is suspended', async () => {
    prisma.workspaceMember.findUnique.mockResolvedValue({
      role: WorkspaceRole.ADMIN,
      status: MemberStatus.SUSPENDED,
      workspace: { deletedAt: null },
    });
    const ctx = createContext({
      user: { id: 'user-1', email: 'a@b.com', sessionId: 's1' },
      params: { id: 'ws-1' },
      headers: {},
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows access and attaches workspaceId and workspaceRole for active members', async () => {
    prisma.workspaceMember.findUnique.mockResolvedValue({
      role: WorkspaceRole.WORKSPACE_OWNER,
      status: MemberStatus.ACTIVE,
      workspace: { deletedAt: null },
    });
    const req: WorkspaceRequest = {
      user: { id: 'user-1', email: 'a@b.com', sessionId: 's1' },
      params: { id: 'ws-1' },
      headers: {},
    };
    const ctx = createContext(req);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.workspaceId).toBe('ws-1');
    expect(req.workspaceRole).toBe(WorkspaceRole.WORKSPACE_OWNER);
  });
});
