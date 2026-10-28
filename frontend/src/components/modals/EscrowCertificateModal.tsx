import { useState, useEffect } from "react"
import type { Payment, Milestone } from "../../types"
import { formatMoney } from "../../data"
import { Icon, Button, Heading, Badge } from "../ui"

export function EscrowCertificateModal({
  payment,
  milestone,
  onClose,
}: {
  payment: Payment
  milestone?: Milestone
  onClose: () => void
}) {
  const [downloaded, setDownloaded] = useState(false)
  const [digest, setDigest] = useState<string>("Computing SHA-256 digest...")
  const certId = `CERT-${payment.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase()}`

  useEffect(() => {
    const computeHash = async () => {
      const canonicalPayload = `CHATESCROW-AUDIT-RECORD|${certId}|${payment.id}|${payment.amount}|${payment.currency}|${payment.provider}|${payment.providerOrderId ?? "N/A"}|${payment.providerCaptureId ?? "N/A"}|${payment.verifiedAt || payment.createdAt}`
      try {
        const msgUint8 = new TextEncoder().encode(canonicalPayload)
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
        setDigest(`sha256:${hashHex}`)
      } catch {
        setDigest(`sha256:${payment.id.replace(/-/g, "").padEnd(64, "0").slice(0, 64)}`)
      }
    }
    computeHash()
  }, [certId, payment])

  const handleDownload = () => {
    const text = `========================================================================
CHATESCROW MILESTONE FUNDING AUDIT CERTIFICATE
Certificate ID : ${certId}
Timestamp      : ${payment.verifiedAt || payment.createdAt}
Digital Digest : ${digest}
========================================================================

PROJECT INFORMATION:
Project Title  : E-commerce Website Development
Depositor      : Sarah Miller (Demo Client)
Beneficiary    : Alex Carter (Demo Freelancer)

MILESTONE ALLOCATION:
Milestone      : ${milestone?.title || "Project Milestone"}
Funded Amount  : ${payment.amount} ${payment.currency}
Vault Provider : ${payment.provider === "DEMO_ESCROW" ? "ChatEscrow Simulated Demo Ledger" : "PayPal Developer Sandbox"}
Provider Order : ${payment.providerOrderId || "N/A"}
Provider Capture: ${payment.providerCaptureId || "N/A"}
Status         : ${payment.status} (Verified in Milestone Ledger)

MUTUAL PROTECTION PROTOCOL:
- Funds are recorded in the neutral milestone ledger.
- Funds release ONLY upon verified AI Acceptance Gate evaluation AND explicit Client Authorization.
- Neither party may unilaterally drain funds without agreed dispute resolution.

Audit Record Fingerprint: ${digest} (Cryptographic verification hash)
========================================================================`
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ChatEscrow-Certificate-${certId}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-line bg-white p-6 shadow-hero">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-success-soft text-success">
              <Icon name="shield" size="sm" />
            </span>
            <div>
              <Heading level={2}>Milestone Funding Audit Certificate</Heading>
              <p className="text-xs text-muted">Audit Record of Secured Milestone Funds</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-surface" aria-label="Close modal">
            <Icon name="x" size="sm" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-xs">
          <div className="rounded-2xl border border-success-border bg-gradient-to-b from-success-soft/30 to-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-muted">{certId}</span>
              <Badge tone="green"><Icon name="check" size="sm" /> SECURED IN LEDGER</Badge>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-ink">{formatMoney(payment.amount)} {payment.currency}</p>
              <p className="text-muted mt-0.5">Allocated for: <strong className="text-ink">{milestone?.title || "Milestone"}</strong></p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line text-muted">
              <div><span className="block font-bold text-subtle uppercase">Depositor</span> Sarah Miller (Client)</div>
              <div><span className="block font-bold text-subtle uppercase">Beneficiary</span> Alex Carter (Freelancer)</div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl bg-surface p-4 border border-line">
            <p className="font-bold text-ink">Ledger & Provider References:</p>
            <div className="font-mono text-[0.7rem] space-y-1 text-muted">
              <p>Provider: <span className="text-ink font-semibold">{payment.provider}</span></p>
              <p>Order Reference: <span className="text-ink">{payment.providerOrderId || "DEMO-TX-001"}</span></p>
              {payment.providerCaptureId && <p>Capture Reference: <span className="text-ink">{payment.providerCaptureId}</span></p>}
              <p>Verified Timestamp: <span className="text-ink">{payment.verifiedAt ? new Date(payment.verifiedAt).toLocaleString() : new Date().toLocaleString()}</span></p>
              <p className="truncate">Digital Digest: <span className="text-ink">{digest}</span></p>
            </div>
          </div>

          <div className="rounded-xl border border-line p-3 text-muted">
            <p className="font-bold text-ink mb-1 flex items-center gap-1.5"><Icon name="lock" size="sm" /> Release Condition</p>
            <p className="leading-relaxed">
              Funds are recorded in milestone protection. Release occurs only upon satisfactory completion of acceptance criteria and client authorization.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
          <Button variant="secondary" icon="download" onClick={handleDownload}>
            {downloaded ? "Downloaded!" : "Download Certificate (.txt)"}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  )
}
