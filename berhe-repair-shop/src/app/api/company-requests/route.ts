import { db } from "@/db";
import { activities, companyRequests } from "@/db/schema";
import { getCfpbCompany } from "@/lib/cfpb-directory";
import { ApiError, apiError, checkOrigin, clean, getWorkspace, workspaceData } from "@/lib/server";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const body = await request.json();
    const company = getCfpbCompany(clean(body.companyId, 180));
    if (!company) throw new ApiError("Choose a company from the CFPB directory.");
    const kind = clean(body.kind);
    if (!["report", "freeze"].includes(kind)) throw new ApiError("Choose a report or freeze request plan.");
    if (kind === "freeze" && !company.freezeListed) throw new ApiError("The CFPB 2025 entry does not specify a freeze service. Contact the company to check availability; this app cannot record an unsupported freeze plan.");
    if (body.guidanceAcknowledged !== true) throw new ApiError("Review the source policy and confirm you will check the provider’s current instructions.");
    const created = await db.transaction(async tx => {
      const [row] = await tx.insert(companyRequests).values({ workspaceId: workspace.id, companyId: company.id, kind, notes: clean(body.notes, 3000) }).returning();
      await tx.insert(activities).values({ workspaceId: workspace.id, requestId: row.id, title: `${kind === "report" ? "Report" : "Freeze"} request plan saved`, description: `${company.name} · Not sent to the company`, type: "info" });
      return row;
    });
    return Response.json({ ...await workspaceData(workspace.id), createdId: created.id }, { status: 201 });
  } catch (error) { return apiError(error); }
}
