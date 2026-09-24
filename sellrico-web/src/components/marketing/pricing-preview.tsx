import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPlanPrice, pricingConfig } from "@/lib/config/pricing"

export function PricingPreviewSection() {
  return (
    <section className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
              Simple plans for every store
            </h2>
            <p className="mt-3 text-muted-foreground">
              {pricingConfig.placeholderNote}
            </p>
          </div>
          <Link href="/pricing" className={buttonVariants({ variant: "outline" })}>
            Compare plans
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {pricingConfig.plans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{plan.name}</h3>
                {plan.highlighted ? <Badge>Popular</Badge> : null}
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              <p className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight">
                {formatPlanPrice(plan, "monthly")}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / month
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
