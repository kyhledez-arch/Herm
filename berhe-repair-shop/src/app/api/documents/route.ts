import { db } from "@/db";
import { activities, documents } from "@/db/schema";
import { REPORTING_AGENCIES } from "@/lib/bureaus";
import { ownedComplaint } from "@/lib/complaint-server";
import { ApiError, apiError, checkOrigin, clean, getWorkspace, ownedDispute, workspaceData } from "@/lib/server";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const workspace = await getWorkspace();
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > 6 * 1024 * 1024) throw new ApiError("Please choose a file smaller than 5 MB.", 413);
    const form = await request.formData();
    if (form.get("redacted") !== "true") throw new ApiError("Confirm that the file is redacted before uploading.");
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw new ApiError("Choose a PDF, PNG, or JPEG file.");
    if (file.size > 5 * 1024 * 1024) throw new ApiError("Please choose a file smaller than 5 MB.", 413);
    if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) throw new ApiError("Only PDF, PNG, and JPEG files are supported.");
    const buffer = Buffer.from(await file.arrayBuffer());
    const valid = file.type === "application/pdf" ? buffer.subarray(0, 5).toString() === "%PDF-" : file.type === "image/png" ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : buffer[0] === 255 && buffer[1] === 216;
    if (!valid) throw new ApiError("The file content does not match its file type.");
    const kind = clean(form.get("kind")) === "report" ? "report" : "supporting";
    const bureau = clean(form.get("bureau"));
    if (bureau && !REPORTING_AGENCIES.some(b => b.id === bureau)) throw new ApiError("Choose a supported reporting agency.");
    if (kind === "report" && !bureau) throw new ApiError("Select the reporting agency for this consumer report.");
    const disputeId = clean(form.get("disputeId")), complaintId = clean(form.get("complaintId"));
    if (disputeId && complaintId) throw new ApiError("Link a file to one dispute or one complaint at a time.");
    if (disputeId) await ownedDispute(disputeId, workspace.id);
    if (complaintId) {
      if (kind !== "supporting") throw new ApiError("Use supporting document type for complaint evidence.");
      await ownedComplaint(complaintId, workspace.id);
    }
    const name = file.name.replace(/[\x00-\x1f/\\]/g, "_").slice(0, 150);
    await db.transaction(async tx => {
      await tx.insert(documents).values({ workspaceId: workspace.id, disputeId: disputeId || null, complaintId: complaintId || null, name, kind, bureau: bureau || null, mimeType: file.type, size: file.size, content: buffer.toString("base64") });
      await tx.insert(activities).values({ workspaceId: workspace.id, disputeId: disputeId || null, complaintId: complaintId || null, title: `${kind === "report" ? ["chexsystems", "earlywarning"].includes(bureau) ? "Banking consumer report" : bureau === "worknumber" ? "Employment report" : ["datax", "lexisnexis"].includes(bureau) ? "Specialty consumer report" : "Credit report" : "Supporting document"} uploaded`, description: name, type: "document" });
    });
    return Response.json(await workspaceData(workspace.id), { status: 201 });
  } catch (error) { return apiError(error); }
}
