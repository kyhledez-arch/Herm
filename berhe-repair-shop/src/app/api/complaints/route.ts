import { db } from "@/db";
import { activities, complaints } from "@/db/schema";
import { getComplaintChannel } from "@/lib/complaints";
import { validateComplaintInput } from "@/lib/complaint-server";
import { apiError, checkOrigin, getWorkspace, workspaceData } from "@/lib/server";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const values = await validateComplaintInput(await request.json(), workspace.id);
    const created = await db.transaction(async tx => {
      const [complaint] = await tx.insert(complaints).values({ workspaceId: workspace.id, ...values }).returning();
      await tx.insert(activities).values({ workspaceId: workspace.id, complaintId: complaint.id, title: `${getComplaintChannel(complaint.channel).name} complaint draft created`, description: `${complaint.company} · Ready for review, not submitted`, type: "draft" });
      return complaint;
    });
    return Response.json({ ...await workspaceData(workspace.id), createdId: created.id }, { status: 201 });
  } catch (error) { return apiError(error); }
}
