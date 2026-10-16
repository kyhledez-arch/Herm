import { boolean, date, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const workspaces = pgTable("dm_workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("Alex Morgan"),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  isDemo: boolean("is_demo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const disputes = pgTable("dm_disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  bureau: text("bureau").notNull(),
  creditor: text("creditor").notNull(),
  accountLast4: text("account_last_4").notNull().default(""),
  category: text("category").notNull().default("Account information"),
  reason: text("reason").notNull(),
  details: text("details").notNull(),
  requestedAction: text("requested_action").notNull().default("Correct the inaccurate information"),
  submissionMethod: text("submission_method").notNull().default("online"),
  receivedAt: timestamp("received_at", { withTimezone: true }),
  status: text("status").notNull().default("draft"),
  reference: text("reference").notNull().default(""),
  resolution: text("resolution").notNull().default(""),
  outcome: text("outcome").notNull().default(""),
  accountsDeleted: integer("accounts_deleted").notNull().default(0),
  isSample: boolean("is_sample").notNull().default(false),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const complaints = pgTable("dm_complaints", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  relatedDisputeId: uuid("related_dispute_id").references(() => disputes.id, { onDelete: "set null" }),
  company: text("company").notNull(),
  companyContact: text("company_contact").notNull().default(""),
  issue: text("issue").notNull(),
  details: text("details").notNull(),
  contactHistory: text("contact_history").notNull().default(""),
  desiredResolution: text("desired_resolution").notNull(),
  priorDisputeConfirmed: boolean("prior_dispute_confirmed").notNull().default(false),
  priorDisputeDate: date("prior_dispute_date", { mode: "string" }),
  priorDisputeNoLongerPending: boolean("prior_dispute_no_longer_pending").notNull().default(false),
  status: text("status").notNull().default("draft"),
  reference: text("reference").notNull().default(""),
  resolution: text("resolution").notNull().default(""),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  followUpAt: timestamp("follow_up_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reportItems = pgTable("dm_report_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  detail: text("detail").notNull().default(""),
  suggestedReason: text("suggested_reason").notNull().default(""),
  suggestedCategory: text("suggested_category").notNull().default(""),
  accountLast4: text("account_last_4").notNull().default(""),
  balanceCents: integer("balance_cents"),
  status: text("status").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const companyRequests = pgTable("dm_company_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  companyId: text("company_id").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("draft"),
  notes: text("notes").notNull().default(""),
  reference: text("reference").notNull().default(""),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("dm_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  disputeId: uuid("dispute_id").references(() => disputes.id, { onDelete: "set null" }),
  complaintId: uuid("complaint_id").references(() => complaints.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("supporting"),
  bureau: text("bureau"),
  mimeType: text("mime_type").notNull().default("application/pdf"),
  size: integer("size").notNull().default(0),
  content: text("content"),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activities = pgTable("dm_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  disputeId: uuid("dispute_id").references(() => disputes.id, { onDelete: "set null" }),
  complaintId: uuid("complaint_id").references(() => complaints.id, { onDelete: "set null" }),
  requestId: uuid("request_id").references(() => companyRequests.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  type: text("type").notNull().default("info"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
