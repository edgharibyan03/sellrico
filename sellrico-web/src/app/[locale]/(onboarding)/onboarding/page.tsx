"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useApiError } from "@/hooks/use-api-error";
import { Link, useRouter } from "@/i18n/navigation";
import { CheckCircle2, Circle, LoaderCircle, Store } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { updateOnboarding } from "@/lib/api/dashboard";
import { getSession } from "@/lib/api/auth";
import {
  createConnectCode,
  createSite,
  getSyncProgress,
  pollConnection,
} from "@/lib/api/sites";
import { updateAssistant } from "@/lib/api/assistant";
import type {
  AssistantTone,
  ConnectCodeResponse,
  Site,
  SyncProgress,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = [
  "Welcome",
  "Store URL",
  "Connect plugin",
  "Connection",
  "Product sync",
  "Assistant",
  "Done",
];

function isValidStoreUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    const url = new URL(withProtocol)
    const host = url.hostname.toLowerCase()
    // Allow localhost / loopback for local WordPress installs
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return true
    }
    return host.includes(".")
  } catch {
    return false
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const mapApiError = useApiError();
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const [step, setStep] = useState(0);
  const [checking, setChecking] = useState(true);
  const [storeUrl, setStoreUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [connectCode, setConnectCode] = useState<ConnectCodeResponse | null>(
    null,
  );
  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncProgress | null>(null);
  const [assistantName, setAssistantName] = useState("Shoppio Assistant");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hi! Looking for something specific? I can help you find products.",
  );
  const [language, setLanguage] = useState("en");
  const [tone, setTone] = useState<AssistantTone>("friendly");
  const [primaryColor, setPrimaryColor] = useState("#0F766E");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const session = await getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      if (session.user.onboardingCompleted) {
        router.replace("/dashboard");
        return;
      }
      setStep(Math.max(0, Math.min(6, session.user.onboardingStep || 0)));
      setChecking(false);
    })();
  }, [router]);

  const progressValue = useMemo(
    () => ((step + 1) / STEPS.length) * 100,
    [step],
  );

  async function goTo(next: number) {
    setStep(next);
    try {
      await updateOnboarding(next, false);
    } catch {
      // non-blocking
    }
  }

  async function handleStoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUrlError(null);
    if (!isValidStoreUrl(storeUrl)) {
      setUrlError(t("storeUrlError"))
      return;
    }
    setBusy(true);
    try {
      const created = await createSite({ domain: storeUrl });
      setSite(created);
      const code = await createConnectCode(created.id);
      setConnectCode(code);
      await goTo(2);
    } catch (err) {
      setUrlError(mapApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function startConnectionCheck() {
    if (!site) return;
    setConnectionState("connecting");
    setConnectionError(null);
    setBusy(true);
    try {
      await goTo(3);
      const connected = await pollConnection(site.id);
      setSite(connected);
      setConnectionState("connected");
      toast.success("Store connected");
    } catch (err) {
      setConnectionState("error");
      setConnectionError(mapApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function runSync() {
    if (!site) return
    setBusy(true)
    await goTo(4)
    try {
      let progress = await getSyncProgress(site.id)
      setSync(progress)

      // Plugin syncs on connect — poll briefly if still waiting.
      for (let i = 0; i < 10 && progress.status === "syncing"; i += 1) {
        await new Promise((r) => setTimeout(r, 1500))
        progress = await getSyncProgress(site.id)
        setSync(progress)
      }

      if (progress.status === "syncing") {
        setSync({
          ...progress,
          status: "completed",
          message:
            "Still waiting for plugin sync. Open Shoppio in WordPress and click Sync products, then refresh.",
        })
      }
    } catch (err) {
      setSync({
        status: "error",
        productsSynced: 0,
        productsTotal: 0,
        message: "Sync failed",
        error: mapApiError(err),
      })
    } finally {
      setBusy(false)
    }
  }

  async function saveAssistant(e: React.FormEvent) {
    e.preventDefault();
    if (!site) return;
    setBusy(true);
    try {
      await updateAssistant(site.id, {
        name: assistantName,
        welcomeMessage,
        language,
        tone,
        primaryColor,
      });
      await goTo(6);
    } catch (err) {
      toast.error(mapApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    try {
      await updateOnboarding(7, true);
      router.push("/dashboard");
    } catch (err) {
      toast.error(mapApiError(err));
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <Logo href="/dashboard" />
          <span className="text-sm text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Progress value={progressValue} className="mb-8 h-1.5" />

        <ol
          className="mb-8 hidden gap-2 sm:flex"
          aria-label="Onboarding progress"
        >
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                index === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {index < step ? (
                <CheckCircle2 className="size-3.5 text-primary" />
              ) : (
                <Circle className="size-3.5" />
              )}
              {label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>
                Let&apos;s connect your WooCommerce store and set up Shoppio —
                your AI shopping assistant.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li>• Connect your WooCommerce store</li>
                <li>• Install the Shoppio WordPress plugin</li>
                <li>• Sync products and configure your assistant</li>
              </ul>
              <Button onClick={() => void goTo(1)}>{tc("continue")}</Button>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("storeUrlTitle")}</CardTitle>
              <CardDescription>
                We&apos;ll use this to prepare a secure connection for your
                WooCommerce site.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStoreSubmit}>
                <FieldGroup>
                  <Field data-invalid={!!urlError || undefined}>
                    <FieldLabel htmlFor="storeUrl">
                      {t("storeUrlLabel")}
                    </FieldLabel>
                    <Input
                      id="storeUrl"
                      placeholder={t("storeUrlPlaceholder")}
                      value={storeUrl}
                      onChange={(e) => setStoreUrl(e.target.value)}
                      aria-invalid={!!urlError || undefined}
                      required
                    />
                    {urlError ? <FieldError>{urlError}</FieldError> : null}
                  </Field>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void goTo(0)}
                    >
                      {t("back")}
                    </Button>
                    <Button type="submit" disabled={busy}>
                      {busy ? <Spinner data-icon="inline-start" /> : null}
                      {tc("continue")}
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("connectTitle")}</CardTitle>
              <CardDescription>
                Install Shoppio on WordPress, then connect using the code below.
                Secrets never leave your WordPress server.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {connectCode ? (
                <>
                  <div className="rounded-lg border border-dashed border-border bg-muted/50 p-4 text-center">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Connect code
                    </p>
                    <p className="mt-2 font-mono text-2xl font-semibold tracking-widest">
                      {connectCode.code}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Expires{" "}
                      {new Date(connectCode.expiresAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
                    {connectCode.instructions.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ol>
                </>
              ) : null}
              <Alert>
                <AlertDescription>{t("connectHint")}</AlertDescription>
              </Alert>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void goTo(1)}
                >
                  {t("back")}
                </Button>
                <Button
                  onClick={() => void startConnectionCheck()}
                  disabled={busy}
                >
                  {busy ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Store data-icon="inline-start" />
                  )}
                  {t("confirmConnection")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Connection status</CardTitle>
              <CardDescription>
                Confirming that your WooCommerce store is linked to Shoppio.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                {connectionState === "connecting" ? (
                  <LoaderCircle className="size-5 animate-spin text-primary" />
                ) : null}
                {connectionState === "connected" ? (
                  <CheckCircle2 className="size-5 text-primary" />
                ) : null}
                {connectionState === "error" ? (
                  <Circle className="size-5 text-destructive" />
                ) : null}
                <div>
                  <p className="font-medium capitalize">{connectionState}</p>
                  <p className="text-sm text-muted-foreground">
                    {site?.domain ?? "Your store"}
                  </p>
                </div>
              </div>
              {connectionError ? (
                <FieldError>{connectionError}</FieldError>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {connectionState === "error" ? (
                  <Button
                    onClick={() => void startConnectionCheck()}
                    disabled={busy}
                  >
                    Retry
                  </Button>
                ) : null}
                {connectionState === "connected" ? (
                  <Button onClick={() => void runSync()} disabled={busy}>
                    Continue to product sync
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void goTo(2)}
                >
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Syncing your WooCommerce products</CardTitle>
              <CardDescription>
                Initial sync can continue in the background — you can proceed
                once the first batch is ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Progress
                value={
                  sync && sync.productsTotal > 0
                    ? (sync.productsSynced / sync.productsTotal) * 100
                    : 15
                }
              />
              <p className="text-sm text-muted-foreground">
                {sync?.message ?? "Preparing sync..."}
              </p>
              {sync ? (
                <p className="text-sm font-medium">
                  {sync.productsSynced} / {sync.productsTotal} products synced
                </p>
              ) : null}
              {sync?.error ? <FieldError>{sync.error}</FieldError> : null}
              <div className="flex gap-2">
                <Button
                  onClick={() => void goTo(5)}
                  disabled={busy || sync?.status === "error"}
                >
                  Continue
                </Button>
                {sync?.status === "error" ? (
                  <Button variant="outline" onClick={() => void runSync()}>
                    Retry sync
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card>
            <CardHeader>
              <CardTitle>Configure your assistant</CardTitle>
              <CardDescription>
                These basics can be changed anytime from the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveAssistant}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="assistantName">
                      Assistant name
                    </FieldLabel>
                    <Input
                      id="assistantName"
                      value={assistantName}
                      onChange={(e) => setAssistantName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="welcome">Welcome message</FieldLabel>
                    <Textarea
                      id="welcome"
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Language</FieldLabel>
                    <Select
                      value={language}
                      onValueChange={(v) => v && setLanguage(v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>Tone</FieldLabel>
                    <Select
                      value={tone}
                      onValueChange={(v) => v && setTone(v as AssistantTone)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="professional">
                            Professional
                          </SelectItem>
                          <SelectItem value="concise">Concise</SelectItem>
                          <SelectItem value="enthusiastic">
                            Enthusiastic
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="color">Primary color</FieldLabel>
                    <div className="flex items-center gap-3">
                      <Input
                        id="color"
                        type="color"
                        className="h-10 w-14 p-1"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        aria-label="Primary color hex"
                      />
                    </div>
                  </Field>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void goTo(4)}
                    >
                      Back
                    </Button>
                    <Button type="submit" disabled={busy}>
                      {busy ? <Spinner data-icon="inline-start" /> : null}
                      Save & continue
                    </Button>
                  </div>
                </FieldGroup>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 6 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Shoppio assistant is ready</CardTitle>
              <CardDescription>
                Manage sites, products, and usage from your Sellrico dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-lg border border-border bg-brand-mist/60 p-4 text-sm">
                <p className="font-medium">{site?.name ?? "Your store"}</p>
                <p className="text-muted-foreground">{site?.domain}</p>
              </div>
              <Button onClick={() => void finish()} disabled={busy}>
                {busy ? <Spinner data-icon="inline-start" /> : null}
                Go to Dashboard
              </Button>
              <Link
                href="/dashboard"
                className={buttonVariants({ variant: "ghost" })}
              >
                Skip for now
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
