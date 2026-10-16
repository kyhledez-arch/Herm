import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { disputePdfTitle, getBureau, reportLabel } from "./bureaus";

const safe = (value: string) => value.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\x7E\n]/g, " ");
export async function makePdf(title: string, paragraphs: string[], sample = false, footer = "Prepared draft. Review and sign before submitting.") {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setAuthor("BerheRepairShop");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([612, 792]);
  let y = 730;
  const pageHeader = () => {
    page.drawText("BerheRepairShop", { x: 52, y: 742, size: 15, font: bold, color: rgb(0.36, 0.3, 0.76) });
    page.drawLine({ start: { x: 52, y: 725 }, end: { x: 560, y: 725 }, color: rgb(0.88, 0.87, 0.94), thickness: 1 });

    if (!sample) {
      page.drawText("DRAFT", {
        x: 150,
        y: 400,
        size: 80,
        font: bold,
        color: rgb(0.95, 0.95, 0.95),
        rotate: { angle: 45 },
        opacity: 0.5,
      });
    }

    y = 694;
  };
  pageHeader();
  page.drawText(safe(title), { x: 52, y, size: 19, font: bold, color: rgb(0.1, 0.14, 0.22) });
  y -= 34;
  if (sample) { page.drawText("SAMPLE ONLY - NOT A REAL CREDIT REPORT OR SUBMISSION", { x: 52, y, size: 9, font: bold, color: rgb(0.63, 0.23, 0.23) }); y -= 28; }
  const drawLine = (text: string) => {
    if (y < 75) { page = pdf.addPage([612, 792]); pageHeader(); }
    page.drawText(safe(text), { x: 52, y, size: 10.5, font, color: rgb(0.22, 0.25, 0.3) });
    y -= 16;
  };
  for (const paragraph of paragraphs) {
    for (const line of safe(paragraph).split("\n")) {
      let buffer = "";
      for (const word of line.split(" ")) {
        const next = buffer ? `${buffer} ${word}` : word;
        if (font.widthOfTextAtSize(next, 10.5) > 502 && buffer) { drawLine(buffer); buffer = word; }
        else buffer = next;
        while (font.widthOfTextAtSize(buffer, 10.5) > 502) { drawLine(buffer.slice(0, 65)); buffer = buffer.slice(65); }
      }
      drawLine(buffer);
    }
    y -= 12;
  }
  const pages = pdf.getPages();
  pages.forEach((p, i) => p.drawText(`${footer} | ${i + 1} of ${pages.length}`, { x: 52, y: 35, size: 8, font, color: rgb(0.47, 0.49, 0.54) }));
  return new Uint8Array(await pdf.save());
}

export async function makeDisputeLetter(dispute: { bureau: string; creditor: string; accountLast4: string; reason: string; details: string; requestedAction: string; isSample: boolean }, workspace: { name: string; address: string }, attachments: string[]) {
  const bureau = getBureau(dispute.bureau);
  return makePdf(disputePdfTitle(dispute.bureau), [
    `${workspace.name === "Your workspace" ? "[Your full legal name]" : workspace.name}\n${workspace.address || "[Your complete mailing address]"}`,
    new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    `To:\n${bureau.mailAddress}`,
    `Re: ${dispute.creditor}${dispute.accountLast4 ? ` - Account ending in ${dispute.accountLast4}` : ""}`,
    "Dear Consumer Dispute Department,",
    `I am writing to dispute information on my ${reportLabel(dispute.bureau)} that I believe is inaccurate or incomplete. Please treat this as a request for investigation under the Fair Credit Reporting Act.`,
    `Disputed item: ${dispute.creditor}\nAccount identification: ${dispute.accountLast4 ? `ending ${dispute.accountLast4}` : "[last four digits, if applicable]"}\nReason: ${dispute.reason}`,
    dispute.details,
    `Requested correction: ${dispute.requestedAction}. Please investigate this specific item, correct or delete any information that is inaccurate, incomplete, or cannot be verified, and send me the written results and an updated copy of my report, as applicable. If I disagree with the results, I may make a separate request for the description of the procedure used under FCRA section 611(a)(7).`,
    attachments.length ? `Supporting documents to review and enclose: ${attachments.join(", ")}. These files are not automatically sent by BerheRepairShop.` : "[List and enclose relevant supporting documents, if available.]",
    "Thank you for reviewing this dispute.",
    `Sincerely,\n\n${workspace.name === "Your workspace" ? "[Your full legal name]" : workspace.name}\n[Your signature]`,
    "Before mailing: verify the recipient address on the official site, complete your address and signature, and include the bureau's required forms. This draft uses only the account's last four digits; supply any required full identifiers and identity documents directly to the bureau, not to BerheRepairShop.",
    `Official mail instructions: ${bureau.mailInstructions}`,
    bureau.disputeGuidance ?? "Follow the provider’s official identity and filing requirements. No portal login does not mean no identity verification.",
    "Provider filing methods vary: account-based portals, verified public forms, written mail, and confirmed phone disputes are not interchangeable. A report request, support message, or freeze request is not a dispute. This draft has not been submitted to any reporting agency.",
  ], dispute.isSample);
}
