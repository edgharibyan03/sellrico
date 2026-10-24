"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { useAuthGate } from "@/hooks/use-auth-gate"
import { login } from "@/lib/api/auth"
import { getUserFacingError } from "@/lib/api/client"

export default function LoginPage() {
  const router = useRouter()
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
      toast.success("Welcome back")
      if (!session.user.onboardingCompleted) {
        router.push("/onboarding")
      } else {
        router.push("/dashboard")
      }
    } catch (err) {
      setError(getUserFacingError(err))
    } finally {
      setLoading(false)
    }
  }

  if (status !== "loading" && loggedIn) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>You are signed in</CardTitle>
          <CardDescription>Continue to your Sellrico dashboard.</CardDescription>
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
        <CardTitle>Log in</CardTitle>
        <CardDescription>Access your Sellrico dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field data-invalid={!!error || undefined}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
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
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Forgot password?
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
              Log in
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="ml-1 font-medium text-foreground hover:underline">
          Sign up
        </Link>
      </CardFooter>
    </Card>
  )
}
