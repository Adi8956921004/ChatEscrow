import { useState, useEffect } from "react"
import type { WebhookEvent } from "../types"
import { getWebhookEvents, simulateWebhook } from "../data"
import { Icon, Button, Heading, Badge, Card, Spinner, InfoBanner } from "../components/ui"

export function WebhooksScreen() {
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    getWebhookEvents()
      .then((data) => {
        setEvents(data)
        if (data.length > 0 && !selectedEvent) {
          setSelectedEvent(data[data.length - 1])
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSimulate = async (eventType: string) => {
    setSimulating(true)
    try {
      const newEvt = await simulateWebhook(eventType)
      setSelectedEvent(newEvt)
      load()
    } catch (e) {
      setError(String(e))
    } finally {
      setSimulating(false)
    }
  }

  const statusTone = (status: string) => {
    if (status === "VERIFIED") return "green"
    if (status === "FAILED") return "red"
    return "amber"
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="page-masthead flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge tone="blue"><Icon name="shield" size="sm" /> PayPal Event Stream</Badge>
          <Heading className="mt-3">Webhook Inspector & Verification</Heading>
          <p className="mt-2 text-sm text-muted">
            Monitors real-time webhook deliveries, signature verification (POST /v1/notifications/verify-webhook-signature), and idempotent deduplication.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon="refresh" onClick={load}>Refresh</Button>
        </div>
      </div>

      {error && <InfoBanner tone="red">{error}</InfoBanner>}

      {/* Simulator Toolbar */}
      <Card className="p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-ink">Simulate Sandbox Webhook Event</p>
            <p className="text-xs text-muted mt-0.5">Test signature verification and state machine updates without an external public URL tunnel.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="soft"
              loading={simulating}
              onClick={() => handleSimulate("PAYMENT.CAPTURE.COMPLETED")}
            >
              Capture Completed
            </Button>
            <Button
              variant="soft"
              loading={simulating}
              onClick={() => handleSimulate("CHECKOUT.ORDER.APPROVED")}
            >
              Order Approved
            </Button>
            <Button
              variant="soft"
              loading={simulating}
              onClick={() => handleSimulate("PAYMENT.CAPTURE.DENIED")}
            >
              Capture Denied
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Events List */}
        <Card className="overflow-hidden">
          <div className="border-b border-line p-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Received Events ({events.length})</span>
            <span className="text-xs text-subtle">Most recent first</span>
          </div>
          {loading && <Spinner />}
          {!loading && events.length === 0 && (
            <div className="p-8 text-center text-sm text-muted">
              No webhook events captured yet. Click a simulation button above or send a webhook from PayPal Sandbox.
            </div>
          )}
          {!loading && events.length > 0 && (
            <div className="divide-y divide-line max-h-[500px] overflow-y-auto">
              {[...events].reverse().map((evt) => (
                <button
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className={`w-full p-4 text-left transition hover:bg-surface flex items-start justify-between gap-3 ${selectedEvent?.id === evt.id ? "bg-surface-strong ring-1 ring-primary/20" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge tone={statusTone(evt.verificationStatus)}>
                        {evt.verificationStatus}
                      </Badge>
                      <span className="text-xs font-mono text-subtle truncate">{evt.providerEventId}</span>
                    </div>
                    <p className="text-xs font-bold text-ink truncate">{evt.eventType}</p>
                    <p className="text-[0.7rem] text-subtle mt-0.5">{new Date(evt.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <span className="text-subtle shrink-0"><Icon name="chevron" size="sm" /></span>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Payload / Details Viewer */}
        <Card className="p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <Heading level={2}>Event Details</Heading>
            {selectedEvent && (
              <Badge tone={statusTone(selectedEvent.verificationStatus)}>
                {selectedEvent.verificationStatus}
              </Badge>
            )}
          </div>
          {selectedEvent ? (
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-subtle font-semibold block mb-0.5">Event Type:</span>
                <span className="font-mono font-bold text-ink">{selectedEvent.eventType}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-subtle font-semibold block mb-0.5">Provider ID:</span>
                  <span className="font-mono text-muted truncate block">{selectedEvent.providerEventId}</span>
                </div>
                <div>
                  <span className="text-subtle font-semibold block mb-0.5">Processing Result:</span>
                  <span className="font-semibold text-ink">{selectedEvent.processingResult ?? "PROCESSED"}</span>
                </div>
              </div>
              <div>
                <span className="text-subtle font-semibold block mb-1">Raw Payload (JSON):</span>
                <pre className="p-3 rounded-xl bg-surface border border-line font-mono text-[0.7rem] overflow-x-auto max-h-72 leading-relaxed text-ink">
                  {selectedEvent.rawPayload
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedEvent.rawPayload), null, 2)
                        } catch {
                          return selectedEvent.rawPayload
                        }
                      })()
                    : "No payload"}
                </pre>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted">
              Select an event on the left to inspect its signature verification and payload.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
