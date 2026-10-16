import importedCompanies from "./data/cfpb-companies-2025.json";
import type { Bureau, RequestKind } from "./types";
import type { BureauDetails } from "./bureaus";

export const CFPB_SOURCE_URL = "https://files.consumerfinance.gov/f/documents/cfpb_consumer-reporting-companies_list_2025.pdf";
export const CFPB_LIST_URL = "https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/consumer-reporting-companies/companies-list/";
export interface CfpbCompany {
  id: Bureau; name: string; market: string; description: string; reportPolicy: string;
  freezeListed: boolean; freezePolicy: string; website: string; reportUrl: string; freezeUrl: string;
  phoneText: string; address: string; links: { label: string; url: string }[];
  sourcePage: number; sourceYear: number; sourceEntry?: string; contactNote?: string;
}
export const CFPB_COMPANIES = importedCompanies as CfpbCompany[];
export const CFPB_MARKETS = [...new Set(CFPB_COMPANIES.map(company => company.market))];
export const getCfpbCompany = (id: string) => CFPB_COMPANIES.find(company => company.id === id);
export const isCatalogAgency = (id: string) => id.startsWith("cfpb-") && !!getCfpbCompany(id);
export const sourcePageUrl = (company: CfpbCompany) => `${CFPB_SOURCE_URL}#page=${company.sourcePage}`;
export const directoryPhones = (company: CfpbCompany) => [...new Set(company.phoneText.match(/\d{3}[-.]\d{3}[-.]\d{4}/g) ?? [])];

const currentLinks: Partial<Record<Bureau, { report: string; freeze?: string }>> = {
  experian: { report: "https://www.annualcreditreport.com/", freeze: "https://www.experian.com/freeze/center.html" },
  equifax: { report: "https://www.annualcreditreport.com/", freeze: "https://www.equifax.com/personal/credit-report-services/credit-freeze/" },
  transunion: { report: "https://www.annualcreditreport.com/", freeze: "https://www.transunion.com/credit-freeze" },
  innovis: { report: "https://www.innovis.com/personal/creditReport", freeze: "https://www.innovis.com/personal/securityFreeze" },
  chexsystems: { report: "https://www.chexsystems.com/request-reports/consumer-disclosure", freeze: "https://www.chexsystems.com/security-freeze/information" },
  earlywarning: { report: "https://www.earlywarning.com/consumer-information" },
  datax: { report: "https://consumers.dataxltd.com/annualCreditReport", freeze: "https://consumers.dataxltd.com/consumerCreditFreeze" },
  lexisnexis: { report: "https://consumer.risk.lexisnexis.com/request", freeze: "https://consumer.risk.lexisnexis.com/freeze" },
  worknumber: { report: "https://employees.theworknumber.com/employment-data-report", freeze: "https://employees.theworknumber.com/employee-data-freeze" },
};
export function directoryActionUrl(company: CfpbCompany, kind: RequestKind) {
  return currentLinks[company.id]?.[kind] ?? (kind === "report" ? company.reportUrl : company.freezeUrl || company.website);
}
export const hasCurrentDirectoryLink = (company: CfpbCompany, kind: RequestKind) => !!currentLinks[company.id]?.[kind];
export function catalogCategory(company: CfpbCompany) {
  if (company.market === "Employment screening") return "Employment / income information";
  if (company.market === "Tenant screening") return "Tenant / rental screening";
  if (company.market === "Medical & life insurance") return "Medical / insurance screening";
  if (company.market === "Telecom & utilities") return "Telecom / utility history";
  if (company.market === "Banking & payments") return "Checking / savings account history";
  if (company.market === "Low-income & subprime") return "Alternative-finance account information";
  return "Consumer disclosure / insurance data";
}
export const CATALOG_AGENCIES: BureauDetails[] = CFPB_COMPANIES.filter(company => company.id.startsWith("cfpb-")).map(company => ({
  id: company.id, name: company.name, color: "#8972b6", portal: company.website, login: company.website,
  accountName: "provider consumer services", report: company.reportUrl, description: company.description,
  phone: directoryPhones(company)[0] ?? "", phoneNote: "This is a contact from the CFPB 2025 list, not confirmation of a phone dispute filing route. Check the provider’s current process first.",
  mailAddress: company.address ? `[Confirm the current dispute recipient before mailing]\n\nCFPB 2025 listed contact—not verified for disputes:\n${company.address}` : "[Confirm the current dispute mailing address with the provider]",
  mailInstructions: company.website, onlineAccess: "guidance", supportedMethods: ["mail"], defaultMethod: "mail",
  defaultCategory: catalogCategory(company), reportKind: `${company.market.toLowerCase()} consumer report`,
  pdfTitle: `${company.name.length > 34 ? company.name.slice(0, 31) + "..." : company.name} Dispute Draft`,
  catalogSource: true,
  onlineNote: "The CFPB 2025 list supplies company contact and report information, not a verified online dispute form. Follow the company’s current instructions. This app only prepares a written draft for this directory entry.",
  disputeGuidance: "CFPB 2025 directory entry. Written draft preparation only; current filing methods and dispute recipients have not been independently verified. Check the provider’s current consumer process and address before sending. A report request or general support message is not a filed dispute.",
}));
