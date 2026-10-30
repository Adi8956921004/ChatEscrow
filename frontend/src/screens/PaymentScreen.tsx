import { useState, useEffect } from "react"
import type { Screen, Payment, Milestone, Project } from "../types"
import {
  getProjectPayments,
  getMilestones,
  getProject,
  depositDemoPayment,
  createPaypalOrder,
  capturePaypalOrder,
  recheckPaypalOrder,
  formatMoney,
  paymentStatusLabel,
  getActorRole,
} from "../data"
import { Icon, Button, Heading, Badge, Card, Field, InfoBanner, StatCard } from "../components/ui"

export function PaymentScreen({ navigate: _navigate, projectId }: { navigate: (s: Screen) => void; projectId: string }) {
  const activeRole = getActorRole()
  const isClient = activeRole === "client"
  const [payments, setPayments] = useState<Payment[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("")
  const [amount, setAmount] = useState("")
  const [loadingPaypal, setLoadingPaypal] = useState(false)
  const [loadingDemoDeposit, setLoadingDemoDeposit] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [capturingId, setCapturingId] = useState<string | null>(null)
  const [orderResult, setOrderResult] = useState<Record<string, unknown> | null>(null)
  const [captureResult, setCaptureResult] = useState<Record<string, unknown> | null>(null)
  const [demoDepositSuccess, setDemoDepositSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reloadData = () => {
    getProjectPayments(projectId).then(setPayments).catch((err) => {
      setError("Failed to load payments: " + (err instanceof Error ? err.message : String(err)))
    })
    getMilestones(projectId).then((ms) => {
      setMilestones(ms)
      if (ms.length > 0 && !selectedMilestoneId) {
        setSelectedMilestoneId(ms[0].id)
        if (ms[0].amount) setAmount(String(ms[0].amount))
      }
    }).catch((err) => {
      setError("Failed to load milestones: " + (err instanceof Error ? err.message : String(err)))
    })
    getProject(projectId).then(setProject).catch(() => {})
  }

  useEffect(() => {
    reloadData()
    // Auto-capture redirect token from PayPal Sandbox only if initiated by this session
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    if (token) {
      const pendingOrder = sessionStorage.getItem("chatescrow_pending_order")
      if (pendingOrder === token || payments.some((p) => p.providerOrderId === token)) {
        handleCaptureOrder(token).then(() => {
          sessionStorage.removeItem("chatescrow_pending_order")
          window.history.replaceState({}, document.title, window.location.pathname)
        })
      }
    }
  }, [projectId])

  const handleMilestoneChange = (id: string) => {
    setSelectedMilestoneId(id)
    const found = milestones.find((m) => m.id === id)
    if (found && found.amount) {
      setAmount(String(found.amount))
    }
  }

  // 1-Click Demo Milestone Deposit
  const handleDemoDeposit = async () => {
    setLoadingDemoDeposit(true); setError(null); setDemoDepositSuccess(null)
    const selected = milestones.find((m) => m.id === selectedMilestoneId)
    const parsedAmount = parseFloat(amount) || selected?.amount
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Please select a milestone with a valid amount.")
      setLoadingDemoDeposit(false)
      return
    }
    try {
      const p = await depositDemoPayment(projectId, selectedMilestoneId)
      setPayments((prev) => [p, ...prev])
      setDemoDepositSuccess(`Successfully recorded ${formatMoney(parsedAmount)} for milestone funding via demo simulation.`)
      reloadData()
    } catch (e) {
      setError("Milestone demo deposit failed: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoadingDemoDeposit(false)
    }
  }

  // Real PayPal Sandbox Order
  const handleCreatePaypalOrder = async () => {
    setLoadingPaypal(true); setError(null); setOrderResult(null); setCaptureResult(null)
    try {
      const result = await createPaypalOrder(projectId, selectedMilestoneId, milestones.find((m) => m.id === selectedMilestoneId)?.currency ?? "USD")
      if (result.orderId) {
        sessionStorage.setItem("chatescrow_pending_order", String(result.orderId))
      }
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
      // Backend returns 200 only for CAPTURED. Any other status on 2xx means an
      // idempotent already-captured response; non-2xx throws and is caught below.
      if (result.status !== "CAPTURED") {
        const providerStatus = result.providerStatus ? ` (PayPal: ${String(result.providerStatus)})` : ""
        setError(
          `Capture did not complete. Status: ${String(result.status)}${providerStatus}. ` +
          "The payment was NOT charged. Check PayPal Sandbox or try again after approval."
        )
      }
      reloadData()
    } catch (e) {
      // api() throws on non-2xx â€” surface the real HTTP error body
      setError(
        "Capture failed: " + (e instanceof Error ? e.message : String(e))
      )
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
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge tone={isClient ? "green" : "blue"}>
              {isClient ? "👤 Client View" : "🛠️ Freelancer View"}
            </Badge>
            <Badge tone="green"><Icon name="shield" size="sm" /> Demo Simulation Mode</Badge>
            <Badge tone="blue">PayPal Sandbox Mode</Badge>
            <Badge tone="amber">Sandbox, Not Regulated Escrow</Badge>
          </div>
          <Heading>{isClient ? "Milestone Funding & Checkout" : "Payment Status & Ledger"}</Heading>
          <p className="mt-1 text-sm text-muted">
            {isClient
              ? <>Secure milestone funds safely in the payment ledger. Use <strong>1-Click Demo Deposit</strong> or <strong>PayPal Sandbox</strong>.</>
              : "View the payment ledger for your project. Funds are released to you when the client approves each milestone."}
          </p>
        </div>
        <Button variant="secondary" icon="refresh" onClick={reloadData}>Refresh Ledger</Button>
      </div>

      {/* Balance Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={isClient ? "Total Funds in Milestone Ledger" : "Total Milestone Funds for You"}
          value={formatMoney(totalCaptured)}
          detail={isClient ? "Funds recorded in the neutral milestone ledger" : "Protected until your milestones are approved"}
          icon="shield"
          tone="green"
        />
        <StatCard
          label="Project Total"
          value={formatMoney(project?.totalBudget ?? milestones.reduce((acc, m) => acc + (Number(m.amount) || 0), 0))}
          detail="Agreed total across all milestones"
          icon="trend"
          tone="blue"
        />
        <StatCard
          label="Protection Status"
          value="Mutual Consent"
          detail={isClient ? "Funds never release without your approval" : "Payout guaranteed upon client approval"}
          icon="wallet"
          tone="amber"
        />
      </div>

      {error && <InfoBanner tone="red">{error}</InfoBanner>}

      {demoDepositSuccess && (
        <InfoBanner tone="green">
          <strong>Milestone Funded Successfully!</strong> {demoDepositSuccess} Work can proceed under agreed terms.
        </InfoBanner>
      )}

      {/* Funding forms — Client only */}
      {isClient && <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: 1-Click Demo Milestone Deposit */}
        <Card className="p-5 md:p-6 border-success-border bg-gradient-to-b from-success-soft/20 to-transparent">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-success text-white">
                  <Icon name="shield" size="sm" />
                </span>
                <Heading level={2}>1-Click Demo Milestone Deposit</Heading>
              </div>
              <p className="mt-1 text-xs text-muted">Simulate milestone deposit into the ledger without real money or login.</p>
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
                    {m.title} â€“ {formatMoney(m.amount)} USD
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Funding Amount (USD)" hint="Locked in simulation ledger until work is approved.">
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
              Deposit {formatMoney(parseFloat(amount) || 0)} into Milestone Ledger
            </Button>
            <p className="text-xs text-center text-subtle leading-relaxed">
              Funds are recorded directly into the milestone payment ledger as verified & captured.
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
                <p className="text-xs font-bold text-ink">Order Created: <span className="font-mono">{String(orderResult.orderId ?? "â€”")}</span></p>
                <div className="flex flex-col gap-2">
                  {Boolean(orderResult.approveUrl) && String(orderResult.approveUrl).startsWith("https") && (
                    <a
                      href={String(orderResult.approveUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary-hover transition"
                    >
                      <Icon name="external" size="sm" /> 1. Approve on PayPal Sandbox
                    </a>
                  )}
                  {Boolean(orderResult.orderId) && (
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

            {captureResult && captureResult.status === "CAPTURED" && (
              <div className="rounded-xl border border-success-border bg-success-soft p-3 space-y-1">
                <p className="text-xs font-bold text-success flex items-center gap-1.5"><Icon name="check" size="sm" /> Captured &amp; Verified</p>
                <p className="text-xs text-muted font-mono">Order: {String(captureResult.orderId)}</p>
                {Boolean(captureResult.captureId) && (
                  <p className="text-xs text-muted font-mono">Capture ID: {String(captureResult.captureId)}</p>
                )}
              </div>
            )}
            {captureResult && captureResult.status === "FAILED" && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 space-y-1">
                <p className="text-xs font-bold text-red-700 flex items-center gap-1.5"><Icon name="warning" size="sm" /> Capture Failed</p>
                <p className="text-xs text-muted font-mono">Status: {String(captureResult.providerStatus ?? captureResult.status)}</p>
                <p className="text-xs text-muted">No funds were charged. Ensure the order was approved on PayPal Sandbox, then try again.</p>
              </div>
            )}
            {captureResult && captureResult.status !== "CAPTURED" && captureResult.status !== "FAILED" && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-1">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5"><Icon name="warning" size="sm" /> Capture Status: {String(captureResult.status)}</p>
                <p className="text-xs text-muted">The order is in an unexpected state. No funds have been verified. Check PayPal Sandbox dashboard.</p>
              </div>
            )}
          </div>
        </Card>
      </div>}

      {/* Freelancer: informational banner about payments */}
      {!isClient && (
        <Card className="overflow-hidden border border-blue-200 bg-blue-50/30 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-600">
              <Icon name="shield" />
            </span>
            <div>
              <p className="font-bold text-ink">Your payments are fully protected</p>
              <p className="mt-1 text-xs text-muted">
                The client funds milestones into the protected payment ledger before work begins. Once you submit your deliverables and the client approves,
                the payout is released directly to your account. You can track all payment activity in the ledger below.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Milestone Payment Ledger Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-5 md:p-6">
          <div>
            <div className="flex items-center gap-2">
              <Heading level={2}>Milestone Payment Ledger</Heading>
              <Badge tone="amber">Sandbox simulation — not a regulated escrow</Badge>
            </div>
            <p className="mt-1 text-xs text-muted">Server-verified milestone transactions (Sandbox simulation — not a regulated escrow service).</p>
          </div>
          <Badge tone="green">{payments.length} Records</Badge>
        </div>

        <div className="divide-y divide-line">
          {payments.length === 0 ? (
            <div className="p-8 text-center text-muted">
              <p className="text-sm">No payment records yet in the ledger.</p>
              <p className="text-xs text-subtle mt-1">Use 1-Click Demo Deposit or PayPal Sandbox above to record milestone funding.</p>
            </div>
          ) : payments.map((p) => (
            <div key={p.id} className="p-4 md:p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-ink text-base">{formatMoney(p.amount)} {p.currency}</span>
                  <Badge tone={p.provider === "DEMO_ESCROW" ? "green" : "blue"}>
                    {p.provider === "DEMO_ESCROW" ? "Demo Ledger" : "PayPal Sandbox"}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted font-mono">
                  {p.providerOrderId && <span>Order: {p.providerOrderId.substring(0, 18)}â€¦</span>}
                  {p.providerCaptureId && <span>Capture: {p.providerCaptureId.substring(0, 18)}â€¦</span>}
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
                {p.status === "UNKNOWN" && p.providerOrderId && (
                  <Button
                    variant="secondary"
                    icon="warning"
                    loading={capturingId === p.providerOrderId}
                    onClick={async () => {
                      setCapturingId(p.providerOrderId!)
                      setError(null)
                      try {
                        const result = await recheckPaypalOrder(p.providerOrderId!)
                        if (result.status === "CAPTURED") {
                          reloadData()
                        } else {
                          setError(
                            `Re-check result: ${String(result.status)}.` +
                            (result.mismatch ? " Amount/currency mismatch â€” check PayPal Sandbox dashboard to reconcile." : " Status still unresolved.")
                          )
                        }
                      } catch (e) {
                        setError("Re-check failed: " + (e instanceof Error ? e.message : String(e)))
                      } finally {
                        setCapturingId(null)
                      }
                    }}
                    className="text-xs py-1 px-2.5 border-amber-400 text-amber-700 hover:bg-amber-50"
                  >
                    Re-check
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
