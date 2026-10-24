"use client";

import { useEffect, useState } from "react";
import {
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/shared/page-states";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UpgradePrompt } from "@/components/billing/plan-states";
import { Progress } from "@/components/ui/progress";
import { getUsageSummary } from "@/lib/api/usage";
import { getUserFacingError } from "@/lib/api/client";
import type { UsageSummary } from "@/lib/types";

export default function UsagePage() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUsage(await getUsageSummary());
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
        <PageHeader
          title="Usage"
          description="Usage for the current billing period."
        />
        <LoadingBlock />
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Usage" />
        <ErrorState
          description={error ?? undefined}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usage"
        description={`Current period: ${new Date(usage.periodStart).toLocaleDateString()} – ${new Date(usage.periodEnd).toLocaleDateString()}`}
      />
      {usage.metrics.some(
        (metric) => metric.limit != null && metric.used >= metric.limit,
      ) ? (
        <UpgradePrompt
          title="You've reached a plan limit."
          description={
            usage.planName
              ? `Your ${usage.planName} plan limit has been reached for this billing period. Upgrade your plan to continue.`
              : "Upgrade your plan to continue."
          }
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        {usage.metrics.map((metric) => {
          const pct =
            metric.limit && metric.limit > 0
              ? Math.min(100, (metric.used / metric.limit) * 100)
              : 0;
          return (
            <Card key={metric.key}>
              <CardHeader>
                <CardDescription>{metric.label}</CardDescription>
                <CardTitle className="text-2xl">
                  {metric.used.toLocaleString()}
                  <span className="text-base font-normal text-muted-foreground">
                    {" "}
                    / {metric.limit?.toLocaleString() ?? "∞"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {metric.limit ? <Progress value={pct} /> : null}
                <p className="text-xs text-muted-foreground">{metric.unit}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
