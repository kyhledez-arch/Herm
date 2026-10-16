import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { ownedComplaint } from "@/lib/complaint-server";
import { complaintDraftText, getComplaintChannel } from "@/lib/complaints";
import { makePdf } from "@/lib/pdf";
import { apiError, getWorkspace } from "@/lib/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const workspace = await getWorkspace();
    const { id } = await context.params;
    const complaint = await ownedComplaint(id, workspace.id);
    const channel = getComplaintChannel(complaint.channel);
    const files = await db.select({ name: documents.name }).from(documents).where(and(eq(documents.workspaceId, workspace.id), eq(documents.complaintId, id)));
    const pdf = await makePdf(`${channel.name} Complaint Draft`, [
      "PREPARATION COPY ONLY. This is not an official filing or proof of submission.",
      complaintDraftText(complaint),
      files.length ? `Supporting files to review and submit separately: ${files.map(f => f.name).join(", ")}.` : "Gather relevant statements, dispute confirmations, and company correspondence before submitting.",
      "Provide your identity and contact details directly on the official portal, not in the complaint narrative.",
      channel.privacy,
      `Review the official portal's current requirements and submit at: ${channel.portal}`,
      "CFPB and BBB are complaint channels, not credit reporting bureaus. This draft does not replace a direct credit report dispute, and no outcome is guaranteed.",
    ], false, "Prepared complaint draft. Review and submit on the official portal.");
    const filename = complaint.company.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 65);
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}-${complaint.channel}-complaint-draft.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return apiError(error); }
}
