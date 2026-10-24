"use client"

import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/shared/page-states"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useApiError } from "@/hooks/use-api-error"
import { Link } from "@/i18n/navigation"
import { getSite } from "@/lib/api/sites"
import type { Site } from "@/lib/types"

export default function SiteDetailPage() {
  const params = useParams<{ id: string }>()
  const t = useTranslations("dashboard.sites")
  const mapApiError = useApiError()
  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setSite(await getSite(params.id))
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("detailTitle")} />
        <LoadingBlock />
      </div>
    )
  }

  if (error || !site) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("detailTitle")} />
        <ErrorState description={error ?? undefined} onRetry={() => void load()} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={site.name}
        description={site.domain}
        actions={
          <Link href="/dashboard/sites" className={buttonVariants({ variant: "outline" })}>
            {t("backToSites")}
          </Link>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("connection")}</CardTitle>
          <CardDescription>{t("connectionDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{t("status")}</p>
            <Badge className="mt-1">{site.connectionStatus}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("siteStatus")}</p>
            <p className="mt-1 font-medium">{site.status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("productsCount")}</p>
            <p className="mt-1 font-medium">{site.productCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("lastSync")}</p>
            <p className="mt-1 font-medium">
              {site.lastSyncedAt
                ? new Date(site.lastSyncedAt).toLocaleString()
                : t("neverSynced")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
