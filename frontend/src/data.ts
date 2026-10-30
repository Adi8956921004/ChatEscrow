// ============================================================
// ChatEscrow – data.ts
// Types and API client wiring.
// Set VITE_API_BASE_URL in .env to connect to the Spring Boot backend.
// Falls back to localhost:8080 if not set.
// ============================================================

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080"

let currentActorRole: "client" | "freelancer" = "client"

export const setActorRole = (role: "client" | "freelancer") => {
  currentActorRole = role
}

export const getActorRole = (): "client" | "freelancer" => currentActorRole

export type MilestoneStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "ACCEPTED"
  | "REVISION_REQUESTED"
  | "DISAGREEMENT_FLAGGED"

export type PaymentStatus =
  | "NOT_CREATED"
  | "ORDER_CREATED"
  | "APPROVAL_PENDING"
  | "CAPTURE_PENDING"
  | "CAPTURED"
  | "FAILED"
  | "CANCELLED"
  | "UNKNOWN"

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface Project {
  id: string
  title: string
  description?: string
  clientName: string
  freelancerName: string
  freelancerEmail?: string
  currency: string
  status: "ACTIVE" | "COMPLETED" | "CANCELLED"
  totalBudget?: number
  createdAt: string
  updatedAt: string
}

export interface ContractVersion {
  id: string
  projectId: string
  versionNumber: number
  termsJson: string
  generatedFromConversation: boolean
  clientApprovalStatus: ApprovalStatus
  freelancerApprovalStatus: ApprovalStatus
  clientApprovedAt?: string
  freelancerApprovedAt?: string
  createdAt: string
  agreed?: boolean
}

export interface Milestone {
  id: string
  projectId: string
  contractVersionId?: string
  title: string
  amount?: number
  currency: string
  dueDate?: string
  deliverables?: string
  acceptanceCriteria?: string
  description?: string
  status: MilestoneStatus
  createdAt: string
  updatedAt: string
}

export interface Submission {
  id: string
  milestoneId: string
  submittedBy: string
  description?: string
  evidenceLinks?: string
  fileReferences?: string
  createdAt: string
}

export interface AcceptanceReport {
  id: string
  submissionId: string
  criterionResultsJson: string
  evidenceSummary?: string
  overallSummary?: string
  modelName?: string
  aiGenerated: boolean
  createdAt: string
}

export interface Payment {
  id: string
  projectId: string
  milestoneId?: string
  provider: string
  providerOrderId?: string
  providerCaptureId?: string
  amount?: number
  currency: string
  status: PaymentStatus
  verifiedAt?: string
  createdAt: string
  updatedAt: string
}

export interface Payout {
  id: string
  milestoneId: string
  projectId: string
  recipientEmail: string
  amount: number
  currency: string
  payoutBatchId: string
  status: string
  simulated: boolean
  provider: string
  releasedAt: string
}

export interface AuditEvent {
  id: string
  projectId: string
  actorId?: string
  actorName?: string
  eventType: string
  entityType?: string
  entityId?: string
  safeMetadata?: string
  createdAt: string
}

export interface WebhookEvent {
  id: string
  providerEventId: string
  eventType: string
  verificationStatus: "VERIFIED" | "FAILED" | "SKIPPED" | "SIMULATED"
  rawPayload: string
  processingResult?: string
  processedAt?: string
  createdAt: string
}

// ── API helpers ──────────────────────────────────────────────

/** Typed API error that carries the HTTP status code for fine-grained UI handling. */
export class ApiError extends Error {
  constructor(public readonly httpStatus: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const actorId = currentActorRole === "client" ? "Sarah Miller" : "Alex Carter"
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Actor-Role": currentActorRole,
      "X-Actor-Id": actorId,
      "Authorization": `Bearer ${currentActorRole}-demo-token`,
      ...opts?.headers,
    },
    ...opts,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new ApiError(res.status, `API ${opts?.method ?? "GET"} ${path} → ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// Projects
export const getProjects = () => api<Project[]>("/api/projects")
export const getProject = (id: string) => api<Project>(`/api/projects/${id}`)
export const createProject = (body: Record<string, unknown>) =>
  api<Project>("/api/projects", { method: "POST", body: JSON.stringify(body) })

// Contracts
export const getContractVersions = (projectId: string) =>
  api<ContractVersion[]>(`/api/projects/${projectId}/contract-versions`)
export const generateDraft = (projectId: string, conversationText: string) =>
  api<ContractVersion>(`/api/projects/${projectId}/contract-drafts`, {
    method: "POST",
    body: JSON.stringify({ conversationText }),
  })
export const saveDraft = (projectId: string, draftId: string, termsJson: string) =>
  api<ContractVersion>(`/api/projects/${projectId}/contract-drafts/${draftId}`, {
    method: "PUT",
    body: JSON.stringify({ termsJson }),
  })
export const approveContract = (projectId: string, versionId: string, role: "client" | "freelancer") =>
  api<ContractVersion>(`/api/projects/${projectId}/contract-versions/${versionId}/approve`, {
    method: "POST",
    body: JSON.stringify({ role }),
  })

// Milestones
export const getMilestones = (projectId: string) =>
  api<Milestone[]>(`/api/projects/${projectId}/milestones`)
export const syncProjectMilestones = (projectId: string, body: Record<string, unknown>) =>
  api<Project>(`/api/projects/${projectId}/sync-milestones`, { method: "POST", body: JSON.stringify(body) })
export const createMilestone = (projectId: string, body: Record<string, unknown>) =>
  api<Milestone>(`/api/projects/${projectId}/milestones`, { method: "POST", body: JSON.stringify(body) })
export const submitEvidence = (milestoneId: string, body: Record<string, unknown>) =>
  api<Submission>(`/api/milestones/${milestoneId}/submissions`, { method: "POST", body: JSON.stringify(body) })
export const getSubmissions = (milestoneId: string) =>
  api<Submission[]>(`/api/milestones/${milestoneId}/submissions`)
export const evaluateSubmission = (submissionId: string) =>
  api<AcceptanceReport>(`/api/submissions/${submissionId}/evaluate`, { method: "POST", body: "{}" })
export const acceptMilestone = (milestoneId: string) =>
  api<Milestone>(`/api/milestones/${milestoneId}/accept`, { method: "POST", body: "{}" })
export const requestRevision = (milestoneId: string, note: string) =>
  api<Milestone>(`/api/milestones/${milestoneId}/request-revision`, {
    method: "POST",
    body: JSON.stringify({ note }),
  })
export const flagDisagreement = (milestoneId: string, reason: string) =>
  api<Milestone>(`/api/milestones/${milestoneId}/flag-disagreement`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
export const releaseMilestone = (milestoneId: string) =>
  api<Record<string, unknown>>(`/api/milestones/${milestoneId}/release`, {
    method: "POST",
    body: "{}",
  })
export const getDisputePack = (milestoneId: string) =>
  api<Record<string, unknown>>(`/api/milestones/${milestoneId}/dispute-pack`)

// Payments
// Backend looks up stored milestone amount server-side; amount is not trusted from client
export const createPaypalOrder = (projectId: string, milestoneId: string, currency = "USD") =>
  api<Record<string, unknown>>("/api/payments/paypal/orders", {
    method: "POST",
    body: JSON.stringify({ projectId, milestoneId, currency }),
  })
export const capturePaypalOrder = (orderId: string) =>
  api<Record<string, unknown>>(`/api/payments/paypal/orders/${orderId}/capture`, { method: "POST", body: "{}" })
export const recheckPaypalOrder = (orderId: string) =>
  api<Record<string, unknown>>(`/api/payments/paypal/orders/${orderId}/recheck`, { method: "POST", body: "{}" })
export const depositDemoPayment = (projectId: string, milestoneId: string) =>
  api<Payment>("/api/payments/demo-deposit", {
    method: "POST",
    body: JSON.stringify({ projectId, milestoneId }),
  })
export const depositDemoEscrow = depositDemoPayment
export const getProjectPayments = (projectId: string) =>
  api<Payment[]>(`/api/projects/${projectId}/payments`)
export const refundPayment = (paymentId: string, reason?: string) =>
  api<Payment>(`/api/payments/${paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
export const getWebhookEvents = () =>
  api<WebhookEvent[]>("/api/webhooks/events")
export const simulateWebhook = (eventType: string) =>
  api<WebhookEvent>("/api/webhooks/simulate", {
    method: "POST",
    body: JSON.stringify({ eventType }),
  })

// Timeline
export const getTimeline = (projectId: string) =>
  api<AuditEvent[]>(`/api/projects/${projectId}/timeline`)

// Status
export const getStatus = () => api<Record<string, unknown>>("/api/status")

// ── Formatting helpers ──────────────────────────────────────

export const formatMoney = (amount?: number) =>
  amount != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount)
    : "—"

export const statusLabel: Record<MilestoneStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  ACCEPTED: "Accepted",
  REVISION_REQUESTED: "Revision requested",
  DISAGREEMENT_FLAGGED: "Disagreement flagged",
}

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  NOT_CREATED: "Not created",
  ORDER_CREATED: "Order created",
  APPROVAL_PENDING: "Awaiting approval",
  CAPTURE_PENDING: "Capture pending",
  CAPTURED: "Captured (verified)",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  UNKNOWN: "Unknown (reconcile)",
}

// Fallback / initial presentation data
export const activities = [
  { title: "Frontend milestone submitted", detail: "Alex submitted work for AI review", time: "18 min ago", type: "upload" },
  { title: "Design milestone approved", detail: "Sandbox payment marked ready for demo release", time: "2 days ago", type: "check" },
  { title: "Agreement activated", detail: "Sarah and Alex approved the project terms", time: "Aug 12", type: "spark" },
]


