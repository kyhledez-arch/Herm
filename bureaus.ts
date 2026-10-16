import type { Bureau, DisputeStatus, SubmissionMethod } from "./types";
import { SPECIALTY_AGENCIES } from "./specialty-agencies";
import { CATALOG_AGENCIES } from "./cfpb-directory";

export interface BureauDetails {
  id: Bureau; name: string; color: string; portal: string; login: string; accountName: string;
  report: string; description: string; phone: string; phoneNote: string;
  mailAddress: string; mailInstructions: string; mailForm?: string;
  onlineAccess?: "account" | "form" | "guidance"; supportedMethods?: SubmissionMethod[]; defaultMethod?: SubmissionMethod;
  onlineNote?: string; defaultCategory?: string; reportKind?: string; pdfTitle?: string; disputeGuidance?: string; catalogSource?: boolean;
}
export const BUREAUS: BureauDetails[] = [
  {
    id: "experian", name: "Experian", color: "#aa278a",
    portal: "https://www.experian.com/disputes/main.html", login: "https://usa.experian.com/login/index?br=exp&it=dsp", accountName: "Experian account",
    report: "https://www.experian.com/consumer-products/free-credit-report.html",
    description: "Online disputes require signing in to an Experian account. Prefer not to create or use a portal account? You can dispute by mail or phone instead.",
    phone: "888-397-3742", phoneNote: "Use the number on your Experian report when available, or contact Experian for a dispute specialist. Identity verification and supporting documents may be required.",
    mailAddress: "Experian\nDispute by Mail\nP.O. Box 4500\nAllen, TX 75013",
    mailInstructions: "https://www.experian.com/blogs/ask-experian/credit-education/faqs/instructions-for-disputing-by-mail/",
    mailForm: "https://www.experian.com/blogs/ask-experian/wp-content/themes/exp/pdf/dispute-form.pdf",
  },
  {
    id: "equifax", name: "Equifax", color: "#b52436",
    portal: "https://www.equifax.com/personal/credit-report-services/credit-dispute/", login: "https://my.equifax.com/membercenter/#/login", accountName: "myEquifax account",
    report: "https://www.equifax.com/personal/credit-report-services/free-credit-reports/",
    description: "Sign in to a free myEquifax account to file an online dispute. Mail and phone routes are available without a myEquifax login.",
    phone: "888-378-4329", phoneNote: "Contact Equifax Consumer Services and request help with a credit-report dispute. Have your report available and follow the representative’s verification instructions.",
    mailAddress: "Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374",
    mailInstructions: "https://www.equifax.com/personal/contact-us/",
    mailForm: "https://assets.equifax.com/assets/personal/Dispute.pdf",
  },
  {
    id: "transunion", name: "TransUnion", color: "#008f9c",
    portal: "https://www.transunion.com/credit-disputes/dispute-your-credit", login: "https://www.transunion.com/credit-disputes/dispute-your-credit", accountName: "TransUnion Service Center account",
    report: "https://www.transunion.com/annual-credit-report",
    description: "Online disputes use a TransUnion Service Center account. If you don’t want to sign in, follow TransUnion’s official mail or phone dispute process.",
    phone: "800-916-8800", phoneNote: "Have your TransUnion report, the disputed items, and the reasons for your dispute ready. The representative will verify your identity and explain any required documents.",
    mailAddress: "TransUnion Consumer Solutions\nP.O. Box 2000\nChester, PA 19016-2000",
    mailInstructions: "https://www.transunion.com/credit-disputes/dispute-your-credit/mail-or-phone",
  },
  {
    id: "innovis", name: "Innovis", color: "#235681",
    portal: "https://www.innovis.com/personal/disputeResolution", login: "https://www.innovis.com/login/index", accountName: "Innovis Personal Account",
    report: "https://www.innovis.com/personal/creditReport",
    description: "Sign in to an Innovis Personal Account for an online dispute, or request an investigation by phone or mail without a portal login.",
    phone: "866-712-0021", phoneNote: "Call Innovis Consumer Assistance about an investigation. Provide the requested identity information directly to Innovis, not in this workspace.",
    mailAddress: "Innovis Consumer Assistance\nPO Box 530088\nAtlanta, GA 30353-0088",
    mailInstructions: "https://www.innovis.com/personal/lc_dispute",
    mailForm: "https://www.innovis.com/assets/pdf/InnovisDisputeRequest-89dbeb50b1662fa27cf628a5d203e9f0.pdf",
  },
];
export const CHEXSYSTEMS: BureauDetails = {
  id: "chexsystems", name: "ChexSystems", color: "#236483",
  portal: "https://www.chexsystems.com/dispute", login: "https://chexsystems-ds.fiscloudservices.com/", accountName: "ChexSystems Consumer Portal account",
  report: "https://www.chexsystems.com/request-reports/consumer-disclosure",
  description: "ChexSystems is a specialty consumer reporting agency for checking and savings account history. Dispute inaccurate information through its Consumer Portal, or use the official mail and phone routes without a portal login.",
  phone: "800-428-9623", phoneNote: "Call ChexSystems Consumer Relations for help submitting a dispute. Have your consumer disclosure report and the disputed item details ready. Follow the representative’s identity-verification and documentation instructions.",
  mailAddress: "Chex Systems, Inc.\nAttn: Consumer Relations\nPO Box 583399\nMinneapolis, MN 55458",
  mailInstructions: "https://www.chexsystems.com/dispute",
  mailForm: "https://www.chexsystems.com/-/media/Project/ChexSystems/ChexSystems/PDF/RequestforInvestigationForm.pdf?sc_lang=en",
};
export const REPORTING_AGENCIES: BureauDetails[] = [...BUREAUS, CHEXSYSTEMS, ...SPECIALTY_AGENCIES, ...CATALOG_AGENCIES];
export const getBureau = (id: string) => REPORTING_AGENCIES.find(b => b.id === id) ?? BUREAUS[0];
export const reportLabel = (id: string) => getBureau(id).reportKind ?? (id === "chexsystems" ? "banking consumer report" : "credit report");
export const defaultCategory = (id?: string) => id === "chexsystems" ? "Checking / savings account history" : id ? getBureau(id).defaultCategory ?? "Account information" : "Account information";
export const disputePdfTitle = (id: string) => getBureau(id).pdfTitle ?? (id === "chexsystems" ? "ChexSystems Banking Report Dispute" : "Credit Report Dispute");
export const STATUS_LABELS: Record<DisputeStatus, string> = { draft: "Draft", in_review: "In review", resolved: "Resolved", needs_attention: "Needs attention" };
export const OUTCOME_OPTIONS = [
  { id: "", label: "No outcome recorded yet" },
  { id: "deleted", label: "Deleted — account or item removed" },
  { id: "corrected", label: "Corrected — information fixed" },
  { id: "verified", label: "Verified — confirmed as accurate" },
  { id: "other", label: "Other outcome" },
];
export const OUTCOME_LABELS: Record<string, string> = Object.fromEntries(OUTCOME_OPTIONS.map(o => [o.id, o.label]));
export const outcomeLabel = (outcome: string) => OUTCOME_LABELS[outcome] ?? outcome;
export const REASONS = ["Incorrect account balance", "This account isn’t mine", "Incorrect late payment", "Duplicate account", "Incorrect account status", "Incorrect personal information", "Unauthorized inquiry", "Other inaccurate information", "Incorrect bank account closure", "Incorrect overdraft or unpaid balance", "Paid bank account reported as unpaid", "Incorrect employment dates", "Incorrect income information", "Incorrect insurance or public record", "Incorrect alternative-finance account"];
export const BANKING_CATEGORIES = ["Checking / savings account history", "Bank account closure"];
export const CATEGORIES = ["Account information", "Collection account", "Payment history", "Personal information", "Credit inquiry", ...BANKING_CATEGORIES, "Alternative-finance account information", "Consumer disclosure / insurance data", "Employment / income information", "Tenant / rental screening", "Medical / insurance screening", "Telecom / utility history"];
export const ACTIONS = ["Correct the inaccurate information", "Remove an account that does not belong to me", "Remove a duplicate entry", "Update the account status", "Investigate and provide the results"];
export const GUIDE_ARTICLES = [
  { id: "first", title: "Your first dispute, made simple", category: "Getting started", duration: "4 min read", intro: "You don’t need to be a credit expert to question an error. You just need a clear explanation and the right supporting information.", sections: [
    { title: "1. Start with your credit reports", text: "Get your free Experian, Equifax, and TransUnion reports at AnnualCreditReport.com. Request your Innovis report separately through Innovis. ChexSystems has a separate banking consumer report—request it directly to check your checking and savings account history. Look for information you believe is inaccurate or incomplete." },
    { title: "2. Be specific about the error", text: "Identify the creditor, the account’s last four digits, and exactly what is wrong. Explain what the information should say and why. Only dispute information you genuinely believe is inaccurate or incomplete." },
    { title: "3. Include evidence", text: "Useful evidence includes payment receipts, creditor correspondence, or the relevant excerpt of your credit report. Send copies, keep the originals, and provide any required identity documents directly to the bureau." },
    { title: "4. Choose how to submit", text: "Online disputes require signing in to an Experian, myEquifax, TransUnion Service Center, or Innovis Personal Account. For specialty agencies, follow the provider-specific route: DataX publishes a mail dispute process; Early Warning requires written submissions (with a state-specific phone exception); The Work Number has a public dispute form with verification. No-portal-login alternatives do not mean anonymous submission. Review your draft, follow the bureau’s official requirements, and verify your identity directly with the bureau." },
    { title: "5. Record and follow up", text: "A saved draft is not a submitted dispute. Record the actual online or phone confirmation, or the mailing and delivery dates. Investigations generally take 30 days from receipt and can sometimes take up to 45 days. A planning reminder is not a guaranteed deadline. Review the bureau’s response and an updated report." },
  ] },
  { id: "documents", title: "What makes strong supporting evidence?", category: "Dispute essentials", duration: "3 min read", intro: "A focused explanation backed by relevant records gives the bureau the information it needs to investigate.", sections: [
    { title: "Match your evidence to the issue", text: "For an incorrect payment status, use a payment confirmation or account statement. For a wrong balance, use a recent creditor statement. For an account that isn’t yours, explain the circumstances and include any relevant creditor correspondence." },
    { title: "Protect your sensitive information", text: "This device-based workspace is not an authenticated document vault. Upload only redacted PDFs or images. Never upload Social Security numbers, government IDs, passwords, or full account numbers. Supply identity verification documents directly to the official bureau." },
    { title: "Keep a paper trail", text: "Keep a copy of what you submitted, the submission date, and the bureau’s confirmation number. If you mail a dispute, consider certified mail with a return receipt. Verify the current mailing address and required forms on the official site before sending. Record delivery separately from the mailing date." },
  ] },
  { id: "eoscar", title: "How to write a dispute that survives e-OSCAR", category: "Dispute strategy", duration: "6 min read", intro: "Bureaus may route disputes through e-OSCAR. Understanding the standardized handoff helps you write a clear, evidence-based dispute—not game the system.", sections: [
    { title: "1. What e-OSCAR actually is", text: "e-OSCAR (Online Solution for Complete and Accurate Reporting) is an electronic platform used by consumer reporting agencies and furnishers to exchange dispute information. In an indirect dispute, a CRA may send an Automated Credit Dispute Verification (ACDV) to the bank, lender, or collector that furnished the item. A code and summary may be used to describe the dispute. The furnisher investigates and responds; the CRA remains responsible for a reasonable reinvestigation. e-OSCAR is a routing system, not a substitute for those legal duties." },
    { title: "2. State the issue clearly and preserve your evidence", text: "The FCRA requires a CRA to forward the furnisher all relevant information it receives from you. CFPB guidance says furnishers must review relevant information and supporting documents forwarded with a dispute. The CFPB has alleged failures to convey disputes or forward relevant documents in particular enforcement matters; that is not a reason to assume your documents will be omitted. Keep copies and explicitly list each attachment. Write the first paragraph so the issue is unmistakable: identify the account (creditor and last four digits), the precise field and value shown, and what your records show. A concise summary helps a reviewer route it; relevant documents support your facts." },

    { title: "3. Build a furnisher-proof packet", text: "Write the first paragraph so it survives condensing: 'Account [creditor], ending [last 4]: report shows [exact error with date and amount]; my [statement/letter dated X] shows [correct value].' Attach short, annotated proof—highlight the relevant lines on statements or correspondence—and reference each attachment by name in the letter. Keep the full packet factual and limited to information you genuinely believe is inaccurate. Never dispute accurate negative information or submit anything untruthful; that can be deemed frivolous and, in the case of paid credit-repair schemes, unlawful." },
    { title: "4. Use both dispute routes when they apply", text: "A dispute sent to a CRA may be routed to the furnisher through e-OSCAR. For dispute types covered by Regulation V, you may also send a direct dispute to the furnisher at its designated direct-dispute address; the furnisher must investigate and review relevant evidence you provide. There are exceptions—including certain identifying-information, employer, inquiry, public-record, fraud-alert, and information-supplied-by-another-furnisher disputes—so check 12 C.F.R. § 1022.43 and the furnisher’s current instructions. A qualifying direct dispute goes to the furnisher rather than entering through the CRA’s ACDV route, but the furnisher may still use automated systems. Keep copies and proof of delivery. If a repeat dispute is deemed frivolous or irrelevant, the company must provide a notice explaining why; submit genuinely new, relevant facts or evidence if you dispute that conclusion." },
    { title: "5. Request the procedure and escalate with receipts", text: "If the CRA says the item was verified, FCRA § 611(a)(7) lets you request a description of the procedure used. The CRA must provide that description within 15 days after it receives your request. The response describes the procedure and, where reasonably available, identifies the furnisher contacted; it is not necessarily copies of original contracts or source documents. If the response does not address your evidence, consider a new, specific dispute or a CFPB complaint with your original packet, receipts, and results. BerheRepairShop can prepare and track a complaint draft; it does not file it for you. Investigation periods are generally 30 days, with extensions in certain circumstances; check your notice for the actual dates." },
    { title: "6. What never works", text: "Form-letter blasts disputing everything, invented identity-theft claims, and 'pay for delete' demands to bureaus waste your one investigation per cycle and can get future disputes dismissed as frivolous. Accurate negative information generally cannot be removed by disputing it. The method that beats automation is boring but effective: precise facts, matched evidence, both doors, and a documented escalation." },
    { title: "7. YouTube “removal” methods vs. what actually works", text: "Viral videos often sell 609 letters, round-robin bureau hopping, and mass “not mine” disputes as guaranteed deletions. A 609 file-disclosure request does not force deletion of accurate accounts. There is no legal right to rotate disputes on a schedule. Generic mass letters that fail to identify a specific inaccuracy may lack information needed for an investigation and can be deemed frivolous; a template is useful only when it accurately describes your facts. A lawful approach is to identify one specific inaccuracy, provide matching evidence, consider a direct furnisher dispute only when Regulation V covers that dispute, keep delivery receipts, request the verification procedure after results if needed, and complain to CFPB when the investigation appears unreasonable. Any pay-for-delete offer is a separate voluntary agreement with a collector, not a right against a bureau; get any agreement in writing and never dispute accurate information. Use identity-theft procedures only for actual identity theft." },
  ] },
  { id: "timelines", title: "What happens after you submit?", category: "Know your rights", duration: "5 min read", intro: "Your dispute starts an investigation—not a guaranteed removal or credit-score increase.", sections: [
    { title: "The investigation", text: "Credit reporting companies typically have 30 days from receipt to investigate. In some circumstances, the period can be extended to 45 days. The bureau may contact the company that supplied the information and review your supporting documents." },
    { title: "The possible outcomes", text: "Information may be corrected, deleted, or verified as accurate. Accurate negative information generally cannot be removed simply because it is disputed. BerheRepairShop does not promise removals or a change in credit score." },
    { title: "If you disagree with the result", text: "Review the explanation and any updated report. You may provide new relevant evidence, contact the information furnisher, add a statement to your report, or seek guidance from the Consumer Financial Protection Bureau. For legal advice, consult a qualified professional." },
    { title: "A freeze is a different action", text: "A security freeze limits access to a consumer report; it does not dispute or correct information. Clarity Services maintains a separate consumer file, even though it is part of Experian. Manage each bureau’s freeze separately and supply verification information only through the provider’s official process." },
  ] },
];
