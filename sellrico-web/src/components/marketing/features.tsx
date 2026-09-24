import {
  GitCompareArrows,
  MessageSquareText,
  PackageSearch,
  ShoppingBag,
  Sparkles,
  Store,
} from "lucide-react"

const features = [
  {
    icon: PackageSearch,
    title: "AI product discovery",
    description: "Customers describe what they need in plain language.",
  },
  {
    icon: MessageSquareText,
    title: "Natural language search",
    description: "Find products by intent, budget, and preferences.",
  },
  {
    icon: Sparkles,
    title: "Recommendations",
    description: "Surface relevant options from your WooCommerce catalog.",
  },
  {
    icon: Store,
    title: "WooCommerce integration",
    description: "Connect your store with the Shoppio WordPress plugin.",
  },
  {
    icon: ShoppingBag,
    title: "Conversational shopping",
    description: "Guide shoppers through questions instead of filters.",
  },
  {
    icon: GitCompareArrows,
    title: "Product comparison",
    description: "Help customers weigh options side by side.",
  },
]

export function FeaturesSection() {
  return (
    <section className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6">
        <div className="max-w-xl">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
            Built for WooCommerce merchants
          </h2>
          <p className="mt-3 text-muted-foreground">
            Shoppio brings AI-assisted shopping to your catalog — with room to
            grow into future shopping actions.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="flex flex-col gap-3 rounded-lg border border-border p-5">
              <feature.icon className="size-5 text-primary" aria-hidden />
              <h3 className="font-medium">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
