import { AuthCtaLink } from "@/components/auth/auth-cta-link"
import { brand } from "@/lib/config/brand"

export function FinalCtaSection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 rounded-2xl border border-border bg-brand-mist px-6 py-12 sm:px-10">
        <h2 className="max-w-xl font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
          Ready to add {brand.product} to your WooCommerce store?
        </h2>
        <p className="max-w-lg text-muted-foreground">
          Create your {brand.name} account, connect your store, and go live in
          minutes.
        </p>
        <AuthCtaLink size="lg" />
      </div>
    </section>
  )
}
