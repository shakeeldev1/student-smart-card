import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RequestMeta {
  userAgent?: string | null;
  ipAddress?: string | null;
}

function parseDurationToMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const value = Number(match[1]);
  const unitMs: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * unitMs[match[2]];
}

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private signAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const expiresInMs = parseDurationToMs(
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN')!,
    );
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET')!,
      expiresIn: Math.floor(expiresInMs / 1000),
    });
  }

  async issueTokenPair(user: User, meta: RequestMeta = {}): Promise<TokenPair> {
    const accessToken = this.signAccessToken(user);

    const rawRefreshToken = randomBytes(40).toString('hex');
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN')!;

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + parseDurationToMs(refreshExpiresIn)),
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async rotateRefreshToken(
    rawToken: string,
    meta: RequestMeta = {},
  ): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawToken);
    const existing = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.revokedAt) {
      await this.refreshTokenRepository.update(
        { userId: existing.userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException({
        code: 'TOKEN_REUSE_DETECTED',
        message:
          'Refresh token reuse detected. All sessions have been revoked.',
      });
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.usersService.findById(existing.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newPair = await this.issueTokenPair(user, meta);
    const newTokenHash = this.hashToken(newPair.refreshToken);
    const newTokenEntity = await this.refreshTokenRepository.findOne({
      where: { tokenHash: newTokenHash },
    });

    existing.revokedAt = new Date();
    existing.replacedByTokenId = newTokenEntity?.id ?? null;
    await this.refreshTokenRepository.save(existing);

    return newPair;
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.refreshTokenRepository.update(
      { tokenHash, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async listActiveSessions(): Promise<
    Array<{
      id: string;
      userId: string;
      userName: string;
      userEmail: string;
      userRole: string;
      userAgent: string | null;
      ipAddress: string | null;
      createdAt: Date;
      expiresAt: Date;
    }>
  > {
    const sessions = await this.refreshTokenRepository.find({
      where: { revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    return sessions.map((session) => ({
      id: session.id,
      userId: session.userId,
      userName: session.user.name,
      userEmail: session.user.email,
      userRole: session.user.role,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }

  async revokeSession(id: string): Promise<void> {
    const session = await this.refreshTokenRepository.findOne({
      where: { id },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (!session.revokedAt) {
      await this.refreshTokenRepository.update(id, {
        revokedAt: new Date(),
      });
    }
  }
}
