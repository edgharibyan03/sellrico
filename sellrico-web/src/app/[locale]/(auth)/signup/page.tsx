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
import { signup } from "@/lib/api/auth"

export default function SignupPage() {
  const router = useRouter()
  const mapApiError = useApiError()
  const t = useTranslations("auth.signup")
  const tc = useTranslations("common")
  const { loggedIn, status } = useAuthGate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setLoading(true)
    try {
      await signup({ name, email, password })
      toast.success(t("accountCreated"))
      router.push("/onboarding")
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
            <Field>
              <FieldLabel htmlFor="name">{t("name")}</FieldLabel>
              <Input
                id="name"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
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
        {t("haveAccount")}{" "}
        <Link href="/login" className="ml-1 font-medium text-foreground hover:underline">
          {tc("logIn")}
        </Link>
      </CardFooter>
    </Card>
  )
}
