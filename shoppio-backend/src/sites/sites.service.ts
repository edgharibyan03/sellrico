import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CredentialStatus, Prisma, SiteStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PlanResolverService } from '../ai/plans/plan-resolver.service';
import { EntitlementService } from '../billing/entitlement.service';
import { AppConfigService } from '../config/app-config.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { ConnectCodeResponseDto, DashboardSiteDto, SyncProgressDto } from './dto/site-response.dto';

type SiteWithCounts = Prisma.SiteGetPayload<{
  include: {
    _count: { select: { products: true; credentials: true } };
    credentials: { select: { id: true } };
    connectCodes: { select: { id: true } };
  };
}>;

@Injectable()
export class SitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfig: AppConfigService,
    private readonly planResolver: PlanResolverService,
    private readonly entitlements: EntitlementService,
  ) {}

  async getAuthenticatedSite(site: AuthenticatedSite) {
    return this.prisma.site.findFirstOrThrow({
      where: { id: site.id },
      select: {
        id: true,
        domain: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async listForUser(user: AuthenticatedUser): Promise<DashboardSiteDto[]> {
    const [sites, snapshot] = await Promise.all([
      this.prisma.site.findMany({
        where: { ownerUserId: user.id },
        include: this.dashboardInclude(),
        orderBy: { createdAt: 'desc' },
      }),
      this.entitlements.resolveForUser(user.id),
    ]);
    return sites.map((site) => this.toDashboardDto(site, snapshot.plan.slug));
  }

  async getForUser(user: AuthenticatedUser, siteId: string): Promise<DashboardSiteDto> {
    const [site, snapshot] = await Promise.all([
      this.findOwnedSite(user.id, siteId),
      this.entitlements.resolveForUser(user.id),
    ]);
    return this.toDashboardDto(site, snapshot.plan.slug);
  }

  async createForUser(user: AuthenticatedUser, dto: CreateSiteDto): Promise<DashboardSiteDto> {
    const domain = this.normalizeDomain(dto.domain);
    const name = dto.name?.trim() || domain;
    const snapshot = await this.entitlements.assertCanCreateSite(user.id);

    const site = await this.prisma.site.create({
      data: {
        ownerUserId: user.id,
        domain,
        name,
        status: SiteStatus.PENDING,
        planId: snapshot.plan.slug,
      },
      include: this.dashboardInclude(),
    });

    return this.toDashboardDto(site, snapshot.plan.slug);
  }

  async disconnectForUser(user: AuthenticatedUser, siteId: string): Promise<void> {
    await this.findOwnedSite(user.id, siteId);

    await this.prisma.$transaction([
      this.prisma.siteCredential.updateMany({
        where: { siteId, status: CredentialStatus.ACTIVE },
        data: { status: CredentialStatus.REVOKED, revokedAt: new Date() },
      }),
      this.prisma.siteConnectCode.updateMany({
        where: { siteId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.site.update({
        where: { id: siteId },
        data: { status: SiteStatus.DISCONNECTED },
      }),
    ]);
  }

  async createConnectCode(
    user: AuthenticatedUser,
    siteId: string,
  ): Promise<ConnectCodeResponseDto> {
    const site = await this.findOwnedSite(user.id, siteId);

    if (site.status === SiteStatus.DISCONNECTED) {
      throw new BadRequestException({
        code: 'SITE_DISCONNECTED',
        message: 'Reconnect is not available for a disconnected site yet',
      });
    }

    // Invalidate unused codes for this site
    await this.prisma.siteConnectCode.updateMany({
      where: { siteId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = this.generateConnectCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.siteConnectCode.create({
      data: {
        siteId,
        code,
        expiresAt,
      },
    });

    const apiOrigin = this.appConfig.appUrl.replace(/\/$/, '');

    return {
      code,
      expiresAt: expiresAt.toISOString(),
      instructions: [
        'Install the Shoppio plugin in WordPress.',
        'Open Settings → Shoppio in wp-admin.',
        `Set API base URL to ${apiOrigin} (no /api/v1 path).`,
        `Paste connect code ${code} and click Connect.`,
        'Return here and confirm the connection.',
      ],
    };
  }

  async getConnectionStatus(user: AuthenticatedUser, siteId: string): Promise<DashboardSiteDto> {
    const [site, snapshot] = await Promise.all([
      this.findOwnedSite(user.id, siteId),
      this.entitlements.resolveForUser(user.id),
    ]);
    const dto = this.toDashboardDto(site, snapshot.plan.slug);

    if (dto.connectionStatus !== 'connected') {
      throw new ConflictException({
        code: 'NOT_CONNECTED',
        message:
          'Store is not connected yet. Install the Shoppio plugin and use the connect code, then try again.',
      });
    }

    return dto;
  }

  async getSyncProgress(user: AuthenticatedUser, siteId: string): Promise<SyncProgressDto> {
    const site = await this.findOwnedSite(user.id, siteId);
    const count = site._count.products;

    if (site.status !== SiteStatus.ACTIVE) {
      return {
        status: 'idle',
        productsSynced: 0,
        productsTotal: 0,
        message: 'Connect the store before syncing products.',
      };
    }

    if (!site.lastSyncedAt && count === 0) {
      return {
        status: 'syncing',
        productsSynced: 0,
        productsTotal: 0,
        message: 'Waiting for the WordPress plugin to sync products…',
      };
    }

    return {
      status: 'completed',
      productsSynced: count,
      productsTotal: count,
      message:
        count > 0
          ? `Synced ${count} product${count === 1 ? '' : 's'}.`
          : 'Sync completed — no products found in WooCommerce.',
    };
  }

  private async findOwnedSite(userId: string, siteId: string): Promise<SiteWithCounts> {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, ownerUserId: userId },
      include: this.dashboardInclude(),
    });

    if (!site) {
      throw new NotFoundException({
        code: 'SITE_NOT_FOUND',
        message: 'Site not found',
      });
    }

    return site;
  }

  private dashboardInclude() {
    return {
      _count: { select: { products: true, credentials: true } },
      credentials: {
        where: { status: CredentialStatus.ACTIVE },
        select: { id: true },
        take: 1,
      },
      connectCodes: {
        where: { usedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true },
        take: 1,
      },
    } satisfies Prisma.SiteInclude;
  }

  private toDashboardDto(site: SiteWithCounts, planSlug?: string): DashboardSiteDto {
    return {
      id: site.id,
      domain: site.domain,
      name: site.name,
      status: site.status,
      productCount: site._count.products,
      lastSyncedAt: site.lastSyncedAt ? site.lastSyncedAt.toISOString() : null,
      connectionStatus: this.resolveConnectionStatus(site),
      planId: this.planResolver.normalize(planSlug ?? site.planId),
      createdAt: site.createdAt.toISOString(),
    };
  }

  private resolveConnectionStatus(site: SiteWithCounts): DashboardSiteDto['connectionStatus'] {
    if (site.status === SiteStatus.ACTIVE && site.credentials.length > 0) {
      return 'connected';
    }
    if (site.connectCodes.length > 0) {
      return 'connecting';
    }
    if (site.status === SiteStatus.SUSPENDED) {
      return 'error';
    }
    return 'idle';
  }

  private generateConnectCode(): string {
    const part = () => randomBytes(2).toString('hex').toUpperCase();
    return `SP-${part()}-${part()}`;
  }

  normalizeDomain(input: string): string {
    const trimmed = input.trim().toLowerCase();
    try {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return new URL(trimmed).hostname;
      }
    } catch {
      // fall through
    }
    return trimmed.replace(/\/$/, '').replace(/^www\./, '');
  }

  assertOwner(userId: string, ownerUserId: string | null): void {
    if (ownerUserId !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not own this site',
      });
    }
  }
}
