import type { BureauDetails } from "./bureaus";

export interface SpecialtyFreezeOptions {
  status: "available" | "contact";
  label: string;
  description: string;
  instructions: string;
  portal?: string;
  primaryLabel?: string;
  extraLinks?: { label: string; url: string }[];
  phone: string;
  phoneNote: string;
  mailAddress?: string;
  mailForm?: string;
  caution: string;
}
export interface SpecialtyAgencyDetails extends BureauDetails {
  initials: string;
  focus: string;
  group: "banking" | "credit" | "risk" | "employment";
  freezeOptions: SpecialtyFreezeOptions;
}

export const SPECIALTY_AGENCIES: SpecialtyAgencyDetails[] = [
  {
    id: "earlywarning", name: "Early Warning Services", initials: "EW", color: "#687eaa", focus: "Banking & payment history", group: "banking",
    portal: "https://www.earlywarning.com/dispute-file-disclosure", login: "https://consumerservices.earlywarning.com/", accountName: "Early Warning secure transfer account",
    onlineAccess: "account", supportedMethods: ["online", "mail"], defaultMethod: "mail", defaultCategory: "Checking / savings account history", reportKind: "banking file disclosure", pdfTitle: "Early Warning Banking Report Dispute",
    report: "https://www.earlywarning.com/consumer-information",
    description: "Review your banking file disclosure and dispute inaccurate information in writing. Early Warning accepts mailed, faxed, or securely uploaded documents; its secure transfer portal is not a general support inbox.",
    onlineNote: "Create your User ID and password on Early Warning’s secure transfer portal. When it asks for the recipient, use consumerservices@earlywarning.com. Upload your written dispute with the required consumer ID, item details, and evidence directly to Early Warning.",
    phone: "800-745-1560", phoneNote: "General Consumer Services and secure-transfer help. Standard disputes must be in writing. Early Warning lists a Colorado-only phone dispute exception at 800-325-7775; check its official instructions. A general support call is not a filed dispute.",
    mailAddress: "Early Warning\nAttn: Consumer Services\n5801 N Pima Road\nScottsdale, AZ 85250",
    mailInstructions: "https://www.earlywarning.com/dispute-file-disclosure",
    mailForm: "https://www.earlywarning.com/sites/default/files/2026-02/EWS-Request-for-Reinvestigation-Form.pdf",
    disputeGuidance: "Written disputes need your consumer ID from the file disclosure, the disputed record, a specific explanation, and evidence. Add any required identifiers directly to the provider’s form—not this workspace. Phone tracking is not offered here for the standard written-dispute process.",
    freezeOptions: {
      status: "contact", label: "Ask about available protections", instructions: "https://www.earlywarning.com/consumer-information",
      description: "No official public security-freeze request route was identified in Early Warning’s published consumer instructions. Do not assume a freeze is available or active. Ask Consumer Services about current protections and review your file disclosure.",
      phone: "800-745-1560", phoneNote: "Ask Early Warning Consumer Services about current protection options. This is a support contact, not a freeze placement.",
      caution: "A freeze at ChexSystems or another provider does not freeze Early Warning’s separate file. This app does not promise an Early Warning freeze or submit a protection request.",
      extraLinks: [{ label: "EarlyWarning.com", url: "https://www.earlywarning.com/" }],
    },
  },
  {
    id: "datax", name: "DataX", initials: "DX", color: "#9a758c", focus: "Alternative-finance credit history", group: "credit",
    portal: "https://consumers.dataxltd.com/incorrectReports", login: "https://consumers.dataxltd.com/incorrectReports", accountName: "DataX consumer service",
    onlineAccess: "guidance", supportedMethods: ["mail"], defaultMethod: "mail", defaultCategory: "Alternative-finance account information", reportKind: "alternative-finance consumer report", pdfTitle: "DataX Consumer Report Dispute",
    report: "https://consumers.dataxltd.com/annualCreditReport",
    description: "DataX is an Equifax company with a separate alternative-finance consumer report. Its published dispute instructions require printing, signing, and mailing the Request for Investigation form.",
    onlineNote: "DataX’s public page provides dispute instructions and a printable form—not a verified online dispute filing. Its online freeze portal is a different service. Use the mail route to prepare and record a dispute.",
    phone: "800-295-4790", phoneNote: "Consumer assistance only. DataX’s published process instructs consumers to mail the signed investigation form. Do not record a general assistance call as a submitted dispute.",
    mailAddress: "DataX, an Equifax Company\nConsumer Reporting Division\nP.O. Box 740125\nAtlanta, GA 30374",
    mailInstructions: "https://consumers.dataxltd.com/incorrectReports",
    mailForm: "https://consumers.dataxltd.com/assets/pdf/datax_request_for_investigation_consumer_report.pdf",
    disputeGuidance: "Mail the signed official investigation form and required verification documents to the dispute address. DataX freeze correspondence uses a different PO box. Do not email SSNs, birth dates, or other sensitive identifiers.",
    freezeOptions: {
      status: "available", label: "DataX security freeze", portal: "https://altfi-freezeweb-usis-iris-prd.us.equifax.com/freeze/", primaryLabel: "Open DataX freeze portal",
      instructions: "https://consumers.dataxltd.com/consumerCreditFreeze",
      description: "Both links you provided relate to DataX. Use its Equifax-hosted portal to place, lift, or remove a DataX freeze, or follow the DataX consumer page’s mail instructions. This does not freeze your regular Equifax credit report.",
      extraLinks: [{ label: "DataX consumer freeze page", url: "https://consumers.dataxltd.com/consumerCreditFreeze" }],
      phone: "800-295-4790", phoneNote: "Contact DataX for assistance; follow its published online or mail process to make a freeze request.",
      mailAddress: "DataX, an Equifax Company\nConsumer Reporting Division\nP.O. Box 740124\nAtlanta, GA 30374",
      mailForm: "https://consumers.dataxltd.com/assets/pdf/datax_credit_freeze_request.pdf",
      caution: "DataX dispute mail goes to PO Box 740125; freeze mail goes to PO Box 740124. Supply identity verification only through the official provider process.",
    },
  },
  {
    id: "lexisnexis", name: "LexisNexis Risk Solutions", initials: "LN", color: "#ac796f", focus: "Consumer, insurance & public-record data", group: "risk",
    portal: "https://dataqualitycenter.risk.lexisnexis.com/", login: "https://consumer.risk.lexisnexis.com/help", accountName: "LexisNexis Consumer Center",
    onlineAccess: "guidance", supportedMethods: ["mail", "phone"], defaultMethod: "phone", defaultCategory: "Consumer disclosure / insurance data", reportKind: "LexisNexis consumer disclosure report", pdfTitle: "LexisNexis Consumer Report Dispute",
    report: "https://consumer.risk.lexisnexis.com/request",
    description: "Request your Consumer Disclosure Report, then contact the LexisNexis Consumer Center about inaccurate or incomplete data. The public help form is for assistance and documents—not proof a dispute has been filed.",
    onlineNote: "Contact Consumer Support to initiate a dispute and follow the instructions in your report. The online help page accepts questions or documents; do not treat sending a help request as a confirmed dispute submission.",
    phone: "866-897-8126", phoneNote: "LexisNexis’s Consumer Support page lists this number for questions and disputes. Have your report or case reference ready. Record a phone submission only if the representative confirms a dispute was initiated.",
    mailAddress: "LexisNexis Risk Solutions Consumer Center\nP.O. Box 105108\nAtlanta, GA 30348-5108",
    mailInstructions: "https://consumer.risk.lexisnexis.com/contact",
    disputeGuidance: "Identify the specific report, disputed entry, and supporting evidence. Use the report’s or Consumer Center’s current dispute instructions. Consumer disclosure, opt-out, help, and freeze forms are different actions.",
    freezeOptions: {
      status: "available", label: "LexisNexis security freeze", portal: "https://consumer.risk.lexisnexis.com/freeze", primaryLabel: "Open LexisNexis freeze options",
      instructions: "https://consumer.risk.lexisnexis.com/freeze",
      description: "Request, lift, or remove a freeze on eligible LexisNexis Risk Solutions consumer reports. Follow the page’s forms and verification steps. Permissible-purpose and legal exceptions can still allow access.",
      phone: "800-456-1244", phoneNote: "Official security-freeze phone line. It is different from Consumer Support’s dispute number.",
      mailAddress: "LexisNexis Risk Solutions Consumer Center\nAttn: Security Freeze\nP.O. Box 105108\nAtlanta, GA 30348-5108",
      caution: "This is not a universal LexisNexis opt-out, a deletion request, or a freeze at any other reporting agency. Keep provider PINs and verification documents out of this workspace.",
    },
  },
  {
    id: "worknumber", name: "The Work Number", initials: "WN", color: "#6b9788", focus: "Employment & income verification", group: "employment",
    portal: "https://employees.theworknumber.com/employee-data-dispute", login: "https://employees.theworknumber.com/data-dispute-form", accountName: "The Work Number employee service",
    onlineAccess: "form", supportedMethods: ["online", "mail", "phone"], defaultMethod: "online", defaultCategory: "Employment / income information", reportKind: "employment and income report", pdfTitle: "The Work Number Employment Data Dispute",
    report: "https://employees.theworknumber.com/employment-data-report",
    description: "Review your Employment Data Report and dispute inaccurate employment dates, income, or other data. The Work Number provides an online data-dispute form plus phone and mail routes.",
    onlineNote: "Use the official Employee Data Dispute form. Provide the requested identifiers and verification information only on that website. Report access and some account functions may require an employee login; a public form is not anonymous.",
    phone: "800-367-2884", phoneNote: "Employee Service Center for data disputes. Follow its verification steps and record a submission only if the representative confirms the dispute was initiated.",
    mailAddress: "Equifax Workforce Solutions\nATTN: DISPUTE\n3470 Rider Trail South\nEarth City, MO 63045",
    mailInstructions: "https://employees.theworknumber.com/employee-data-dispute",
    mailForm: "https://assets.equifax.com/ews/twn/assets/employee-data-dispute-form.pdf",
    disputeGuidance: "Use the official dispute form for inaccurate employment or income data. Payroll records, employer correspondence, or other relevant documents may help. Upload only redacted copies here; supply sensitive tax and identity documents directly to the provider.",
    freezeOptions: {
      status: "available", label: "Employment data freeze", portal: "https://employees.theworknumber.com/employee-data-freeze", primaryLabel: "Open employee data freeze options",
      instructions: "https://employees.theworknumber.com/employee-data-freeze",
      extraLinks: [{ label: "Official data freeze form", url: "https://employees.theworknumber.com/data-freeze-form" }],
      description: "Control access to employment and income verification data at The Work Number. This is an employment data freeze, not a credit-report freeze. Freezing can delay job, loan, or social-benefit applications that rely on verification.",
      phone: "800-367-2884", phoneNote: "Employee Service Center can assist with data-freeze and unfreeze requests. Follow the official page’s verification instructions.",
      mailAddress: "Equifax Workforce Solutions\nATTN: Employment Data Freeze\n3470 Rider Trail South\nEarth City, MO 63045",
      mailForm: "https://assets.equifax.com/wfs/theworknumber/assets/twn_Employment_Data_Freeze_Placement_Form.pdf",
      caution: "Unfreezing online may require an employee login. If using email, the provider’s form instructs you to request its Secure Email channel first; do not send sensitive documents in ordinary email or store them here.",
    },
  },
];
export const getSpecialtyAgency = (id: string) => SPECIALTY_AGENCIES.find(agency => agency.id === id);
