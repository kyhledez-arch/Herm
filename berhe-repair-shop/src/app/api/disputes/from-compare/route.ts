import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { activities, disputes, documents, reportItems } from "@/db/schema";
import { ACTIONS, CATEGORIES, REASONS, REPORTING_AGENCIES, getBureau } from "@/lib/bureaus";
import { defaultAgencyMethod, isSubmissionMethod, supportsAgencyMethod } from "@/lib/submission-methods";
import { COMPARE_BUREAUS } from "@/lib/bureau-compare";
import { ApiError, apiError, checkOrigin, clean, getWorkspace, workspaceData } from "@/lib/server";
import type { Bureau } from "@/lib/types";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const body = await request.json();

    const itemIds: string[] = Array.isArray(body.itemIds) ? [...new Set<string>(body.itemIds)].filter(Boolean) : [];
    if (!itemIds.length || itemIds.length > 60) throw new ApiError("Select at least one item from your comparison (up to 60).");

    const rows = await db.select({ item: reportItems, document: documents }).from(reportItems)
      .innerJoin(documents, eq(reportItems.documentId, documents.id))
      .where(and(eq(reportItems.workspaceId, workspace.id), inArray(reportItems.id, itemIds)));
    if (rows.length !== itemIds.length) throw new ApiError("One or more selected items could not be found. Refresh the comparison and try again.");

    // A bureau can only be disputed where the item is actually reported. You cannot dispute the
    // absence of a tradeline at a bureau that never received it.
    const disputedBureaus: Bureau[] = [...new Set(rows.map(row => row.document.bureau as Bureau))];
    if (!disputedBureaus.length) throw new ApiError("Select at least one bureau where this item is reported.");
    if (disputedBureaus.some(bureau => !COMPARE_BUREAUS.includes(bureau))) throw new ApiError("Cross-bureau comparison covers Experian, Equifax, TransUnion, and Innovis.");

    const selectedBureaus: string[] = Array.isArray(body.bureaus) ? [...new Set<string>(body.bureaus)] : [];
    if (!selectedBureaus.length) throw new ApiError("Select at least one bureau to prepare a draft for.");
    if (selectedBureaus.some(bureau => !disputedBureaus.includes(bureau as Bureau))) throw new ApiError("You can only prepare drafts for bureaus that actually report this item. A bureau that never received the account cannot be disputed for omitting it.");

    const submissionMethod = body.submissionMethod === undefined
      ? selectedBureaus.length === 1 ? defaultAgencyMethod(selectedBureaus[0]) : "mail"
      : body.submissionMethod;
    if (!isSubmissionMethod(submissionMethod)) throw new ApiError("Choose online, mail, or phone.");
    if (selectedBureaus.some(bureau => !supportsAgencyMethod(bureau, submissionMethod))) throw new ApiError("That submission method is not available for every selected bureau.");

    // One draft per selected bureau, quoting that bureau's own reported values.
    const itemByBureau = new Map<Bureau, typeof rows[number]["item"]>();
    for (const { item, document } of rows) {
      const bureau = document.bureau as Bureau;
      if (!itemByBureau.has(bureau)) itemByBureau.set(bureau, item);
    }

    const correctValue = clean(body.correctValue, 1000);
    if (correctValue.length < 5) throw new ApiError("Enter what your own records show is correct. BerheRepairShop cannot tell which bureau is right—that has to come from you.");

    const selectedItems = selectedBureaus.map(bureau => itemByBureau.get(bureau as Bureau)).filter(Boolean);
    const inferredReason = new Set(selectedItems.map(item => String(item!.balanceCents))).size > 1
      ? "Incorrect account balance"
      : new Set(selectedItems.map(item => item!.status).filter(Boolean)).size > 1 ? "Incorrect account status" : "Other inaccurate information";
    const reason = clean(body.reason) || inferredReason;
    const category = clean(body.category) || "Account information";
    const requestedAction = clean(body.requestedAction) || ACTIONS[0];
    if (!REASONS.includes(reason) || !CATEGORIES.includes(category) || !ACTIONS.includes(requestedAction)) throw new ApiError("Choose a valid reason, category, and requested correction.");
    if (body.reviewed !== true) throw new ApiError("Confirm you checked the item against your own records before creating drafts.");
    if (body.confirmed !== true) throw new ApiError("Confirm your explanation is truthful to the best of your knowledge.");

    const created = await db.transaction(async tx => {
      const inserted = await tx.insert(disputes).values(selectedBureaus.map(bureau => {
        const item = itemByBureau.get(bureau as Bureau);
        if (!item) throw new ApiError(`No report item found for ${getBureau(bureau).name}.`);
        return {
          workspaceId: workspace.id, bureau,
          creditor: item.label.slice(0, 120),
          accountLast4: item.accountLast4.slice(0, 4),
          category, reason,
          details: `Compared across my credit reports. ${getBureau(bureau).name} reports: ${item.label}${item.detail ? ` (${item.detail})` : ""}${item.status ? `, status "${item.status}"` : ""}. Based on my own records, the correct information is: ${correctValue}. Please investigate this discrepancy and correct your records. Other bureaus may report different values for this account.`,
          requestedAction, submissionMethod,
        };
      })).returning();
      await tx.insert(activities).values(inserted.map(row => ({
        workspaceId: workspace.id, disputeId: row.id,
        title: `${row.creditor} draft created from comparison`,
        description: `${getBureau(row.bureau).name} · Cross-bureau comparison · Not submitted`,
        type: "draft",
      })));
      return inserted;
    });
    return Response.json({ ...await workspaceData(workspace.id), createdIds: created.map(row => row.id) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
