"use client"

import {
  GitCompareArrows,
  MessageSquareText,
  PackageSearch,
  ShoppingBag,
  Sparkles,
  Store,
} from "lucide-react"
import { useTranslations } from "next-intl"

const icons = [
  PackageSearch,
  MessageSquareText,
  Sparkles,
  Store,
  ShoppingBag,
  GitCompareArrows,
]

export function FeaturesSection() {
  const t = useTranslations("marketing.features")
  const items = t.raw("items") as Array<{ title: string; description: string }>

  return (
    <section className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6">
        <div className="max-w-xl">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((feature, index) => {
            const Icon = icons[index] ?? PackageSearch
            return (
              <div key={feature.title} className="flex flex-col gap-3 rounded-lg border border-border p-5">
                <Icon className="size-5 text-primary" aria-hidden />
                <h3 className="font-medium">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
