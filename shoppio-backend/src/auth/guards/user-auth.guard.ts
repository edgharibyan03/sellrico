import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UserAuthService } from '../user-auth.service';
import { UserJwtPayload } from '../interfaces/user-jwt-payload.interface';

@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly userAuthService: UserAuthService,
    private readonly appConfig: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Missing bearer token',
      });
    }

    let payload: UserJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<UserJwtPayload>(token, {
        secret: this.appConfig.jwtSecret,
      });
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      });
    }

    if (payload.typ !== 'user') {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'User token required',
      });
    }

    request.user = await this.userAuthService.resolveUserFromJwtPayload(payload);
    return true;
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) {
      return null;
    }
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }
    return token;
  }
}
