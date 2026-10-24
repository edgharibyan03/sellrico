import type { Metadata } from "next"
import Link from "next/link"
import { AuthCtaLink } from "@/components/auth/auth-cta-link"
import { buttonVariants } from "@/components/ui/button"
import { brand } from "@/lib/config/brand"

export const metadata: Metadata = {
  title: "Documentation",
  description: `${brand.name} docs — get started with ${brand.product}, the AI shopping assistant for WooCommerce.`,
}

export default function DocsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight">
        Documentation
      </h1>
      <p className="mt-3 text-muted-foreground">
        Full documentation is coming soon. For now, here is the essential path to get{" "}
        {brand.product} running.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        <section className="rounded-xl border border-border p-6">
          <h2 className="font-semibold">1. Create a {brand.name} account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign up for {brand.name} and follow the guided onboarding to connect your first
            store with {brand.product}.
          </p>
        </section>
        <section className="rounded-xl border border-border p-6">
          <h2 className="font-semibold">2. Install the {brand.product} WordPress plugin</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Install {brand.product} on your WooCommerce site, then connect using the
            instructions shown during onboarding. API secrets stay on your WordPress
            server — never in the browser.
          </p>
        </section>
        <section className="rounded-xl border border-border p-6">
          <h2 className="font-semibold">3. Sync products</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Once connected, {brand.product} syncs your catalog so the storefront assistant
            can recommend real products with prices and images.
          </p>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <AuthCtaLink />
        <Link href="/pricing" className={buttonVariants({ variant: "outline" })}>
          View pricing
        </Link>
      </div>
    </div>
  )
}
