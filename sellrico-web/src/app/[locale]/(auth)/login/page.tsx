"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"
import { AuthCtaLink } from "@/components/auth/auth-cta-link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useApiError } from "@/hooks/use-api-error"
import { useAuthGate } from "@/hooks/use-auth-gate"
import { Link, useRouter } from "@/i18n/navigation"
import { login } from "@/lib/api/auth"

export default function LoginPage() {
  const router = useRouter()
  const mapApiError = useApiError()
  const t = useTranslations("auth.login")
  const tc = useTranslations("common")
  const { loggedIn, status } = useAuthGate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const session = await login({ email, password })
      toast.success(t("welcomeBack"))
      if (!session.user.onboardingCompleted) {
        router.push("/onboarding")
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (status !== "loading" && loggedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("signedInTitle")}</CardTitle>
          <CardDescription>{t("signedInDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthCtaLink className="w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field data-invalid={!!error || undefined}>
              <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!error || undefined}
              />
            </Field>
            <Field>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <Spinner data-icon="inline-start" /> : null}
              {t("submit")}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/signup" className="ml-1 font-medium text-foreground hover:underline">
          {tc("signUp")}
        </Link>
      </CardFooter>
    </Card>
  )
}
