export type Bureau = "experian" | "equifax" | "transunion" | "innovis" | "chexsystems" | "earlywarning" | "datax" | "lexisnexis" | "worknumber" | `cfpb-${string}`;
export type ComplaintChannel = "cfpb" | "bbb";
export type SubmissionMethod = "online" | "mail" | "phone";
export type DisputeStatus = "draft" | "in_review" | "resolved" | "needs_attention";
export type PageName = "overview" | "disputes" | "complaints" | "reports" | "documents" | "bureaus" | "compare" | "companies" | "specialty" | "protection" | "learn" | "settings";
export interface Workspace { id: string; name: string; email: string; address: string; isDemo: boolean; createdAt: string }
export interface Dispute {
  id: string; workspaceId: string; bureau: Bureau; creditor: string; accountLast4: string;
  category: string; reason: string; details: string; requestedAction: string; status: DisputeStatus;
  submissionMethod: SubmissionMethod; receivedAt: string | null;
  reference: string; resolution: string; outcome: string; accountsDeleted: number;
  isSample: boolean; submittedAt: string | null; dueAt: string | null;
  createdAt: string; updatedAt: string;
}
export interface Complaint {
  id: string; workspaceId: string; channel: ComplaintChannel; relatedDisputeId: string | null;
  company: string; companyContact: string; issue: string; details: string; contactHistory: string;
  desiredResolution: string; priorDisputeConfirmed: boolean; priorDisputeDate: string | null; priorDisputeNoLongerPending: boolean; status: DisputeStatus; reference: string;
  resolution: string; submittedAt: string | null; followUpAt: string | null; createdAt: string; updatedAt: string;
}
export interface ComplaintInput {
  channel: ComplaintChannel; relatedDisputeId: string; company: string; companyContact: string;
  issue: string; details: string; contactHistory: string; desiredResolution: string;
  priorDisputeConfirmed: boolean; priorDisputeDate: string; priorDisputeNoLongerPending: boolean; confirmed: boolean; privacyAcknowledged: boolean;
}
export interface DocumentRecord {
  id: string; workspaceId: string; disputeId: string | null; complaintId: string | null; name: string; kind: string;
  bureau: Bureau | null; mimeType: string; size: number; isSample: boolean; createdAt: string;
}
export interface Activity { id: string; disputeId: string | null; complaintId: string | null; requestId: string | null; title: string; description: string; type: string; createdAt: string }
export type RequestKind = "report" | "freeze";
export type CompanyRequestStatus = "draft" | "submitted" | "completed" | "needs_attention";
export interface CompanyRequest {
  id: string; workspaceId: string; companyId: Bureau; kind: RequestKind; status: CompanyRequestStatus;
  notes: string; reference: string; submittedAt: string | null; completedAt: string | null; createdAt: string; updatedAt: string;
}
export interface WorkspaceData { workspace: Workspace; disputes: Dispute[]; complaints: Complaint[]; requests: CompanyRequest[]; documents: DocumentRecord[]; activities: Activity[] }
export interface DisputeInput { bureaus: Bureau[]; creditor: string; accountLast4: string; category: string; reason: string; details: string; requestedAction: string; submissionMethod: SubmissionMethod; confirmed: boolean }
export type ReportItemKind = "account" | "address" | "phone" | "employer" | "name" | "inquiry";
export interface ParsedReportItem {
  kind: ReportItemKind; label: string; detail: string;
  suggestedReason: string; suggestedCategory: string; raw?: string; sourcePage?: number;
  accountLast4?: string; balanceCents?: number | null; status?: string;
}
export interface ReportItem {
  id: string; workspaceId: string; documentId: string; kind: ReportItemKind;
  label: string; detail: string; suggestedReason: string; suggestedCategory: string;
  accountLast4: string; balanceCents: number | null; status: string; createdAt: string;
}
export type CompareField = "balance" | "status" | "accountLast4";
export interface CompareDifference { field: CompareField; values: Partial<Record<Bureau, string>> }
export interface CompareGroup {
  id: string; label: string;
  presentAt: Bureau[]; missingAt: Bureau[];
  byBureau: Partial<Record<Bureau, ReportItem>>;
  differences: CompareDifference[];
  severity: "conflict" | "partial" | "single" | "consistent";
}
export interface PersonalGroup { id: string; kind: ReportItemKind; label: string; presentAt: Bureau[]; byBureau: Partial<Record<Bureau, ReportItem>> }
export interface CompareSummary {
  bureausWithReports: Bureau[]; totalAccounts: number; conflicts: number;
  partial: number; single: number; consistent: number;
  accountsPerBureau: { bureau: Bureau; count: number }[];
}
export interface BureauComparison {
  groups: CompareGroup[]; personal: PersonalGroup[]; summary: CompareSummary;
}
