import { type ReactNode } from "react"
import type { IconName } from "../types"

export const ICON_PATHS: Record<IconName, ReactNode> = {
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
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  scale: <><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h18" /></>,
}

export function Icon({ name, size = "md" }: { name: IconName; size?: "sm" | "md" | "lg" }) {
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
      {ICON_PATHS[name]}
    </svg>
  )
}

export function Button({
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

export function Heading({ children, level = 1, className = "" }: { children: ReactNode; level?: 1 | 2 | 3; className?: string }) {
  const classes = level === 1 ? "font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl"
    : level === 2 ? "font-display text-xl font-semibold tracking-tight text-ink"
    : "text-sm font-bold text-ink"
  const Tag = `h${level}` as const
  return <Tag className={`${classes} ${className}`}>{children}</Tag>
}

export function Badge({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" | "gray" | "red" | "purple" }) {
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

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[1.75rem] border border-line bg-white shadow-card ${className}`}>
      {children}
    </section>
  )
}

export function Avatar({ initials, dark = false }: { initials: string; dark?: boolean }) {
  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold ${dark ? "bg-ink text-white" : "bg-primary-soft text-primary"}`}>
      {initials}
    </span>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-muted">{label}</span>
      {children}
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </label>
  )
}

export function InfoBanner({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "amber" | "green" | "red" }) {
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

export function Spinner() {
  return <div className="flex items-center justify-center py-16"><div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-danger-border bg-danger-soft p-8 text-center">
      <Icon name="warning" size="lg" />
      <p className="text-sm font-semibold text-ink">{message}</p>
      {onRetry && <Button variant="secondary" icon="refresh" onClick={onRetry}>Retry</Button>}
    </div>
  )
}

export function StatCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: IconName; tone: "blue" | "green" | "amber" | "navy" }) {
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

export function TrustOrbit() {
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
        <p className="mt-0.5 text-xs font-bold text-accent">AI Gate Ready</p>
      </div>
    </div>
  )
}
