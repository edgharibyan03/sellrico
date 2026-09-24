"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  EmptyState,
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { getAssistant, updateAssistant } from "@/lib/api/assistant"
import { listSites } from "@/lib/api/sites"
import { getUserFacingError } from "@/lib/api/client"
import type { AssistantSettings, AssistantTone, Site } from "@/lib/types"

export default function AssistantPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [siteId, setSiteId] = useState<string>("")
  const [settings, setSettings] = useState<AssistantSettings | null>(null)
  const [questionsText, setQuestionsText] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load(selected?: string) {
    setLoading(true)
    setError(null)
    try {
      const siteList = await listSites()
      setSites(siteList)
      const id = selected ?? siteList.find((s) => s.connectionStatus === "connected")?.id ?? siteList[0]?.id
      if (!id) {
        setSettings(null)
        return
      }
      setSiteId(id)
      const data = await getAssistant(id)
      setSettings(data)
      setQuestionsText(data.suggestedQuestions.join("\n"))
    } catch (err) {
      setError(getUserFacingError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settings || !siteId) return
    setSaving(true)
    try {
      const next = await updateAssistant(siteId, {
        ...settings,
        suggestedQuestions: questionsText
          .split("\n")
          .map((q) => q.trim())
          .filter(Boolean),
      })
      setSettings(next)
      toast.success("Assistant settings saved")
    } catch (err) {
      toast.error(getUserFacingError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="AI Assistant" description="Configure how your assistant appears and speaks." />
        <LoadingBlock />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="AI Assistant" />
        <ErrorState description={error} onRetry={() => void load()} />
      </div>
    )
  }

  if (sites.length === 0 || !settings) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="AI Assistant" />
        <EmptyState
          title="No store connected"
          description="Connect a WooCommerce store before configuring the assistant."
          action={
            <Button onClick={() => void load()}>Refresh</Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI Assistant"
        description="Configure how your assistant appears and speaks. More settings can be added later."
      />

      <Card>
        <CardHeader>
          <CardTitle>Assistant settings</CardTitle>
          <CardDescription>Changes apply to the selected site.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave}>
            <FieldGroup>
              <Field>
                <FieldLabel>Site</FieldLabel>
                <Select
                  value={siteId}
                  onValueChange={(v) => {
                    if (v) void load(v)
                  }}
                >
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {sites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.domain}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="name">Assistant name</FieldLabel>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="welcome">Welcome message</FieldLabel>
                <Textarea
                  id="welcome"
                  value={settings.welcomeMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, welcomeMessage: e.target.value })
                  }
                  required
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Language</FieldLabel>
                  <Select
                    value={settings.language}
                    onValueChange={(v) =>
                      v && setSettings({ ...settings, language: v })
                    }
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
                    value={settings.tone}
                    onValueChange={(v) =>
                      v && setSettings({ ...settings, tone: v as AssistantTone })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="color">Primary color</FieldLabel>
                <div className="flex max-w-md items-center gap-3">
                  <Input
                    id="color"
                    type="color"
                    className="h-10 w-14 p-1"
                    value={settings.primaryColor}
                    onChange={(e) =>
                      setSettings({ ...settings, primaryColor: e.target.value })
                    }
                  />
                  <Input
                    value={settings.primaryColor}
                    onChange={(e) =>
                      setSettings({ ...settings, primaryColor: e.target.value })
                    }
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="questions">Suggested questions</FieldLabel>
                <Textarea
                  id="questions"
                  rows={4}
                  value={questionsText}
                  onChange={(e) => setQuestionsText(e.target.value)}
                  placeholder="One question per line"
                />
              </Field>
              <Button type="submit" disabled={saving} className="w-fit">
                {saving ? <Spinner data-icon="inline-start" /> : null}
                Save changes
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
