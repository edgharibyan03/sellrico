"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"
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
import { Link } from "@/i18n/navigation"
import { forgotPassword } from "@/lib/api/auth"

export default function ForgotPasswordPage() {
  const mapApiError = useApiError()
  const t = useTranslations("auth.forgot")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await forgotPassword(email)
      setSent(true)
      toast.success(t("checkEmail"))
      void result
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-sm text-muted-foreground">
            {t("sent", { email })}
          </p>
        ) : (
          <form onSubmit={onSubmit}>
            <FieldGroup>
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
              {error ? <FieldError>{error}</FieldError> : null}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? <Spinner data-icon="inline-start" /> : null}
                {t("submit")}
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:text-foreground">
          {t("backToLogin")}
        </Link>
      </CardFooter>
    </Card>
  )
}
