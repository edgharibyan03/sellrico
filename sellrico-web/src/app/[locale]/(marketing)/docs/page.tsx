import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { AuthCtaLink } from "@/components/auth/auth-cta-link"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { brand } from "@/lib/config/brand"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.docs")
  return {
    title: t("title"),
    description: t("intro", { product: brand.product }),
  }
}

export default async function DocsPage() {
  const t = await getTranslations("marketing.docs")
  const tc = await getTranslations("common")

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight">
        {t("title")}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {t("intro", { product: brand.product })}
      </p>

      <div className="mt-10 flex flex-col gap-6">
        <section className="rounded-xl border border-border p-6">
          <h2 className="font-semibold">
            {t("step1Title", { name: brand.name })}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("step1Body", { name: brand.name, product: brand.product })}
          </p>
        </section>
        <section className="rounded-xl border border-border p-6">
          <h2 className="font-semibold">
            {t("step2Title", { product: brand.product })}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("step2Body", { product: brand.product })}
          </p>
        </section>
        <section className="rounded-xl border border-border p-6">
          <h2 className="font-semibold">{t("step3Title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("step3Body", { product: brand.product })}
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <AuthCtaLink />
        <Link href="/pricing" className={buttonVariants({ variant: "outline" })}>
          {tc("viewPricing")}
        </Link>
      </div>
    </div>
  )
}
