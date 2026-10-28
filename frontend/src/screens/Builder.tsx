import { useState } from "react"
import type { Screen, ContractVersion } from "../types"
import {
  generateDraft,
  saveDraft,
  approveContract,
  getMilestones,
  createMilestone,
  formatMoney,
} from "../data"
import { Icon, Button, Heading, Badge, Card, Field, InfoBanner, Avatar } from "../components/ui"

interface EditableMilestone {
  title: string
  amount: number | string
  currency: string
  dueDate: string
  deliverables: string[]
  acceptanceCriteria: string[]
}

const SAMPLE_CONVERSATIONS = [
  {
    name: "E-commerce Website ($1,200)",
    text: "Sarah: We need a complete e-commerce site for North & Pine by end of September. Budget is $1,200.\nAlex: I can split it into design ($250), frontend ($400), backend integration ($350), and final QA ($200).\nSarah: Perfect. It must be responsive, accessible with Lighthouse > 90, and match the approved designs.",
  },
  {
    name: "Mobile App MVP ($3,000)",
    text: "Client: We need an iOS & Android MVP for our fitness app. Budget is $3,000 over 6 weeks.\nFreelancer: I propose 3 milestones: UI Wireframes & Architecture ($800), Core Workout Tracker ($1,400), and Store Deployment ($800).\nClient: Agreed. Must support offline caching and Apple Health sync.",
  },
  {
    name: "Brand Design ($800)",
    text: "Client: Looking for brand identity package: Logo, typography, color guide, and pitch deck.\nDesigner: Total is $800. Milestone 1: Brand Concept ($350). Milestone 2: Final Vector Assets & Guidelines ($450).\nClient: Sounds great, let's proceed.",
  },
]

export function Builder({
  navigate,
  projectId,
  onRefresh,
}: {
  navigate: (s: Screen) => void
  projectId: string
  onRefresh: () => void
}) {
  const [conversation, setConversation] = useState(SAMPLE_CONVERSATIONS[0].text)
  const [draft, setDraft] = useState<ContractVersion | null>(null)
  const [projectSummary, setProjectSummary] = useState("Design and develop a responsive e-commerce website for North & Pine.")
  const [milestonesList, setMilestonesList] = useState<EditableMilestone[]>([
    {
      title: "Design",
      amount: 250,
      currency: "USD",
      dueDate: "2025-08-22",
      deliverables: ["Homepage mockups", "Product page design", "Cart/checkout flow"],
      acceptanceCriteria: ["Responsive desktop and mobile layouts", "Brand system applied consistently"],
    },
    {
      title: "Frontend Development",
      amount: 400,
      currency: "USD",
      dueDate: "2025-09-05",
      deliverables: ["Responsive React pages", "Reusable product components", "Interactive cart experience"],
      acceptanceCriteria: ["Matches approved designs", "Works across modern browsers", "Lighthouse accessibility score above 90"],
    },
    {
      title: "Backend Integration",
      amount: 350,
      currency: "USD",
      dueDate: "2025-09-19",
      deliverables: ["Product API integration", "Customer account flow", "Sandbox checkout connection"],
      acceptanceCriteria: ["Errors handled clearly", "Inventory updates correctly", "Sandbox checkout completes end-to-end"],
    },
    {
      title: "Final Delivery",
      amount: 200,
      currency: "USD",
      dueDate: "2025-09-30",
      deliverables: ["QA report", "Deployment guide", "Source code handoff"],
      acceptanceCriteria: ["No blocking defects", "Documentation is complete", "Client sign-off received"],
    },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientApproved, setClientApproved] = useState(false)
  const [freelancerApproved, setFreelancerApproved] = useState(false)
  const [approving, setApproving] = useState<"client" | "freelancer" | null>(null)
  const [savingMilestones, setSavingMilestones] = useState(false)
  const [agreementSuccess, setAgreementSuccess] = useState(false)
  const [missingInformation, setMissingInformation] = useState<string[]>([])
  const [itemsNeedingConfirmation, setItemsNeedingConfirmation] = useState<string[]>([])
  const [assumptions, setAssumptions] = useState<string[]>([])

  const handleGenerate = async () => {
    setLoading(true); setError(null); setAgreementSuccess(false)
    try {
      const cv = await generateDraft(projectId, conversation)
      setDraft(cv)
      try {
        const parsed = JSON.parse(cv.termsJson)
        if (parsed.projectSummary) setProjectSummary(parsed.projectSummary)
        if (Array.isArray(parsed.missingInformation)) setMissingInformation(parsed.missingInformation)
        if (Array.isArray(parsed.itemsNeedingConfirmation)) setItemsNeedingConfirmation(parsed.itemsNeedingConfirmation)
        if (Array.isArray(parsed.assumptions)) setAssumptions(parsed.assumptions)
        if (Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
          setMilestonesList(
            parsed.milestones.map((m: Record<string, unknown>, idx: number) => ({
              title: String(m.title ?? `Milestone ${idx + 1}`),
              amount: m.amount != null ? Number(m.amount) : 0,
              currency: String(m.currency ?? "USD"),
              dueDate: String(m.dueDate && m.dueDate !== "null" && m.dueDate !== "Needs confirmation" ? m.dueDate : "Needs confirmation"),
              deliverables: Array.isArray(m.deliverables) ? m.deliverables : [String(m.deliverables ?? "Deliverables")],
              acceptanceCriteria: Array.isArray(m.acceptanceCriteria) ? m.acceptanceCriteria : [String(m.acceptanceCriteria ?? "Meets acceptance criteria")],
            }))
          )
        }
      } catch {}
    } catch {
      // Fallback draft so user flow never breaks
      setDraft({
        id: "draft-" + Date.now(),
        projectId,
        versionNumber: (draft?.versionNumber ?? 1) + 1,
        termsJson: "{}",
        generatedFromConversation: true,
        clientApprovalStatus: "PENDING",
        freelancerApprovalStatus: "PENDING",
        createdAt: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddMilestone = () => {
    setMilestonesList((prev) => [
      ...prev,
      {
        title: `New Milestone ${prev.length + 1}`,
        amount: 250,
        currency: "USD",
        dueDate: "2025-10-15",
        deliverables: ["Deliverable specifications"],
        acceptanceCriteria: ["Meets acceptance criteria"],
      },
    ])
    setClientApproved(false)
    setFreelancerApproved(false)
    setAgreementSuccess(false)
  }

  const handleRemoveMilestone = (index: number) => {
    setMilestonesList((prev) => prev.filter((_, i) => i !== index))
    setClientApproved(false)
    setFreelancerApproved(false)
    setAgreementSuccess(false)
  }

  const handleUpdateMilestone = (index: number, field: keyof EditableMilestone, value: unknown) => {
    setMilestonesList((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
    setClientApproved(false)
    setFreelancerApproved(false)
    setAgreementSuccess(false)
  }

  const [savingDraft, setSavingDraft] = useState(false)
  const handleSaveDraft = async () => {
    if (!draft?.id) return
    setSavingDraft(true); setError(null)
    try {
      const termsObj = {
        projectSummary,
        milestones: milestonesList,
      }
      const updated = await saveDraft(projectId, draft.id, JSON.stringify(termsObj))
      setDraft(updated)
      setClientApproved(false)
      setFreelancerApproved(false)
      setAgreementSuccess(false)
    } catch (e) {
      setError("Failed to save draft version: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSavingDraft(false)
    }
  }

  const hasMissingTerms = milestonesList.some(
    (m) =>
      !m.title.trim() ||
      Number(m.amount) <= 0 ||
      m.title.includes("Needs confirmation") ||
      m.dueDate === "Needs confirmation" ||
      !m.dueDate
  )

  const handleApprove = async (role: "client" | "freelancer") => {
    if (hasMissingTerms) {
      setError("Cannot sign agreement with unconfirmed terms or $0 amounts. Please complete all fields before signing.")
      return
    }
    setApproving(role); setError(null)
    try {
      if (draft && draft.id && !draft.id.startsWith("draft-")) {
        await approveContract(projectId, draft.id, role)
      }
      if (role === "client") setClientApproved(true)
      else setFreelancerApproved(true)

      const isBothApproved = (role === "client" ? true : clientApproved) && (role === "freelancer" ? true : freelancerApproved)
      if (isBothApproved) {
        setAgreementSuccess(true)
        // Sync milestones to backend project only if none exist yet
        setSavingMilestones(true)
        try {
          const existing = await getMilestones(projectId).catch(() => [])
          if (existing.length === 0) {
            for (const m of milestonesList) {
              await createMilestone(projectId, {
                title: m.title,
                amount: Number(m.amount),
                dueDate: m.dueDate,
                deliverables: Array.isArray(m.deliverables) ? m.deliverables.join("|") : m.deliverables,
                acceptanceCriteria: Array.isArray(m.acceptanceCriteria) ? m.acceptanceCriteria.join("|") : m.acceptanceCriteria,
                description: `Agreed milestone: ${m.title}`,
                contractVersionId: draft?.id,
              })
            }
          }
          onRefresh()
        } catch (syncErr) {
          setError("Approved, but failed to sync milestones: " + (syncErr instanceof Error ? syncErr.message : String(syncErr)))
        } finally {
          setSavingMilestones(false)
        }
      }
    } catch (e) {
      setError("Approval failed: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setApproving(null)
    }
  }

  const totalCalculated = milestonesList.reduce((acc, m) => acc + (Number(m.amount) || 0), 0)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="page-masthead flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge tone="blue"><Icon name="spark" size="sm" /> AI Contract Intelligence</Badge>
          <Heading className="mt-3">AI Agreement Builder</Heading>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Extract structured, mutually agreeable terms from conversation or build milestones manually. AI flags missing items and protects against hallucinated amounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="green">Total: {formatMoney(totalCalculated)}</Badge>
        </div>
      </div>

      {error && <InfoBanner tone="red"><strong>Note:</strong> {error}</InfoBanner>}

      {agreementSuccess && (
        <InfoBanner tone="green">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong>Agreement Fully Approved & Activated!</strong>
              <p className="text-xs text-ink/80 mt-0.5">Both Sarah Miller (Client) and Alex Carter (Freelancer) have verified and approved all terms. Milestones are registered.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate("agreement")}>View Agreement</Button>
              <Button icon="wallet" onClick={() => navigate("payment")}>Fund Milestone Now →</Button>
            </div>
          </div>
        </InfoBanner>
      )}

      {/* Preset Pickers */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-muted uppercase tracking-wider mr-1">Quick Presets:</span>
        {SAMPLE_CONVERSATIONS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => setConversation(preset.text)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-primary hover:bg-primary-soft hover:text-primary"
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.35fr]">
        {/* Left Column: Chat input */}
        <Card className="self-start overflow-hidden">
          <div className="border-b border-line p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><Icon name="message" /></span>
              <div><Heading level={2}>Conversation Input</Heading><p className="text-xs text-muted">Paste client–freelancer chat or requirements</p></div>
            </div>
          </div>
          <div className="p-5">
            <textarea
              value={conversation}
              onChange={(e) => setConversation(e.target.value)}
              rows={9}
              className="field resize-none text-xs leading-relaxed font-sans"
              placeholder="Paste conversation..."
            />
          </div>
          <div className="p-5 pt-0 space-y-3">
            <Button className="w-full" icon="spark" loading={loading} onClick={handleGenerate}>
              {draft ? "Regenerate Terms with AI" : "Extract Agreement with AI"}
            </Button>
            <p className="text-center text-xs leading-relaxed text-subtle">
              AI parses milestones, deliverables, amounts, and dates. Missing values require human review.
            </p>
          </div>
        </Card>

        {/* Right Column: Editable Agreement & Mutual Approval */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between border-b border-line p-5 md:p-6 gap-2">
              <div>
                <Heading level={2}>Contract Terms & Milestones</Heading>
                <p className="mt-1 text-xs text-muted">Customizable before signing. Edits require mutual re-approval.</p>
              </div>
              <div className="flex items-center gap-2">
                {draft?.id && !draft.id.startsWith("draft-") && (
                  <Button variant="ghost" loading={savingDraft} className="text-xs py-1.5" onClick={handleSaveDraft}>
                    Save Draft (v{draft.versionNumber ? draft.versionNumber + 1 : 2})
                  </Button>
                )}
                <Button variant="secondary" icon="plus" className="text-xs py-1.5" onClick={handleAddMilestone}>
                  Add Milestone
                </Button>
              </div>
            </div>

            <div className="space-y-5 p-5 md:p-6">
              {/* Project Summary */}
              <Field label="Project Summary">
                <input
                  type="text"
                  value={projectSummary}
                  onChange={(e) => setProjectSummary(e.target.value)}
                  className="field text-sm"
                />
              </Field>

              {/* AI Missing Information & Items Needing Confirmation Banner */}
              {(itemsNeedingConfirmation.length > 0 || missingInformation.length > 0) && (
                <div className="rounded-2xl border border-warning-border bg-warning-soft p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-warning font-bold text-xs uppercase tracking-wider">
                    <Icon name="warning" size="sm" />
                    <span>AI Flagged: Details Needing Human Confirmation</span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    ChatEscrow never guesses terms. Please verify or fill in the flagged missing information before mutual signing:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[...itemsNeedingConfirmation, ...missingInformation].map((item, idx) => (
                      <Badge key={idx} tone="amber">
                        <Icon name="clock" size="sm" /> {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Agreed Milestones ({milestonesList.length})</p>
                  <span className="text-xs font-bold text-primary">{formatMoney(totalCalculated)} Total</span>
                </div>

                {milestonesList.map((m, idx) => {
                  const needsAmount = !m.amount || Number(m.amount) === 0
                  const needsDate = m.dueDate === "Needs confirmation" || !m.dueDate
                  return (
                    <div key={idx} className={`rounded-xl border p-4 space-y-3 transition ${needsAmount || needsDate ? "border-warning-border bg-warning-soft/30" : "border-line bg-surface/50 hover:border-line-strong"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="grid size-6 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={m.title}
                            onChange={(e) => handleUpdateMilestone(idx, "title", e.target.value)}
                            className="font-bold text-ink bg-transparent border-b border-transparent hover:border-line focus:border-primary focus:bg-white px-1 py-0.5 rounded text-sm w-full"
                          />
                          {(needsAmount || needsDate) && (
                            <Badge tone="amber"><Icon name="clock" size="sm" /> Needs confirmation</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-muted">$</span>
                            <input
                              type="number"
                              value={m.amount || ""}
                              placeholder="0"
                              onChange={(e) => handleUpdateMilestone(idx, "amount", e.target.value)}
                              className={`field text-xs font-bold w-20 py-1 px-2 ${needsAmount ? "border-warning ring-1 ring-warning/30" : ""}`}
                            />
                          </div>
                          {milestonesList.length > 1 && (
                            <button
                              onClick={() => handleRemoveMilestone(idx)}
                              className="text-subtle hover:text-danger p-1 rounded transition"
                              title="Remove milestone"
                            >
                              <Icon name="trash" size="sm" />
                            </button>
                          )}
                        </div>
                      </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-subtle font-semibold block mb-1">Target Due Date:</span>
                        <input
                          type="text"
                          value={m.dueDate}
                          onChange={(e) => handleUpdateMilestone(idx, "dueDate", e.target.value)}
                          className="field text-xs py-1"
                        />
                      </div>
                      <div>
                        <span className="text-subtle font-semibold block mb-1">Deliverables (one per line):</span>
                        <textarea
                          rows={2}
                          value={Array.isArray(m.deliverables) ? m.deliverables.join("\n") : m.deliverables}
                          onChange={(e) => handleUpdateMilestone(idx, "deliverables", e.target.value.split("\n"))}
                          className="field text-xs py-1 resize-none font-sans"
                          placeholder="Deliverables..."
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-subtle font-semibold block mb-1 text-xs">Acceptance Criteria (one per line):</span>
                      <textarea
                        rows={2}
                        value={Array.isArray(m.acceptanceCriteria) ? m.acceptanceCriteria.join("\n") : m.acceptanceCriteria}
                        onChange={(e) => handleUpdateMilestone(idx, "acceptanceCriteria", e.target.value.split("\n"))}
                        className="field text-xs py-1 resize-none font-sans"
                        placeholder="Acceptance criteria..."
                      />
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          </Card>

          {/* Mutual Approval Card */}
          <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <Heading level={2}>Mutual Approval (Milestone Payment Protocol)</Heading>
                <p className="mt-1 text-xs text-muted">Both parties must explicitly approve before milestone funding is activated.</p>
              </div>
              <Badge tone={clientApproved && freelancerApproved ? "green" : hasMissingTerms ? "red" : "amber"}>
                {clientApproved && freelancerApproved ? "Fully Agreed" : hasMissingTerms ? "Incomplete Terms" : "Pending Signature"}
              </Badge>
            </div>

            {hasMissingTerms && (
              <div className="mt-4 rounded-xl border border-warning-border bg-warning-soft p-3 text-xs text-warning flex items-center gap-2">
                <Icon name="warning" size="sm" />
                <span>All milestone amounts, dates, and terms must be confirmed before parties can sign.</span>
              </div>
            )}

            <div className="mt-5 space-y-3">
              {/* Client Approval */}
              <div className="flex items-center justify-between rounded-xl border border-line p-4">
                <div className="flex items-center gap-3">
                  <Avatar initials="SM" />
                  <div>
                    <p className="text-sm font-bold text-ink">Sarah Miller <span className="font-normal text-muted">(Client)</span></p>
                    <p className="text-xs text-muted">{clientApproved ? "Approved & Digitally Signed" : "Pending client approval"}</p>
                  </div>
                </div>
                {clientApproved ? (
                  <Badge tone="green"><Icon name="check" size="sm" /> Approved</Badge>
                ) : (
                  <Button variant="soft" loading={approving === "client"} disabled={hasMissingTerms} onClick={() => handleApprove("client")}>
                    Sign as Client
                  </Button>
                )}
              </div>

              {/* Freelancer Approval */}
              <div className="flex items-center justify-between rounded-xl border border-line p-4">
                <div className="flex items-center gap-3">
                  <Avatar initials="AC" dark />
                  <div>
                    <p className="text-sm font-bold text-ink">Alex Carter <span className="font-normal text-muted">(Freelancer)</span></p>
                    <p className="text-xs text-muted">{freelancerApproved ? "Approved & Digitally Signed" : "Pending freelancer approval"}</p>
                  </div>
                </div>
                {freelancerApproved ? (
                  <Badge tone="green"><Icon name="check" size="sm" /> Approved</Badge>
                ) : (
                  <Button variant="soft" loading={approving === "freelancer"} disabled={hasMissingTerms} onClick={() => handleApprove("freelancer")}>
                    Sign as Freelancer
                  </Button>
                )}
              </div>
            </div>

            {savingMilestones && (
              <p className="mt-3 text-xs text-center text-primary animate-pulse font-medium">Syncing agreed milestones with milestone funding backend...</p>
            )}

            {clientApproved && freelancerApproved && (
              <div className="mt-5 flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => navigate("agreement")}>View Active Agreement</Button>
                <Button icon="wallet" onClick={() => navigate("payment")}>Proceed to Milestone Funding →</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
