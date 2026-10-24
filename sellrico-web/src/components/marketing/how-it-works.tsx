"use client"

import { useTranslations } from "next-intl"
import { brand } from "@/lib/config/brand"

export function HowItWorksSection() {
  const t = useTranslations("marketing.howItWorks")
  const steps = t.raw("steps") as Array<{ title: string; description: string }>
  const fill = (value: string) =>
    value
      .replaceAll("{name}", brand.name)
      .replaceAll("{product}", brand.product)

  return (
    <section id="how-it-works" className="border-b border-border bg-brand-mist/40 py-20 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6">
        <div className="max-w-xl">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {t("subtitle", { name: brand.name, product: brand.product })}
          </p>
        </div>
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, index) => (
            <li key={item.title} className="flex flex-col gap-3">
              <span className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-sm font-semibold text-primary">
                {index + 1}
              </span>
              <h3 className="font-medium">{fill(item.title)}</h3>
              <p className="text-sm text-muted-foreground">{fill(item.description)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
