"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ErrorState,
  LoadingBlock,
  PageHeader,
} from "@/components/shared/page-states"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { getMe, logout } from "@/lib/api/auth"
import {
  changePassword,
  deleteAccount,
  updateProfile,
} from "@/lib/api/dashboard"
import { getUserFacingError } from "@/lib/api/client"
import type { User } from "@/lib/types"

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [notifyProduct, setNotifyProduct] = useState(true)
  const [notifyBilling, setNotifyBilling] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const me = await getMe()
      setUser(me)
      setName(me.name)
      setEmail(me.email)
    } catch (err) {
      setError(getUserFacingError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setBusy("profile")
    try {
      const next = await updateProfile({ name, email })
      setUser(next)
      toast.success("Profile updated")
    } catch (err) {
      toast.error(getUserFacingError(err))
    } finally {
      setBusy(null)
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    setBusy("password")
    try {
      await changePassword({ currentPassword, newPassword })
      setCurrentPassword("")
      setNewPassword("")
      toast.success("Password updated")
    } catch (err) {
      toast.error(getUserFacingError(err))
    } finally {
      setBusy(null)
    }
  }

  async function onDelete() {
    if (!window.confirm("Delete your Sellrico account? This cannot be undone.")) {
      return
    }
    setBusy("delete")
    try {
      await deleteAccount()
      await logout()
      toast.success("Account deleted")
      router.replace("/")
    } catch (err) {
      toast.error(getUserFacingError(err))
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Settings" description="Account and security preferences." />
        <LoadingBlock />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Settings" />
        <ErrorState description={error ?? undefined} onRetry={() => void load()} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Account and security preferences." />

      <Card>
        <CardHeader>
          <CardTitle>Account information</CardTitle>
          <CardDescription>Update your name and email.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Button type="submit" disabled={busy === "profile"} className="w-fit">
                {busy === "profile" ? <Spinner data-icon="inline-start" /> : null}
                Save profile
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password & security</CardTitle>
          <CardDescription>Change your account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="current">Current password</FieldLabel>
                <Input
                  id="current"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="next">New password</FieldLabel>
                <Input
                  id="next"
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </Field>
              <Button type="submit" disabled={busy === "password"} className="w-fit">
                {busy === "password" ? <Spinner data-icon="inline-start" /> : null}
                Update password
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose which emails you want to receive.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={notifyProduct}
              onCheckedChange={(v) => setNotifyProduct(v === true)}
            />
            Product sync alerts
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={notifyBilling}
              onCheckedChange={(v) => setNotifyBilling(v === true)}
            />
            Billing and plan updates
          </label>
          <Button
            variant="outline"
            className="w-fit"
            onClick={() => toast.success("Notification preferences saved")}
          >
            Save preferences
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Permanently delete your Sellrico account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <Button
            variant="destructive"
            disabled={busy === "delete"}
            onClick={() => void onDelete()}
          >
            {busy === "delete" ? <Spinner data-icon="inline-start" /> : null}
            Delete account
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
