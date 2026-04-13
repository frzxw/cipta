import { Body, Controller, Post, Req } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

interface ApiEnvelope<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<ApiEnvelope<Awaited<ReturnType<AuthService['register']>>>> {
    const data = await this.authService.register(dto);
    return this.createSuccessEnvelope(req, data);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<ApiEnvelope<Awaited<ReturnType<AuthService['login']>>>> {
    const data = await this.authService.login(dto);
    return this.createSuccessEnvelope(req, data);
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
  ): Promise<ApiEnvelope<Awaited<ReturnType<AuthService['refresh']>>>> {
    const data = await this.authService.refresh(dto);
    return this.createSuccessEnvelope(req, data);
  }

  @Post('logout')
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: Request,
  ): Promise<ApiEnvelope<Awaited<ReturnType<AuthService['logout']>>>> {
    const data = await this.authService.logout(dto);
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
}