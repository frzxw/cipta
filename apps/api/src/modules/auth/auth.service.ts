import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WorkspaceRole } from '@cipta/database';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ACCESS_TOKEN_TTL = '15m';
const BCRYPT_SALT_ROUNDS = 12;

interface AuthWorkspace {
  id: string;
  role: WorkspaceRole;
}

interface AuthUserClaims {
  id: string;
  email: string;
  workspaces: AuthWorkspace[];
}

interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
  jti: string;
  expiresAt: Date;
}

export interface RefreshTokenClaims {
  sub: string;
  jti: string;
  family: string;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
    createdAt: Date;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    role: WorkspaceRole;
  };
  tokens: AuthTokenPair;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  tokens: AuthTokenPair;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const workspaceName = `${dto.displayName}'s Workspace`;
    const workspaceSlug = await this.createUniqueWorkspaceSlug(workspaceName);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          displayName: dto.displayName,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug: workspaceSlug,
        },
      });

      await tx.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: WorkspaceRole.OWNER,
        },
      });

      return { user, workspace };
    });

    const workspaces: AuthWorkspace[] = [
      {
        id: created.workspace.id,
        role: WorkspaceRole.OWNER,
      },
    ];

    const familyId = randomUUID();
    const issuedTokens = await this.issueTokenPair(
      {
        id: created.user.id,
        email: created.user.email,
        workspaces,
      },
      familyId,
    );

    await this.persistRefreshToken(created.user.id, issuedTokens, familyId);

    return {
      user: {
        id: created.user.id,
        email: created.user.email,
        displayName: created.user.displayName,
        createdAt: created.user.createdAt,
      },
      workspace: {
        id: created.workspace.id,
        name: created.workspace.name,
        slug: created.workspace.slug,
        role: WorkspaceRole.OWNER,
      },
      tokens: this.toAuthTokenPair(issuedTokens),
    };
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        workspaces: {
          select: {
            role: true,
            workspace: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const workspaces: AuthWorkspace[] = user.workspaces.map((member) => ({
      id: member.workspace.id,
      role: member.role,
    }));

    const familyId = randomUUID();
    const issuedTokens = await this.issueTokenPair(
      {
        id: user.id,
        email: user.email,
        workspaces,
      },
      familyId,
    );

    await this.persistRefreshToken(user.id, issuedTokens, familyId);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      tokens: this.toAuthTokenPair(issuedTokens),
    };
  }

  async refresh(input: {
    refreshToken: string;
    claims: RefreshTokenClaims;
  }): Promise<AuthTokenPair> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { jti: input.claims.jti },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.usedAt ||
      storedToken.family !== input.claims.family ||
      storedToken.userId !== input.claims.sub
    ) {
      await this.revokeTokenFamilies(storedToken?.family ?? null, input.claims.family);
      throw new UnauthorizedException('Refresh token invalid or already used');
    }

    const isTokenMatch = await bcrypt.compare(
      input.refreshToken,
      storedToken.refreshTokenHash,
    );

    if (!isTokenMatch) {
      await this.revokeTokenFamily(storedToken.family);
      throw new UnauthorizedException('Refresh token invalid or already used');
    }

    if (storedToken.expiresAt.getTime() <= Date.now()) {
      await this.revokeTokenFamily(storedToken.family);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: storedToken.userId },
      include: {
        workspaces: {
          select: {
            role: true,
            workspace: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found for refresh token');
    }

    const workspaces: AuthWorkspace[] = user.workspaces.map((member) => ({
      id: member.workspace.id,
      role: member.role,
    }));

    const nextTokens = await this.issueTokenPair(
      {
        id: user.id,
        email: user.email,
        workspaces,
      },
      storedToken.family,
    );

    const now = new Date();
    const rotatedCount = await this.prisma.refreshToken.updateMany({
      where: {
        id: storedToken.id,
        usedAt: null,
        revokedAt: null,
      },
      data: {
        usedAt: now,
        revokedAt: now,
      },
    });

    if (rotatedCount.count === 0) {
      await this.revokeTokenFamily(storedToken.family);
      throw new UnauthorizedException('Refresh token invalid or already used');
    }

    await this.persistRefreshToken(user.id, nextTokens, storedToken.family);

    return this.toAuthTokenPair(nextTokens);
  }

  async logout(input: {
    refreshToken: string;
    claims: RefreshTokenClaims;
  }): Promise<{ message: string }> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { jti: input.claims.jti },
    });

    if (!storedToken) {
      return { message: 'Logged out successfully' };
    }

    const isTokenMatch = await bcrypt.compare(
      input.refreshToken,
      storedToken.refreshTokenHash,
    );

    if (!isTokenMatch) {
      await this.revokeTokenFamilies(storedToken.family, input.claims.family);
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.revokeTokenFamilies(storedToken.family, input.claims.family);

    return { message: 'Logged out successfully' };
  }

  private async createUniqueWorkspaceSlug(
    workspaceName: string,
  ): Promise<string> {
    const baseSlug = this.slugify(workspaceName);

    const existingCount = await this.prisma.workspace.count({
      where: {
        slug: {
          startsWith: baseSlug,
        },
      },
    });

    if (existingCount === 0) {
      return baseSlug;
    }

    return `${baseSlug}-${existingCount + 1}`;
  }

  private slugify(value: string): string {
    const normalized = value.toLowerCase().replace(/'/g, '');
    const slug = normalized
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

    return slug || 'workspace';
  }

  private async issueTokenPair(
    user: AuthUserClaims,
    familyId: string,
  ): Promise<IssuedTokenPair> {
    const accessSecret = this.getRequiredSecret('JWT_ACCESS_SECRET');
    const refreshSecret = this.getRequiredSecret('JWT_REFRESH_SECRET');
    const jti = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        workspaces: user.workspaces,
      },
      {
        secret: accessSecret,
        expiresIn: ACCESS_TOKEN_TTL,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        jti,
        family: familyId,
      },
      {
        secret: refreshSecret,
        expiresIn: REFRESH_TOKEN_TTL,
      },
    );

    const refreshTokenHash = await bcrypt.hash(
      refreshToken,
      BCRYPT_SALT_ROUNDS,
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenHash,
      jti,
      expiresAt: this.getRefreshTokenExpiresAt(),
    };
  }

  private getRefreshTokenExpiresAt(): Date {
    return new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  }

  private async persistRefreshToken(
    userId: string,
    tokenPair: IssuedTokenPair,
    familyId: string,
  ): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },
        jti: tokenPair.jti,
        family: familyId,
        refreshTokenHash: tokenPair.refreshTokenHash,
        expiresAt: tokenPair.expiresAt,
      },
    });
  }

  private toAuthTokenPair(tokenPair: IssuedTokenPair): AuthTokenPair {
    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  private async revokeTokenFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        family: familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private async revokeTokenFamilies(
    storedFamily: string | null,
    claimsFamily: string,
  ): Promise<void> {
    if (storedFamily) {
      await this.revokeTokenFamily(storedFamily);
      if (storedFamily !== claimsFamily) {
        await this.revokeTokenFamily(claimsFamily);
      }
    } else {
      await this.revokeTokenFamily(claimsFamily);
    }
  }

  private getRequiredSecret(
    envKey: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET',
  ): string {
    const secret = process.env[envKey];

    if (!secret || secret.length < 64) {
      throw new InternalServerErrorException(
        `${envKey} is required and must be at least 64 characters`,
      );
    }

    return secret;
  }
}
