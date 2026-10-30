import { useState, useEffect } from "react"
import type { Screen, Milestone, ContractVersion, Project } from "../types"
import {
  getMilestones,
  getContractVersions,
  getProject,
  createMilestone,
  formatMoney,
  statusLabel,
} from "../data"
import { Icon, Button, Heading, Badge, Card, Field, InfoBanner, Spinner } from "../components/ui"

export function Agreement({
  navigate,
  projectId,
  onRefresh,
}: {
  navigate: (s: Screen) => void
  projectId: string
  onRefresh: () => void
}) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [contracts, setContracts] = useState<ContractVersion[]>([])
  const [selected, setSelected] = useState<Milestone | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newAmount, setNewAmount] = useState("300")
  const [newDueDate, setNewDueDate] = useState("2025-10-10")
  const [newDeliverables, setNewDeliverables] = useState("")
  const [newCriteria, setNewCriteria] = useState("")

  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    Promise.all([getMilestones(projectId), getContractVersions(projectId), getProject(projectId)])
      .then(([ms, cvs, p]) => {
        setMilestones(ms)
        setContracts(cvs)
        setProject(p)
        setSelected(ms.find((m) => m.status === "SUBMITTED") ?? ms[0] ?? null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load agreement data. Check backend connectivity."))
      .finally(() => setLoading(false))
  }, [projectId])

  const handleCreateNewMilestone = async () => {
    if (!newTitle.trim()) return
    setError(null)
    try {
      const created = await createMilestone(projectId, {
        title: newTitle,
        amount: parseFloat(newAmount) || 200,
        dueDate: newDueDate,
        deliverables: newDeliverables || "Deliverable specification",
        acceptanceCriteria: newCriteria || "Accepted by client",
        description: `Custom milestone: ${newTitle}`,
      })
      setMilestones((prev) => [...prev, created])
      setSelected(created)
      setShowAddModal(false)
      setNewTitle("")
      onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create milestone. Please try again.")
    }
  }

  const latestContract = contracts[0]
  const statusTone = (s: string): "green" | "blue" | "amber" | "gray" | "red" => {
    if (s === "ACCEPTED") return "green"
    if (s === "SUBMITTED") return "blue"
    if (s === "REVISION_REQUESTED" || s === "DISAGREEMENT_FLAGGED") return "amber"
    return "gray"
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {error && <InfoBanner tone="red">{error}</InfoBanner>}
      <div className="page-masthead flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="green">Active Project</Badge>
            <Badge tone="green"><Icon name="check" size="sm" /> Terms Agreed</Badge>
          </div>
          <Heading>{project?.title || "Agreed Project Milestones"}</Heading>
          <p className="mt-2 text-sm text-muted">
            {project?.clientName || "Sarah Miller"} (Client) ↔ {project?.freelancerName || "Alex Carter"} (Freelancer) · Milestone Payment Protection
          </p>
          {project?.description && (
            <p className="mt-1 text-xs text-muted max-w-2xl">{project.description}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon="plus" onClick={() => setShowAddModal(true)}>+ Add Milestone</Button>
          <Button variant="secondary" icon="edit" onClick={() => navigate("builder")}>Edit Agreement</Button>
          <Button icon="wallet" onClick={() => navigate("payment")}>Fund Milestone</Button>
        </div>
      </div>

      {showAddModal && (
        <Card className="p-5 border-primary-border bg-primary-soft/30 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <Heading level={2}>Add Milestone to Agreement</Heading>
            <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-ink"><Icon name="x" size="sm" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Milestone Title">
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g., Performance Optimization" className="field" />
            </Field>
            <Field label="Amount ($ USD)">
              <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="field" />
            </Field>
            <Field label="Due Date">
              <input value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="field" />
            </Field>
          </div>
          <Field label="Deliverables (separated by | )">
            <input value={newDeliverables} onChange={(e) => setNewDeliverables(e.target.value)} placeholder="Speed test audit|Image compression pipeline" className="field" />
          </Field>
          <Field label="Acceptance Criteria (separated by | )">
            <input value={newCriteria} onChange={(e) => setNewCriteria(e.target.value)} placeholder="Lighthouse speed > 95|Zero console warnings" className="field" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleCreateNewMilestone} disabled={!newTitle.trim()}>Save Milestone</Button>
          </div>
        </Card>
      )}

      {latestContract && (
        <Card className="p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-muted">Contract version</p>
              <p className="mt-1 font-bold text-ink">Version {latestContract.versionNumber} · Mutually Agreed</p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-xs text-muted">Client</p>
                <Badge tone="green"><Icon name="check" size="sm" /> Approved</Badge>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted">Freelancer</p>
                <Badge tone="green"><Icon name="check" size="sm" /> Approved</Badge>
              </div>
            </div>
            <Button variant="soft" icon="wallet" onClick={() => navigate("payment")}>Fund Milestone</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-line p-5 md:p-6 flex items-center justify-between">
            <div>
              <Heading level={2}>Milestone Timeline</Heading>
              <p className="mt-1 text-sm text-muted">Select any milestone to inspect criteria, evidence, and release actions.</p>
            </div>
            <Badge tone="blue">{milestones.length} Milestones</Badge>
          </div>
          <div className="p-5 md:p-6 space-y-2">
            {milestones.length === 0 ? (
              <div className="p-6 text-center text-muted">
                <p className="text-sm">No milestones found.</p>
                <Button className="mt-3" onClick={() => setShowAddModal(true)}>Add your first milestone</Button>
              </div>
            ) : milestones.map((milestone, index) => (
              <button key={milestone.id} onClick={() => setSelected(milestone)}
                className={`relative flex w-full gap-4 rounded-xl p-3 text-left transition hover:bg-surface ${selected?.id === milestone.id ? "bg-primary-soft ring-1 ring-primary/30" : ""}`}>
                {index < milestones.length - 1 && <span className="absolute left-7 top-11 h-9 w-px bg-line" />}
                <span className={`z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 ${milestone.status === "ACCEPTED" ? "border-success bg-success text-white" : milestone.status === "SUBMITTED" ? "border-primary bg-primary text-white" : "border-line-strong bg-white text-subtle"}`}>
                  {milestone.status === "ACCEPTED" ? <Icon name="check" size="sm" /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-ink">{milestone.title}</p>
                    <p className="text-sm font-extrabold text-ink">{formatMoney(milestone.amount)}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-xs text-muted">Due {milestone.dueDate ?? "TBD"}</p>
                    <Badge tone={statusTone(milestone.status)}>{statusLabel[milestone.status]}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {selected && (
          <Card className="overflow-hidden">
            <div className="border-b border-line p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <Heading level={2}>{selected.title}</Heading>
                  <p className="mt-1 text-sm text-muted">Due {selected.dueDate ?? "TBD"} · {formatMoney(selected.amount)} USD</p>
                </div>
                <Badge tone={statusTone(selected.status)}>{statusLabel[selected.status]}</Badge>
              </div>
            </div>
            <div className="space-y-5 p-5 md:p-6">
              <p className="text-sm leading-relaxed text-muted">{selected.description || "Milestone deliverable specification."}</p>
              {selected.deliverables && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Deliverables</p>
                  <div className="space-y-1">
                    {selected.deliverables.split("|").map((d, i) => (
                      <div key={i} className="flex gap-2 text-sm text-ink"><span className="mt-0.5 text-success"><Icon name="check" size="sm" /></span>{d}</div>
                    ))}
                  </div>
                </div>
              )}
              {selected.acceptanceCriteria && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Acceptance Criteria</p>
                  <div className="space-y-1">
                    {selected.acceptanceCriteria.split("|").map((c, i) => (
                      <div key={i} className="flex gap-2 text-sm text-ink"><span className="mt-0.5 text-primary"><Icon name="check" size="sm" /></span>{c}</div>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2 space-y-2">
                {selected.status === "SUBMITTED" && (
                  <Button className="w-full" icon="search" onClick={() => navigate("review")}>Open AI Work Review</Button>
                )}
                {selected.status === "NOT_STARTED" && (
                  <Button className="w-full" variant="secondary" icon="wallet" onClick={() => navigate("payment")}>Fund Milestone (Sandbox / Fake Money)</Button>
                )}
                {selected.status === "ACCEPTED" && (
                  <div className="space-y-2">
                    <InfoBanner tone="green">Milestone completed and accepted.</InfoBanner>
                    <Button className="w-full" icon="wallet" onClick={() => navigate("review")}>View Review & Payout Release</Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
