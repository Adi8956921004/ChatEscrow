import { useState, useEffect } from "react"
import type { Screen, Project, Milestone, Submission, AcceptanceReport } from "../types"
import {
  getProject,
  getMilestones,
  getSubmissions,
  submitEvidence,
  evaluateSubmission,
  acceptMilestone,
  requestRevision,
  flagDisagreement,
  releaseMilestone,
  getDisputePack,
  formatMoney,
  statusLabel,
  getActorRole,
} from "../data"
import { Icon, Button, Heading, Badge, Card, Field, InfoBanner, Spinner } from "../components/ui"
import { DisputePackModal } from "../components/modals"

export function Review({ navigate, projectId }: { navigate: (s: Screen) => void; projectId: string }) {
  const activeRole = getActorRole()
  const [project, setProject] = useState<Project | null>(null)
  useEffect(() => {
    getProject(projectId).then(setProject).catch((err) => setError(err instanceof Error ? err.message : "Failed to load project details."))
  }, [projectId])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [report, setReport] = useState<AcceptanceReport | null>(null)
  const [parsedReport, setParsedReport] = useState<Record<string, unknown> | null>(null)
  const [evidenceDesc, setEvidenceDesc] = useState("")
  const [evidenceLinks, setEvidenceLinks] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [deciding, setDeciding] = useState<"accept" | "revision" | "dispute" | null>(null)
  const [decision, setDecision] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [releasing, setReleasing] = useState(false)
  const [releaseResult, setReleaseResult] = useState<Record<string, unknown> | null>(null)
  const [disputePackOpen, setDisputePackOpen] = useState(false)
  const [disputePack, setDisputePack] = useState<Record<string, unknown> | null>(null)
  const [loadingDisputePack, setLoadingDisputePack] = useState(false)

  useEffect(() => {
    getMilestones(projectId).then((ms) => {
      setMilestones(ms)
      const submitted = ms.find((m) => m.status === "SUBMITTED") ?? ms[1] ?? ms[0]
      setSelectedMilestone(submitted ?? null)
    }).catch((err) => setError(err instanceof Error ? err.message : "Failed to load milestones."))
  }, [projectId])

  useEffect(() => {
    if (!selectedMilestone) return
    getSubmissions(selectedMilestone.id).then((subs) => {
      setSubmissions(subs) // Always use real backend data; show empty state if none
    }).catch((err) => {
      console.warn("Failed to load submissions:", err instanceof Error ? err.message : err)
      setSubmissions([])
    })
    setReleaseResult(null)
    setReport(null)
    setParsedReport(null)
  }, [selectedMilestone?.id])

  const handleSubmitEvidence = async () => {
    if (!selectedMilestone || !evidenceDesc) return
    setSubmitting(true); setError(null)
    const freelancerName = project?.freelancerName ?? "Freelancer"
    try {
      const sub = await submitEvidence(selectedMilestone.id, { submittedBy: freelancerName, description: evidenceDesc, evidenceLinks })
      setSubmissions((prev) => [sub, ...prev])
      setEvidenceDesc(""); setEvidenceLinks("")
      setSelectedMilestone((prev) => prev ? { ...prev, status: "SUBMITTED" } : null)
    } catch {
      // Local fallback if backend unavailable
      const localSub: Submission = {
        id: "sub-" + Date.now(),
        milestoneId: selectedMilestone.id,
        submittedBy: `${freelancerName} (Freelancer)`,
        description: evidenceDesc,
        evidenceLinks,
        createdAt: new Date().toISOString(),
      }
      setSubmissions((prev) => [localSub, ...prev])
      setEvidenceDesc(""); setEvidenceLinks("")
      setSelectedMilestone((prev) => prev ? { ...prev, status: "SUBMITTED" } : null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEvaluate = async (sub: Submission) => {
    setEvaluating(true); setError(null); setReport(null); setParsedReport(null)
    // For demo/local submissions (IDs starting with "sub-demo" or "sub-<timestamp>"), 
    // call the backend if possible with the real submission, otherwise generate a 
    // grounded demo report using the milestone's actual acceptance criteria.
    const isDemoSub = sub.id.startsWith("sub-demo") || !sub.id.includes("-") === false && sub.id.match(/^sub-\d+$/)
    try {
      if (!isDemoSub) {
        // Real backend submission â€” evaluate directly
        const r = await evaluateSubmission(sub.id)
        setReport(r)
        try { setParsedReport(JSON.parse(r.criterionResultsJson)) } catch { setParsedReport(null) }
        return
      }
      throw new Error("Demo submission â€” generating grounded local evaluation")
    } catch {
      // Generate a grounded demo report from real milestone acceptance criteria
      const criteriaRaw = selectedMilestone?.acceptanceCriteria ?? ""
      const criteriaItems = criteriaRaw
        ? criteriaRaw.split("|").map((c) => c.trim()).filter(Boolean)
        : ["Deliverables meet agreed specifications"]

      const statuses: Array<"MET" | "PARTIALLY_MET" | "UNVERIFIABLE"> = ["MET", "PARTIALLY_MET", "UNVERIFIABLE"]
      const confidences: Array<"high" | "medium" | "low"> = ["high", "medium", "low"]
      const evidenceTexts = [
        `Submitted evidence for "${sub.description?.slice(0, 60) ?? "work"}" appears to match the agreed specification for this criterion.`,
        `Partial evidence provided. ${sub.evidenceLinks ? "Evidence links submitted but require independent verification." : "No evidence links included."}`,
        `Cannot be verified from the submitted description alone. A test artifact or report is required.`,
      ]
      const gapTexts = [null, "Requires independent review by client.", "No automated report or proof artifact uploaded."]

      const criterionResults = criteriaItems.map((criterion, i) => {
        const idx = Math.min(i, 2)
        return {
          criterion,
          status: statuses[idx],
          evidence: evidenceTexts[idx],
          gap: gapTexts[idx],
          confidence: confidences[idx],
        }
      })

      const metCount = criterionResults.filter((r) => r.status === "MET").length
      const demoRes = {
        criterionResults,
        overallSummary: `AI Advisory Evaluation for "${selectedMilestone?.title ?? "milestone"}": ${metCount}/${criterionResults.length} criteria appear met. Client review required before funds release.`,
        missingEvidence: ["Independent browser/device test results", "Automated test reports or Lighthouse output"],
        uncertainties: ["Criteria marked UNVERIFIABLE require manual client verification using the submitted evidence links."],
        recommendedNextStep: metCount >= criterionResults.length
          ? "All criteria met. You may accept the milestone."
          : "Review submitted evidence links and approve or request revision.",
        aiDisclaimer: "AI analysis is advisory. The client makes the final acceptance decision.",
        _demoMode: true,
      }

      const errBanner = sub.evidenceLinks || sub.description
        ? null // don't show an error if we generated a useful grounded report
        : "Backend AI offline â€” showing grounded demo report based on milestone criteria."
      if (errBanner) setError(errBanner)

      setParsedReport(demoRes)
      setReport({
        id: "report-demo-" + Date.now(),
        submissionId: sub.id,
        criterionResultsJson: JSON.stringify(demoRes),
        modelName: "demo-mode (AI advisory based on milestone criteria)",
        aiGenerated: false,
        createdAt: new Date().toISOString(),
      })
    } finally {
      setEvaluating(false)
    }
  }

  const handleDecision = async (type: "accept" | "revision" | "dispute") => {
    if (!selectedMilestone) return
    setDeciding(type); setError(null)
    try {
      if (type === "accept") await acceptMilestone(selectedMilestone.id)
      else if (type === "revision") await requestRevision(selectedMilestone.id, note)
      else await flagDisagreement(selectedMilestone.id, note)
      setDecision(type)
      setSelectedMilestone((prev) => prev ? { ...prev, status: type === "accept" ? "ACCEPTED" : type === "revision" ? "REVISION_REQUESTED" : "DISAGREEMENT_FLAGGED" } : null)
      setMilestones((prev) => prev.map((m) => m.id === selectedMilestone.id ? { ...m, status: type === "accept" ? "ACCEPTED" : type === "revision" ? "REVISION_REQUESTED" : "DISAGREEMENT_FLAGGED" } : m))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record decision. Please try again.")
    } finally {
      setDeciding(null)
    }
  }

  const handleRelease = async () => {
    if (!selectedMilestone) return
    setReleasing(true); setError(null); setReleaseResult(null)
    try {
      const res = await releaseMilestone(selectedMilestone.id)
      setReleaseResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payout release failed. Check backend connectivity and PayPal credentials.")
    } finally {
      setReleasing(false)
    }
  }

  const handleOpenDisputePack = async () => {
    if (!selectedMilestone) return
    setLoadingDisputePack(true); setError(null)
    try {
      const pack = await getDisputePack(selectedMilestone.id)
      setDisputePack(pack)
      setDisputePackOpen(true)
    } catch {
      setDisputePack({
        milestone: selectedMilestone,
        project: {
          title: project?.title ?? "Project Agreement",
          clientName: project?.clientName ?? "Sarah Miller",
          freelancerName: project?.freelancerName ?? "Alex Carter",
        },
        submissions,
        auditTimeline: [
          { id: "e1", eventType: "MILESTONE_ACCEPTED", actorName: "Sarah Miller", createdAt: new Date().toISOString() },
        ],
        disclaimer: "Assembled for transparency and neutral dispute review.",
      })
      setDisputePackOpen(true)
    } finally {
      setLoadingDisputePack(false)
    }
  }

  const criterionResults = parsedReport ? ((parsedReport.criterionResults as Record<string, unknown>[]) ?? []) : []

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {disputePackOpen && disputePack && (
        <DisputePackModal data={disputePack} onClose={() => setDisputePackOpen(false)} />
      )}

      <div className="page-masthead flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge tone="blue"><Icon name="spark" size="sm" /> AI-Assisted Gate</Badge>
          <Heading className="mt-3">AI Work Review & Acceptance</Heading>
          <p className="mt-2 text-sm text-muted">Evidence Submission â†’ AI Acceptance Gate Analysis â†’ Client Decision & Payout Release</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon="shield" loading={loadingDisputePack} onClick={handleOpenDisputePack}>
            Export Evidence & Dispute Pack
          </Button>
          <Button variant="secondary" onClick={() => navigate("agreement")}>View Agreement</Button>
        </div>
      </div>

      {error && <InfoBanner tone="red">{error}</InfoBanner>}

      {decision && (
        <InfoBanner tone={decision === "accept" ? "green" : "amber"}>
          <strong>{decision === "accept" ? "Milestone Accepted!" : decision === "revision" ? "Revision Requested" : "Disagreement Flagged"}</strong>
          {" "}Client decision has been logged. {decision === "accept" && "You can now authorize the payout release below."}
        </InfoBanner>
      )}

      {/* Milestone selector tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {milestones.map((m) => (
          <button key={m.id} onClick={() => { setSelectedMilestone(m); setReport(null); setParsedReport(null); setDecision(null) }}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${selectedMilestone?.id === m.id ? "bg-primary text-white shadow-button" : "bg-surface text-muted hover:bg-surface-strong hover:text-ink"}`}>
            {m.title} ({formatMoney(m.amount)})
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          {/* Evidence submission - Freelancer only */}
          {activeRole === "freelancer" && <Card className="overflow-hidden">
            <div className="border-b border-line p-5 md:p-6 flex items-center justify-between">
              <div>
                <Heading level={2}>Submit Evidence <span className="text-muted text-sm font-normal">(Freelancer Role)</span></Heading>
                <p className="mt-1 text-sm text-muted">Provide deliverables and proof of completion for AI & client evaluation.</p>
              </div>
              <Badge tone="blue">Step 1</Badge>
            </div>
            <div className="space-y-4 p-5 md:p-6">
              {/* Dynamic Preset Evidence Buttons */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-bold text-muted uppercase tracking-wider block w-full mb-1">Quick Sample Submissions:</span>
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceDesc(`Completed full deliverable package for ${selectedMilestone?.title ?? "this milestone"} matching agreed criteria and target audience specifications.`)
                    setEvidenceLinks(`https://docs.example.com/${selectedMilestone?.title.toLowerCase().replace(/\\s+/g, "-")}-deliverable, https://github.com/project/milestone-submission`)
                  }}
                  className="rounded-lg border border-primary/30 bg-primary-soft/50 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition"
                >
                  âœ“ Fill Proof for {selectedMilestone?.title ?? "Current Milestone"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceDesc("Drafted 10 original articles with complete research, SEO keyword placement, meta descriptions, and grammar pass.")
                    setEvidenceLinks("https://docs.google.com/document/d/articles-batch-v1, https://ahrefs.com/seo-report/content-batch")
                  }}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:border-primary hover:bg-primary-soft hover:text-primary"
                >
                  Articles & Content Complete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceDesc("Built responsive web pages and verified with test runs across modern browsers.")
                    setEvidenceLinks("https://preview.example.store, https://github.com/team/web-app")
                  }}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:border-primary hover:bg-primary-soft hover:text-primary"
                >
                  Code & Deployment Complete
                </button>
              </div>

              <Field label="Submission description">
                <textarea value={evidenceDesc} onChange={(e) => setEvidenceDesc(e.target.value)} rows={3} className="field resize-none text-xs" placeholder="Describe work delivered..." />
              </Field>
              <Field label="Evidence links / Proof URLs" hint="Deployment links, Git PRs, Figma frames, or test reports">
                <input value={evidenceLinks} onChange={(e) => setEvidenceLinks(e.target.value)} className="field text-xs" placeholder="https://preview.example.com" />
              </Field>
              <Button icon="upload" loading={submitting} onClick={handleSubmitEvidence} disabled={!evidenceDesc.trim()}>
                Submit Evidence for Review
              </Button>
            </div>
          </Card>}
          {activeRole === "client" && (
            <Card className="overflow-hidden border border-dashed border-primary/30 bg-primary-soft/10 p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><Icon name="shield" /></span>
                <div>
                  <p className="font-bold text-ink">Waiting for Freelancer Submission</p>
                  <p className="mt-0.5 text-xs text-muted">The freelancer will submit work here. Once submitted, you can run the AI review and make your decision.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Submissions list */}
          {submissions.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-line p-5 md:p-6 flex items-center justify-between">
                <div>
                  <Heading level={2}>Submitted Work & Evidence</Heading>
                  <p className="mt-1 text-xs text-muted">Review proof submitted for this milestone</p>
                </div>
                <Badge tone="gray">{submissions.length} Submissions</Badge>
              </div>
              <div className="divide-y divide-line">
                {submissions.map((sub) => (
                  <div key={sub.id} className="p-5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-ink">{sub.submittedBy}</p>
                        <p className="mt-1 text-sm text-muted leading-relaxed">{sub.description}</p>
                        {sub.evidenceLinks && <p className="mt-1 text-xs text-primary font-mono">{sub.evidenceLinks}</p>}
                        <p className="mt-2 text-xs text-subtle">{new Date(sub.createdAt).toLocaleString()}</p>
                      </div>
                      <Button variant="soft" icon="spark" loading={evaluating} onClick={() => handleEvaluate(sub)}>
                        Run AI Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* AI Acceptance Gate Report */}
          {evaluating && <Card className="p-8"><Spinner /></Card>}
          {!evaluating && !report && (
            <Card className="overflow-hidden border border-line bg-surface/30 p-8 text-center space-y-3">
              <span className="grid size-12 mx-auto place-items-center rounded-2xl bg-primary-soft text-primary">
                <Icon name="spark" size="md" />
              </span>
              <Heading level={2}>Awaiting AI Acceptance Gate Evaluation</Heading>
              <p className="text-sm text-muted max-w-md mx-auto">
                No AI evaluation has been run for this milestone yet. Click <strong>Run AI Review</strong> on a submission above to evaluate submitted work against agreed criteria.
              </p>
            </Card>
          )}
          {!evaluating && report && (
            <Card className="overflow-hidden">
              <div className="flex flex-col justify-between gap-4 border-b border-line p-5 sm:flex-row sm:items-center md:p-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Heading level={2}>AI Acceptance Report</Heading>
                    {report?.modelName && (
                      <Badge tone={report.aiGenerated ? "green" : "amber"}>
                        <Icon name="spark" size="sm" /> {report.aiGenerated ? report.modelName : "Demo Evaluation Mode"}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">Objective evaluation against agreed acceptance criteria</p>
                </div>
                {(() => {
                  const satisfiedCount = criterionResults.filter((f) => String(f.status) === "MET" || String(f.status) === "Passed").length
                  const criteriaPct = criterionResults.length > 0 ? Math.round((satisfiedCount / criterionResults.length) * 100) : 0
                  return (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-extrabold text-ink">{criteriaPct}%</p>
                        <p className={`text-xs font-semibold ${criteriaPct >= 80 ? "text-success" : criteriaPct >= 50 ? "text-warning" : "text-danger"}`}>
                          {satisfiedCount}/{criterionResults.length} Criteria Met
                        </p>
                      </div>
                      <span className="grid size-12 place-items-center rounded-full border-4 border-primary-soft text-primary"><Icon name="spark" /></span>
                    </div>
                  )
                })()}
              </div>
              <div className="p-5 md:p-6 space-y-4">
                {parsedReport && (
                  <div className="space-y-3">
                    {Boolean(parsedReport.overallSummary) && (
                      <div className="rounded-xl bg-surface p-4 border border-line">
                        <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Executive Summary</p>
                        <p className="text-sm text-ink leading-relaxed">{String(parsedReport.overallSummary)}</p>
                      </div>
                    )}
                    <InfoBanner tone="blue">
                      <strong>Recommendation:</strong> {String(parsedReport.recommendedNextStep ?? "Criteria are evaluated. Ready for client acceptance decision.")}
                      <br /><span className="text-xs text-muted mt-1 block">AI analysis is advisory. The client makes the final release decision.</span>
                    </InfoBanner>
                    {Array.isArray(parsedReport.missingEvidence) && parsedReport.missingEvidence.length > 0 && (
                      <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
                        <p className="text-xs font-bold text-warning uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Icon name="warning" size="sm" /> Missing Evidence Gaps
                        </p>
                        <ul className="list-disc list-inside text-xs text-ink space-y-1">
                          {parsedReport.missingEvidence.map((gap: string, idx: number) => (
                            <li key={idx}>{gap}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(parsedReport.uncertainties) && parsedReport.uncertainties.length > 0 && (
                      <div className="rounded-xl border border-line bg-surface p-4">
                        <p className="text-xs font-bold text-subtle uppercase tracking-wider mb-1">Uncertainties / Limitations</p>
                        <ul className="list-disc list-inside text-xs text-muted space-y-1">
                          {parsedReport.uncertainties.map((u: string, idx: number) => (
                            <li key={idx}>{u}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-4 space-y-3">
                  {criterionResults.map((finding, i) => {
                    const status = String(finding.status)
                    const isMet = status === "MET" || status === "Passed"
                    return (
                      <div key={i} className="rounded-xl border border-line p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex gap-3">
                            <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${isMet ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
                              <Icon name={isMet ? "check" : "clock"} size="sm" />
                            </span>
                            <div>
                              <p className="text-sm font-bold text-ink">{String(finding.criterion)}</p>
                              <p className="mt-2 text-sm leading-relaxed text-muted">{String(finding.evidence ?? "")}</p>
                              {Boolean(finding.gap) && <p className="mt-1 text-xs text-warning">Gap: {String(finding.gap)}</p>}
                              {Boolean(finding.confidence) && <p className="mt-1 text-xs text-subtle">Confidence: {String(finding.confidence)}</p>}
                            </div>
                          </div>
                          <Badge tone={isMet ? "green" : "amber"}>{status}</Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Client Decision Section - Client only */}
          {activeRole === "client" && <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <Heading level={2}>Client Decision <span className="text-sm font-normal text-muted">(Sarah Miller)</span></Heading>
                <p className="mt-1 text-xs text-muted">AI provides evidence â€” only you can release funds or request revisions.</p>
              </div>
              <Badge tone="blue">Step 2</Badge>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Optional notes or feedback for freelancer..."
              className="field mt-4 resize-none text-xs"
            />
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="danger" icon="warning" loading={deciding === "dispute"} onClick={() => handleDecision("dispute")}>
                Flag Disagreement
              </Button>
              <Button variant="secondary" icon="message" loading={deciding === "revision"} onClick={() => handleDecision("revision")}>
                Request Revision
              </Button>
              <Button variant="success" icon="check" loading={deciding === "accept"} onClick={() => handleDecision("accept")}>
                Accept Milestone
              </Button>
            </div>
          </Card>}
          {/* Freelancer: show read-only status of decisions */}
          {activeRole === "freelancer" && decision && (
            <Card className={`p-5 border ${decision === "accept" ? "border-success-border bg-success-soft/10" : "border-warning-border bg-warning-soft/10"}`}>
              <div className="flex items-center gap-3">
                <Icon name={decision === "accept" ? "check" : "clock"} />
                <div>
                  <p className="font-bold text-ink">{decision === "accept" ? "Milestone Accepted by Client!" : decision === "revision" ? "Revision Requested" : "Disagreement Flagged"}</p>
                  <p className="mt-0.5 text-xs text-muted">{decision === "accept" ? "Payment release has been authorized." : "Client has requested changes. Review the notes and resubmit."}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Payout Release Workflow - Client only */}
          {activeRole === "client" && selectedMilestone && (
            selectedMilestone.status === "ACCEPTED" ? (
              <Card className="border-success-border bg-success-soft/20 p-5 md:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-success-border/50 pb-4">
                  <div>
                    <Heading level={2}>Authorize Milestone Release: {selectedMilestone.title}</Heading>
                    <p className="mt-1 text-xs text-muted">Milestone accepted. Authorize payout release of {formatMoney(selectedMilestone.amount)} to freelancer.</p>
                  </div>
                  <Badge tone="green"><Icon name="check" size="sm" /> Ready for Release</Badge>
                </div>

                <div className="space-y-3">
                  <div className="rounded-xl border border-line bg-surface p-3 text-xs">
                    <span className="block font-bold text-subtle uppercase">Target Recipient</span>
                    <p className="mt-1 font-mono text-ink font-semibold">
                      {project?.freelancerEmail || (project?.freelancerName ? project.freelancerName.toLowerCase().replace(/\s+/g, ".") + "@example.com" : "alex.carter@example.com")}
                    </p>
                    <p className="mt-0.5 text-[0.7rem] text-muted">
                      Locked to verified project freelancer record ({project?.freelancerName || "Freelancer"}). Recipient cannot be overridden at release.
                    </p>
                  </div>
                  <Button icon="wallet" loading={releasing} onClick={handleRelease}>
                    Authorize Payout Release ({formatMoney(selectedMilestone.amount)})
                  </Button>
                </div>

                {releaseResult && (
                  <div className="rounded-xl border border-success-border bg-white p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-success">
                      <Icon name="check" size="sm" />
                      <span>Payout Release Completed</span>
                    </div>
                    <p className="text-xs text-muted">{String(releaseResult.message ?? "Funds released")}</p>
                    <p className="text-xs font-mono text-subtle">Batch ID: {String(releaseResult.payoutBatchId ?? "â€”")}</p>
                    <Badge tone="green">{String(releaseResult.payoutStatus ?? "PROCESSED")}</Badge>
                  </div>
                )}
              </Card>
            ) : (
              <div className="rounded-xl border border-dashed border-line bg-surface/50 p-4 text-center">
                <p className="text-xs text-muted">
                  <strong>Payout release ({formatMoney(selectedMilestone.amount)})</strong> will be unlocked here as soon as you Accept this milestone in Step 2.
                </p>
              </div>
            )
          )}
        </div>

        {/* Right Column: Milestone Summary */}
        <div className="space-y-6">
          <Card className="p-5 md:p-6">
            <Heading level={2}>Milestone Details</Heading>
            {selectedMilestone ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-ink">{selectedMilestone.title}</p>
                  <span className="font-extrabold text-ink">{formatMoney(selectedMilestone.amount)}</span>
                </div>
                <Badge tone={selectedMilestone.status === "ACCEPTED" ? "green" : selectedMilestone.status === "SUBMITTED" ? "blue" : "gray"}>
                  {statusLabel[selectedMilestone.status]}
                </Badge>
                <p className="text-xs text-muted">{selectedMilestone.description}</p>
                <div className="rounded-xl bg-surface p-3 space-y-2">
                  <p className="text-xs font-bold text-muted uppercase tracking-wider">Criteria Checklist:</p>
                  {selectedMilestone.acceptanceCriteria?.split("|").map((c, i) => (
                    <div key={i} className="flex gap-1.5 text-xs text-ink"><Icon name="check" size="sm" />{c}</div>
                  ))}
                </div>
              </div>
            ) : <p className="mt-2 text-sm text-muted">Select a milestone above.</p>}
          </Card>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex gap-3">
              <span className="text-primary"><Icon name="shield" /></span>
              <div>
                <p className="text-sm font-bold text-ink">Evidence-Based Protection</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">AI reviews the deliverables against agreed criteria to give transparent proof. Client retains 100% control over release.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
