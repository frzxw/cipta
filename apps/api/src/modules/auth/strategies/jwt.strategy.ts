import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtWorkspaceClaim } from '../workspace-scope.util';

interface JwtAccessPayload {
  sub: string;
  email: string;
  workspaces: JwtWorkspaceClaim[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JwtStrategy.getAccessSecret(),
    });
  }

  validate(payload: JwtAccessPayload): {
    id: string;
    email: string;
    workspaces: JwtWorkspaceClaim[];
  } {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid access token payload');
    }

    return {
      id: payload.sub,
      email: payload.email,
      workspaces: payload.workspaces ?? [],
    };
  }

  private static getAccessSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret || secret.length < 64) {
      throw new InternalServerErrorException(
        'JWT_ACCESS_SECRET is required and must be at least 64 characters',
      );
    }

    return secret;
  }
}
