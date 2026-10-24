import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Plan } from '@prisma/client';
import { SiteAuthGuard } from '../auth/guards/site-auth.guard';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { CurrentSite } from '../common/decorators/current-site.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedSite } from '../common/types/authenticated-site';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { BillingService } from './billing.service';
import { CheckoutDto } from './dto/checkout.dto';
import { EntitlementService, EntitlementSnapshot } from './entitlement.service';
import { PlanService } from './plan.service';
import { SubscriptionService } from './subscription.service';

export interface PublicPlanDto {
  id: 'free' | 'pro' | 'business';
  slug: 'free' | 'pro' | 'business';
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number | null;
  annualBillingAvailable: boolean;
  currency: string;
  highlighted: boolean;
  features: string[];
  featureKeys: string[];
  limits: {
    sites: number;
    products: number;
    aiMessages: number;
  };
  historyRetentionDays: number | null;
}

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(
    private readonly plans: PlanService,
    private readonly entitlements: EntitlementService,
    private readonly subscriptions: SubscriptionService,
    private readonly billing: BillingService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'List active subscription plans' })
  async listPlans(): Promise<PublicPlanDto[]> {
    const plans = await this.plans.listActive();
    return plans.map((plan) => this.toPublicPlan(plan));
  }

  @Get('subscription')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiOperation({ summary: 'Current account subscription, limits, usage, and features' })
  async getSubscription(@CurrentUser() user: AuthenticatedUser) {
    const snapshot = await this.entitlements.resolveForUser(user.id);
    return this.toSubscription(snapshot);
  }

  @Post('checkout')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiOperation({
    summary: 'Start a plan change',
    description:
      'Downgrade to Free is applied immediately. Paid checkout waits for a payment provider.',
  })
  async checkout(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckoutDto) {
    const interval = dto.interval ?? 'monthly';
    if (interval === 'annual') {
      throw new BadRequestException({
        code: 'ANNUAL_BILLING_UNAVAILABLE',
        message: 'Annual billing is not available yet.',
      });
    }
    if (dto.planId === 'free') {
      const updated = await this.subscriptions.downgradeToFree(user.id);
      const snapshot = await this.entitlements.resolveForUser(user.id);
      return {
        changed: true,
        url: null,
        subscription: this.toSubscription(snapshot),
        planId: updated.plan.slug,
      };
    }
    return this.billing.createCheckoutSession({
      userId: user.id,
      planSlug: dto.planId,
      interval,
    });
  }

  @Post('portal')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiOperation({ summary: 'Open the payment-provider customer portal' })
  portal(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.createPortalSession(user.id);
  }

  @Post('subscription/downgrade')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('user-jwt')
  @ApiOperation({ summary: 'Move the account to the Free plan without deleting data' })
  async downgrade(@CurrentUser() user: AuthenticatedUser) {
    await this.subscriptions.downgradeToFree(user.id);
    return this.toSubscription(await this.entitlements.resolveForUser(user.id));
  }

  @Get('entitlements')
  @UseGuards(SiteAuthGuard)
  @ApiBearerAuth('site-jwt')
  @ApiOperation({
    summary: 'Plan entitlements for the connected site',
    description: 'Plugin endpoint. The site is resolved from the site JWT.',
  })
  async entitlementsForSite(@CurrentSite() site: AuthenticatedSite) {
    const snapshot = await this.entitlements.resolveForSite(site.id);
    if (!snapshot) {
      const plans = await this.plans.listActive();
      const free = plans.find((plan) => plan.slug === 'free') ?? plans[0];
      return {
        planId: 'free' as const,
        features: Array.isArray(free?.features) ? free.features : [],
        removeBranding: false,
      };
    }
    return {
      planId: snapshot.plan.slug,
      status: snapshot.status,
      features: snapshot.plan.features,
      limits: snapshot.limits,
      usage: snapshot.usage,
      remaining: snapshot.remaining,
      removeBranding: snapshot.plan.features.includes('remove_branding'),
    };
  }

  private toPublicPlan(plan: Plan): PublicPlanDto {
    const slug = plan.slug === 'pro' || plan.slug === 'business' ? plan.slug : 'free';
    return {
      id: slug,
      slug,
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.priceMonthly,
      annualPrice: plan.priceAnnual,
      annualBillingAvailable: plan.priceAnnual != null,
      currency: 'USD',
      highlighted: plan.highlighted,
      features: this.strings(plan.highlights),
      featureKeys: this.strings(plan.features),
      limits: {
        sites: plan.maxSites,
        products: plan.maxProducts,
        aiMessages: plan.maxAiMessages,
      },
      historyRetentionDays: plan.historyRetentionDays,
    };
  }

  private toSubscription(snapshot: EntitlementSnapshot) {
    return {
      planId: snapshot.plan.slug,
      storedPlanId: snapshot.storedPlanSlug,
      interval: snapshot.interval,
      status: snapshot.status,
      price: snapshot.plan.priceMonthly,
      currency: 'USD',
      renewsAt: snapshot.renewsAt,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      provider: snapshot.provider,
      paymentPending: snapshot.paymentPending,
      accessRestricted: snapshot.accessRestricted,
      features: snapshot.plan.features,
      limits: {
        sites: snapshot.limits.maxSites,
        products: snapshot.limits.maxProducts,
        aiMessages: snapshot.limits.maxAiMessages,
        historyRetentionDays: snapshot.limits.historyRetentionDays,
      },
      usage: snapshot.usage,
      remaining: snapshot.remaining,
      overLimit: snapshot.overLimit,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
      annualBillingAvailable: snapshot.plan.priceAnnual != null,
    };
  }

  private strings(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((item): item is string => typeof item === 'string');
  }
}
