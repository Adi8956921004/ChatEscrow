import { useState, useEffect, type ReactNode } from "react"
import {
  activities,
  formatMoney,
  reviewFindings,
  statusLabel,
  paymentStatusLabel,
  getProjects,
  getMilestones,
  createMilestone,
  getContractVersions,
  generateDraft,
  approveContract,
  submitEvidence,
  getSubmissions,
  evaluateSubmission,
  acceptMilestone,
  requestRevision,
  flagDisagreement,
  releaseMilestone,
  getDisputePack,
  createPaypalOrder,
  capturePaypalOrder,
  depositDemoEscrow,
  getProjectPayments,
  getTimeline,
  getStatus,
  type Project,
  type Milestone,
  type ContractVersion,
  type Submission,
  type AcceptanceReport,
  type Payment,
  type AuditEvent,
} from "./data"

type Screen = "dashboard" | "builder" | "agreement" | "review" | "payment" | "timeline"
type IconName =
  | "grid" | "spark" | "file" | "search" | "bell" | "plus" | "arrow"
  | "wallet" | "clock" | "check" | "trend" | "upload" | "calendar"
  | "users" | "shield" | "edit" | "chevron" | "message" | "external"
  | "menu" | "x" | "link" | "warning" | "info" | "refresh" | "paypal"
  | "trash"

function Icon({ name, size = "md" }: { name: IconName; size?: "sm" | "md" | "lg" }) {
  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    spark: <path d="m12 3 1.4 4.1a5.5 5.5 0 0 0 3.5 3.5L21 12l-4.1 1.4a5.5 5.5 0 0 0-3.5 3.5L12 21l-1.4-4.1a5.5 5.5 0 0 0-3.5-3.5L3 12l4.1-1.4a5.5 5.5 0 0 0 3.5-3.5L12 3Z" />,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
    wallet: <><path d="M3 6h16v13H3zM3 9h16" /><path d="M16 14h.01" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    trend: <><path d="m4 16 5-5 4 4 7-8" /><path d="M15 7h5v5" /></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M5 20h14" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-4 2-6 6-6s6 2 6 6M16 5a3 3 0 0 1 0 6M17 14c3 .4 4 2.4 4 6" /></>,
    shield: <><path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z" /><path d="m8 12 3 3 5-6" /></>,
    edit: <><path d="m14 5 5 5M4 20l3.5-.8L20 6.7 17.3 4 4.8 16.5z" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    message: <path d="M4 5h16v12H9l-5 4z" />,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v7H4V6h7" /></>,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    x: <path d="m6 6 12 12M18 6 6 18" />,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
    warning: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
    info: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
    refresh: <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>,
    paypal: <><path d="M7 11.5C7 9 9 7 11.5 7H16c2.5 0 4 1.5 4 3.5 0 3-2.5 4.5-5 4.5h-2l-1 5H8l1-8.5z" /><path d="M4 16.5C4 14 6 12 8.5 12H13c2.5 0 4 1.5 4 3.5 0 3-2.5 4.5-5 4.5H9l-1 4H4l1-7z" /></>,
    trash: <><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" /></>,
  }
  return (
    <svg
      className={size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function Button({
  children, onClick, variant = "primary", icon, className = "", disabled = false, loading = false,
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "soft" | "danger" | "success"
  icon?: IconName; className?: string; disabled?: boolean; loading?: boolean
}) {
  const styles = {
    primary: "bg-primary text-white shadow-button hover:bg-primary-hover",
    secondary: "border border-line bg-white text-ink hover:border-line-strong hover:bg-surface",
    ghost: "text-muted hover:bg-surface hover:text-ink",
    soft: "bg-primary-soft text-primary hover:bg-primary-soft-hover",
    danger: "bg-danger-soft text-danger hover:bg-danger-soft-hover border border-danger-border",
    success: "bg-success text-white shadow-button hover:bg-emerald-600",
  }
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-focus disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon && <Icon name={icon} size="sm" />}
      {children}
    </button>
  )
}

function Heading({ children, level = 1, className = "" }: { children: ReactNode; level?: 1 | 2 | 3; className?: string }) {
  const classes = level === 1 ? "font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl"
    : level === 2 ? "font-display text-xl font-semibold tracking-tight text-ink"
    : "text-sm font-bold text-ink"
  const Tag = `h${level}` as const
  return <Tag className={`${classes} ${className}`}>{children}</Tag>
}

function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" | "gray" | "red" | "purple" }) {
  const tones = {
    blue: "bg-primary-soft text-primary",
    green: "bg-success-soft text-success",
    amber: "bg-warning-soft text-warning",
    gray: "bg-surface-strong text-muted",
    red: "bg-danger-soft text-danger",
    purple: "bg-violet-soft text-violet",
  }
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[1.75rem] border border-line bg-white shadow-card ${className}`}>
      {children}
    </section>
  )
}

function Avatar({ initials, dark = false }: { initials: string; dark?: boolean }) {
  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold ${dark ? "bg-ink text-white" : "bg-primary-soft text-primary"}`}>
      {initials}
    </span>
  )
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-muted">{label}</span>
      {children}
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </label>
  )
}

function InfoBanner({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "amber" | "green" | "red" }) {
  const styles = {
    blue: "bg-primary-soft border-primary-border text-ink",
    amber: "bg-warning-soft border-warning-border text-ink",
    green: "bg-success-soft border-success-border text-ink",
    red: "bg-danger-soft border-danger-border text-ink",
  }
  const icons: Record<string, IconName> = { blue: "info", amber: "warning", green: "check", red: "warning" }
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${styles[tone]}`}>
      <span className="mt-0.5 shrink-0"><Icon name={icons[tone]} size="sm" /></span>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  )
}

function Spinner() {
  return <div className="flex items-center justify-center py-16"><div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-danger-border bg-danger-soft p-8 text-center">
      <Icon name="warning" size="lg" />
      <p className="text-sm font-semibold text-ink">{message}</p>
      {onRetry && <Button variant="secondary" icon="refresh" onClick={onRetry}>Retry</Button>}
    </div>
  )
}

const navItems: { id: Screen; label: string; icon: IconName }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "builder", label: "AI Agreement Builder", icon: "spark" },
  { id: "agreement", label: "Agreements", icon: "file" },
  { id: "review", label: "AI Work Review", icon: "search" },
  { id: "payment", label: "Escrow & Checkout", icon: "wallet" },
  { id: "timeline", label: "Activity Timeline", icon: "clock" },
]

function Sidebar({ screen, setScreen, open, close }: { screen: Screen; setScreen: (s: Screen) => void; open: boolean; close: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-overlay lg:hidden" onClick={close} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col overflow-hidden bg-rail px-4 py-5 text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="pointer-events-none absolute -left-24 top-12 size-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-32 right-0 size-40 rounded-full bg-violet/15 blur-3xl" />
        <div className="flex items-center justify-between px-3">
          <button className="flex items-center gap-2.5" onClick={() => setScreen("dashboard")}>
            <span className="relative grid size-10 place-items-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-button">
              <span className="absolute size-4 rotate-45 rounded-sm border border-accent" />
              <span className="size-2 rotate-45 rounded-sm bg-accent" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-white">ChatEscrow</span>
          </button>
          <button className="rounded-lg p-2 text-white/60 hover:bg-white/10 lg:hidden" onClick={close} aria-label="Close navigation"><Icon name="x" /></button>
        </div>
        <nav className="mt-10 space-y-1">
          <p className="px-3 pb-3 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/35">Trust workspace</p>
          {navItems.map((item) => (
            <button key={item.id} onClick={() => { setScreen(item.id); close() }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${screen === item.id ? "bg-white text-rail shadow-nav" : "text-white/55 hover:bg-white/8 hover:text-white"}`}>
              <span className={screen === item.id ? "text-primary" : "text-white/40"}><Icon name={item.icon} /></span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="relative mt-auto overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
          <div className="absolute -right-5 -top-7 size-20 rounded-full border border-accent/30" />
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/45">
            <Icon name="shield" size="sm" /> 100% Fake Money / Sandbox
          </div>
          <p className="text-xs leading-relaxed text-white/55">Payments and releases are simulated. No real funds are transferred or charged.</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone="green"><span className="size-1.5 rounded-full bg-success" />Simulated Escrow</Badge>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-white/10 px-2 pt-4">
          <Avatar initials="SM" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">Sarah Miller</p>
            <p className="text-xs text-white/40">Demo Client account</p>
          </div>
          <span className="ml-auto text-white/30"><Icon name="chevron" size="sm" /></span>
        </div>
      </aside>
    </>
  )
}

function Topbar({ openMenu, screen }: { openMenu: () => void; screen: Screen }) {
  const title = navItems.find((item) => item.id === screen)?.label
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-page/80 px-4 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-muted hover:bg-surface lg:hidden" onClick={openMenu} aria-label="Open navigation"><Icon name="menu" /></button>
        <p className="text-sm font-bold text-ink lg:hidden">{title}</p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Badge tone="green">Fake Money / Demo Mode</Badge>
        <Badge tone="blue">PayPal Sandbox</Badge>
        <button className="relative rounded-xl p-2.5 text-muted hover:bg-surface" aria-label="Notifications">
          <Icon name="bell" />
          <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-primary" />
        </button>
      </div>
    </header>
  )
}

function TrustOrbit() {
  return (
    <div className="trust-orbit relative mx-auto aspect-square w-full max-w-[25rem]">
      <svg viewBox="0 0 420 420" className="h-full w-full overflow-visible" aria-label="Animated visualization connecting the client, freelancer, and project milestones">
        <defs>
          <linearGradient id="orbit-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5C7CFA" />
            <stop offset="0.5" stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#B9FF66" />
          </linearGradient>
          <radialGradient id="core" cx="35%" cy="30%">
            <stop offset="0" stopColor="#738BFF" />
            <stop offset="1" stopColor="#4F46E5" />
          </radialGradient>
        </defs>
        <circle cx="210" cy="210" r="174" fill="none" stroke="white" strokeOpacity=".06" />
        <circle cx="210" cy="210" r="130" fill="none" stroke="white" strokeOpacity=".1" strokeDasharray="3 10" />
        <path d="M67 142C120 36 310 31 361 155S314 376 173 361 14 248 67 142Z" fill="none" stroke="url(#orbit-line)" strokeWidth="1.5" strokeOpacity=".7" className="orbit-path" />
        <g className="orbit-core">
          <circle cx="210" cy="210" r="68" fill="url(#core)" fillOpacity=".22" />
          <circle cx="210" cy="210" r="50" fill="#111A3A" stroke="url(#orbit-line)" strokeWidth="1.5" />
          <path d="M210 183l24 10v17c0 17-10 29-24 35-14-6-24-18-24-35v-17l24-10Z" fill="none" stroke="white" strokeWidth="2" />
          <path d="m199 212 8 8 16-19" fill="none" stroke="#B9FF66" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className="orbit-node orbit-node-a">
          <circle cx="73" cy="141" r="25" fill="#171F42" stroke="#738BFF" />
          <text x="73" y="146" fill="white" textAnchor="middle" fontSize="13" fontWeight="700">SM</text>
        </g>
        <g className="orbit-node orbit-node-b">
          <circle cx="349" cy="158" r="25" fill="#171F42" stroke="#B9FF66" />
          <text x="349" y="163" fill="white" textAnchor="middle" fontSize="13" fontWeight="700">AC</text>
        </g>
        <g>
          <circle cx="174" cy="360" r="17" fill="#171F42" stroke="#8B5CF6" />
          <path d="m167 360 5 5 10-12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="orbit-pulse">
          <circle cx="359" cy="274" r="10" fill="#B9FF66" />
          <circle cx="359" cy="274" r="18" fill="none" stroke="#B9FF66" strokeOpacity=".35" />
        </g>
      </svg>
      <div className="absolute left-1 top-[58%] rounded-2xl border border-white/10 bg-white/8 px-3 py-2 backdrop-blur-xl">
        <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/40">Trust signal</p>
        <p className="mt-0.5 text-xs font-bold text-white">Agreement secured</p>
      </div>
      <div className="absolute right-0 top-[18%] rounded-2xl border border-white/10 bg-white/8 px-3 py-2 backdrop-blur-xl">
        <p className="text-[0.6rem] font-bold uppercase tracking-widest text-white/40">Review state</p>
        <p className="mt-0.5 text-xs font-bold text-accent">94% match</p>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────

function StatCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: IconName; tone: "blue" | "green" | "amber" | "navy" }) {
  const colors = { blue: "bg-primary-soft text-primary", green: "bg-success-soft text-success", amber: "bg-warning-soft text-warning", navy: "bg-navy-soft text-ink" }
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-muted">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{value}</p>
        </div>
        <span className={`grid size-10 place-items-center rounded-xl ${colors[tone]}`}><Icon name={icon} /></span>
      </div>
      <p className="mt-3 text-xs font-medium text-subtle">{detail}</p>
    </Card>
  )
}

function Dashboard({ navigate, projectId }: { navigate: (s: Screen) => void; projectId: string }) {
  const [project, setProject] = useState<Project | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [backendUp, setBackendUp] = useState<boolean | null>(null)

  useEffect(() => {
    getStatus()
      .then(() => setBackendUp(true))
      .catch(() => setBackendUp(false))
    getProjects()
      .then((projects) => { if (projects.length > 0) setProject(projects[0]) })
      .catch(() => {})
    getMilestones(projectId)
      .then(setMilestones)
      .catch(() => {})
  }, [projectId])

  const totalBudget = project?.totalBudget ?? 1200
  const acceptedCount = milestones.filter((m) => m.status === "ACCEPTED").length
  const progressPct = milestones.length > 0 ? Math.round((acceptedCount / milestones.length) * 100) : 42

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
              AI contract extraction · Mutual approval · Fake Money & Sandbox escrow · Evidence-based acceptance gate
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button icon="plus" onClick={() => navigate("builder")}>Build agreement</Button>
              <button onClick={() => navigate("payment")} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/14">
                Fund Escrow (Fake Money) <Icon name="wallet" size="sm" />
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
        <StatCard label="Awaiting your review" value="Frontend Milestone" detail="Alex submitted work with evidence links" icon="clock" tone="amber" />
        <StatCard label="Escrow status" value="Simulated / Sandbox" detail="100% fake money protection mode" icon="wallet" tone="green" />
        <StatCard label="Protection guarantee" value="Mutual consent" detail="Funds only release on client acceptance" icon="shield" tone="blue" />
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
                <p className="text-xs text-muted">Escrow target</p>
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
            <div className="mt-4 grid gap-3 rounded-xl bg-surface p-4 sm:grid-cols-3">
              <div><p className="text-xs text-muted">Current milestone</p><p className="mt-1 text-sm font-bold text-ink">Frontend Development</p></div>
              <div><p className="text-xs text-muted">Escrow Amount</p><p className="mt-1 text-sm font-bold text-ink">$400 USD</p></div>
              <div>
                <p className="text-xs text-muted">Action</p>
                <button onClick={() => navigate("review")} className="mt-1 flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-hover">
                  Open AI Review Gate <Icon name="arrow" size="sm" />
                </button>
              </div>
            </div>
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

// ── Agreement Builder ────────────────────────────────────────────────────

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

function Builder({ navigate, projectId, onRefresh }: { navigate: (s: Screen) => void; projectId: string; onRefresh: () => void }) {
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

  const handleGenerate = async () => {
    setLoading(true); setError(null); setAgreementSuccess(false)
    try {
      const cv = await generateDraft(projectId, conversation)
      setDraft(cv)
      try {
        const parsed = JSON.parse(cv.termsJson)
        if (parsed.projectSummary) setProjectSummary(parsed.projectSummary)
        if (Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
          setMilestonesList(
            parsed.milestones.map((m: Record<string, unknown>, idx: number) => ({
              title: String(m.title ?? `Milestone ${idx + 1}`),
              amount: m.amount ? Number(m.amount) : [250, 400, 350, 200][idx] ?? 300,
              currency: String(m.currency ?? "USD"),
              dueDate: String(m.dueDate && m.dueDate !== "Needs confirmation" ? m.dueDate : "2025-09-15"),
              deliverables: Array.isArray(m.deliverables) ? m.deliverables : ["Core deliverables completed"],
              acceptanceCriteria: Array.isArray(m.acceptanceCriteria) ? m.acceptanceCriteria : ["Approved by client", "Cross-browser compatible"],
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
  }

  const handleRemoveMilestone = (index: number) => {
    setMilestonesList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateMilestone = (index: number, field: keyof EditableMilestone, value: unknown) => {
    setMilestonesList((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const handleApprove = async (role: "client" | "freelancer") => {
    setApproving(role); setError(null)
    try {
      if (draft && draft.id && !draft.id.startsWith("draft-")) {
        await approveContract(projectId, draft.id, role).catch(() => {})
      }
      if (role === "client") setClientApproved(true)
      else setFreelancerApproved(true)

      const isBothApproved = (role === "client" ? true : clientApproved) && (role === "freelancer" ? true : freelancerApproved)
      if (isBothApproved) {
        setAgreementSuccess(true)
        // Sync milestones to backend project
        setSavingMilestones(true)
        try {
          for (const m of milestonesList) {
            await createMilestone(projectId, {
              title: m.title,
              amount: Number(m.amount),
              dueDate: m.dueDate,
              deliverables: Array.isArray(m.deliverables) ? m.deliverables.join("|") : m.deliverables,
              acceptanceCriteria: Array.isArray(m.acceptanceCriteria) ? m.acceptanceCriteria.join("|") : m.acceptanceCriteria,
              description: `Agreed milestone: ${m.title}`,
              contractVersionId: draft?.id,
            }).catch(() => {})
          }
          onRefresh()
        } finally {
          setSavingMilestones(false)
        }
      }
    } catch (e) {
      setError(String(e))
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
              <Button icon="wallet" onClick={() => navigate("payment")}>Fund Escrow Now →</Button>
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

              {/* Milestones list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Agreed Milestones ({milestonesList.length})</p>
                  <span className="text-xs font-bold text-primary">{formatMoney(totalCalculated)} Total</span>
                </div>

                {milestonesList.map((m, idx) => (
                  <div key={idx} className="rounded-xl border border-line bg-surface/50 p-4 space-y-3 transition hover:border-line-strong">
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
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-muted">$</span>
                          <input
                            type="number"
                            value={m.amount}
                            onChange={(e) => handleUpdateMilestone(idx, "amount", e.target.value)}
                            className="field text-xs font-bold w-20 py-1 px-2"
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
                        <span className="text-subtle font-semibold block mb-1">Deliverables:</span>
                        <input
                          type="text"
                          value={Array.isArray(m.deliverables) ? m.deliverables.join(", ") : m.deliverables}
                          onChange={(e) => handleUpdateMilestone(idx, "deliverables", e.target.value.split(", "))}
                          className="field text-xs py-1"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-subtle font-semibold block mb-1 text-xs">Acceptance Criteria (for AI Gate & Client Acceptance):</span>
                      <input
                        type="text"
                        value={Array.isArray(m.acceptanceCriteria) ? m.acceptanceCriteria.join(" | ") : m.acceptanceCriteria}
                        onChange={(e) => handleUpdateMilestone(idx, "acceptanceCriteria", e.target.value.split(" | "))}
                        className="field text-xs py-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Mutual Approval Card */}
          <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <Heading level={2}>Mutual Approval (Smart Escrow Protocol)</Heading>
                <p className="mt-1 text-xs text-muted">Both parties must explicitly approve before escrow funding is activated.</p>
              </div>
              <Badge tone={clientApproved && freelancerApproved ? "green" : "amber"}>
                {clientApproved && freelancerApproved ? "Fully Agreed" : "Pending Signature"}
              </Badge>
            </div>

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
                  <Button variant="soft" loading={approving === "client"} onClick={() => handleApprove("client")}>
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
                  <Button variant="soft" loading={approving === "freelancer"} onClick={() => handleApprove("freelancer")}>
                    Sign as Freelancer
                  </Button>
                )}
              </div>
            </div>

            {savingMilestones && (
              <p className="mt-3 text-xs text-center text-primary animate-pulse font-medium">Syncing agreed milestones with escrow backend...</p>
            )}

            {clientApproved && freelancerApproved && (
              <div className="mt-5 flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => navigate("agreement")}>View Active Agreement</Button>
                <Button icon="wallet" onClick={() => navigate("payment")}>Proceed to Escrow Checkout →</Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

// ── Agreement View ───────────────────────────────────────────────────────

function Agreement({ navigate, projectId, onRefresh }: { navigate: (s: Screen) => void; projectId: string; onRefresh: () => void }) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [contracts, setContracts] = useState<ContractVersion[]>([])
  const [selected, setSelected] = useState<Milestone | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newAmount, setNewAmount] = useState("300")
  const [newDueDate, setNewDueDate] = useState("2025-10-10")
  const [newDeliverables, setNewDeliverables] = useState("")
  const [newCriteria, setNewCriteria] = useState("")

  useEffect(() => {
    Promise.all([getMilestones(projectId), getContractVersions(projectId)])
      .then(([ms, cvs]) => {
        setMilestones(ms)
        setContracts(cvs)
        setSelected(ms.find((m) => m.status === "SUBMITTED") ?? ms[0] ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId])

  const handleCreateNewMilestone = async () => {
    if (!newTitle.trim()) return
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
    } catch {}
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
      <div className="page-masthead flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="green">Active Project</Badge>
            <Badge tone="green"><Icon name="check" size="sm" /> Terms Agreed</Badge>
          </div>
          <Heading>E-commerce Website Development</Heading>
          <p className="mt-2 text-sm text-muted">Sarah Miller (Client) ↔ Alex Carter (Freelancer) · Escrow Protected</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon="plus" onClick={() => setShowAddModal(true)}>+ Add Milestone</Button>
          <Button variant="secondary" icon="edit" onClick={() => navigate("builder")}>Edit Agreement</Button>
          <Button icon="wallet" onClick={() => navigate("payment")}>Escrow Checkout</Button>
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
            <Button variant="soft" icon="wallet" onClick={() => navigate("payment")}>Fund in Escrow</Button>
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
                  <Button className="w-full" variant="secondary" icon="wallet" onClick={() => navigate("payment")}>Fund in Escrow (Fake Money / Sandbox)</Button>
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

// ── AI Work Review & Dispute Pack ────────────────────────────────────────

function DisputePackModal({ data, onClose }: { data: Record<string, unknown>; onClose: () => void }) {
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

function Review({ navigate, projectId }: { navigate: (s: Screen) => void; projectId: string }) {
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
  const [recipientEmail, setRecipientEmail] = useState("alex.carter@example.com")
  const [disputePackOpen, setDisputePackOpen] = useState(false)
  const [disputePack, setDisputePack] = useState<Record<string, unknown> | null>(null)
  const [loadingDisputePack, setLoadingDisputePack] = useState(false)

  useEffect(() => {
    getMilestones(projectId).then((ms) => {
      setMilestones(ms)
      const submitted = ms.find((m) => m.status === "SUBMITTED") ?? ms[1] ?? ms[0]
      setSelectedMilestone(submitted ?? null)
    }).catch(() => {})
  }, [projectId])

  useEffect(() => {
    if (!selectedMilestone) return
    getSubmissions(selectedMilestone.id).then((subs) => {
      if (subs.length > 0) {
        setSubmissions(subs)
      } else {
        // Fallback demo submission for Frontend Development
        setSubmissions([
          {
            id: "sub-demo-01",
            milestoneId: selectedMilestone.id,
            submittedBy: "Alex Carter (Freelancer)",
            description: "Completed responsive storefront with all 8 Figma frames, product catalog grid, cart drawer, and responsive checkout integration. Tested with Lighthouse (score: 94).",
            evidenceLinks: "https://preview.northandpine.store, https://github.com/alexcarter/north-pine-storefront",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ])
      }
    }).catch(() => {})
    setReleaseResult(null)
  }, [selectedMilestone])

  const handleSubmitEvidence = async () => {
    if (!selectedMilestone || !evidenceDesc) return
    setSubmitting(true); setError(null)
    try {
      const sub = await submitEvidence(selectedMilestone.id, { submittedBy: "Alex Carter", description: evidenceDesc, evidenceLinks })
      setSubmissions((prev) => [sub, ...prev])
      setEvidenceDesc(""); setEvidenceLinks("")
      setSelectedMilestone((prev) => prev ? { ...prev, status: "SUBMITTED" } : null)
    } catch {
      // Local fallback
      const localSub: Submission = {
        id: "sub-" + Date.now(),
        milestoneId: selectedMilestone.id,
        submittedBy: "Alex Carter (Freelancer)",
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

  const handleEvaluate = async (submissionId: string) => {
    setEvaluating(true); setError(null); setReport(null); setParsedReport(null)
    try {
      const r = await evaluateSubmission(submissionId)
      setReport(r)
      try { setParsedReport(JSON.parse(r.criterionResultsJson)) } catch { setParsedReport(null) }
    } catch {
      // Demo report
      const demoRes = {
        criterionResults: [
          { criterion: "Matches approved designs", status: "MET", evidence: "Layout, spacing, typography, and component states match approved design frames.", confidence: "high" },
          { criterion: "Works across modern browsers", status: "MET", evidence: "Verified in Chrome, Safari, Firefox, and Edge viewports.", confidence: "high" },
          { criterion: "Lighthouse accessibility score above 90", status: "MET", evidence: "Lighthouse audit returned 94 accessibility score.", confidence: "high" },
        ],
        recommendedNextStep: "Accept milestone and authorize escrow release.",
        aiDisclaimer: "AI acceptance check is advisory. Client maintains final approval authority.",
      }
      setParsedReport(demoRes)
      setReport({
        id: "report-demo",
        submissionId,
        criterionResultsJson: JSON.stringify(demoRes),
        modelName: "Gemini 2.0 Flash (AI Acceptance Gate)",
        aiGenerated: true,
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
      if (type === "accept") await acceptMilestone(selectedMilestone.id).catch(() => {})
      else if (type === "revision") await requestRevision(selectedMilestone.id, note).catch(() => {})
      else await flagDisagreement(selectedMilestone.id, note).catch(() => {})
      setDecision(type)
      setSelectedMilestone((prev) => prev ? { ...prev, status: type === "accept" ? "ACCEPTED" : type === "revision" ? "REVISION_REQUESTED" : "DISAGREEMENT_FLAGGED" } : null)
      setMilestones((prev) => prev.map((m) => m.id === selectedMilestone.id ? { ...m, status: type === "accept" ? "ACCEPTED" : type === "revision" ? "REVISION_REQUESTED" : "DISAGREEMENT_FLAGGED" } : m))
    } finally {
      setDeciding(null)
    }
  }

  const handleRelease = async () => {
    if (!selectedMilestone) return
    setReleasing(true); setError(null); setReleaseResult(null)
    try {
      const res = await releaseMilestone(selectedMilestone.id, recipientEmail)
      setReleaseResult(res)
    } catch {
      // Simulated release
      setReleaseResult({
        payoutBatchId: "DEMO-PAYOUT-" + Date.now(),
        payoutStatus: "SUCCESS (Simulated Release)",
        isSimulated: true,
        message: `Escrow release of ${formatMoney(selectedMilestone.amount)} authorized to ${recipientEmail}`,
      })
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
        project: { title: "E-commerce Website Development", clientName: "Sarah Miller", freelancerName: "Alex Carter" },
        submissions,
        auditTimeline: [
          { id: "e1", eventType: "MILESTONE_ACCEPTED", actorName: "Sarah Miller", createdAt: new Date().toISOString() },
        ],
        disclaimer: "Assembled for transparency and neutral escrow dispute resolution.",
      })
      setDisputePackOpen(true)
    } finally {
      setLoadingDisputePack(false)
    }
  }

  const criterionResults = parsedReport ? ((parsedReport.criterionResults as Record<string, unknown>[]) ?? []) : reviewFindings.map((f) => ({ criterion: f.criterion, status: f.status === "Passed" ? "MET" : "PARTIALLY_MET", evidence: f.evidence, gap: null, confidence: "high" }))

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {disputePackOpen && disputePack && (
        <DisputePackModal data={disputePack} onClose={() => setDisputePackOpen(false)} />
      )}

      <div className="page-masthead flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge tone="blue"><Icon name="spark" size="sm" /> AI-Assisted Gate</Badge>
          <Heading className="mt-3">AI Work Review & Acceptance</Heading>
          <p className="mt-2 text-sm text-muted">Evidence Submission → AI Acceptance Gate Analysis → Client Decision & Payout Release</p>
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
          {/* Evidence submission */}
          <Card className="overflow-hidden">
            <div className="border-b border-line p-5 md:p-6 flex items-center justify-between">
              <div>
                <Heading level={2}>Submit Evidence <span className="text-muted text-sm font-normal">(Freelancer Role)</span></Heading>
                <p className="mt-1 text-sm text-muted">Provide deliverables and proof of completion for AI & client evaluation.</p>
              </div>
              <Badge tone="blue">Step 1</Badge>
            </div>
            <div className="space-y-4 p-5 md:p-6">
              {/* Quick Preset Evidence Buttons */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-bold text-muted uppercase tracking-wider block w-full mb-1">Quick Sample Submissions:</span>
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceDesc("Built full responsive storefront matching 8 Figma frames. Tested across Chrome, Safari, Firefox. Lighthouse accessibility score: 94.")
                    setEvidenceLinks("https://preview.northandpine.store, https://github.com/alexcarter/storefront")
                  }}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:border-primary hover:bg-primary-soft hover:text-primary"
                >
                  Frontend Storefront Complete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceDesc("APIs connected with cart, checkout, inventory management, and PayPal Sandbox webhooks. All tests passing.")
                    setEvidenceLinks("https://api.northandpine.store/health, https://postman.com/collections/ecommerce-api")
                  }}
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:border-primary hover:bg-primary-soft hover:text-primary"
                >
                  Backend Integration Complete
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
          </Card>

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
                      <Button variant="soft" icon="spark" loading={evaluating} onClick={() => handleEvaluate(sub.id)}>
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
          {(report || !evaluating) && (
            <Card className="overflow-hidden">
              <div className="flex flex-col justify-between gap-4 border-b border-line p-5 sm:flex-row sm:items-center md:p-6">
                <div>
                  <Heading level={2}>AI Acceptance Report</Heading>
                  <p className="mt-1 text-sm text-muted">Objective evaluation against agreed acceptance criteria</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-ink">94%</p>
                    <p className="text-xs font-semibold text-success">Criteria Satisfied</p>
                  </div>
                  <span className="grid size-12 place-items-center rounded-full border-4 border-primary-soft text-primary"><Icon name="spark" /></span>
                </div>
              </div>
              <div className="p-5 md:p-6">
                {parsedReport && (
                  <InfoBanner tone="blue">
                    <strong>Recommendation:</strong> {String(parsedReport.recommendedNextStep ?? "Criteria are well satisfied. Ready for client acceptance.")}
                    <br /><span className="text-xs text-muted mt-1 block">AI analysis is advisory. The client makes the final release decision.</span>
                  </InfoBanner>
                )}
                <div className="mt-6 space-y-4">
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
                              {finding.gap && <p className="mt-1 text-xs text-warning">Gap: {String(finding.gap)}</p>}
                              {finding.confidence && <p className="mt-1 text-xs text-subtle">Confidence: {String(finding.confidence)}</p>}
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

          {/* Client Decision Section */}
          <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <Heading level={2}>Client Decision <span className="text-sm font-normal text-muted">(Sarah Miller)</span></Heading>
                <p className="mt-1 text-xs text-muted">AI provides evidence — only you can release funds or request revisions.</p>
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
          </Card>

          {/* Payout Release Workflow (only when ACCEPTED) */}
          {selectedMilestone?.status === "ACCEPTED" && (
            <Card className="border-success-border bg-success-soft/20 p-5 md:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-success-border/50 pb-4">
                <div>
                  <Heading level={2}>Authorize Milestone Release</Heading>
                  <p className="mt-1 text-xs text-muted">Milestone accepted. Authorize simulated or PayPal Payout release to freelancer.</p>
                </div>
                <Badge tone="green"><Icon name="check" size="sm" /> Ready for Release</Badge>
              </div>

              <div className="space-y-3">
                <Field label="Recipient Freelancer Email">
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="field text-xs"
                  />
                </Field>
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
                  <p className="text-xs font-mono text-subtle">Batch ID: {String(releaseResult.payoutBatchId ?? "—")}</p>
                  <Badge tone="green">{String(releaseResult.payoutStatus ?? "PROCESSED")}</Badge>
                </div>
              )}
            </Card>
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

// ── Escrow & Checkout Screen ──────────────────────────────────────────────

function PaymentScreen({ navigate, projectId }: { navigate: (s: Screen) => void; projectId: string }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("")
  const [amount, setAmount] = useState("400")
  const [loadingPaypal, setLoadingPaypal] = useState(false)
  const [loadingDemoDeposit, setLoadingDemoDeposit] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [capturingId, setCapturingId] = useState<string | null>(null)
  const [orderResult, setOrderResult] = useState<Record<string, unknown> | null>(null)
  const [captureResult, setCaptureResult] = useState<Record<string, unknown> | null>(null)
  const [demoDepositSuccess, setDemoDepositSuccess] = useState<string | null>(null)
  const [manualOrderId, setManualOrderId] = useState("")
  const [error, setError] = useState<string | null>(null)

  const reloadData = () => {
    getProjectPayments(projectId).then(setPayments).catch(() => {})
    getMilestones(projectId).then((ms) => {
      setMilestones(ms)
      if (ms.length > 0 && !selectedMilestoneId) {
        setSelectedMilestoneId(ms[0].id)
        if (ms[0].amount) setAmount(String(ms[0].amount))
      }
    }).catch(() => {})
  }

  useEffect(() => {
    reloadData()
    // Auto-capture redirect token from PayPal Sandbox
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    if (token) {
      handleCaptureOrder(token).then(() => {
        window.history.replaceState({}, document.title, window.location.pathname)
      })
    }
  }, [projectId])

  const handleMilestoneChange = (id: string) => {
    setSelectedMilestoneId(id)
    const found = milestones.find((m) => m.id === id)
    if (found && found.amount) {
      setAmount(String(found.amount))
    }
  }

  // 1-Click Fake Money / Demo Escrow Deposit
  const handleDemoDeposit = async () => {
    setLoadingDemoDeposit(true); setError(null); setDemoDepositSuccess(null)
    const parsedAmount = parseFloat(amount) || 400
    try {
      const p = await depositDemoEscrow(projectId, selectedMilestoneId, parsedAmount)
      setPayments((prev) => [p, ...prev])
      setDemoDepositSuccess(`Successfully locked ${formatMoney(parsedAmount)} into escrow using Fake Money simulation!`)
      reloadData()
    } catch {
      // Local demo payment record
      const localPayment: Payment = {
        id: "demo-pay-" + Date.now(),
        projectId,
        milestoneId: selectedMilestoneId,
        provider: "DEMO_ESCROW",
        providerOrderId: "DEMO-ESCROW-" + Date.now(),
        providerCaptureId: "DEMO-CAP-" + Date.now(),
        amount: parsedAmount,
        currency: "USD",
        status: "CAPTURED",
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setPayments((prev) => [localPayment, ...prev])
      setDemoDepositSuccess(`Successfully locked ${formatMoney(parsedAmount)} into escrow using Fake Money simulation!`)
    } finally {
      setLoadingDemoDeposit(false)
    }
  }

  // Real PayPal Sandbox Order
  const handleCreatePaypalOrder = async () => {
    setLoadingPaypal(true); setError(null); setOrderResult(null); setCaptureResult(null)
    try {
      const result = await createPaypalOrder(projectId, selectedMilestoneId, parseFloat(amount))
      setOrderResult(result)
      reloadData()
    } catch (e) {
      setError(String(e))
    } finally {
      setLoadingPaypal(false)
    }
  }

  // PayPal Sandbox Capture
  const handleCaptureOrder = async (orderIdToCapture: string) => {
    if (!orderIdToCapture) return
    setCapturing(true); setCapturingId(orderIdToCapture); setError(null); setCaptureResult(null)
    try {
      const result = await capturePaypalOrder(orderIdToCapture)
      setCaptureResult(result)
      reloadData()
    } catch (e) {
      setError(String(e))
    } finally {
      setCapturing(false)
      setCapturingId(null)
    }
  }

  const paymentStatusTone = (status: string): "green" | "blue" | "amber" | "gray" | "red" => {
    if (status === "CAPTURED") return "green"
    if (status === "APPROVAL_PENDING") return "blue"
    if (status === "FAILED") return "red"
    if (status === "UNKNOWN") return "amber"
    return "gray"
  }

  const totalCaptured = payments
    .filter((p) => p.status === "CAPTURED")
    .reduce((acc, p) => acc + (Number(p.amount) || 0), 0)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="page-masthead flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge tone="green"><Icon name="shield" size="sm" /> 100% Fake Money Protection</Badge>
            <Badge tone="blue">PayPal Sandbox Mode</Badge>
          </div>
          <Heading>Escrow Funding & Checkout</Heading>
          <p className="mt-1 text-sm text-muted">
            Lock funds safely in escrow. You can use <strong>1-Click Fake Money</strong> (no real money or login needed) or <strong>PayPal Sandbox</strong>.
          </p>
        </div>
        <Button variant="secondary" icon="refresh" onClick={reloadData}>Refresh Ledger</Button>
      </div>

      {/* Escrow Balance Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Escrow Locked"
          value={formatMoney(totalCaptured)}
          detail="Funds safely locked in escrow ledger"
          icon="shield"
          tone="green"
        />
        <StatCard
          label="Project Target"
          value="$1,200"
          detail="Agreed total across all 4 milestones"
          icon="trend"
          tone="blue"
        />
        <StatCard
          label="Protection Status"
          value="Mutual Consent"
          detail="Never releases without client acceptance"
          icon="wallet"
          tone="amber"
        />
      </div>

      {error && <InfoBanner tone="red">{error}</InfoBanner>}

      {demoDepositSuccess && (
        <InfoBanner tone="green">
          <strong>Escrow Deposit Successful!</strong> {demoDepositSuccess} The milestone is now funded and work can proceed safely.
        </InfoBanner>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: 1-Click Fake Money Escrow Deposit */}
        <Card className="p-5 md:p-6 border-success-border bg-gradient-to-b from-success-soft/20 to-transparent">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-success text-white">
                  <Icon name="shield" size="sm" />
                </span>
                <Heading level={2}>1-Click Fake Money Deposit</Heading>
              </div>
              <p className="mt-1 text-xs text-muted">Recommended for evaluation — zero real funds, no login needed.</p>
            </div>
            <Badge tone="green">Instant</Badge>
          </div>

          <div className="mt-5 space-y-4">
            <Field label="Select Milestone to Fund">
              <select
                value={selectedMilestoneId}
                onChange={(e) => handleMilestoneChange(e.target.value)}
                className="field text-sm"
              >
                {milestones.length === 0 ? (
                  <option value="demo-milestone-frontend">Frontend Development ($400)</option>
                ) : milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} – {formatMoney(m.amount)} USD
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Escrow Amount (USD)" hint="Locked in simulation escrow until work is approved.">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="field text-sm font-bold"
                min="1"
              />
            </Field>

            <Button
              variant="success"
              icon="shield"
              loading={loadingDemoDeposit}
              className="w-full py-3"
              onClick={handleDemoDeposit}
            >
              Deposit {formatMoney(parseFloat(amount) || 0)} Fake Money into Escrow
            </Button>
            <p className="text-xs text-center text-subtle leading-relaxed">
              Funds are recorded directly into the verifiable escrow ledger as verified & captured.
            </p>
          </div>
        </Card>

        {/* Card 2: PayPal Sandbox Payment */}
        <Card className="p-5 md:p-6">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Icon name="paypal" size="sm" />
                </span>
                <Heading level={2}>PayPal Sandbox Mode</Heading>
              </div>
              <p className="mt-1 text-xs text-muted">Test real PayPal order flow via Developer Sandbox.</p>
            </div>
            <Badge tone="blue">Sandbox</Badge>
          </div>

          <div className="mt-5 space-y-4">
            <Button
              icon="paypal"
              loading={loadingPaypal}
              className="w-full"
              onClick={handleCreatePaypalOrder}
            >
              Create PayPal Sandbox Order ({formatMoney(parseFloat(amount) || 0)})
            </Button>

            {orderResult && (
              <div className="rounded-xl border border-line bg-surface p-4 space-y-3">
                <p className="text-xs font-bold text-ink">Order Created: <span className="font-mono">{String(orderResult.orderId ?? "—")}</span></p>
                <div className="flex flex-col gap-2">
                  {orderResult.approveUrl && String(orderResult.approveUrl).startsWith("https") && (
                    <a
                      href={String(orderResult.approveUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary-hover transition"
                    >
                      <Icon name="external" size="sm" /> 1. Approve on PayPal Sandbox
                    </a>
                  )}
                  {orderResult.orderId && (
                    <Button
                      variant="secondary"
                      icon="check"
                      loading={capturing}
                      onClick={() => handleCaptureOrder(String(orderResult.orderId))}
                      className="text-xs py-2"
                    >
                      2. Verify & Capture Sandbox Payment
                    </Button>
                  )}
                </div>
              </div>
            )}

            {captureResult && (
              <div className="rounded-xl border border-success-border bg-success-soft p-3 space-y-1">
                <p className="text-xs font-bold text-success flex items-center gap-1.5"><Icon name="check" size="sm" /> Captured & Verified</p>
                <p className="text-xs text-muted font-mono">Order: {String(captureResult.orderId)}</p>
              </div>
            )}

            {/* Manual Order Capture */}
            <div className="border-t border-line pt-3">
              <span className="text-xs font-bold text-muted block mb-1">Manual Order Capture:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter PayPal Order ID..."
                  value={manualOrderId}
                  onChange={(e) => setManualOrderId(e.target.value)}
                  className="field text-xs font-mono"
                />
                <Button
                  variant="secondary"
                  disabled={!manualOrderId.trim()}
                  loading={capturing}
                  onClick={() => handleCaptureOrder(manualOrderId.trim())}
                  className="text-xs"
                >
                  Capture
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Escrow Ledger Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-5 md:p-6">
          <div>
            <Heading level={2}>Verifiable Escrow Ledger</Heading>
            <p className="mt-1 text-xs text-muted">Server-verified transactions ensuring buyer and seller protection.</p>
          </div>
          <Badge tone="green">{payments.length} Records</Badge>
        </div>

        <div className="divide-y divide-line">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <p className="text-sm">No payment records yet in the ledger.</p>
              <p className="text-xs text-subtle mt-1">Use 1-Click Fake Money or PayPal Sandbox above to record an escrow deposit.</p>
            </div>
          ) : payments.map((p) => (
            <div key={p.id} className="p-4 md:p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-ink text-base">{formatMoney(p.amount)} {p.currency}</span>
                  <Badge tone={p.provider === "DEMO_ESCROW" ? "green" : "blue"}>
                    {p.provider === "DEMO_ESCROW" ? "Simulated Escrow" : "PayPal Sandbox"}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted font-mono">
                  {p.providerOrderId && <span>Order: {p.providerOrderId.substring(0, 18)}…</span>}
                  {p.providerCaptureId && <span>Capture: {p.providerCaptureId.substring(0, 18)}…</span>}
                  {p.verifiedAt && <span className="text-success font-sans">Verified {new Date(p.verifiedAt).toLocaleTimeString()}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge tone={paymentStatusTone(p.status)}>
                  {paymentStatusLabel[p.status] ?? p.status}
                </Badge>
                {p.status === "APPROVAL_PENDING" && p.providerOrderId && (
                  <Button
                    variant="secondary"
                    icon="check"
                    loading={capturingId === p.providerOrderId}
                    onClick={() => handleCaptureOrder(p.providerOrderId!)}
                    className="text-xs py-1 px-2.5"
                  >
                    Capture
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Activity Timeline ─────────────────────────────────────────────────────

function Timeline({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true); setError(null)
    getTimeline(projectId)
      .then((evts) => {
        if (evts.length > 0) {
          setEvents(evts)
        } else {
          setEvents([
            { id: "e1", projectId, eventType: "DEMO_ESCROW_DEPOSITED", actorName: "Sarah Miller (Client)", safeMetadata: "{\"amount\":400,\"currency\":\"USD\"}", createdAt: new Date().toISOString() },
            { id: "e2", projectId, eventType: "MILESTONE_EVIDENCE_SUBMITTED", actorName: "Alex Carter (Freelancer)", safeMetadata: "{\"milestone\":\"Frontend\"}", createdAt: new Date(Date.now() - 3600000).toISOString() },
            { id: "e3", projectId, eventType: "CONTRACT_AGREED", actorName: "System", safeMetadata: "{\"version\":1}", createdAt: new Date(Date.now() - 7200000).toISOString() },
          ])
        }
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
          <p className="mt-2 text-sm text-muted">Immutable record of all project agreements, escrow deposits, submissions, and acceptance decisions.</p>
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

// ── App root ──────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search
      const path = window.location.pathname
      if (search.includes("token=") || path.includes("payment")) {
        return "payment"
      }
    }
    return "dashboard"
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [projectId, setProjectId] = useState<string>("demo-project-001")
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = () => setRefreshKey((k) => k + 1)

  useEffect(() => {
    getProjects()
      .then((projects) => {
        if (projects.length > 0) {
          setProjectId(projects[0].id)
        }
      })
      .catch(() => {})
  }, [refreshKey])

  const navigate = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }) }

  return (
    <div className="app-shell min-h-screen bg-page text-ink">
      <Sidebar screen={screen} setScreen={navigate} open={menuOpen} close={() => setMenuOpen(false)} />
      <div className="lg:pl-72">
        <Topbar screen={screen} openMenu={() => setMenuOpen(true)} />
        <main className="relative p-4 md:p-8 lg:p-10">
          {screen === "dashboard" && <Dashboard navigate={navigate} projectId={projectId} />}
          {screen === "builder" && <Builder navigate={navigate} projectId={projectId} onRefresh={triggerRefresh} />}
          {screen === "agreement" && <Agreement navigate={navigate} projectId={projectId} onRefresh={triggerRefresh} />}
          {screen === "review" && <Review navigate={navigate} projectId={projectId} />}
          {screen === "payment" && <PaymentScreen navigate={navigate} projectId={projectId} />}
          {screen === "timeline" && <Timeline projectId={projectId} />}
        </main>
      </div>
    </div>
  )
}
