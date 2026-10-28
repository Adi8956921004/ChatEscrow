import { useState } from "react"
import type { Milestone, Project, Submission, AuditEvent } from "../../types"
import { formatMoney, statusLabel } from "../../data"
import { Icon, Button, Heading, Badge, InfoBanner } from "../ui"

export function DisputePackModal({ data, onClose }: { data: Record<string, unknown>; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const milestone = data.milestone as Milestone | undefined
  const project = data.project as Project | undefined
  const submissions = (data.submissions as Submission[]) ?? []
  const auditTimeline = (data.auditTimeline as AuditEvent[]) ?? []

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-line bg-white p-6 shadow-hero">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
              <Icon name="shield" size="sm" />
            </span>
            <div>
              <Heading level={2}>Evidence & Dispute Pack</Heading>
              <p className="text-xs text-muted">Auditable export for neutral resolution</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-surface" aria-label="Close modal">
            <Icon name="x" size="sm" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          <InfoBanner tone="blue">
            {String(data.disclaimer ?? "Assembled for transparency and neutral review.")}
          </InfoBanner>

          <div className="rounded-xl border border-line p-4 space-y-2 bg-surface">
            <p className="font-bold text-ink">Project: {project?.title ?? "E-commerce Website Development"}</p>
            <p className="text-xs text-muted">Client: {project?.clientName ?? "Sarah Miller"} · Freelancer: {project?.freelancerName ?? "Alex Carter"}</p>
            <p className="text-xs text-muted">Milestone: <strong className="text-ink">{milestone?.title}</strong> ({formatMoney(milestone?.amount)})</p>
            <p className="text-xs text-muted">Status: <Badge tone={milestone?.status === "ACCEPTED" ? "green" : "blue"}>{milestone?.status ? statusLabel[milestone.status] : "—"}</Badge></p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Agreed Acceptance Criteria</p>
            <div className="rounded-xl border border-line p-3 space-y-1 bg-white">
              {milestone?.acceptanceCriteria?.split("|").map((c, i) => (
                <div key={i} className="flex gap-2 text-xs text-ink">
                  <span className="text-primary mt-0.5"><Icon name="check" size="sm" /></span>
                  {c}
                </div>
              )) ?? <p className="text-xs text-muted">No criteria specified.</p>}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Submitted Evidence ({submissions.length})</p>
            <div className="space-y-2">
              {submissions.length === 0 ? (
                <p className="text-xs text-muted">No evidence submitted yet.</p>
              ) : submissions.map((s) => (
                <div key={s.id} className="rounded-xl border border-line p-3 text-xs space-y-1">
                  <div className="flex justify-between text-muted">
                    <span>By: {s.submittedBy}</span>
                    <span>{new Date(s.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-ink font-medium">{s.description}</p>
                  {s.evidenceLinks && <p className="text-primary font-mono">{s.evidenceLinks}</p>}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Audit Events ({auditTimeline.length})</p>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-line p-3 space-y-1 bg-surface text-xs font-mono">
              {auditTimeline.length === 0 ? (
                <p className="text-muted">No audit events recorded.</p>
              ) : auditTimeline.map((e) => (
                <div key={e.id} className="text-muted">
                  <span className="text-subtle">[{new Date(e.createdAt).toLocaleTimeString()}]</span>{" "}
                  <strong className="text-ink">{e.eventType}</strong> by {e.actorName ?? "System"}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? "Copied JSON!" : "Copy Pack JSON"}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  )
}
