import { getCfpbCompany, directoryActionUrl, CFPB_SOURCE_URL } from "@/lib/cfpb-directory";
import { ownedCompanyRequest } from "@/lib/company-request-server";
import { ApiError, apiError, getWorkspace } from "@/lib/server";
import { makePdf } from "@/lib/pdf";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const workspace = await getWorkspace();
    const { id } = await context.params;
    const row = await ownedCompanyRequest(id, workspace.id);
    const company = getCfpbCompany(row.companyId);
    if (!company) throw new ApiError("Company not found.", 404);
    const pdf = await makePdf(`${row.kind === "report" ? "Report" : "Freeze"} Request Worksheet`, [
      "PREPARATION WORKSHEET ONLY. This is not an official request, submission confirmation, or proof of an active freeze.",
      `Company: ${company.name}\nMarket: ${company.market}\nAction: ${row.kind === "report" ? "Consumer report request" : "Freeze request"}\nTracker status: ${row.status}`, 
      `Source: CFPB 2025 List of Consumer Reporting Companies, page ${company.sourcePage}. Contact details and eligibility may have changed.`,
      row.kind === "report" ? company.reportPolicy : company.freezePolicy,
      `Your planning notes:\n${row.notes || "[Add your own planning notes.]"}`,
      `Provider guidance: ${directoryActionUrl(company, row.kind === "freeze" ? "freeze" : "report")}`,
      row.submittedAt ? `Submission recorded by you: ${row.submittedAt.toISOString().slice(0, 10)}\nReference: ${row.reference || "Not recorded"}` : "No provider submission has been recorded. Complete the current official process before marking this submitted.",
      "Provide identity verification directly to the provider. Do not store SSNs, identity documents, passwords, or freeze PINs in BerheRepairShop. Send only through verified official channels.",
      "A freeze affects the provider's own file and is separate from a dispute or report request. The provider must confirm any freeze is active.",
      `Original source: ${CFPB_SOURCE_URL}`,
    ], false, "Planning worksheet. Complete the official provider process separately.");
    const filename = company.name.replace(/[^a-zA-Z0-9-]/g, "-").slice(0, 65);
    return new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}-${row.kind}-request-worksheet.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return apiError(error); }
}
