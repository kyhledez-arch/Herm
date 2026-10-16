import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { activities, disputes, documents, reportItems } from "@/db/schema";
import { ACTIONS, CATEGORIES, REASONS, REPORTING_AGENCIES, getBureau } from "@/lib/bureaus";
import { draftFromReason } from "@/lib/dispute-templates";
import { defaultAgencyMethod, isSubmissionMethod, supportsAgencyMethod } from "@/lib/submission-methods";
import { ApiError, apiError, checkOrigin, clean, getWorkspace, workspaceData } from "@/lib/server";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const body = await request.json();
    const itemIds: string[] = Array.isArray(body.itemIds) ? [...new Set<string>(body.itemIds)].filter(Boolean) : [];
    if (!itemIds.length || itemIds.length > 60) throw new ApiError("Select at least one item from your report (up to 60).");
    const bureaus: string[] = Array.isArray(body.bureaus) ? [...new Set<string>(body.bureaus)] : [];
    if (!bureaus.length || bureaus.some(id => !REPORTING_AGENCIES.some(b => b.id === id))) throw new ApiError("Select at least one reporting agency.");
    const submissionMethod = body.submissionMethod === undefined ? bureaus.length === 1 ? defaultAgencyMethod(bureaus[0]) : "mail" : body.submissionMethod;
    if (!isSubmissionMethod(submissionMethod)) throw new ApiError("Choose online, mail, or phone.");
    if (bureaus.some(id => !supportsAgencyMethod(id, submissionMethod))) throw new ApiError("That submission method is not available for every selected agency.");
    if (body.reviewed !== true) throw new ApiError("Confirm you reviewed each selected item before creating drafts.");
    if (body.confirmed !== true) throw new ApiError("Confirm your explanations will be truthful to the best of your knowledge.");

    const rows = await db.select({ item: reportItems, document: documents }).from(reportItems)
      .innerJoin(documents, eq(reportItems.documentId, documents.id))
      .where(and(eq(reportItems.workspaceId, workspace.id), inArray(reportItems.id, itemIds)));
    if (rows.length !== itemIds.length) throw new ApiError("One or more selected items could not be found. Refresh and try again.");

    const requestedAction = clean(body.requestedAction) || ACTIONS[0];
    if (!ACTIONS.includes(requestedAction)) throw new ApiError("Choose a valid requested correction.");
    const created = await db.transaction(async tx => {
      const inserted = await tx.insert(disputes).values(
        rows.flatMap(({ item }) => bureaus.map(bureau => ({
          workspaceId: workspace.id, bureau,
          creditor: item.label.slice(0, 120),
          accountLast4: item.accountLast4 || item.detail.match(/\b\d{4}\b/)?.[0] || "",
          category: CATEGORIES.includes(item.suggestedCategory) ? item.suggestedCategory : CATEGORIES[0],
          reason: REASONS.includes(item.suggestedReason) ? item.suggestedReason : "Other inaccurate information",
          details: (() => {
            const reason = REASONS.includes(item.suggestedReason) ? item.suggestedReason : "Other inaccurate information";
            const last4 = item.detail.match(/\b\d{4}\b/)?.[0] ?? item.accountLast4 ?? "";
            return draftFromReason(reason, item.label, last4).details;
          })(),
          requestedAction, submissionMethod,
        })))
      ).returning();
      await tx.insert(activities).values(inserted.map(row => ({
        workspaceId: workspace.id, disputeId: row.id, title: `${row.creditor} draft created from report`,
        description: `${getBureau(row.bureau).name} · Selected from an uploaded report · Not submitted`, type: "draft",
      })));
      return inserted;
    });
    return Response.json({ ...await workspaceData(workspace.id), createdIds: created.map(d => d.id) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
