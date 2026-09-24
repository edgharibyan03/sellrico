import { brand } from "@/lib/config/brand"

const steps = [
  {
    step: "1",
    title: `Create a ${brand.name} account`,
    description: `Sign up, then install the ${brand.product} WordPress plugin.`,
  },
  {
    step: "2",
    title: "Connect your WooCommerce store",
    description: "Link your store securely — credentials stay on your site.",
  },
  {
    step: "3",
    title: "Sync your catalog",
    description: "Pull products from WooCommerce so the assistant can recommend them.",
  },
  {
    step: "4",
    title: "Let customers shop through conversation",
    description: `Publish ${brand.product} and help visitors find products faster.`,
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-b border-border bg-brand-mist/40 py-20 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6">
        <div className="max-w-xl">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            From a {brand.name} account to a live {brand.product} assistant in a
            few guided steps.
          </p>
        </div>
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((item) => (
            <li key={item.step} className="flex flex-col gap-3">
              <span className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-sm font-semibold text-primary">
                {item.step}
              </span>
              <h3 className="font-medium">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
