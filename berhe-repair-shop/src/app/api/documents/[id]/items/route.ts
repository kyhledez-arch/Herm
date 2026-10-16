import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, reportItems } from "@/db/schema";
import { extractPdfText, parseReportText } from "@/lib/report-parser";
import { ApiError, apiError, checkOrigin, getWorkspace, isUUID, workspaceData } from "@/lib/server";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const workspace = await getWorkspace();
    const { id } = await context.params;
    if (!isUUID(id)) throw new ApiError("Document not found.", 404);
    const [file] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.workspaceId, workspace.id)));
    if (!file) throw new ApiError("Document not found.", 404);
    const items = await db.select().from(reportItems).where(eq(reportItems.documentId, id));
    return Response.json({ items, document: { id: file.id, name: file.name, bureau: file.bureau, parsed: items.length > 0 } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const { id } = await context.params;
    if (!isUUID(id)) throw new ApiError("Document not found.", 404);
    const [file] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.workspaceId, workspace.id)));
    if (!file) throw new ApiError("Document not found.", 404);
    if (file.mimeType !== "application/pdf") throw new ApiError("Item detection works on PDF reports. Re-upload the report as a PDF.");
    const content = file.content ? Buffer.from(file.content, "base64") : Buffer.from([]);
    if (!content.length) throw new ApiError("This sample document has no stored text. Upload your own redacted PDF report to detect items.");
    const text = await extractPdfText(new Uint8Array(content));
    const parsed = parseReportText(text);
    const rows = await db.transaction(async tx => {
      await tx.delete(reportItems).where(eq(reportItems.documentId, id));
      if (!parsed.length) return [];
      return tx.insert(reportItems).values(parsed.map(item => ({
        workspaceId: workspace.id, documentId: id, kind: item.kind, label: item.label.slice(0, 300),
        detail: item.detail.slice(0, 300), suggestedReason: item.suggestedReason, suggestedCategory: item.suggestedCategory,
        accountLast4: (item.accountLast4 ?? "").slice(0, 4), balanceCents: item.balanceCents ?? null, status: (item.status ?? "").slice(0, 60),
      }))).returning();
    });
    return Response.json({ items: rows, detected: rows.length, textPreview: text.slice(0, 400) });
  } catch (error) { return apiError(error); }
}
