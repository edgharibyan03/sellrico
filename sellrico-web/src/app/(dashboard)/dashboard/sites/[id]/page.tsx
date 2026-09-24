"use client"

import Link from "next/link"
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
import { getSite } from "@/lib/api/sites"
import { getUserFacingError } from "@/lib/api/client"
import type { Site } from "@/lib/types"

export default function SiteDetailPage() {
  const params = useParams<{ id: string }>()
  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setSite(await getSite(params.id))
    } catch (err) {
      setError(getUserFacingError(err))
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
        <PageHeader title="Site" />
        <LoadingBlock />
      </div>
    )
  }

  if (error || !site) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Site" />
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
            Back to sites
          </Link>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>Status and sync details for this store.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge className="mt-1">{site.connectionStatus}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Site status</p>
            <p className="mt-1 font-medium">{site.status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Products</p>
            <p className="mt-1 font-medium">{site.productCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last sync</p>
            <p className="mt-1 font-medium">
              {site.lastSyncedAt
                ? new Date(site.lastSyncedAt).toLocaleString()
                : "Never"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
