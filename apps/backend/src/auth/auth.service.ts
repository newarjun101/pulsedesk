import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '@/database/prisma.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto/auth.dto';

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    isEmailVerified: boolean;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateOpaqueToken(): string {
    return randomBytes(32).toString('hex');
  }

  private getRefreshExpiryDate(): Date {
    const expiresInMs = 7 * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + expiresInMs);
  }

  async register(
    dto: RegisterDto,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthTokensResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
      },
    });

    return this.createSessionAndTokens(user, meta);
  }

  async login(
    dto: LoginDto,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthTokensResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isSuspended) {
      throw new UnauthorizedException('Account is suspended');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.createSessionAndTokens(user, meta);
  }

  private async createSessionAndTokens(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      isEmailVerified: boolean;
    },
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<AuthTokensResponse> {
    const expiresAt = this.getRefreshExpiryDate();
    const rawRefreshToken = this.generateOpaqueToken();
    const tokenHash = this.hashToken(rawRefreshToken);

    const session = await this.prisma.$transaction(async (tx) => {
      const createdSession = await tx.session.create({
        data: {
          userId: user.id,
          userAgent: meta.userAgent,
          ipAddress: meta.ipAddress,
          expiresAt,
        },
      });

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          sessionId: createdSession.id,
          tokenHash,
          expiresAt,
        },
      });

      return createdSession;
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      sessionId: session.id,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(dto.refreshToken);
    const existingToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        session: true,
        user: {
          select: { id: true, email: true, isSuspended: true },
        },
      },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: if a revoked token is presented, revoke the entire session
    if (existingToken.revokedAt !== null) {
      await this.prisma.session.update({
        where: { id: existingToken.sessionId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token reuse detected; session revoked');
    }

    if (
      existingToken.expiresAt < new Date() ||
      existingToken.session.revokedAt !== null ||
      existingToken.user.isSuspended
    ) {
      throw new UnauthorizedException('Refresh token expired or session invalid');
    }

    const newRawToken = this.generateOpaqueToken();
    const newTokenHash = this.hashToken(newRawToken);
    const newExpiresAt = this.getRefreshExpiryDate();

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          userId: existingToken.userId,
          sessionId: existingToken.sessionId,
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt,
        },
      });

      await tx.refreshToken.update({
        where: { id: existingToken.id },
        data: {
          revokedAt: new Date(),
          replacedByTokenId: created.id,
        },
      });
    });

    const accessToken = await this.jwtService.signAsync({
      sub: existingToken.user.id,
      email: existingToken.user.email,
      sessionId: existingToken.sessionId,
    });

    return {
      accessToken,
      refreshToken: newRawToken,
    };
  }

  async logout(sessionId: string): Promise<{ success: boolean }> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: sessionId },
        data: { revokedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { sessionId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && !user.isSuspended) {
      const rawToken = this.generateOpaqueToken();
      const tokenHash = this.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
      // Email delivery is wired in the notifications phase.
    }

    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);
    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: now },
      }),
      this.prisma.session.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    return { message: 'Password has been reset successfully' };
  }

  async listSessions(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string): Promise<{ success: boolean }> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    return this.logout(session.id);
  }
}
