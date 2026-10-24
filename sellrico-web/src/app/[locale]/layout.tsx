import { notFound } from "next/navigation"
import { Manrope, IBM_Plex_Mono } from "next/font/google"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { routing } from "@/i18n/routing"
import { brand } from "@/lib/config/brand"

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
})

const manropeHeading = Manrope({
  variable: "--font-heading",
  subsets: ["latin", "cyrillic"],
  display: "swap",
})

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
})

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "meta" })
  return {
    title: {
      default: t("title", { name: brand.name, tagline: t("tagline") }),
      template: `%s · ${brand.name}`,
    },
    description: t("description", {
      name: brand.name,
      product: brand.product,
    }),
    openGraph: {
      title: t("title", { name: brand.name, tagline: t("tagline") }),
      description: t("description", {
        name: brand.name,
        product: brand.product,
      }),
      siteName: brand.name,
      type: "website",
      locale: locale === "ru" ? "ru_RU" : "en_US",
    },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      className={`${manrope.variable} ${manropeHeading.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <NextIntlClientProvider messages={messages}>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
