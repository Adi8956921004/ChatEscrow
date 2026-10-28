import { useState } from "react"
import type { Screen, IconName } from "../../types"
import { Icon, Button, Heading, Badge } from "../ui"

export function NotificationsDrawer({
  open,
  onClose,
  navigate,
}: {
  open: boolean
  onClose: () => void
  navigate: (s: Screen) => void
}) {
  const [notifs, setNotifs] = useState([
    { id: "1", title: "Milestone Funded", detail: "$400.00 USD secured for Frontend Development", time: "5 min ago", screen: "payment" as Screen, icon: "wallet" as IconName, tone: "green" as const },
    { id: "2", title: "Milestone Deliverables Submitted", detail: "Alex Carter submitted storefront GitHub link & preview URL", time: "18 min ago", screen: "review" as Screen, icon: "upload" as IconName, tone: "blue" as const },
    { id: "3", title: "AI Acceptance Gate Completed", detail: "94% criteria passed. Advisory report ready for review.", time: "22 min ago", screen: "review" as Screen, icon: "spark" as IconName, tone: "purple" as const },
    { id: "4", title: "Contract Agreement Signed", detail: "Mutual digital approval recorded for Contract Version 1", time: "2 hours ago", screen: "agreement" as Screen, icon: "file" as IconName, tone: "gray" as const },
  ])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-xs" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-line bg-white p-6 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary">
              <Icon name="bell" size="sm" />
            </span>
            <Heading level={2}>Notifications</Heading>
            <Badge tone="blue">{notifs.length} New</Badge>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-surface"><Icon name="x" size="sm" /></button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto space-y-3">
          {notifs.map((n) => (
            <div
              key={n.id}
              onClick={() => { navigate(n.screen); onClose() }}
              className="cursor-pointer rounded-2xl border border-line p-3.5 transition hover:bg-surface hover:border-line-strong space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
                  <Icon name={n.icon} size="sm" /> {n.title}
                </span>
                <span className="text-[0.65rem] text-subtle">{n.time}</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">{n.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-auto border-t border-line pt-4 flex gap-2">
          <Button variant="secondary" className="w-full text-xs" onClick={() => setNotifs([])}>Clear All</Button>
          <Button variant="primary" className="w-full text-xs" onClick={onClose}>Done</Button>
        </div>
      </aside>
    </>
  )
}
