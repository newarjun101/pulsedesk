import { Injectable, OnModuleInit } from '@nestjs/common';
import { PERMISSION_GROUPS } from '@social-platform/shared-types';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class PermissionsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.seedPermissions();
    } catch {
      // Database may not be reachable during unit tests or build-time
    }
  }

  async seedPermissions(): Promise<void> {
    for (const [group, keys] of Object.entries(PERMISSION_GROUPS)) {
      for (const key of keys) {
        await this.prisma.permission.upsert({
          where: { key },
          update: { group },
          create: { key, group },
        });
      }
    }
  }

  async findAll() {
    return this.prisma.permission.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
  }
}
