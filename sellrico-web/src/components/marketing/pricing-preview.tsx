"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { getPlans } from "@/lib/api/billing"
import { formatPlanPrice } from "@/lib/config/pricing"
import type { BillingPlan } from "@/lib/types"

export function PricingPreviewSection() {
  const t = useTranslations("marketing.pricingPreview")
  const tc = useTranslations("common")
  const [plans, setPlans] = useState<BillingPlan[]>([])

  useEffect(() => {
    let active = true
    void getPlans()
      .then((next) => {
        if (active) setPlans(next)
      })
      .catch(() => {
        if (active) setPlans([])
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("title")}
            </h2>
            <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Link href="/pricing" className={buttonVariants({ variant: "outline" })}>
            {tc("comparePlans")}
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{plan.name}</h3>
                {plan.highlighted ? <Badge>{tc("popular")}</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              <p className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight">
                {formatPlanPrice(plan, "monthly")}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {tc("perMonth")}
                </span>
              </p>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {plan.features.slice(0, 4).map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
