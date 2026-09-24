"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Bot,
  CreditCard,
  MessageSquare,
  Package,
  Store,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/shared/page-states"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { getActivity, getOverview } from "@/lib/api/dashboard"
import { getUserFacingError } from "@/lib/api/client"
import { getPlan } from "@/lib/config/pricing"
import type { ActivityItem, OverviewStats } from "@/lib/types"

export default function OverviewPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [overview, acts] = await Promise.all([getOverview(), getActivity()])
      setStats(overview)
      setActivity(acts)
    } catch (err) {
      setError(getUserFacingError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Overview"
          description="What’s happening across your stores right now."
        />
        <LoadingBlock rows={5} />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Overview" />
        <ErrorState description={error ?? undefined} onRetry={() => void load()} />
      </div>
    )
  }

  const plan = getPlan(stats.planId)
  const usagePct =
    stats.aiMessagesLimit && stats.aiMessagesLimit > 0
      ? Math.min(100, Math.round((stats.aiMessagesUsed / stats.aiMessagesLimit) * 100))
      : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Key stats so you can see how Shoppio is working for your stores."
      />

      {!stats.onboardingCompleted ? (
        <Alert>
          <AlertTitle>Finish setup</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>Connect your WooCommerce store to unlock the assistant.</span>
            <Link href="/onboarding" className={buttonVariants({ size: "sm" })}>
              Continue onboarding
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current plan</CardDescription>
            <CardTitle className="text-2xl">{plan.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/billing" className="text-sm text-primary hover:underline">
              Manage billing
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Connected sites</CardDescription>
            <CardTitle className="text-2xl">{stats.connectedSites}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/sites" className="text-sm text-primary hover:underline">
              View sites
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Products synced</CardDescription>
            <CardTitle className="text-2xl">{stats.productsSynced.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/products" className="text-sm text-primary hover:underline">
              View products
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>AI messages this month</CardDescription>
            <CardTitle className="text-2xl">
              {stats.aiMessagesUsed.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {stats.aiMessagesLimit?.toLocaleString() ?? "∞"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {usagePct != null ? (
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            ) : null}
            <Link href="/dashboard/usage" className="text-sm text-primary hover:underline">
              View usage
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Chat messages today</CardDescription>
            <CardTitle className="text-2xl">
              {(stats.chatMessagesToday ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Visitor messages answered by the assistant today.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversations</CardDescription>
            <CardTitle className="text-2xl">
              {(stats.conversationsOpen ?? 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Shopper chat threads across your stores.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>
              Connections, syncs, and visitor chats — so you see what changed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState
                title="No activity yet"
                description="Connect a store and let shoppers chat to start seeing events here."
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {activity.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 rounded-lg border border-border px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      <Badge variant="secondary">{item.type.replaceAll("_", " ")}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Common next steps.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              href="/dashboard/sites"
              className={buttonVariants({ variant: "outline", className: "justify-start" })}
            >
              <Store data-icon="inline-start" />
              Connect store
            </Link>
            <Link
              href="/dashboard/assistant"
              className={buttonVariants({ variant: "outline", className: "justify-start" })}
            >
              <Bot data-icon="inline-start" />
              Configure assistant
            </Link>
            <Link
              href="/dashboard/products"
              className={buttonVariants({ variant: "outline", className: "justify-start" })}
            >
              <Package data-icon="inline-start" />
              View products
            </Link>
            <Link
              href="/dashboard/usage"
              className={buttonVariants({ variant: "outline", className: "justify-start" })}
            >
              <MessageSquare data-icon="inline-start" />
              Check AI usage
            </Link>
            <Link
              href="/dashboard/billing"
              className={buttonVariants({ variant: "outline", className: "justify-start" })}
            >
              <CreditCard data-icon="inline-start" />
              Manage subscription
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
