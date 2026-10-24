"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export function UpgradePrompt({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const t = useTranslations("dashboard.billing");
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/pricing" className={buttonVariants({ size: "sm" })}>
          {t("viewPlans")}
        </Link>
      </CardContent>
    </Card>
  );
}

export function LockedFeature({
  title,
  description,
  availableOn,
}: {
  title: string;
  description: string;
  availableOn: string;
}) {
  const t = useTranslations("dashboard.billing");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-3">
        <p className="text-sm font-medium">
          {t("availableOn", { plan: availableOn })}
        </p>
        <Link
          href="/pricing"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("upgrade")}
        </Link>
      </CardContent>
    </Card>
  );
}

export function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null | undefined;
}) {
  const t = useTranslations("dashboard.billing");
  const capped =
    limit != null && limit > 0
      ? Math.min(100, Math.round((used / limit) * 100))
      : null;
  const reached = limit != null && used >= limit;
  const close = capped != null && capped >= 80 && !reached;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">
          {used.toLocaleString()}
          <span className="font-normal text-muted-foreground">
            {" "}
            / {limit != null ? limit.toLocaleString() : "∞"}
          </span>
        </p>
      </div>
      {capped != null ? (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={
              reached
                ? "h-full rounded-full bg-destructive"
                : close
                  ? "h-full rounded-full bg-amber-500"
                  : "h-full rounded-full bg-primary"
            }
            style={{ width: `${capped}%` }}
          />
        </div>
      ) : null}
      {reached ? (
        <p className="text-xs text-destructive">{t("limitReached")}</p>
      ) : close ? (
        <p className="text-xs text-amber-700">{t("almostAtLimit")}</p>
      ) : null}
    </div>
  );
}
