import type { Screen, Role, IconName } from "../types"
import { Icon, Badge, Avatar } from "./ui"

export const navItems: { id: Screen; label: string; icon: IconName; roles?: Role[] }[] = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "builder", label: "AI Agreement Builder", icon: "spark", roles: ["client"] },
  { id: "agreement", label: "Agreements", icon: "file" },
  { id: "review", label: "AI Work Review", icon: "search" },
  { id: "payment", label: "Milestone Funding & Checkout", icon: "wallet", roles: ["client"] },
  { id: "timeline", label: "Activity Timeline", icon: "clock" },
  { id: "webhooks", label: "Webhook Inspector", icon: "bell" },
]

export function Sidebar({
  screen,
  setScreen,
  open,
  close,
  activeRole,
}: {
  screen: Screen
  setScreen: (s: Screen) => void
  open: boolean
  close: () => void
  activeRole: Role
}) {
  // Filter nav items by role
  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(activeRole)
  )

  const isClient = activeRole === "client"

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
          <p className="px-3 pb-3 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/35">
            {isClient ? "Client Workspace" : "Freelancer Workspace"}
          </p>
          {visibleItems.map((item) => (
            <button key={item.id} onClick={() => { setScreen(item.id); close() }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${screen === item.id ? "bg-white text-rail shadow-nav" : "text-white/55 hover:bg-white/8 hover:text-white"}`}>
              <span className={screen === item.id ? "text-primary" : "text-white/40"}><Icon name={item.icon} /></span>
              {item.label}
            </button>
          ))}

          {/* Freelancer: show payment view as read-only status */}
          {!isClient && (
            <button onClick={() => { setScreen("timeline"); close() }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${screen === "payment" ? "bg-white text-rail shadow-nav" : "text-white/55 hover:bg-white/8 hover:text-white"}`}>
              <span className="text-white/40"><Icon name="trend" /></span>
              Payment Status
            </button>
          )}
        </nav>
        <div className="relative mt-auto overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
          <div className="absolute -right-5 -top-7 size-20 rounded-full border border-accent/30" />
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/45">
            <Icon name="shield" size="sm" /> {isClient ? "Escrow Protection" : "Payout Protection"}
          </div>
          <p className="text-xs leading-relaxed text-white/55">
            {isClient
              ? "Server-verified ledger with PayPal sandbox integration. You control fund release."
              : "Your payments are held securely until the client approves your milestone."}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone="blue"><span className="size-1.5 rounded-full bg-primary" />Sandbox Mode</Badge>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-white/10 px-2 pt-4">
          <Avatar initials={isClient ? "SM" : "AC"} dark={!isClient} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{isClient ? "Sarah Miller" : "Alex Carter"}</p>
            <p className="text-xs text-white/40">{isClient ? "Client Persona" : "Freelancer Persona"}</p>
          </div>
        </div>
      </aside>
    </>
  )
}
