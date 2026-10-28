import { useState, useEffect } from "react"
import type { AuditEvent, IconName } from "../types"
import { getTimeline } from "../data"
import { Icon, Button, Heading, Badge, Card, Spinner, ErrorState } from "../components/ui"

export function Timeline({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true); setError(null)
    getTimeline(projectId)
      .then((evts) => {
        setEvents(evts ?? [])
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [projectId])

  const eventIcon = (type: string): IconName => {
    if (type.includes("PROJECT")) return "file"
    if (type.includes("CONTRACT")) return "shield"
    if (type.includes("PAYMENT") || type.includes("PAYPAL") || type.includes("ESCROW")) return "wallet"
    if (type.includes("MILESTONE") && type.includes("ACCEPTED")) return "check"
    if (type.includes("SUBMISSION") || type.includes("EVIDENCE")) return "upload"
    if (type.includes("AI")) return "spark"
    if (type.includes("REVISION")) return "message"
    if (type.includes("DISAGREEMENT")) return "warning"
    return "clock"
  }

  const eventColor = (type: string): string => {
    if (type.includes("ACCEPTED") || type.includes("AGREED") || type.includes("CAPTURED") || type.includes("DEPOSITED")) return "bg-success-soft text-success"
    if (type.includes("FAILED") || type.includes("DISAGREEMENT")) return "bg-danger-soft text-danger"
    if (type.includes("REVISION") || type.includes("PENDING")) return "bg-warning-soft text-warning"
    if (type.includes("AI") || type.includes("GENERATED")) return "bg-violet-soft text-violet"
    if (type.includes("PAYPAL") || type.includes("PAYMENT")) return "bg-primary-soft text-primary"
    return "bg-surface-strong text-muted"
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="page-masthead flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge tone="gray"><Icon name="clock" size="sm" /> Verifiable Audit</Badge>
          <Heading className="mt-3">Activity Timeline</Heading>
          <p className="mt-2 text-sm text-muted">Immutable record of all project agreements, milestone funding deposits, submissions, and acceptance decisions.</p>
        </div>
        <Button variant="secondary" icon="refresh" onClick={load}>Refresh</Button>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && <Spinner />}

      {!loading && events.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">No events yet. Interact with agreements or payments to build the audit trail.</p>
        </Card>
      )}

      {!loading && events.length > 0 && (
        <div className="relative">
          <div className="absolute left-[1.1rem] top-0 h-full w-px bg-line" />
          <div className="space-y-4">
            {events.map((event, i) => (
              <div key={event.id} className="relative flex gap-4">
                <span className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full ${eventColor(event.eventType)}`}>
                  <Icon name={eventIcon(event.eventType)} size="sm" />
                </span>
                <div className={`flex-1 rounded-2xl border border-line bg-white p-4 shadow-card ${i === 0 ? "ring-2 ring-primary/10" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-ink">{event.eventType.replace(/_/g, " ")}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {event.actorName ?? "System"} {event.entityType ? `· ${event.entityType}` : ""}
                      </p>
                    </div>
                    <p className="text-xs text-subtle">{new Date(event.createdAt).toLocaleString()}</p>
                  </div>
                  {event.safeMetadata && event.safeMetadata !== "{}" && (
                    <p className="mt-2 rounded-lg bg-surface px-3 py-1.5 font-mono text-xs text-muted">{event.safeMetadata}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
