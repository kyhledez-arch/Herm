import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, complaints, companyRequests, disputes, documents, workspaces } from "@/db/schema";

const COOKIE = "dispute_master_workspace";
export const isUUID = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const daysAgo = (days: number) => new Date(Date.now() - days * 86400000);
const daysAhead = (days: number) => new Date(Date.now() + days * 86400000);

export async function getWorkspace(create = false) {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id && isUUID(id)) {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    if (workspace) return workspace;
  }
  if (!create) throw new ApiError("Your session has expired. Please refresh the workspace.", 401);
  const newId = randomUUID();
  const workspace = await db.transaction(async tx => {
    const [newWorkspace] = await tx.insert(workspaces).values({ id: newId }).returning();
    const seeds = await tx.insert(disputes).values([
      { workspaceId: newId, bureau: "experian", creditor: "Capital One", accountLast4: "4832", category: "Account information", reason: "Incorrect account balance", details: "My sample report lists a balance of $1,240, but my most recent statement shows $840. The payment made before the reporting date has not been reflected.", status: "in_review", submittedAt: daysAgo(12), dueAt: daysAhead(18), createdAt: daysAgo(14), updatedAt: daysAgo(2), reference: "SAMPLE-EX-1024", isSample: true },
      { workspaceId: newId, bureau: "equifax", creditor: "Portfolio Recovery", accountLast4: "9017", category: "Collection account", reason: "This account isn’t mine", details: "This sample collection account does not belong to me. I do not recognize the original creditor or the account details. Please investigate the ownership of this account.", requestedAction: "Remove an account that does not belong to me", status: "in_review", submittedAt: daysAgo(6), dueAt: daysAhead(24), createdAt: daysAgo(7), updatedAt: daysAgo(3), reference: "SAMPLE-EQ-2086", isSample: true },
      { workspaceId: newId, bureau: "transunion", creditor: "Chase Bank", accountLast4: "7621", category: "Payment history", reason: "Incorrect late payment", details: "My sample report shows a late payment, but my payment confirmation shows that the payment was received before the due date. Please correct the reported payment history.", status: "draft", createdAt: daysAgo(1), updatedAt: daysAgo(1), isSample: true },
      { workspaceId: newId, bureau: "experian", creditor: "Discover", accountLast4: "2290", category: "Account information", reason: "Duplicate account", details: "This sample credit card account appears twice on my credit report with the same opening date and account details. Please remove the duplicate entry.", requestedAction: "Remove a duplicate entry", status: "resolved", resolution: "Sample outcome: the duplicate entry was removed.", outcome: "deleted", accountsDeleted: 1, submittedAt: daysAgo(29), dueAt: daysAgo(-1), createdAt: daysAgo(30), updatedAt: daysAgo(4), isSample: true },
      { workspaceId: newId, bureau: "equifax", creditor: "Wells Fargo", accountLast4: "1645", category: "Account information", reason: "Incorrect account status", details: "This sample account was paid in full but is still shown with an outstanding balance. Please update the balance and status to reflect the creditor’s final statement.", requestedAction: "Update the account status", status: "resolved", resolution: "Sample outcome: the account status was corrected.", outcome: "corrected", accountsDeleted: 0, submittedAt: daysAgo(36), dueAt: daysAgo(6), createdAt: daysAgo(37), updatedAt: daysAgo(11), isSample: true },
    ]).returning();
    await tx.insert(documents).values([
      { workspaceId: newId, name: "Experian credit report.pdf", kind: "report", bureau: "experian", size: 248320, isSample: true, createdAt: daysAgo(14) },
      { workspaceId: newId, name: "Equifax credit report.pdf", kind: "report", bureau: "equifax", size: 196608, isSample: true, createdAt: daysAgo(7) },
      { workspaceId: newId, name: "TransUnion credit report.pdf", kind: "report", bureau: "transunion", size: 224256, isSample: true, createdAt: daysAgo(2) },
      { workspaceId: newId, name: "Payment confirmation.pdf", kind: "supporting", disputeId: seeds[2].id, size: 47104, isSample: true, createdAt: daysAgo(1) },
    ]);
    await tx.insert(activities).values([
      { workspaceId: newId, disputeId: seeds[2].id, title: "Your Chase Bank draft is ready", description: "TransUnion · Review and take the next step", type: "draft", createdAt: daysAgo(1) },
      { workspaceId: newId, disputeId: seeds[0].id, title: "Capital One dispute is in review", description: "Experian · Sample submission recorded", type: "submitted", createdAt: daysAgo(2) },
      { workspaceId: newId, disputeId: seeds[3].id, title: "One less thing to worry about", description: "Discover · Sample duplicate entry resolved", type: "resolved", createdAt: daysAgo(4) },
      { workspaceId: newId, title: "Equifax report added to your workspace", description: "Your sample documents are organized and ready", type: "document", createdAt: daysAgo(7) },
    ]);
    return newWorkspace;
  });
  jar.set(COOKIE, newId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 90 });
  return workspace;
}

export async function workspaceData(workspaceId: string) {
  const [[workspace], disputeRows, complaintRows, requestRows, documentRows, activityRows] = await Promise.all([
    db.select().from(workspaces).where(eq(workspaces.id, workspaceId)),
    db.select().from(disputes).where(eq(disputes.workspaceId, workspaceId)).orderBy(desc(disputes.updatedAt)),
    db.select().from(complaints).where(eq(complaints.workspaceId, workspaceId)).orderBy(desc(complaints.updatedAt)),
    db.select().from(companyRequests).where(eq(companyRequests.workspaceId, workspaceId)).orderBy(desc(companyRequests.updatedAt)),
    db.select({ id: documents.id, workspaceId: documents.workspaceId, disputeId: documents.disputeId, complaintId: documents.complaintId, name: documents.name, kind: documents.kind, bureau: documents.bureau, mimeType: documents.mimeType, size: documents.size, isSample: documents.isSample, createdAt: documents.createdAt }).from(documents).where(eq(documents.workspaceId, workspaceId)).orderBy(desc(documents.createdAt)),
    db.select().from(activities).where(eq(activities.workspaceId, workspaceId)).orderBy(desc(activities.createdAt)).limit(30),
  ]);
  return { workspace, disputes: disputeRows, complaints: complaintRows, requests: requestRows, documents: documentRows, activities: activityRows };
}

export async function ownedDispute(id: string, workspaceId: string) {
  if (!isUUID(id)) throw new ApiError("Dispute not found", 404);
  const [dispute] = await db.select().from(disputes).where(and(eq(disputes.id, id), eq(disputes.workspaceId, workspaceId)));
  if (!dispute) throw new ApiError("Dispute not found", 404);
  return dispute;
}
export class ApiError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function apiError(error: unknown) {
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  console.error("BerheRepairShop request failed:", error);
  return Response.json({ error: "We couldn’t save your changes. Please try again." }, { status: 500 });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && new URL(origin).host !== host) throw new ApiError("This request is not allowed.", 403);
}
export const clean = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
