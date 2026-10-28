import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { Logo } from "@/components/layout/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = await getTranslations("common")

  return (
    <div className="flex min-h-full flex-col bg-brand-mist/50">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            {t("backToHome")}
          </Link>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
