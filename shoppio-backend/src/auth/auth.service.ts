import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CredentialStatus, SiteStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { ConnectSiteDto } from './dto/connect-site.dto';
import {
  ConnectResponseDto,
  RevokeResponseDto,
  RotateResponseDto,
  TokenResponseDto,
} from './dto/auth-response.dto';
import { TokenRequestDto } from './dto/token-request.dto';
import { SiteJwtPayload } from './interfaces/site-jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly appConfig: AppConfigService,
  ) {}

  async connect(dto: ConnectSiteDto): Promise<ConnectResponseDto> {
    const domain = this.normalizeDomain(dto.domain);
    const { keyId, secret, secretHash } = await this.generateCredentialPair();

    if (dto.connectCode?.trim()) {
      return this.connectWithCode(dto, domain, keyId, secret, secretHash);
    }

    // Legacy open connect (unowned site) — prefer connect codes from the dashboard.
    const site = await this.prisma.site.create({
      data: {
        domain,
        name: dto.name.trim(),
        status: SiteStatus.ACTIVE,
        credentials: {
          create: {
            keyId,
            secretHash,
            label: 'default',
            status: CredentialStatus.ACTIVE,
          },
        },
      },
    });

    return {
      siteId: site.id,
      domain: site.domain,
      name: site.name,
      keyId,
      secret,
    };
  }

  private async connectWithCode(
    dto: ConnectSiteDto,
    domain: string,
    keyId: string,
    secret: string,
    secretHash: string,
  ): Promise<ConnectResponseDto> {
    const code = dto.connectCode!.trim().toUpperCase();

    const connectCode = await this.prisma.siteConnectCode.findUnique({
      where: { code },
      include: { site: true },
    });

    if (!connectCode || connectCode.usedAt || connectCode.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException({
        code: 'INVALID_CONNECT_CODE',
        message: 'Invalid or expired connect code',
      });
    }

    const site = connectCode.site;

    if (site.status === SiteStatus.DISCONNECTED || site.status === SiteStatus.SUSPENDED) {
      throw new BadRequestException({
        code: 'SITE_INACTIVE',
        message: 'This site cannot be connected',
      });
    }

    const siteDomain = this.normalizeDomain(site.domain);
    if (siteDomain !== domain && siteDomain !== domain.replace(/^www\./, '')) {
      throw new BadRequestException({
        code: 'DOMAIN_MISMATCH',
        message: `Connect code belongs to ${site.domain}, but this WordPress site is ${domain}`,
      });
    }

    await this.prisma.$transaction([
      this.prisma.siteCredential.updateMany({
        where: { siteId: site.id, status: CredentialStatus.ACTIVE },
        data: { status: CredentialStatus.REVOKED, revokedAt: new Date() },
      }),
      this.prisma.siteCredential.create({
        data: {
          siteId: site.id,
          keyId,
          secretHash,
          label: 'plugin',
          status: CredentialStatus.ACTIVE,
        },
      }),
      this.prisma.site.update({
        where: { id: site.id },
        data: {
          status: SiteStatus.ACTIVE,
          name: dto.name.trim() || site.name,
        },
      }),
      this.prisma.siteConnectCode.update({
        where: { id: connectCode.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return {
      siteId: site.id,
      domain: site.domain,
      name: dto.name.trim() || site.name,
      keyId,
      secret,
    };
  }

  async issueToken(dto: TokenRequestDto): Promise<TokenResponseDto> {
    const credential = await this.prisma.siteCredential.findUnique({
      where: { keyId: dto.keyId },
      include: { site: true },
    });

    if (!credential || credential.status !== CredentialStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid site credentials',
      });
    }

    if (credential.site.status !== SiteStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'SITE_INACTIVE',
        message: 'Site is not active',
      });
    }

    const valid = await argon2.verify(credential.secretHash, dto.secret);
    if (!valid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid site credentials',
      });
    }

    await this.prisma.siteCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    });

    const payload: SiteJwtPayload = {
      sub: credential.siteId,
      keyId: credential.keyId,
      typ: 'site',
      credentialId: credential.id,
    };

    const expiresIn = this.appConfig.jwtExpiresIn;
    const accessToken = await this.jwt.signAsync(payload as object, {
      secret: this.appConfig.jwtSecret,
      expiresIn: expiresIn as `${number}h` | `${number}m` | `${number}s` | number,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiresInSeconds(expiresIn),
      siteId: credential.siteId,
    };
  }

  async revoke(site: AuthenticatedSite): Promise<RevokeResponseDto> {
    await this.prisma.siteCredential.update({
      where: { id: site.credentialId },
      data: {
        status: CredentialStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    return {
      revoked: true,
      keyId: site.keyId,
    };
  }

  async rotate(site: AuthenticatedSite): Promise<RotateResponseDto> {
    const { keyId, secret, secretHash } = await this.generateCredentialPair();

    await this.prisma.$transaction([
      this.prisma.siteCredential.update({
        where: { id: site.credentialId },
        data: {
          status: CredentialStatus.REVOKED,
          revokedAt: new Date(),
        },
      }),
      this.prisma.siteCredential.create({
        data: {
          siteId: site.id,
          keyId,
          secretHash,
          label: 'rotated',
          status: CredentialStatus.ACTIVE,
        },
      }),
    ]);

    return {
      keyId,
      secret,
      previousKeyId: site.keyId,
    };
  }

  async resolveSiteFromJwtPayload(payload: SiteJwtPayload): Promise<AuthenticatedSite> {
    if (payload.typ !== 'site' || !payload.sub || !payload.keyId || !payload.credentialId) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Invalid site token',
      });
    }

    const credential = await this.prisma.siteCredential.findFirst({
      where: {
        id: payload.credentialId,
        keyId: payload.keyId,
        siteId: payload.sub,
        status: CredentialStatus.ACTIVE,
      },
      include: { site: true },
    });

    if (!credential || credential.site.status !== SiteStatus.ACTIVE) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Site credential is no longer valid',
      });
    }

    return {
      id: credential.site.id,
      domain: credential.site.domain,
      name: credential.site.name,
      status: credential.site.status,
      credentialId: credential.id,
      keyId: credential.keyId,
    };
  }

  private async generateCredentialPair(): Promise<{
    keyId: string;
    secret: string;
    secretHash: string;
  }> {
    const keyId = `spk_${randomBytes(12).toString('hex')}`;
    const secret = `sss_${randomBytes(32).toString('hex')}`;
    const secretHash = await argon2.hash(secret);

    return { keyId, secret, secretHash };
  }

  private normalizeDomain(input: string): string {
    const trimmed = input.trim().toLowerCase();
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return new URL(trimmed).hostname;
      }
    } catch {
      // fall through
    }
    return trimmed.replace(/\/$/, '');
  }

  private parseExpiresInSeconds(expiresIn: string): number {
    const match = /^(\d+)([smhd])?$/.exec(expiresIn);
    if (!match) {
      return 3600;
    }
    const value = Number(match[1]);
    const unit = match[2] ?? 's';
    switch (unit) {
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return value;
    }
  }
}
