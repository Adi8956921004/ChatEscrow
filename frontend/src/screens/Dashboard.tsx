import { useState, useEffect } from "react"
import type { Screen, Project, Milestone, IconName } from "../types"
import { getStatus, getProjects, getMilestones, formatMoney, activities, getActorRole } from "../data"
import { Icon, Button, Heading, Badge, Card, InfoBanner, StatCard, TrustOrbit } from "../components/ui"

export function Dashboard({ navigate, projectId }: { navigate: (s: Screen) => void; projectId: string }) {
  const activeRole = getActorRole()
  const [project, setProject] = useState<Project | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [backendUp, setBackendUp] = useState<boolean | null>(null)

  useEffect(() => {
    getStatus()
      .then(() => setBackendUp(true))
      .catch(() => setBackendUp(false))
    getProjects()
      .then((projects) => { if (projects.length > 0) setProject(projects[0]) })
      .catch(() => setBackendUp(false))
    getMilestones(projectId)
      .then(setMilestones)
      .catch(() => setBackendUp(false))
  }, [projectId])

  const totalBudget = project?.totalBudget ?? 1200
  const acceptedCount = milestones.filter((m) => m.status === "ACCEPTED").length
  const pendingReviewMilestone = milestones.find((m) => m.status === "SUBMITTED")
  const inProgressMilestone = milestones.find((m) => m.status === "IN_PROGRESS")
  const revisionMilestone = milestones.find((m) => m.status === "REVISION_REQUESTED")
  const progressPct = milestones.length > 0 ? Math.round((acceptedCount / milestones.length) * 100) : 0
  const totalEarned = milestones.filter((m) => m.status === "ACCEPTED").reduce((s, m) => s + (m.amount ?? 0), 0)

  const isClient = activeRole === "client"
  const isFreelancer = activeRole === "freelancer"

  return (
    <div className="space-y-6">
      {backendUp === false && (
        <InfoBanner tone="amber">
          <strong>Backend starting / reconnecting.</strong> The UI automatically uses demo fallback storage so all features remain interactive.
        </InfoBanner>
      )}

      {/* Hero Banner */}
      <section className="hero-grid relative overflow-hidden rounded-[2.25rem] bg-rail px-6 py-7 text-white shadow-hero md:px-10 md:py-10">
        <div className="pointer-events-none absolute -left-20 bottom-0 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-xl">
            <div className="mb-8 flex items-center gap-3">
              <span className="h-px w-8 bg-accent" />
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">
                ChatEscrow · {isClient ? "Client Workspace" : "Freelancer Workspace"}
              </p>
            </div>
            <p className="font-display text-4xl font-medium leading-[1.08] tracking-tight md:text-5xl">
              {isClient
                ? <>Review work, <span className="text-accent">protect your payment.</span></>
                : <>Deliver work, <span className="text-accent">get paid safely.</span></>
              }
            </p>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/55 md:text-base">
              {isClient
                ? "AI contract extraction · Mutual approval · Milestone payment protection · Evidence-based acceptance gate"
                : "Structured milestones · Evidence submission · AI-assisted review · Protected payout release"}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {isClient ? (
                <>
                  <Button icon="plus" onClick={() => navigate("builder")}>Build Agreement</Button>
                  <button onClick={() => navigate("payment")} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/14">
                    Fund Milestone <Icon name="wallet" size="sm" />
                  </button>
                  <button onClick={() => navigate("review")} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/14">
                    Review &amp; Approve <Icon name="check" size="sm" />
                  </button>
                </>
              ) : (
                <>
                  <Button icon="upload" onClick={() => navigate("review")}>Submit Work</Button>
                  <button onClick={() => navigate("agreement")} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/14">
                    View Agreement <Icon name="file" size="sm" />
                  </button>
                  <button onClick={() => navigate("timeline")} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/14">
                    Activity Timeline <Icon name="clock" size="sm" />
                  </button>
                </>
              )}
            </div>
            <div className="mt-10 grid grid-cols-3 gap-3 border-t border-white/10 pt-6">
              <div><p className="text-2xl font-bold">01</p><p className="mt-1 text-[0.65rem] uppercase tracking-wider text-white/35">Active project</p></div>
              <div><p className="text-2xl font-bold">{formatMoney(totalBudget)}</p><p className="mt-1 text-[0.65rem] uppercase tracking-wider text-white/35">Total budget</p></div>
              <div><p className="text-2xl font-bold">{milestones.length > 0 ? milestones.length : 4}</p><p className="mt-1 text-[0.65rem] uppercase tracking-wider text-white/35">Milestones</p></div>
            </div>
          </div>
          <TrustOrbit />
        </div>
      </section>

      {/* Role-specific stat cards */}
      {isClient ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Awaiting your review"
            value={pendingReviewMilestone ? pendingReviewMilestone.title : "All up to date"}
            detail={pendingReviewMilestone ? "Deliverable submitted — run AI review" : "No pending submissions"}
            icon="clock"
            tone={pendingReviewMilestone ? "amber" : "blue"}
          />
          <StatCard
            label="Milestones approved"
            value={`${acceptedCount} / ${milestones.length || 4}`}
            detail={`${progressPct}% of project milestones accepted`}
            icon="check"
            tone="green"
          />
          <StatCard
            label="Payment protection"
            value="Mutual Consent"
            detail="Funds release only upon your approval"
            icon="shield"
            tone="navy"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Current task"
            value={
              revisionMilestone ? revisionMilestone.title
                : inProgressMilestone ? inProgressMilestone.title
                : pendingReviewMilestone ? pendingReviewMilestone.title
                : "All milestones submitted"
            }
            detail={
              revisionMilestone ? "Revision requested by client — resubmit"
                : inProgressMilestone ? "In progress — submit when ready"
                : pendingReviewMilestone ? "Awaiting client review & approval"
                : "Check timeline for next steps"
            }
            icon={revisionMilestone ? "warning" : "clock"}
            tone={revisionMilestone ? "amber" : "blue"}
          />
          <StatCard
            label="Earned so far"
            value={totalEarned > 0 ? formatMoney(totalEarned) : "—"}
            detail={`${acceptedCount} milestone${acceptedCount !== 1 ? "s" : ""} approved & released`}
            icon="trend"
            tone="green"
          />
          <StatCard
            label="Payment protection"
            value="Fully protected"
            detail="Funds secured in milestone ledger until your work is approved"
            icon="shield"
            tone="navy"
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.8fr)]">
        {/* Active project card */}
        <Card className="overflow-hidden border-0">
          <div className="flex items-center justify-between border-b border-line p-5 md:p-6">
            <div>
              <Heading level={2}>Active project</Heading>
              <p className="mt-1 text-sm text-muted">
                {isClient ? "Track milestone progress and approve deliverables." : "Your current milestones and submission status."}
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate("agreement")}>View agreement <Icon name="arrow" size="sm" /></Button>
          </div>
          <div className="p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon name="file" /></span>
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Heading level={3}>{project?.title ?? "E-commerce Website Development"}</Heading>
                    <Badge tone="green">Active</Badge>
                  </div>
                  <p className="text-sm text-muted">
                    {isClient
                      ? <>Client: <strong>{project?.clientName ?? "Sarah Miller"}</strong> · Freelancer: {project?.freelancerName ?? "Alex Carter"}</>
                      : <>Freelancer: <strong>{project?.freelancerName ?? "Alex Carter"}</strong> · Client: {project?.clientName ?? "Sarah Miller"}</>
                    }
                  </p>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="font-extrabold text-ink">{formatMoney(totalBudget)}</p>
                <p className="text-xs text-muted">{isClient ? "Total milestone budget" : "Your project total"}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted">Project milestones completed</span><span className="text-ink">{progressPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-strong">
                <div className="h-full rounded-full bg-gradient-flow" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            {/* Role-specific milestone action card */}
            {(() => {
              const activeMilestone = isClient
                ? (pendingReviewMilestone || milestones.find((m) => m.status !== "ACCEPTED") || milestones[0])
                : (revisionMilestone || inProgressMilestone || milestones.find((m) => m.status !== "ACCEPTED") || milestones[0])
              return (
                <div className="mt-4 grid gap-3 rounded-xl bg-surface p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted">{isClient ? "Pending review" : "Current milestone"}</p>
                    <p className="mt-1 text-sm font-bold text-ink">{activeMilestone?.title ?? "Milestone Funding"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Amount</p>
                    <p className="mt-1 text-sm font-bold text-ink">{activeMilestone ? formatMoney(activeMilestone.amount) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Action</p>
                    {isClient ? (
                      <button onClick={() => navigate("review")} className="mt-1 flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-hover">
                        {pendingReviewMilestone ? "Run AI Review Gate" : "View milestones"} <Icon name="arrow" size="sm" />
                      </button>
                    ) : (
                      <button onClick={() => navigate("review")} className="mt-1 flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-hover">
                        {revisionMilestone ? "Resubmit Revised Work" : "Submit Deliverables"} <Icon name="upload" size="sm" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Client: quick-action funding button */}
            {isClient && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => navigate("payment")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-strong transition"
                >
                  <Icon name="wallet" size="sm" /> Fund a Milestone
                </button>
                <button
                  onClick={() => navigate("timeline")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-strong transition"
                >
                  <Icon name="clock" size="sm" /> View Activity
                </button>
              </div>
            )}

            {/* Freelancer: upcoming milestones list */}
            {isFreelancer && milestones.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold text-muted uppercase tracking-wider">Your Milestones</p>
                {milestones.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2">
                    <span className="text-sm font-semibold text-ink">{m.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted">{formatMoney(m.amount)}</span>
                      <Badge
                        tone={
                          m.status === "ACCEPTED" ? "green"
                          : m.status === "SUBMITTED" ? "blue"
                          : m.status === "REVISION_REQUESTED" ? "amber"
                          : "gray"
                        }
                      >
                        {m.status === "ACCEPTED" ? "✓ Paid"
                          : m.status === "SUBMITTED" ? "Under Review"
                          : m.status === "REVISION_REQUESTED" ? "Revision Needed"
                          : m.status === "IN_PROGRESS" ? "In Progress"
                          : "Not Started"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent activity */}
        <Card className="border-0">
          <div className="border-b border-line p-5 md:p-6">
            <Heading level={2}>Recent activity</Heading>
            <p className="mt-1 text-sm text-muted">Latest project updates.</p>
          </div>
          <div className="divide-y divide-line px-5">
            {activities.map((activity) => (
              <div key={activity.title} className="flex gap-3 py-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                  <Icon name={activity.type as IconName} size="sm" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{activity.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{activity.detail}</p>
                  <p className="mt-1.5 text-xs font-semibold text-subtle">{activity.time}</p>
                </div>
              </div>
            ))}
            <button onClick={() => navigate("timeline")} className="flex w-full items-center gap-2 py-4 text-sm font-semibold text-primary hover:text-primary-hover">
              View full timeline <Icon name="arrow" size="sm" />
            </button>
          </div>
        </Card>
      </div>

      {/* Role-specific quick-action panel */}
      {isClient ? (
        <Card className="overflow-hidden border border-primary/20 bg-gradient-to-r from-primary-soft/30 to-transparent p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><Icon name="shield" /></span>
              <div>
                <p className="font-bold text-ink">Client Actions</p>
                <p className="mt-1 text-xs text-muted">You control fund release. Review submitted work, make decisions, and authorize payment to the freelancer.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="soft" icon="search" onClick={() => navigate("review")}>Review Submissions</Button>
              <Button variant="secondary" icon="wallet" onClick={() => navigate("payment")}>Manage Payments</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-blue-200 bg-gradient-to-r from-blue-50/50 to-transparent p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-600"><Icon name="upload" /></span>
              <div>
                <p className="font-bold text-ink">Freelancer Actions</p>
                <p className="mt-1 text-xs text-muted">Submit evidence for each milestone. The AI will evaluate your work against agreed criteria before the client makes a decision.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button icon="upload" onClick={() => navigate("review")}>Submit Work</Button>
              <Button variant="secondary" icon="file" onClick={() => navigate("agreement")}>View Agreement</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
