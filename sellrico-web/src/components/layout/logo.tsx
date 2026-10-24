import { Link } from "@/i18n/navigation"
import { brand } from "@/lib/config/brand"
import { cn } from "@/lib/utils"

export function Logo({
  className,
  href = "/",
  showProduct = false,
}: {
  className?: string
  href?: string
  /** When true, show “Sellrico · Shoppio” in compact product context */
  showProduct?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
      >
        S
      </span>
      <span className="inline-flex items-baseline gap-1.5">
        {brand.name}
        {showProduct ? (
          <span className="text-sm font-medium text-muted-foreground">
            · {brand.product}
          </span>
        ) : null}
      </span>
    </Link>
  )
}
