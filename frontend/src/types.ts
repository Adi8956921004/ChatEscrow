import type { ReactNode } from "react"
import type {
  Project,
  Milestone,
  ContractVersion,
  Submission,
  AcceptanceReport,
  Payment,
  AuditEvent,
  WebhookEvent,
} from "./data"

export type Screen = "dashboard" | "builder" | "agreement" | "review" | "payment" | "timeline" | "webhooks"
export type Role = "client" | "freelancer"

export type IconName =
  | "grid" | "spark" | "file" | "search" | "bell" | "plus" | "arrow"
  | "wallet" | "clock" | "check" | "trend" | "upload" | "calendar"
  | "users" | "shield" | "edit" | "chevron" | "message" | "external"
  | "menu" | "x" | "link" | "warning" | "info" | "refresh" | "paypal"
  | "trash" | "download" | "lock" | "scale"

export type {
  Project,
  Milestone,
  ContractVersion,
  Submission,
  AcceptanceReport,
  Payment,
  AuditEvent,
  WebhookEvent,
  ReactNode,
}
