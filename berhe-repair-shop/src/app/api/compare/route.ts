import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { documents, reportItems } from "@/db/schema";
import { COMPARE_BUREAUS, buildComparison, type CompareItemRef } from "@/lib/bureau-compare";
import { apiError, getWorkspace } from "@/lib/server";
import type { Bureau, ReportItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const workspace = await getWorkspace();
    const reports = await db.select().from(documents)
      .where(and(eq(documents.workspaceId, workspace.id), eq(documents.kind, "report")))
      .orderBy(desc(documents.createdAt));

    const latest = new Map<Bureau, typeof reports[number]>();
    for (const report of reports) {
      const bureau = report.bureau as Bureau | null;
      if (bureau && COMPARE_BUREAUS.includes(bureau) && !latest.has(bureau)) latest.set(bureau, report);
    }
    const documentIds = [...latest.values()].map(report => report.id);
    const rows = documentIds.length
      ? await db.select().from(reportItems).where(and(eq(reportItems.workspaceId, workspace.id), inArray(reportItems.documentId, documentIds)))
      : [];
    const typedRows: ReportItem[] = rows.map(row => ({ ...row, kind: row.kind as ReportItem["kind"], createdAt: row.createdAt.toISOString() }));

    const bureauByDocument = new Map(documentIds.map(id => {
      const entry = [...latest.values()].find(report => report.id === id)!;
      return [id, entry.bureau as Bureau];
    }));
    const refs: CompareItemRef[] = typedRows.map(item => ({ item, bureau: bureauByDocument.get(item.documentId)! })).filter(ref => ref.bureau);

    return Response.json({
      ...buildComparison(refs),
      reports: COMPARE_BUREAUS.map(bureau => {
        const report = latest.get(bureau);
        return report ? { bureau, documentId: report.id, documentName: report.name, uploadedAt: report.createdAt } : { bureau, documentId: null, documentName: null, uploadedAt: null };
      }),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
