"use client"

import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/navigation"
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
  const t = useTranslations("dashboard.settings")
  const ta = useTranslations("auth.signup")
  const tc = useTranslations("common")
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
      toast.success(t("profileUpdated"))
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
      toast.success(t("passwordUpdated"))
    } catch (err) {
      toast.error(getUserFacingError(err))
    } finally {
      setBusy(null)
    }
  }

  async function onDelete() {
    if (!window.confirm(t("deleteConfirm"))) {
      return
    }
    setBusy("delete")
    try {
      await deleteAccount()
      await logout()
      toast.success(t("accountDeleted"))
      router.replace("/")
    } catch (err) {
      toast.error(getUserFacingError(err))
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} description={t("description")} />
        <LoadingBlock />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} />
        <ErrorState description={error ?? undefined} onRetry={() => void load()} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
          <CardDescription>{t("profileDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">{ta("name")}</FieldLabel>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">{ta("email")}</FieldLabel>
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
                {t("saveProfile")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("password")}</CardTitle>
          <CardDescription>{t("passwordDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="current">{t("currentPassword")}</FieldLabel>
                <Input
                  id="current"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="next">{t("newPassword")}</FieldLabel>
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
                {t("updatePassword")}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("notifications")}</CardTitle>
          <CardDescription>{t("notificationsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={notifyProduct}
              onCheckedChange={(v) => setNotifyProduct(v === true)}
            />
            {t("notifyProduct")}
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={notifyBilling}
              onCheckedChange={(v) => setNotifyBilling(v === true)}
            />
            {t("notifyBilling")}
          </label>
          <Button
            variant="outline"
            className="w-fit"
            onClick={() => toast.success(tc("save"))}
          >
            {tc("save")}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>{t("dangerZone")}</CardTitle>
          <CardDescription>{t("dangerDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <Button
            variant="destructive"
            disabled={busy === "delete"}
            onClick={() => void onDelete()}
          >
            {busy === "delete" ? <Spinner data-icon="inline-start" /> : null}
            {t("deleteAccount")}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
