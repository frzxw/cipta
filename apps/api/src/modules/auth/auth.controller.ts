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
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { AuthService, RefreshTokenClaims } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

const JwtRefreshGuardType = JwtRefreshGuard as Type<CanActivate>;

interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

interface RefreshClaimsRequest extends Request {
  user?: RefreshTokenClaims;
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
  ): Promise<ApiEnvelope<Awaited<ReturnType<AuthService['register']>>>> {
    const data = await this.authService.register(dto);
    return this.createSuccessEnvelope(req, data);
  }

  @Post('login')
  @Throttle({
    short: { limit: 1, ttl: 1000 },
    medium: { limit: 10, ttl: 60000 },
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<ApiEnvelope<Awaited<ReturnType<AuthService['login']>>>> {
    const data = await this.authService.login(dto);
    return this.createSuccessEnvelope(req, data);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuardType)
  @Throttle({
    short: { limit: 2, ttl: 1000 },
    medium: { limit: 20, ttl: 60000 },
  })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: RefreshClaimsRequest,
  ): Promise<ApiEnvelope<Awaited<ReturnType<AuthService['refresh']>>>> {
    const data = await this.authService.refresh({
      refreshToken: dto.refreshToken,
      claims: this.getRefreshClaims(req),
    });
    return this.createSuccessEnvelope(req, data);
  }

  @Post('logout')
  @UseGuards(JwtRefreshGuardType)
  @Throttle({
    short: { limit: 2, ttl: 1000 },
    medium: { limit: 20, ttl: 60000 },
  })
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: RefreshClaimsRequest,
  ): Promise<ApiEnvelope<Awaited<ReturnType<AuthService['logout']>>>> {
    const data = await this.authService.logout({
      refreshToken: dto.refreshToken,
      claims: this.getRefreshClaims(req),
    });
    return this.createSuccessEnvelope(req, data);
  }

  private createSuccessEnvelope<T>(req: Request, data: T): ApiEnvelope<T> {
    const requestIdHeader = req.headers['x-request-id'];
    const requestId =
      typeof requestIdHeader === 'string' && requestIdHeader.length > 0
        ? requestIdHeader
        : randomUUID();

    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    };
  }

  private getRefreshClaims(req: RefreshClaimsRequest): RefreshTokenClaims {
    const claims = req.user;

    if (
      !claims ||
      typeof claims.sub !== 'string' ||
      typeof claims.jti !== 'string' ||
      typeof claims.family !== 'string'
    ) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    return claims;
  }
}
