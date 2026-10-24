"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Bot, CreditCard, MessageSquare, Package, Store } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/shared/page-states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { UpgradePrompt, UsageMeter } from "@/components/billing/plan-states";
import { getActivity, getOverview } from "@/lib/api/dashboard";
import { getUserFacingError } from "@/lib/api/client";
import { formatMoney } from "@/lib/config/pricing";
import type { ActivityItem, OverviewStats } from "@/lib/types";

export default function OverviewPage() {
  const t = useTranslations("dashboard.overview");
  const tb = useTranslations("dashboard.billing");
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [overview, acts] = await Promise.all([
        getOverview(),
        getActivity(),
      ]);
      setStats(overview);
      setActivity(acts);
    } catch (err) {
      setError(getUserFacingError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} description={t("description")} />
        <LoadingBlock rows={5} />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} />
        <ErrorState
          description={error ?? undefined}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  const planName = stats.planName ?? stats.planId;
  const sitesUsed = stats.sitesUsed ?? stats.connectedSites;
  const aiReached =
    stats.aiMessagesLimit != null &&
    stats.aiMessagesUsed >= stats.aiMessagesLimit;
  const sitesOver = stats.overLimit?.sites;
  const productsOver = stats.overLimit?.products;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

      {stats.paymentPending ? (
        <Alert>
          <AlertTitle>Payment pending</AlertTitle>
          <AlertDescription>
            Your last payment is still pending. Paid features stay available
            until the current period ends.
          </AlertDescription>
        </Alert>
      ) : null}

      {stats.subscriptionStatus === "canceled" ||
      stats.subscriptionStatus === "expired" ? (
        <Alert>
          <AlertTitle>Subscription {stats.subscriptionStatus}</AlertTitle>
          <AlertDescription>
            {stats.accessRestricted
              ? "Paid features have ended. You are on the Free plan limits. Existing sites, products, and conversations are still here."
              : "This subscription is set to end. Paid features remain until the current period finishes."}
          </AlertDescription>
        </Alert>
      ) : null}

      {sitesOver ? (
        <UpgradePrompt
          title="Plan limit exceeded"
          description={`Current: ${sitesUsed.toLocaleString()} sites. ${planName} limit: ${(stats.sitesLimit ?? 0).toLocaleString()} sites. Please remove sites or upgrade your plan.`}
        />
      ) : null}

      {productsOver ? (
        <UpgradePrompt
          title="Plan limit exceeded"
          description={`Current: ${stats.productsSynced.toLocaleString()} products. ${planName} limit: ${(stats.productsLimit ?? 0).toLocaleString()} products. Existing products stay indexed. New products will not sync until you are within the limit or upgrade.`}
        />
      ) : null}

      {aiReached ? (
        <UpgradePrompt
          title="You've reached your AI message limit."
          description={`Your ${planName} plan includes ${(stats.aiMessagesLimit ?? 0).toLocaleString()} AI messages per month. Upgrade your plan to continue using the AI assistant.`}
        />
      ) : null}

      {!stats.onboardingCompleted ? (
        <Alert>
          <AlertTitle>Finish setup</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Connect your WooCommerce store to unlock the assistant.</span>
            <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
              Continue onboarding
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("plan")}</CardDescription>
            <CardTitle className="text-2xl capitalize">{planName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              {formatMoney(stats.priceMonthly ?? null, stats.currency)} / month
            </p>
            <Link
              href="/dashboard/billing"
              className="text-sm text-primary hover:underline"
            >
              {tb("manageBilling")}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sites</CardDescription>
            <CardTitle className="text-2xl">
              {sitesUsed.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UsageMeter
              label="Plan limit"
              used={sitesUsed}
              limit={stats.sitesLimit}
            />
            <Link
              href="/dashboard/sites"
              className="mt-3 inline-block text-sm text-primary hover:underline"
            >
              {t("viewSites")}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Products</CardDescription>
            <CardTitle className="text-2xl">
              {stats.productsSynced.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UsageMeter
              label="Synced into Shoppio"
              used={stats.productsSynced}
              limit={stats.productsLimit}
            />
            <Link
              href="/dashboard/products"
              className="mt-3 inline-block text-sm text-primary hover:underline"
            >
              {t("viewProducts")}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>AI messages this month</CardDescription>
            <CardTitle className="text-2xl">
              {stats.aiMessagesUsed.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <UsageMeter
              label="Billing period"
              used={stats.aiMessagesUsed}
              limit={stats.aiMessagesLimit}
            />
            <Link
              href="/dashboard/usage"
              className="text-sm text-primary hover:underline"
            >
              View usage
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Chat messages today</CardDescription>
            <CardTitle className="text-2xl">
              {(stats.chatMessagesToday ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Visitor messages answered by the assistant today.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("conversations")}</CardDescription>
            <CardTitle className="text-2xl">
              {(stats.conversationsOpen ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Shopper chat threads across your stores.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("recentActivity")}</CardTitle>
            <CardDescription>
              Connections, syncs, and visitor chats — so you see what changed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState
                title={t("emptyActivityTitle")}
                description={t("emptyActivityDescription")}
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {activity.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 rounded-lg border border-border px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      <Badge variant="secondary">
                        {item.type.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Common next steps.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              href="/dashboard/sites"
              className={buttonVariants({
                variant: "outline",
                className: "justify-start",
              })}
            >
              <Store data-icon="inline-start" />
              Connect store
            </Link>
            <Link
              href="/dashboard/assistant"
              className={buttonVariants({
                variant: "outline",
                className: "justify-start",
              })}
            >
              <Bot data-icon="inline-start" />
              Configure assistant
            </Link>
            <Link
              href="/dashboard/products"
              className={buttonVariants({
                variant: "outline",
                className: "justify-start",
              })}
            >
              <Package data-icon="inline-start" />
              {t("viewProducts")}
            </Link>
            <Link
              href="/dashboard/usage"
              className={buttonVariants({
                variant: "outline",
                className: "justify-start",
              })}
            >
              <MessageSquare data-icon="inline-start" />
              Check AI usage
            </Link>
            <Link
              href="/dashboard/billing"
              className={buttonVariants({
                variant: "outline",
                className: "justify-start",
              })}
            >
              <CreditCard data-icon="inline-start" />
              Manage subscription
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
