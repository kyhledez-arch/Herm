import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, documents } from "@/db/schema";
import { ApiError, apiError, checkOrigin, getWorkspace, isUUID, workspaceData } from "@/lib/server";
import { makePdf } from "@/lib/pdf";

type Context = { params: Promise<{ id: string }> };
async function getFile(id: string, workspaceId: string) {
  if (!isUUID(id)) throw new ApiError("Document not found.", 404);
  const [file] = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.workspaceId, workspaceId)));
  if (!file) throw new ApiError("Document not found.", 404);
  return file;
}
export async function GET(_request: Request, context: Context) {
  try {
    const workspace = await getWorkspace();
    const { id } = await context.params;
    const file = await getFile(id, workspace.id);
    const bytes = file.isSample ? await makePdf("Sample Workspace Document", [file.name, "This example document is provided to demonstrate BerheRepairShop's document management. It contains no real credit report or account information.", "To start using your own information, clear the sample workspace in Settings and upload a redacted PDF or image. Supply sensitive identity documents only to the official bureau."], true) : new Uint8Array(Buffer.from(file.content ?? "", "base64"));
    return new Response(bytes, { headers: { "Content-Type": file.mimeType, "Content-Disposition": `attachment; filename="${file.name.replace(/["\r\n]/g, "_").replace(/[^\x20-\x7E]/g, "_")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const { id } = await context.params;
    const file = await getFile(id, workspace.id);
    await db.transaction(async tx => {
      await tx.delete(documents).where(eq(documents.id, id));
      await tx.insert(activities).values({ workspaceId: workspace.id, title: "Document removed", description: file.name, type: "document" });
    });
    return Response.json(await workspaceData(workspace.id));
  } catch (error) { return apiError(error); }
}
