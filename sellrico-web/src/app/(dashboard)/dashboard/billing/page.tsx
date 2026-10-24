"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/shared/page-states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  createCheckout,
  createPortalSession,
  getPlans,
  getSubscription,
} from "@/lib/api/billing";
import { UpgradePrompt, UsageMeter } from "@/components/billing/plan-states";
import { getUsageSummary } from "@/lib/api/usage";
import { getUserFacingError } from "@/lib/api/client";
import { formatMoney, formatPlanPrice } from "@/lib/config/pricing";
import type {
  BillingPlan,
  PlanId,
  Subscription,
  UsageSummary,
} from "@/lib/types";

export default function BillingPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [p, s, u] = await Promise.all([
        getPlans(),
        getSubscription(),
        getUsageSummary(),
      ]);
      setPlans(p);
      setSubscription(s);
      setUsage(u);
    } catch (err) {
      setError(getUserFacingError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCheckout(planId: PlanId) {
    setBusy(planId);
    try {
      const result = await createCheckout(planId);
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      toast.success(
        planId === "free" ? "Moved to the Free plan" : "Plan updated",
      );
      await load();
    } catch (err) {
      toast.error(getUserFacingError(err));
    } finally {
      setBusy(null);
    }
  }

  async function onPortal() {
    setBusy("portal");
    try {
      const { url } = await createPortalSession();
      window.location.assign(url);
    } catch (err) {
      toast.error(getUserFacingError(err));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Billing"
          description="Manage your plan and subscription."
        />
        <LoadingBlock />
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Billing" />
        <ErrorState
          description={error ?? undefined}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  const current = plans.find((p) => p.id === subscription.planId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description="Provider-agnostic billing — checkout and portal are opened by the backend."
      />

      {subscription.paymentPending ? (
        <Alert>
          <AlertDescription>
            Payment pending. Paid access continues until the current period
            ends.
          </AlertDescription>
        </Alert>
      ) : null}
      {subscription.status === "canceled" ||
      subscription.status === "expired" ? (
        <Alert>
          <AlertDescription>
            {subscription.accessRestricted
              ? "This subscription no longer includes paid features. You are on Free limits. Your stores, products, and conversations were not deleted."
              : "This subscription will end at the close of the current period."}
          </AlertDescription>
        </Alert>
      ) : null}
      {subscription.overLimit?.sites || subscription.overLimit?.products ? (
        <UpgradePrompt
          title="Plan limit exceeded"
          description="Your saved stores or products are above the current plan. Nothing was deleted. Remove usage or upgrade before adding more."
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Current subscription</CardTitle>
          <CardDescription>
            Your active Sellrico plan for Shoppio.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Plan</p>
            <p className="font-medium">
              {current?.name ?? subscription.planId}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Interval</p>
            <p className="font-medium capitalize">{subscription.interval}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="font-medium">
              {formatMoney(subscription.price, subscription.currency)} / month
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge className="mt-1 capitalize">{subscription.status}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Renewal</p>
            <p className="font-medium">
              {subscription.renewsAt
                ? new Date(subscription.renewsAt).toLocaleDateString()
                : "—"}
            </p>
          </div>
          {usage ? (
            <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-4">
              <UsageMeter
                label="Sites"
                used={
                  usage.metrics.find((metric) => metric.key === "sites")
                    ?.used ?? 0
                }
                limit={
                  usage.metrics.find((metric) => metric.key === "sites")?.limit
                }
              />
              <UsageMeter
                label="AI messages"
                used={
                  usage.metrics.find((metric) => metric.key === "ai_messages")
                    ?.used ?? 0
                }
                limit={
                  usage.metrics.find((metric) => metric.key === "ai_messages")
                    ?.limit
                }
              />
              <UsageMeter
                label="Products"
                used={
                  usage.metrics.find((metric) => metric.key === "products")
                    ?.used ?? 0
                }
                limit={
                  usage.metrics.find((metric) => metric.key === "products")
                    ?.limit
                }
              />
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Button
              onClick={() => void onPortal()}
              disabled={busy === "portal"}
            >
              {busy === "portal" ? <Spinner data-icon="inline-start" /> : null}
              Manage subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 font-[family-name:var(--font-heading)] text-lg font-semibold">
          Available plans
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === subscription.planId;
            return (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {isCurrent ? <Badge>Current</Badge> : null}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-3xl font-semibold tracking-tight">
                    {formatPlanPrice(plan, "monthly")}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      / month
                    </span>
                  </p>
                  {plan.annualPrice == null ? (
                    <p className="text-xs text-muted-foreground">
                      Annual billing is not available yet.
                    </p>
                  ) : null}
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || busy === plan.id}
                    onClick={() => void onCheckout(plan.id)}
                  >
                    {busy === plan.id ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    {isCurrent
                      ? "Current plan"
                      : plan.id === "free"
                        ? "Downgrade"
                        : "Upgrade"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
