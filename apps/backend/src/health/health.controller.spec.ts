import { HealthController } from './health.controller';
import { PrismaService } from '@/database/prisma.service';

describe('HealthController', () => {
  it('returns ok when database is reachable', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const controller = new HealthController(prisma as unknown as PrismaService);

    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
  });

  it('returns degraded when database query fails', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('DB down')) };
    const controller = new HealthController(prisma as unknown as PrismaService);

    const result = await controller.check();
    expect(result.status).toBe('degraded');
    expect(result.database).toBe('down');
  });
});
