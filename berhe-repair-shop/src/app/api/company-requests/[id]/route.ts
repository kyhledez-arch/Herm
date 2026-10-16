import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, companyRequests } from "@/db/schema";
import { getCfpbCompany } from "@/lib/cfpb-directory";
import { ownedCompanyRequest, requestCalendarDate } from "@/lib/company-request-server";
import { ApiError, apiError, checkOrigin, clean, getWorkspace, workspaceData } from "@/lib/server";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const { id } = await context.params;
    const row = await ownedCompanyRequest(id, workspace.id);
    const company = getCfpbCompany(row.companyId);
    const body = await request.json();
    const status = clean(body.status || row.status);
    if (!["draft", "submitted", "completed", "needs_attention"].includes(status)) throw new ApiError("Choose a valid request tracking status.");
    if (status === "draft" && row.submittedAt) throw new ApiError("A recorded submission cannot be turned back into an unsent plan.");
    let submittedAt = row.submittedAt;
    if (!submittedAt && status !== "draft") {
      if (status !== "submitted" || body.actualSubmissionConfirmed !== true) throw new ApiError("Record the actual provider submission before tracking a result.");
      submittedAt = requestCalendarDate(body.submittedAt);
    }
    if (status === "completed" && body.outcomeConfirmed !== true) throw new ApiError(row.kind === "freeze" ? "Confirm the provider told you the freeze is active. An opened link or submitted request is not confirmation." : "Confirm you received the report or the provider’s completed response.");
    await db.transaction(async tx => {
      await tx.update(companyRequests).set({ status, submittedAt, completedAt: status === "completed" ? row.completedAt ?? new Date() : null, reference: clean(body.reference ?? row.reference, 120), notes: clean(body.notes ?? row.notes, 3000), updatedAt: new Date() }).where(eq(companyRequests.id, id));
      await tx.insert(activities).values({ workspaceId: workspace.id, requestId: id, title: `${row.kind === "report" ? "Report" : "Freeze"} request ${status === "draft" ? "plan updated" : status === "submitted" ? "submission recorded" : status === "completed" ? "completion recorded" : "needs follow-up"}`, description: `${company?.name ?? "Company"} · Recorded by you, not synced with the provider`, type: status === "completed" ? "resolved" : "info" });
    });
    return Response.json(await workspaceData(workspace.id));
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const { id } = await context.params;
    const row = await ownedCompanyRequest(id, workspace.id);
    await db.transaction(async tx => {
      await tx.delete(companyRequests).where(eq(companyRequests.id, id));
      await tx.insert(activities).values({ workspaceId: workspace.id, title: "Company request removed from workspace", description: `${getCfpbCompany(row.companyId)?.name ?? "Company"} · Does not cancel a provider request or remove a freeze`, type: "info" });
    });
    return Response.json(await workspaceData(workspace.id));
  } catch (error) { return apiError(error); }
}
