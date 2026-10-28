import { useState, useEffect } from "react"
import type { Screen, Project, Milestone, IconName } from "../types"
import { getStatus, getProjects, getMilestones, formatMoney, activities } from "../data"
import { Icon, Button, Heading, Badge, Card, InfoBanner, StatCard, TrustOrbit } from "../components/ui"

export function Dashboard({ navigate, projectId }: { navigate: (s: Screen) => void; projectId: string }) {
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
  const progressPct = milestones.length > 0 ? Math.round((acceptedCount / milestones.length) * 100) : 0

  return (
    <div className="space-y-6">
      {backendUp === false && (
        <InfoBanner tone="amber">
          <strong>Backend starting / reconnecting.</strong> The UI automatically uses demo fallback storage so all features remain interactive.
        </InfoBanner>
      )}
      <section className="hero-grid relative overflow-hidden rounded-[2.25rem] bg-rail px-6 py-7 text-white shadow-hero md:px-10 md:py-10">
        <div className="pointer-events-none absolute -left-20 bottom-0 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-xl">
            <div className="mb-8 flex items-center gap-3">
              <span className="h-px w-8 bg-accent" />
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/45">ChatEscrow · PayPal AI Challenge</p>
            </div>
            <p className="font-display text-4xl font-medium leading-[1.08] tracking-tight md:text-5xl">
              Work moves faster when <span className="text-accent">trust is visible.</span>
            </p>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/55 md:text-base">
              AI contract extraction · Mutual approval · Milestone protection & Sandbox checkout · Evidence-based acceptance gate
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button icon="plus" onClick={() => navigate("builder")}>Build agreement</Button>
              <button onClick={() => navigate("payment")} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/14">
                Fund Milestone (Demo Mode) <Icon name="wallet" size="sm" />
              </button>
              <button onClick={() => navigate("review")} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/14">
                Review work <Icon name="arrow" size="sm" />
              </button>
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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting your review"
          value={pendingReviewMilestone ? pendingReviewMilestone.title : "All up to date"}
          detail={pendingReviewMilestone ? "Deliverable submitted for review" : "No pending submissions"}
          icon="clock"
          tone={pendingReviewMilestone ? "amber" : "blue"}
        />
        <StatCard
          label="Payment protection mode"
          value="Simulated / Sandbox"
          detail="PayPal Sandbox & demo ledger protection"
          icon="wallet"
          tone="green"
        />
        <StatCard
          label="Protection guarantee"
          value="Mutual consent"
          detail="Funds release only upon client approval"
          icon="shield"
          tone="navy"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.8fr)]">
        <Card className="overflow-hidden border-0">
          <div className="flex items-center justify-between border-b border-line p-5 md:p-6">
            <div>
              <Heading level={2}>Active project</Heading>
              <p className="mt-1 text-sm text-muted">Track milestone progress and next actions.</p>
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
                  <p className="text-sm text-muted">{project?.clientName ?? "Sarah Miller"} ↔ {project?.freelancerName ?? "Alex Carter"}</p>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="font-extrabold text-ink">{formatMoney(totalBudget)}</p>
                <p className="text-xs text-muted">Milestone funding target</p>
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
            {(() => {
              const activeMilestone = pendingReviewMilestone || milestones.find((m) => m.status !== "ACCEPTED") || milestones[0]
              return (
                <div className="mt-4 grid gap-3 rounded-xl bg-surface p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted">Current milestone</p>
                    <p className="mt-1 text-sm font-bold text-ink">{activeMilestone?.title ?? "Milestone Funding"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Milestone Amount</p>
                    <p className="mt-1 text-sm font-bold text-ink">{activeMilestone ? formatMoney(activeMilestone.amount) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Action</p>
                    <button onClick={() => navigate("review")} className="mt-1 flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-hover">
                      Open AI Review Gate <Icon name="arrow" size="sm" />
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
        </Card>

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
    </div>
  )
}
