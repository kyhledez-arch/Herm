import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, complaints } from "@/db/schema";
import { cfpbPriorDisputeEligible, COMPLAINT_STATUS_LABELS, getComplaintChannel, requiresPriorDispute } from "@/lib/complaints";
import { ownedComplaint, validateComplaintInput } from "@/lib/complaint-server";
import { ApiError, apiError, checkOrigin, clean, getWorkspace, workspaceData } from "@/lib/server";
import type { DisputeStatus } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const { id } = await context.params;
    const complaint = await ownedComplaint(id, workspace.id);
    const body = await request.json();
    const channel = getComplaintChannel(complaint.channel);
    if (body.action === "edit") {
      if (complaint.status !== "draft") throw new ApiError("Only unsubmitted drafts can be edited. Update a submitted complaint directly with CFPB or BBB.");
      const values = await validateComplaintInput(body, workspace.id, complaint.channel);
      await db.transaction(async tx => {
        await tx.update(complaints).set({ ...values, updatedAt: new Date() }).where(eq(complaints.id, id));
        await tx.insert(activities).values({ workspaceId: workspace.id, complaintId: id, title: `${channel.name} complaint draft updated`, description: `${values.company} · Revised by you`, type: "draft" });
      });
      return Response.json(await workspaceData(workspace.id));
    }
    const status = clean(body.status) as DisputeStatus;
    if (!["in_review", "resolved", "needs_attention"].includes(status)) throw new ApiError("Choose a valid complaint tracking status.");
    let submittedAt = complaint.submittedAt, followUpAt = complaint.followUpAt;
    if (status === "in_review" && !submittedAt) {
      if (requiresPriorDispute(complaint.channel, complaint.issue) && (!complaint.priorDisputeConfirmed || !cfpbPriorDisputeEligible(complaint.priorDisputeDate ?? "", complaint.priorDisputeNoLongerPending))) {
        throw new ApiError("CFPB’s current credit-report complaint notice requires a prior direct CRA dispute and says to submit only when it is no longer pending or 45 days have elapsed since filing.");
      }
      if (body.actualSubmissionConfirmed !== true) throw new ApiError(`Confirm that you submitted directly through ${channel.name} before recording a submission here.`);
      const date = clean(body.submittedAt, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ApiError("Enter a valid submission date.");
      submittedAt = new Date(`${date}T12:00:00Z`);
      if (Number.isNaN(submittedAt.getTime()) || submittedAt.toISOString().slice(0, 10) !== date || submittedAt.getTime() > Date.now() + 86400000) throw new ApiError("Choose a valid submission date that is not in the future.");
      followUpAt = new Date(submittedAt.getTime() + channel.followUpDays * 86400000);
    }
    if (status !== "in_review" && !submittedAt) throw new ApiError("Record the actual portal submission before recording a company response.");
    await db.transaction(async tx => {
      await tx.update(complaints).set({ status, submittedAt, followUpAt, reference: clean(body.reference ?? complaint.reference, 120), resolution: clean(body.resolution ?? complaint.resolution, 3000), updatedAt: new Date() }).where(eq(complaints.id, id));
      await tx.insert(activities).values({ workspaceId: workspace.id, complaintId: id, title: `${channel.name} complaint ${status === "in_review" ? "submission recorded" : `marked ${COMPLAINT_STATUS_LABELS[status].toLowerCase()}`}`, description: `${complaint.company} · Updated by you, not synced with the portal`, type: status === "resolved" ? "resolved" : status === "in_review" ? "submitted" : "info" });
    });
    return Response.json(await workspaceData(workspace.id));
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const { id } = await context.params;
    const complaint = await ownedComplaint(id, workspace.id);
    await db.transaction(async tx => {
      await tx.delete(complaints).where(eq(complaints.id, id));
      await tx.insert(activities).values({ workspaceId: workspace.id, title: `${getComplaintChannel(complaint.channel).name} complaint removed`, description: "Removed from this workspace only. This does not delete or withdraw an official complaint.", type: "info" });
    });
    return Response.json(await workspaceData(workspace.id));
  } catch (error) { return apiError(error); }
}
