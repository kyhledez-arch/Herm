import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { apiError, getWorkspace, ownedDispute } from "@/lib/server";
import { makeDisputeLetter } from "@/lib/pdf";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const workspace = await getWorkspace();
    const { id } = await context.params;
    const dispute = await ownedDispute(id, workspace.id);
    const files = await db.select({ name: documents.name }).from(documents).where(and(eq(documents.workspaceId, workspace.id), eq(documents.disputeId, id)));
    const pdf = await makeDisputeLetter(dispute, workspace, files.map(f => f.name));
    const name = dispute.creditor.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 70);
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}-${dispute.bureau}-dispute-draft.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return apiError(error); }
}
