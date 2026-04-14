import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  type CanActivate,
  type Type,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  ApiSuccessEnvelope,
  createSuccessEnvelope,
} from '../../common/http/response-envelope';
import { AuthService, RefreshTokenClaims } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

const JwtRefreshGuardType = JwtRefreshGuard as Type<CanActivate>;

function isRefreshTokenClaims(value: unknown): value is RefreshTokenClaims {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const claims = value as {
    sub?: unknown;
    jti?: unknown;
    family?: unknown;
  };

  return (
    typeof claims.sub === 'string' &&
    typeof claims.jti === 'string' &&
    typeof claims.family === 'string'
  );
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 5, ttl: 60000 },
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<ApiSuccessEnvelope<Awaited<ReturnType<AuthService['register']>>>> {
    const data = await this.authService.register(dto);
    return createSuccessEnvelope(req, data);
  }

  @Post('login')
  @Throttle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 10, ttl: 60000 },
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<ApiSuccessEnvelope<Awaited<ReturnType<AuthService['login']>>>> {
    const data = await this.authService.login(dto);
    return createSuccessEnvelope(req, data);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuardType)
  @Throttle({
    short: { limit: 2, ttl: 1000 },
    medium: { limit: 20, ttl: 60000 },
  })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
  ): Promise<ApiSuccessEnvelope<Awaited<ReturnType<AuthService['refresh']>>>> {
    const data = await this.authService.refresh({
      refreshToken: dto.refreshToken,
      claims: this.getRefreshClaims(req),
    });
    return createSuccessEnvelope(req, data);
  }

  @Post('logout')
  @UseGuards(JwtRefreshGuardType)
  @Throttle({
    short: { limit: 2, ttl: 1000 },
    medium: { limit: 20, ttl: 60000 },
  })
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: Request,
  ): Promise<ApiSuccessEnvelope<Awaited<ReturnType<AuthService['logout']>>>> {
    const data = await this.authService.logout({
      refreshToken: dto.refreshToken,
      claims: this.getRefreshClaims(req),
    });
    return createSuccessEnvelope(req, data);
  }

  private getRefreshClaims(req: Request): RefreshTokenClaims {
    const claims = (req as unknown as { user?: unknown }).user;

    if (!isRefreshTokenClaims(claims)) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    return claims;
  }
}
