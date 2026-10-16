import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, disputes } from "@/db/schema";
import { ACTIONS, CATEGORIES, getBureau, OUTCOME_OPTIONS, REASONS, STATUS_LABELS } from "@/lib/bureaus";
import { getSubmissionMethod, isSubmissionMethod, supportsAgencyMethod } from "@/lib/submission-methods";
import { ApiError, apiError, checkOrigin, clean, getWorkspace, ownedDispute, workspaceData } from "@/lib/server";
import type { DisputeStatus } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };
function calendarDate(value: unknown, label: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(`Enter a valid ${label}.`);
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || value > new Date().toISOString().slice(0, 10)) throw new ApiError(`Choose a valid ${label} that is not in the future.`);
  return date;
}
export async function PATCH(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const { id } = await context.params;
    const dispute = await ownedDispute(id, workspace.id);
    const body = await request.json();
    if (body.action === "set_method") {
      if (dispute.status !== "draft") throw new ApiError("The method for an already submitted dispute cannot be changed here.");
      if (!isSubmissionMethod(body.submissionMethod)) throw new ApiError("Choose online, mail, or phone.");
      if (!supportsAgencyMethod(dispute.bureau, body.submissionMethod)) throw new ApiError("This provider does not publish that standard dispute filing route. Choose an available method.");
      await db.transaction(async tx => {
        await tx.update(disputes).set({ submissionMethod: body.submissionMethod, updatedAt: new Date() }).where(eq(disputes.id, id));
        await tx.insert(activities).values({ workspaceId: workspace.id, disputeId: id, title: `${dispute.creditor} submission preference saved`, description: `${getBureau(dispute.bureau).name} · ${getSubmissionMethod(body.submissionMethod).label} · Not submitted`, type: "info" });
      });
      return Response.json(await workspaceData(workspace.id));
    }
    if (body.action === "record_delivery") {
      if (dispute.submissionMethod !== "mail" || !dispute.submittedAt || dispute.status === "draft") throw new ApiError("Record a mailed dispute before adding its delivery date.");
      if (body.receivedAtConfirmed !== true) throw new ApiError("Confirm the delivery date using your carrier receipt or bureau acknowledgment.");
      const receivedAt = calendarDate(body.receivedAt, "bureau received date");
      if (receivedAt < dispute.submittedAt) throw new ApiError("The received date cannot be before the mailing date.");
      await db.transaction(async tx => {
        await tx.update(disputes).set({ receivedAt, dueAt: new Date(receivedAt.getTime() + 30 * 86400000), updatedAt: new Date() }).where(eq(disputes.id, id));
        await tx.insert(activities).values({ workspaceId: workspace.id, disputeId: id, title: `${dispute.creditor} delivery recorded`, description: `${getBureau(dispute.bureau).name} · Receipt-based planning reminder updated by you`, type: "submitted" });
      });
      return Response.json(await workspaceData(workspace.id));
    }
    if (body.action === "edit") {
      if (dispute.status !== "draft") throw new ApiError("Only unsubmitted drafts can be edited. A bureau submission cannot be changed here.");
      const creditor = clean(body.creditor, 120), accountLast4 = clean(body.accountLast4, 4), details = clean(body.details, 4000);
      const reason = clean(body.reason), category = clean(body.category), requestedAction = clean(body.requestedAction);
      const submissionMethod = body.submissionMethod ?? dispute.submissionMethod;
      if (!isSubmissionMethod(submissionMethod)) throw new ApiError("Choose a valid submission method.");
    if (!supportsAgencyMethod(dispute.bureau, submissionMethod)) throw new ApiError("This method is not an available dispute filing route for this provider. A help request or freeze request is not a submitted dispute.");
      if (creditor.length < 2 || details.length < 20) throw new ApiError("Enter a creditor name and a specific explanation of at least 20 characters.");
      if (accountLast4 && !/^\d{4}$/.test(accountLast4)) throw new ApiError("Enter only the last four account digits.");
      if (!REASONS.includes(reason) || !CATEGORIES.includes(category) || !ACTIONS.includes(requestedAction)) throw new ApiError("Choose valid dispute details.");
      await db.transaction(async tx => {
        await tx.update(disputes).set({ creditor, accountLast4, details, reason, category, requestedAction, submissionMethod, updatedAt: new Date() }).where(eq(disputes.id, id));
        await tx.insert(activities).values({ workspaceId: workspace.id, disputeId: id, title: `${creditor} draft updated`, description: `${getBureau(dispute.bureau).name} · Explanation revised by you`, type: "draft" });
      });
      return Response.json(await workspaceData(workspace.id));
    }
    const status = clean(body.status) as DisputeStatus;
    if (!Object.hasOwn(STATUS_LABELS, status)) throw new ApiError("Choose a valid dispute status.");
    let submittedAt = dispute.submittedAt, receivedAt = dispute.receivedAt, dueAt = dispute.dueAt;
    const submissionMethod = body.submissionMethod ?? dispute.submissionMethod;
    if (!isSubmissionMethod(submissionMethod)) throw new ApiError("Choose a valid submission method.");
    if (!supportsAgencyMethod(dispute.bureau, submissionMethod)) throw new ApiError("This method is not an available dispute filing route for this provider. A help request or freeze request is not a submitted dispute.");
    if (dispute.status !== "draft" && submissionMethod !== dispute.submissionMethod) throw new ApiError("A recorded submission method cannot be changed here.");
    if (status === "in_review" && !submittedAt) {
      if (getBureau(dispute.bureau).catalogSource && body.currentInstructionsConfirmed !== true) throw new ApiError("Confirm the company’s current dispute filing instructions and recipient before recording a directory draft as submitted.");
      if (body.actualSubmissionConfirmed !== true) throw new ApiError("Confirm that you completed an online/phone dispute or mailed the packet before recording it here.");
      submittedAt = calendarDate(body.submittedAt ?? new Date().toISOString().slice(0, 10), submissionMethod === "mail" ? "mailing date" : "submission date");
      if (submissionMethod === "mail") {
        receivedAt = body.receivedAt ? calendarDate(body.receivedAt, "bureau received date") : null;
        if (receivedAt && body.receivedAtConfirmed !== true) throw new ApiError("Confirm the bureau received date using a delivery receipt or acknowledgment.");
        if (receivedAt && receivedAt < submittedAt) throw new ApiError("The received date cannot be before the mailing date.");
      } else receivedAt = submittedAt;
      dueAt = receivedAt ? new Date(receivedAt.getTime() + 30 * 86400000) : null;
    }
    if (status === "draft") { submittedAt = null; receivedAt = null; dueAt = null; }
    const outcome = body.outcome !== undefined ? clean(body.outcome, 20) : dispute.outcome;
    if (!OUTCOME_OPTIONS.some(o => o.id === outcome)) throw new ApiError("Choose a valid outcome.");
    let accountsDeleted = dispute.accountsDeleted ?? 0;
    if (body.accountsDeleted !== undefined) {
      const parsed = typeof body.accountsDeleted === "number" ? body.accountsDeleted : parseInt(String(body.accountsDeleted), 10);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 99) throw new ApiError("Enter how many accounts were deleted (0–99).");
      accountsDeleted = parsed;
    }
    if (status === "resolved" && outcome === "deleted" && accountsDeleted < 1) throw new ApiError("Enter how many accounts were deleted (at least 1) when the outcome is deleted.");
    await db.transaction(async tx => {
      await tx.update(disputes).set({ status, submissionMethod, submittedAt, receivedAt, dueAt, reference: clean(body.reference ?? dispute.reference, 100), resolution: clean(body.resolution ?? dispute.resolution, 2000), outcome, accountsDeleted, updatedAt: new Date() }).where(eq(disputes.id, id));
      await tx.insert(activities).values({ workspaceId: workspace.id, disputeId: id, title: `${dispute.creditor} ${status === "in_review" ? "submission recorded" : `marked ${STATUS_LABELS[status].toLowerCase()}`}`, description: `${getBureau(dispute.bureau).name} · ${getSubmissionMethod(submissionMethod).shortLabel}${accountsDeleted > 0 ? ` · ${accountsDeleted} account${accountsDeleted === 1 ? "" : "s"} deleted` : ""} · Updated by you`, type: status === "resolved" ? "resolved" : status === "in_review" ? "submitted" : "info" });
    });
    return Response.json(await workspaceData(workspace.id));
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const { id } = await context.params;
    const dispute = await ownedDispute(id, workspace.id);
    await db.transaction(async tx => {
      await tx.delete(disputes).where(eq(disputes.id, id));
      await tx.insert(activities).values({ workspaceId: workspace.id, title: `${dispute.creditor} dispute removed`, description: "Removed from this workspace only; not withdrawn from the bureau.", type: "info" });
    });
    return Response.json(await workspaceData(workspace.id));
  } catch (error) { return apiError(error); }
}
