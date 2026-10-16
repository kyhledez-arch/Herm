import { db } from "@/db";
import { activities, disputes } from "@/db/schema";
import { REPORTING_AGENCIES, CATEGORIES, REASONS, ACTIONS } from "@/lib/bureaus";
import { getSubmissionMethod, isSubmissionMethod, defaultAgencyMethod, supportsAgencyMethod } from "@/lib/submission-methods";
import { ApiError, apiError, checkOrigin, clean, getWorkspace, workspaceData } from "@/lib/server";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const body = await request.json();
    const selected: string[] = Array.isArray(body.bureaus) ? [...new Set<string>(body.bureaus)] : [];
    if (!selected.length || selected.length > REPORTING_AGENCIES.length || selected.some(id => !REPORTING_AGENCIES.some(b => b.id === id))) throw new ApiError("Select at least one supported reporting agency.");
    const creditor = clean(body.creditor, 120), accountLast4 = clean(body.accountLast4, 4);
    const category = clean(body.category), reason = clean(body.reason), details = clean(body.details, 4000), requestedAction = clean(body.requestedAction);
    const submissionMethod = body.submissionMethod === undefined ? selected.length === 1 ? defaultAgencyMethod(selected[0]) : selected.every(id => supportsAgencyMethod(id, "online")) ? "online" : "mail" : body.submissionMethod;
    if (!isSubmissionMethod(submissionMethod)) throw new ApiError("Choose online, mail, or phone. No-login online submission is not available here.");
    if (selected.some(id => !supportsAgencyMethod(id, submissionMethod))) throw new ApiError("That submission method is not a verified filing route for every selected provider. Choose an available route; support requests and freezes are not disputes.");
    if (creditor.length < 2) throw new ApiError("Enter the bank, creditor, or item name.");
    if (accountLast4 && !/^\d{4}$/.test(accountLast4)) throw new ApiError("Use only the last four digits of the account number.");
    if (!CATEGORIES.includes(category) || !REASONS.includes(reason) || !ACTIONS.includes(requestedAction)) throw new ApiError("Choose a valid category, reason, and requested correction.");
    if (details.length < 20) throw new ApiError("Explain the specific inaccuracy in at least 20 characters.");
    if (body.confirmed !== true) throw new ApiError("Please confirm that your explanation is accurate to the best of your knowledge.");
    const created = await db.transaction(async tx => {
      const rows = await tx.insert(disputes).values(selected.map(bureau => ({ workspaceId: workspace.id, bureau, creditor, accountLast4, category, reason, details, requestedAction, submissionMethod }))).returning();
      await tx.insert(activities).values(rows.map(row => ({ workspaceId: workspace.id, disputeId: row.id, title: `${creditor} draft created`, description: `${REPORTING_AGENCIES.find(b => b.id === row.bureau)?.name} · ${getSubmissionMethod(row.submissionMethod).shortLabel} route · Not submitted`, type: "draft" })));
      return rows;
    });
    return Response.json({ ...await workspaceData(workspace.id), createdIds: created.map(d => d.id) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
