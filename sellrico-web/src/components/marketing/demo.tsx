const demoProducts = [
  {
    name: "Nordic White Door 80cm",
    price: "$349",
    detail: "Slim frame · Fits apartments",
  },
  {
    name: "Compact Studio Door",
    price: "$429",
    detail: "Matte white · Soft-close",
  },
  {
    name: "Sliding Door Kit",
    price: "$489",
    detail: "Space-saver · Under $500",
  },
]

export function DemoSection() {
  return (
    <section id="demo" className="border-b border-border bg-brand-mist/60 py-20 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6">
        <div className="max-w-xl">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight sm:text-3xl">
            Shopping that feels like a conversation
          </h2>
          <p className="mt-3 text-muted-foreground">
            A marketing preview of how customers interact with Shoppio on your storefront.
          </p>
        </div>

        <div className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <div>
              <p className="text-sm font-medium">Shoppio Assistant</p>
              <p className="text-xs text-muted-foreground">Demo conversation</p>
            </div>
            <span className="rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground">
              Live on your store
            </span>
          </div>

          <div className="flex flex-col gap-4">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-3 text-sm">
              I need a white door for a small apartment under $500.
            </div>
            <div className="mr-auto max-w-[95%] rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3 text-sm">
              Sure. Here are a few options that fit your requirements.
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {demoProducts.map((product) => (
                <article
                  key={product.name}
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="flex h-24 items-center justify-center bg-muted text-xs text-muted-foreground">
                    Product image
                  </div>
                  <div className="flex flex-col gap-1 p-3">
                    <h3 className="text-sm font-medium leading-snug">{product.name}</h3>
                    <p className="text-sm font-semibold text-primary">{product.price}</p>
                    <p className="text-xs text-muted-foreground">{product.detail}</p>
                    <button
                      type="button"
                      className="mt-2 rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      View product
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
