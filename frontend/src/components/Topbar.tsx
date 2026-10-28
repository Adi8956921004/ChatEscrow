import type { Screen, Role } from "../types"
import { Icon, Badge } from "./ui"
import { navItems } from "./Sidebar"

export function Topbar({
  openMenu,
  screen,
  activeRole,
  onSelectRole,
}: {
  openMenu: () => void
  screen: Screen
  activeRole: Role
  onSelectRole: (r: Role) => void
}) {
  const title = navItems.find((item) => item.id === screen)?.label
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between bg-page/80 px-4 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-muted hover:bg-surface lg:hidden" onClick={openMenu} aria-label="Open navigation"><Icon name="menu" /></button>
        <p className="text-sm font-bold text-ink lg:hidden">{title}</p>
      </div>

      {/* Role / Persona Switcher */}
      <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface p-1">
        <span className="text-[0.65rem] font-bold text-muted uppercase tracking-wider px-2 hidden sm:inline">Active View:</span>
        <button
          type="button"
          onClick={() => onSelectRole("client")}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${activeRole === "client" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-ink hover:bg-surface-strong"}`}
        >
          <span className={`size-2 rounded-full ${activeRole === "client" ? "bg-white" : "bg-emerald-400"}`} />
          Client (Sarah)
        </button>
        <button
          type="button"
          onClick={() => onSelectRole("freelancer")}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${activeRole === "freelancer" ? "bg-primary text-white shadow-sm" : "text-muted hover:text-ink hover:bg-surface-strong"}`}
        >
          <span className={`size-2 rounded-full ${activeRole === "freelancer" ? "bg-white" : "bg-violet-400"}`} />
          Freelancer (Alex)
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Badge tone="blue">PayPal Sandbox</Badge>
        <button className="relative rounded-xl p-2.5 text-muted hover:bg-surface" aria-label="Notifications">
          <Icon name="bell" />
          <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-primary" />
        </button>
      </div>
    </header>
  )
}
