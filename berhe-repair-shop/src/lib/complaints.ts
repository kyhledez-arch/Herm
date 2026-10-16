import type { ComplaintChannel, DisputeStatus } from "./types";

export const COMPLAINT_CHANNELS: { id: ComplaintChannel; name: string; fullName: string; domain: string; role: string; portal: string; guidance: string; description: string; timeline: string; followUpDays: number; privacy: string }[] = [
  {
    id: "cfpb", name: "CFPB", fullName: "Consumer Financial Protection Bureau", domain: "consumerfinance.gov / CFPB.gov", role: "Federal agency",
    portal: "https://www.consumerfinance.gov/complaint/", guidance: "https://www.consumerfinance.gov/complaint/credit-and-consumer-reporting-complaint-notice-2/", 
    description: "Raise a concern about credit reporting, debt collection, or another financial product. For an inaccurate consumer report, first dispute with the CRA; CFPB says submit only after that dispute is no longer pending or 45 days have elapsed.",
    timeline: "Companies generally respond in 15 days; some provide a final response within 60 days.", followUpDays: 15,
    privacy: "Use your own words and review CFPB’s data-use choices. Complaint information is shared with the company, and some information may be published. Provide identity and contact details directly on the official portal.",
  },
  {
    id: "bbb", name: "BBB", fullName: "Better Business Bureau", domain: "BBB.org", role: "Independent nonprofit",
    portal: "https://www.bbb.org/file-a-complaint", guidance: "https://www.bbb.org/process-of-complaints-and-reviews/complaints",
    description: "Ask for help resolving an eligible marketplace issue with a business. BBB facilitates a response; it is not a government regulator or credit bureau.",
    timeline: "Businesses are asked to respond within 14 days; complaints are generally closed in about 30 days.", followUpDays: 14,
    privacy: "BBB forwards your complaint to the business and may publicly post the text after closure. Keep names, account numbers, addresses, and other personally identifying details out of the complaint narrative.",
  },
];
export const getComplaintChannel = (id: string) => COMPLAINT_CHANNELS.find(channel => channel.id === id) ?? COMPLAINT_CHANNELS[0];
export const COMPLAINT_ISSUES = ["Inaccurate credit report information", "Inaccurate banking consumer report information", "Inaccurate specialty consumer report information", "Inaccurate employment or income report information", "Problem with a dispute investigation", "Debt collection issue", "Credit repair service issue", "Financial product or billing issue", "Other business service issue"];
export const issuesForChannel = (channel: ComplaintChannel) => channel === "cfpb" ? COMPLAINT_ISSUES.filter(issue => issue !== "Other business service issue") : COMPLAINT_ISSUES;
export const requiresPriorDispute = (channel: string, issue: string) => channel === "cfpb" && ["Inaccurate credit report information", "Inaccurate banking consumer report information", "Inaccurate specialty consumer report information", "Inaccurate employment or income report information", "Problem with a dispute investigation"].includes(issue);
export const CFPB_CRA_DISPUTE_WAIT_DAYS = 45;
export function daysSincePriorDispute(dateValue: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return -1;
  const filed = new Date(`${dateValue}T00:00:00Z`);
  if (Number.isNaN(filed.getTime()) || filed.toISOString().slice(0, 10) !== dateValue) return -1;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.floor((today.getTime() - filed.getTime()) / 86400000);
}
export function cfpbPriorDisputeEligible(dateValue: string, noLongerPending: boolean, now = new Date()) {
  const age = daysSincePriorDispute(dateValue, now);
  return age >= 0 && (noLongerPending || age >= CFPB_CRA_DISPUTE_WAIT_DAYS);
}
export const COMPLAINT_STATUS_LABELS: Record<DisputeStatus, string> = { draft: "Draft", in_review: "Submitted", resolved: "Resolved", needs_attention: "Needs attention" };
export interface ComplaintDraftContent { channel: string; company: string; companyContact: string; issue: string; details: string; contactHistory: string; desiredResolution: string }
export function complaintDraftText(complaint: ComplaintDraftContent) {
  return [`${getComplaintChannel(complaint.channel).name} complaint draft`, `Company: ${complaint.company}`, ...(complaint.companyContact ? [`Company location / contact: ${complaint.companyContact}`] : []), `Issue: ${complaint.issue}`, `What happened:\n${complaint.details}`, `Steps already taken:\n${complaint.contactHistory || "[Describe any contact or direct dispute before submitting.]"}`, `Requested resolution:\n${complaint.desiredResolution}`].join("\n\n");
}
