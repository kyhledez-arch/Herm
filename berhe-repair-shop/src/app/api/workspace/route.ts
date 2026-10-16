import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, complaints, companyRequests, disputes, documents, workspaces } from "@/db/schema";
import { ApiError, apiError, checkOrigin, clean, getWorkspace, workspaceData } from "@/lib/server";

export const dynamic = "force-dynamic";
export async function GET() {
  try { const workspace = await getWorkspace(true); return Response.json(await workspaceData(workspace.id), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return apiError(error); }
}
export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const body = await request.json();
    const name = clean(body.name, 80), email = clean(body.email, 120), address = clean(body.address, 500);
    if (!name) throw new ApiError("Please enter your name.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("Please enter a valid email address.");
    await db.update(workspaces).set({ name, email, address }).where(eq(workspaces.id, workspace.id));
    return Response.json(await workspaceData(workspace.id));
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const body = await request.json();
    if (body.confirm !== "START FRESH") throw new ApiError("Please confirm before clearing your workspace.");
    await db.transaction(async tx => {
      await tx.delete(activities).where(eq(activities.workspaceId, workspace.id));
      await tx.delete(documents).where(eq(documents.workspaceId, workspace.id));
      await tx.delete(companyRequests).where(eq(companyRequests.workspaceId, workspace.id));
      await tx.delete(complaints).where(eq(complaints.workspaceId, workspace.id));
      await tx.delete(disputes).where(eq(disputes.workspaceId, workspace.id));
      await tx.update(workspaces).set({ isDemo: false, name: workspace.isDemo && workspace.name === "Alex Morgan" ? "Your workspace" : workspace.name }).where(eq(workspaces.id, workspace.id));
      await tx.insert(activities).values({ workspaceId: workspace.id, title: "A fresh start", description: "Your workspace is ready for your first dispute, complaint, or report request.", type: "info" });
    });
    return Response.json(await workspaceData(workspace.id));
  } catch (error) { return apiError(error); }
}
