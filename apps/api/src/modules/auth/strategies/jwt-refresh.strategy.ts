import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { RefreshTokenClaims } from '../auth.service';

const refreshTokenExtractor = (req: Request): string | null => {
  const body = req.body as { refreshToken?: string } | undefined;
  const refreshToken = body?.refreshToken;

  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    return null;
  }

  return refreshToken;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: refreshTokenExtractor,
      passReqToCallback: true,
      ignoreExpiration: false,
      secretOrKey: JwtRefreshStrategy.getRefreshSecret(),
    });
  }

  validate(req: Request, payload: RefreshTokenClaims): RefreshTokenClaims {
    const body = req.body as { refreshToken?: string } | undefined;

    if (
      !body?.refreshToken ||
      !payload.sub ||
      !payload.jti ||
      !payload.family
    ) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    return payload;
  }

  private static getRefreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;

    if (!secret || secret.length < 64) {
      throw new InternalServerErrorException(
        'JWT_REFRESH_SECRET is required and must be at least 64 characters',
      );
    }

    return secret;
  }
}
