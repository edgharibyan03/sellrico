"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/shared/page-states"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  createCheckout,
  createPortalSession,
  getPlans,
  getSubscription,
} from "@/lib/api/billing"
import { getUserFacingError } from "@/lib/api/client"
import { formatPlanPrice, pricingConfig } from "@/lib/config/pricing"
import type { BillingPlan, PlanId, Subscription } from "@/lib/types"

export default function BillingPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [p, s] = await Promise.all([getPlans(), getSubscription()])
      setPlans(p)
      setSubscription(s)
    } catch (err) {
      setError(getUserFacingError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onCheckout(planId: PlanId) {
    setBusy(planId)
    try {
      const { url } = await createCheckout(planId)
      toast.message("Checkout session created", {
        description: "Payment provider is handled by the backend.",
      })
      window.location.assign(url)
    } catch (err) {
      toast.error(getUserFacingError(err))
    } finally {
      setBusy(null)
    }
  }

  async function onPortal() {
    setBusy("portal")
    try {
      const { url } = await createPortalSession()
      window.location.assign(url)
    } catch (err) {
      toast.error(getUserFacingError(err))
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Billing" description="Manage your plan and subscription." />
        <LoadingBlock />
      </div>
    )
  }

  if (error || !subscription) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Billing" />
        <ErrorState description={error ?? undefined} onRetry={() => void load()} />
      </div>
    )
  }

  const current = plans.find((p) => p.id === subscription.planId)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing"
        description="Provider-agnostic billing — checkout and portal are opened by the backend."
      />

      <Alert>
        <AlertDescription>{pricingConfig.placeholderNote}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Current subscription</CardTitle>
          <CardDescription>Your active Sellrico plan for Shoppio.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Plan</p>
            <p className="font-medium">{current?.name ?? subscription.planId}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Interval</p>
            <p className="font-medium capitalize">{subscription.interval}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="font-medium">
              {subscription.price != null
                ? `${subscription.currency} ${subscription.price}`
                : "TBD"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge className="mt-1 capitalize">{subscription.status}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Renewal</p>
            <p className="font-medium">
              {subscription.renewsAt
                ? new Date(subscription.renewsAt).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => void onPortal()} disabled={busy === "portal"}>
              {busy === "portal" ? <Spinner data-icon="inline-start" /> : null}
              Manage subscription
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 font-[family-name:var(--font-heading)] text-lg font-semibold">
          Available plans
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.id === subscription.planId
            return (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {isCurrent ? <Badge>Current</Badge> : null}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-3xl font-semibold tracking-tight">
                    {formatPlanPrice(plan, subscription.interval)}
                  </p>
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f}>• {f}</li>
                    ))}
                  </ul>
                  <Button
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || busy === plan.id}
                    onClick={() => void onCheckout(plan.id)}
                  >
                    {busy === plan.id ? <Spinner data-icon="inline-start" /> : null}
                    {isCurrent
                      ? "Current plan"
                      : plan.id === "free"
                        ? "Downgrade"
                        : "Upgrade"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
