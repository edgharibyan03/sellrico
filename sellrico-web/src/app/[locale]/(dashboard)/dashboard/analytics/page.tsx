"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/shared/page-states";
import { LockedFeature, UsageMeter } from "@/components/billing/plan-states";
import { getSubscription } from "@/lib/api/billing";
import { getUserFacingError } from "@/lib/api/client";
import type { Subscription } from "@/lib/types";

export default function AnalyticsPage() {
  const t = useTranslations("dashboard.analytics");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getSubscription()
      .then((next) => {
        if (active) setSubscription(next);
      })
      .catch((err: unknown) => {
        if (active) setError(getUserFacingError(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} description={t("description")} />
        <LoadingBlock />
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} />
        <ErrorState description={error ?? undefined} />
      </div>
    );
  }

  const features = subscription.features ?? [];
  const hasAnalytics = features.includes("analytics");
  const hasAdvanced = features.includes("advanced_analytics");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {hasAnalytics ? (
        <div className="grid gap-4 md:grid-cols-3">
          <UsageMeter
            label="Sites"
            used={subscription.usage?.sites ?? 0}
            limit={subscription.limits?.sites}
          />
          <UsageMeter
            label="Products"
            used={subscription.usage?.products ?? 0}
            limit={subscription.limits?.products}
          />
          <UsageMeter
            label="AI messages"
            used={subscription.usage?.aiMessages ?? 0}
            limit={subscription.limits?.aiMessages}
          />
        </div>
      ) : (
        <LockedFeature
          title="Analytics"
          description="Usage trends and store activity are included with Pro."
          availableOn="Pro"
        />
      )}
      {hasAdvanced ? (
        <p className="text-sm text-muted-foreground">
          Advanced analytics is included on your Business plan.
        </p>
      ) : (
        <LockedFeature
          title="Advanced analytics"
          description="Deeper store and assistant reporting."
          availableOn="Business"
        />
      )}
    </div>
  );
}
