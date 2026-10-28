import { useState, useEffect } from "react"
import { getActorRole, setActorRole, getProjects } from "./data"
import type { Screen, Role } from "./types"
import { Sidebar } from "./components/Sidebar"
import { Topbar } from "./components/Topbar"
import {
  Dashboard,
  Builder,
  Agreement,
  Review,
  PaymentScreen,
  Timeline,
  WebhooksScreen,
} from "./screens"

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
  const [activeRole, setActiveRole] = useState<Role>(getActorRole())
  const selectRole = (role: Role) => {
    setActorRole(role)
    setActiveRole(role)
    triggerRefresh()
  }

  useEffect(() => {
    getProjects()
      .then((projects) => {
        if (projects.length > 0) {
          setProjectId(projects[0].id)
        }
      })
      .catch((err) => {
        console.warn("Could not load projects from backend, using default project ID:", err instanceof Error ? err.message : err)
      })
  }, [refreshKey])

  const navigate = (next: Screen) => {
    setScreen(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="app-shell min-h-screen bg-page text-ink">
      <Sidebar
        screen={screen}
        setScreen={navigate}
        open={menuOpen}
        close={() => setMenuOpen(false)}
        activeRole={activeRole}
      />
      <div className="lg:pl-72">
        <Topbar
          screen={screen}
          openMenu={() => setMenuOpen(true)}
          activeRole={activeRole}
          onSelectRole={selectRole}
        />
        <main className="relative p-4 md:p-8 lg:p-10">
          {screen === "dashboard" && <Dashboard navigate={navigate} projectId={projectId} />}
          {screen === "builder" && <Builder navigate={navigate} projectId={projectId} onRefresh={triggerRefresh} />}
          {screen === "agreement" && <Agreement navigate={navigate} projectId={projectId} onRefresh={triggerRefresh} />}
          {screen === "review" && <Review navigate={navigate} projectId={projectId} />}
          {screen === "payment" && <PaymentScreen navigate={navigate} projectId={projectId} />}
          {screen === "timeline" && <Timeline projectId={projectId} />}
          {screen === "webhooks" && <WebhooksScreen />}
        </main>
      </div>
    </div>
  )
}
