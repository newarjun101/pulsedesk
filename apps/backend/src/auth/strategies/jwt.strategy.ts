import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@/database/prisma.service';
import { AuthenticatedUser } from '@/common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  email: string;
  sessionId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: {
        user: {
          select: { id: true, email: true, isSuspended: true },
        },
      },
    });

    if (!session || session.revokedAt !== null || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session is invalid or expired');
    }

    if (session.user.isSuspended) {
      throw new UnauthorizedException('Account is suspended');
    }

    return {
      id: session.user.id,
      email: session.user.email,
      sessionId: session.id,
    };
  }
}
