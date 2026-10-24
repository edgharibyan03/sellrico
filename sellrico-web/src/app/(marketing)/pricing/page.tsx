"use client";

import { useEffect, useState } from "react";
import { Check, Minus } from "lucide-react";
import { AuthCtaLink } from "@/components/auth/auth-cta-link";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ErrorState, LoadingBlock } from "@/components/shared/page-states";
import { getPlans } from "@/lib/api/billing";
import { getUserFacingError } from "@/lib/api/client";
import { buildComparison, formatPlanPrice } from "@/lib/config/pricing";
import type { BillingInterval, BillingPlan } from "@/lib/types";

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="size-4 text-primary" aria-label="Included" />
    ) : (
      <Minus
        className="size-4 text-muted-foreground"
        aria-label="Not included"
      />
    );
  }
  return <span>{value}</span>;
}

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getPlans()
      .then((next) => {
        if (active) setPlans(next);
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

  const comparison = buildComparison(plans);
  const annualUnavailable = plans.every((plan) => plan.annualPrice == null);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Pricing
        </h1>
        <p className="mt-3 text-muted-foreground">
          Choose a plan that fits your WooCommerce store. Prices and limits come
          from your Shoppio account.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <ToggleGroup
          value={[interval]}
          onValueChange={(values) => {
            const next = values[0] as BillingInterval | undefined;
            if (next) setInterval(next);
          }}
          variant="outline"
          spacing={0}
          className="rounded-lg border border-border p-1"
        >
          <ToggleGroupItem value="monthly" aria-label="Monthly billing">
            Monthly
          </ToggleGroupItem>
          <ToggleGroupItem value="annual" aria-label="Annual billing">
            Annual
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {interval === "annual" && annualUnavailable ? (
        <Alert className="mx-auto mt-6 max-w-2xl">
          <AlertTitle>Annual billing is not available yet</AlertTitle>
          <AlertDescription>
            Monthly prices below are the current plans. Annual billing will use
            the same plan catalog once it is enabled.
          </AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="mt-10">
          <LoadingBlock rows={3} />
        </div>
      ) : null}
      {error ? (
        <div className="mt-10">
          <ErrorState description={error} />
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                {plan.highlighted ? <Badge>Popular</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {plan.description}
              </p>
              <p className="font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight">
                {formatPlanPrice(plan, interval)}
                {interval === "monthly" ? (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    / month
                  </span>
                ) : null}
              </p>
              <ul className="flex flex-1 flex-col gap-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Sites: {plan.limits.sites?.toLocaleString() ?? "—"} · Products:{" "}
                {plan.limits.products?.toLocaleString() ?? "—"} · AI:{" "}
                {plan.limits.aiMessages?.toLocaleString() ?? "—"} / month
              </div>
              <AuthCtaLink
                guestHref="/signup"
                guestLabel={
                  plan.id === "free" ? "Start free" : `Choose ${plan.name}`
                }
                variant={plan.highlighted ? "default" : "outline"}
              />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !error && comparison.length > 0 ? (
        <div className="mt-16">
          <h2 className="mb-4 font-[family-name:var(--font-heading)] text-xl font-semibold">
            Feature comparison
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  {plans.map((plan) => (
                    <TableHead key={plan.id}>{plan.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>
                      <CellValue value={row.free} />
                    </TableCell>
                    <TableCell>
                      <CellValue value={row.pro} />
                    </TableCell>
                    <TableCell>
                      <CellValue value={row.business} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
