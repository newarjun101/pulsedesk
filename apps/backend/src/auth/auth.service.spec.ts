import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '@/database/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    session: { create: jest.Mock; update: jest.Mock };
    refreshToken: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(prisma)),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-access-token'),
    };

    const configService = {
      get: jest.fn(),
    } as unknown as ConfigService;

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService,
    );
  });

  it('throws ConflictException when registering an existing email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@example.com' });

    await expect(
      service.register(
        {
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
        },
        {},
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('throws UnauthorizedException on invalid password during login', async () => {
    const hash = await argon2.hash('CorrectPass123!');
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'test@example.com',
      passwordHash: hash,
      isSuspended: false,
    });

    await expect(
      service.login({ email: 'test@example.com', password: 'WrongPassword!' }, {}),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('revokes session when refresh token reuse is detected', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      sessionId: 'sess-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
      session: { revokedAt: null },
      user: { id: 'u1', email: 'test@example.com', isSuspended: false },
    });

    await expect(service.refresh({ refreshToken: 'reused-token' })).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: 'sess-1' },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
