"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Store } from "lucide-react";
import { toast } from "sonner";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/shared/page-states";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { UpgradePrompt } from "@/components/billing/plan-states";
import { createSite, disconnectSite, listSites } from "@/lib/api/sites";
import { ApiError, getUserFacingError } from "@/lib/api/client";
import type { Site } from "@/lib/types";

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setSites(await listSites());
    } catch (err) {
      setError(getUserFacingError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setLimitReached(false);
    if (!domain.trim()) {
      setFormError("Enter a store URL.");
      return;
    }
    setBusy(true);
    try {
      await createSite({ domain });
      setOpen(false);
      setDomain("");
      toast.success("Site added");
      await load();
    } catch (err) {
      setLimitReached(
        err instanceof ApiError && err.code === "SITE_LIMIT_REACHED",
      );
      setFormError(getUserFacingError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDisconnect(id: string) {
    setBusy(true);
    try {
      await disconnectSite(id);
      toast.success("Site disconnected");
      await load();
    } catch (err) {
      toast.error(getUserFacingError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sites"
        description="Manage connected WooCommerce stores. One Sellrico account can include multiple Shoppio sites."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus data-icon="inline-start" />
            Add site
          </Button>
        }
      />

      {loading ? <LoadingBlock /> : null}
      {error ? (
        <ErrorState description={error} onRetry={() => void load()} />
      ) : null}

      {!loading && !error && sites.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No stores connected yet"
          description="Connect your first WooCommerce store to get started."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus data-icon="inline-start" />
              Add site
            </Button>
          }
        />
      ) : null}

      {!loading && !error && sites.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {sites.map((site) => (
            <Card key={site.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{site.name}</CardTitle>
                    <CardDescription>{site.domain}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      site.connectionStatus === "connected"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {site.connectionStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Products</dt>
                    <dd className="font-medium">{site.productCount}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Plan</dt>
                    <dd className="font-medium capitalize">{site.planId}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Last sync</dt>
                    <dd className="font-medium">
                      {site.lastSyncedAt
                        ? new Date(site.lastSyncedAt).toLocaleString()
                        : "Never"}
                    </dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/sites/${site.id}`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Open
                  </Link>
                  <Link
                    href="/dashboard/assistant"
                    className={buttonVariants({
                      size: "sm",
                      variant: "outline",
                    })}
                  >
                    Configure
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy || site.status === "DISCONNECTED"}
                    onClick={() => void onDisconnect(site.id)}
                  >
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add WooCommerce site</DialogTitle>
            <DialogDescription>
              Enter the store URL. You will connect the Shoppio plugin next.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onAdd}>
            <FieldGroup>
              <Field data-invalid={!!formError || undefined}>
                <FieldLabel htmlFor="domain">Store URL</FieldLabel>
                <Input
                  id="domain"
                  placeholder="https://mystore.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  aria-invalid={!!formError || undefined}
                />
                {formError && !limitReached ? (
                  <FieldError>{formError}</FieldError>
                ) : null}
              </Field>
              {limitReached && formError ? (
                <UpgradePrompt
                  title="You've reached your site limit."
                  description={formError}
                />
              ) : null}
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Spinner data-icon="inline-start" /> : null}
                Add site
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
