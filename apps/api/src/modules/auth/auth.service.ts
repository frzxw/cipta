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
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL = '7d';
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

interface RefreshTokenRecord {
  userId: string;
  family: string;
  refreshTokenHash: string;
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
  private readonly refreshTokens = new Map<string, RefreshTokenRecord>();

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

    const tokens = await this.issueTokenPair(
      {
        id: created.user.id,
        email: created.user.email,
        workspaces,
      },
      randomUUID(),
    );

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
      tokens,
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

    const tokens = await this.issueTokenPair(
      {
        id: user.id,
        email: user.email,
        workspaces,
      },
      randomUUID(),
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      tokens,
    };
  }

  async refresh(dto: RefreshDto): Promise<AuthTokenPair> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    const storedToken = this.refreshTokens.get(payload.jti);
    if (!storedToken) {
      this.revokeTokenFamily(payload.family);
      throw new UnauthorizedException('Refresh token invalid or already used');
    }

    const isTokenMatch = await bcrypt.compare(
      dto.refreshToken,
      storedToken.refreshTokenHash,
    );

    if (!isTokenMatch) {
      this.revokeTokenFamily(storedToken.family);
      throw new UnauthorizedException('Refresh token invalid or already used');
    }

    this.refreshTokens.delete(payload.jti);

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

    return this.issueTokenPair(
      {
        id: user.id,
        email: user.email,
        workspaces,
      },
      storedToken.family,
    );
  }

  async logout(dto: LogoutDto): Promise<{ message: string }> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    this.refreshTokens.delete(payload.jti);

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
  ): Promise<AuthTokenPair> {
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

    this.refreshTokens.set(jti, {
      userId: user.id,
      family: familyId,
      refreshTokenHash,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<{ sub: string; jti: string; family: string }> {
    const refreshSecret = this.getRequiredSecret('JWT_REFRESH_SECRET');

    try {
      return await this.jwtService.verifyAsync<{
        sub: string;
        jti: string;
        family: string;
      }>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private revokeTokenFamily(familyId: string): void {
    for (const [jti, token] of this.refreshTokens.entries()) {
      if (token.family === familyId) {
        this.refreshTokens.delete(jti);
      }
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
