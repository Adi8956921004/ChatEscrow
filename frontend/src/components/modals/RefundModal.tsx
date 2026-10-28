import { useState } from "react"
import type { Payment } from "../../types"
import { refundPayment, formatMoney } from "../../data"
import { Icon, Button, Heading, Field, InfoBanner } from "../ui"

export function RefundModal({
  payment,
  onClose,
  onSuccess,
}: {
  payment: Payment
  onClose: () => void
  onSuccess: (payment: Payment) => void
}) {
  const [reason, setReason] = useState("Milestone cancelled by mutual agreement")
  const [refunding, setRefunding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRefund = async () => {
    setRefunding(true); setError(null)
    try {
      const updated = await refundPayment(payment.id, reason)
      onSuccess(updated)
      onClose()
    } catch (err) {
      setError("Refund request failed: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setRefunding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-hero">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2 text-danger">
            <Icon name="warning" size="md" />
            <Heading level={2}>Refund Milestone Deposit</Heading>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-surface"><Icon name="x" size="sm" /></button>
        </div>

        <div className="mt-4 space-y-3">
          <InfoBanner tone="amber">
            You are initiating a full refund of <strong>{formatMoney(payment.amount)} {payment.currency}</strong> from milestone funding back to Sarah Miller (Client).
          </InfoBanner>
          <Field label="Refund Reason / Notes">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="field text-xs"
            />
          </Field>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-3 border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={refunding} onClick={handleRefund}>
            Confirm Milestone Refund
          </Button>
        </div>
      </div>
    </div>
  )
}
