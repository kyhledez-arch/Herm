import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { complaints } from "@/db/schema";
import { cfpbPriorDisputeEligible, COMPLAINT_CHANNELS, daysSincePriorDispute, issuesForChannel, requiresPriorDispute } from "./complaints";
import { ApiError, clean, isUUID, ownedDispute } from "./server";
import type { ComplaintChannel } from "./types";

export async function ownedComplaint(id: string, workspaceId: string) {
  if (!isUUID(id)) throw new ApiError("Complaint not found.", 404);
  const [complaint] = await db.select().from(complaints).where(and(eq(complaints.id, id), eq(complaints.workspaceId, workspaceId)));
  if (!complaint) throw new ApiError("Complaint not found.", 404);
  return complaint;
}
export async function validateComplaintInput(body: Record<string, unknown>, workspaceId: string, fixedChannel?: string) {
  const channel = clean(fixedChannel ?? body.channel) as ComplaintChannel;
  if (!COMPLAINT_CHANNELS.some(c => c.id === channel)) throw new ApiError("Choose CFPB or BBB for this complaint.");
  const company = clean(body.company, 160), companyContact = clean(body.companyContact, 500), issue = clean(body.issue);
  const details = clean(body.details, 6000), contactHistory = clean(body.contactHistory, 3000), desiredResolution = clean(body.desiredResolution, 2000);
  if (company.length < 2) throw new ApiError("Enter the company you are complaining about.");
  if (!issuesForChannel(channel).includes(issue)) throw new ApiError("Select an issue that fits this complaint channel.");
  if (details.length < 30) throw new ApiError("Describe what happened in at least 30 characters.");
  if (desiredResolution.length < 10) throw new ApiError("Describe a specific requested resolution in at least 10 characters.");
  if (body.confirmed !== true) throw new ApiError("Confirm that your complaint is truthful to the best of your knowledge.");
  if (body.privacyAcknowledged !== true) throw new ApiError("Review and acknowledge the complaint privacy guidance.");
  const priorRequired = requiresPriorDispute(channel, issue);
  const priorDisputeConfirmed = priorRequired && body.priorDisputeConfirmed === true;
  const priorDisputeDate = priorRequired ? clean(body.priorDisputeDate, 10) : "";
  const priorDisputeNoLongerPending = priorRequired && body.priorDisputeNoLongerPending === true;
  const priorDisputeAge = priorDisputeDate ? daysSincePriorDispute(priorDisputeDate) : -1;
  if (priorDisputeDate && priorDisputeAge < 0) throw new ApiError("Enter a valid date for your direct dispute that is not in the future.");
  if (priorDisputeNoLongerPending && (!priorDisputeConfirmed || !priorDisputeDate)) {
    throw new ApiError("Only confirm that the CRA dispute is no longer pending after recording a direct CRA dispute date and confirming you filed it.");
  }
  if (priorRequired && priorDisputeConfirmed && !priorDisputeDate) {
    throw new ApiError("Enter the date you filed your direct dispute with the credit or consumer reporting company.");
  }
  const relatedDisputeId = clean(body.relatedDisputeId, 50);
  if (relatedDisputeId) {
    const dispute = await ownedDispute(relatedDisputeId, workspaceId);
    if (dispute.isSample) throw new ApiError("Sample disputes cannot be used in a real complaint. Choose your own dispute or leave the link blank.");
  }
  return { channel, company, companyContact, issue, details, contactHistory, desiredResolution, priorDisputeConfirmed, priorDisputeDate: priorDisputeDate || null, priorDisputeNoLongerPending, relatedDisputeId: relatedDisputeId || null };
}
