import type { ReportItemKind, ParsedReportItem } from "./types";

/** Best-effort extraction from a consumer-report PDF. Always review before disputing. */
const STATES = "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|PR";
const STREET = String.raw`(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Terrace|Ter|Circle|Cir|Parkway|Pkwy|Highway|Hwy|Place|Pl|Suite|Ste|Apt|Unit|#)`;
const PHONE = String.raw`(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}`;
const MONEY = String.raw`\$\s?\d[\d,]*(?:\.\d{2})?`;
const DATE = String.raw`\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}`;

export const ITEM_KINDS: { id: ReportItemKind; name: string; group: string }[] = [
  { id: "account", name: "Accounts", group: "Accounts & tradelines" },
  { id: "inquiry", name: "Inquiries", group: "Accounts & tradelines" },
  { id: "address", name: "Addresses", group: "Personal information" },
  { id: "phone", name: "Phone numbers", group: "Personal information" },
  { id: "employer", name: "Employers", group: "Personal information" },
  { id: "name", name: "Names", group: "Personal information" },
];

function lines(text: string) {
  return text.split(/\r?\n/).map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean);
}
function unique<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>(), out: T[] = [];
  for (const item of items) { const k = key(item); if (!seen.has(k)) { seen.add(k); out.push(item); } }
  return out;
}
const label = (value: string) => value.replace(/^[^A-Za-z0-9]+/, "").replace(/[:\s]+$/, "").trim().slice(0, 120);
const digits = (value: string) => value.replace(/\D/g, "");
const last4 = (value: string) => { const all = digits(value); return all ? all.slice(-4) : ""; };

const STATUS_PATTERNS = [
  "120+ days past due", "120 days past due", "90 days past due", "60 days past due", "30 days past due",
  "charged off", "charge-off", "charge off", "collection", "collections", "past due", "delinquent",
  "paid as agreed", "never late", "paid in full", "paid", "current", "open", "closed", "settled",
  "repossessed", "foreclosed", "disputed", "deceased", "transferred",
];
function detectStatus(row: string): string {
  const lower = row.toLowerCase();
  for (const pattern of STATUS_PATTERNS) if (lower.includes(pattern)) return pattern;
  return "";
}

export function parseReportText(rawText: string): ParsedReportItem[] {
  const text = rawText.replace(/\u00a0/g, " ");
  const rows = lines(text);
  const items: ParsedReportItem[] = [];

  // Accounts: rows containing a masked/partial account number, a balance, or explicit account wording.
  for (const row of rows) {
    const masked = row.match(/(?:[Xx•\*]{2,}[\s-]?)(\d{4})/) || row.match(/(?:ending(?:\s+in)?|account(?:\s+#?:?)?\s*[\w]*)\D{0,12}(\d{4})/i);
    const money = row.match(new RegExp(MONEY, "g"));
    const accountWord = /\b(account|creditor|tradeline|balance owed|credit limit|past due)\b/i.test(row);
    if (!masked && !money && !accountWord) continue;
    if (/^(phone|telephone|employer|address|date of birth|social security|consumer|inquir)/i.test(row)) continue;
    const name = label(row.split(/(?:\.\.\.)|\s{3,}|\t|\u2022|,?\s+\$|\s+-\s+\$|Account\s|#/i)[0] ?? row);
    const generic = /^(credit limit|high balance|payment status|past due|amount past due|monthly payment|date opened|date closed|account condition|terms|responsibility|balance|amount|and|the|this|report|page|total|summary|date|account|creditor)$/i;
    if (name.length < 3 || generic.test(name) || !/[A-Za-z]{3}/.test(name)) continue;
    const accountLast4 = masked ? masked[1] : "";
    const moneyMatch = row.match(/\$\s?([\d,]+(?:\.\d{1,2})?)/);
    const balanceCents = moneyMatch ? Math.round(parseFloat(moneyMatch[1].replace(/,/g, "")) * 100) : null;
    const status = detectStatus(row);
    items.push({
      kind: "account", label: name,
      detail: [accountLast4 ? `Account ending ${accountLast4}` : "", ...((money ?? []).slice(0, 2))].filter(Boolean).join(" · "),
      suggestedReason: "Other inaccurate information", suggestedCategory: "Account information",
      raw: row.slice(0, 400), sourcePage: undefined,
      accountLast4, balanceCents, status,
    } as ParsedReportItem);
  }

  // Inquiries: rows with a date and a company-ish name but no balance.
  for (const row of rows) {
    if (!new RegExp(DATE).test(row) || new RegExp(MONEY).test(row)) continue;
    if (/\b(account|balance|payment|opened|closed|status|report|page|birth|social security|telephone|employer|address|consumer)\b/i.test(row)) continue;
    const name = label(row.replace(new RegExp(DATE, "g"), "").replace(/[^A-Za-z0-9&.,'\-\s]/g, " ").replace(/\s+/g, " "));
    if (name.length < 4 || !/[A-Za-z]{3}/.test(name)) continue;
    items.push({
      kind: "inquiry", label: name, detail: `Reported ${row.match(new RegExp(DATE))?.[0] ?? "on your report"}`,
      suggestedReason: "Unauthorized inquiry", suggestedCategory: "Credit inquiry",
      raw: row.slice(0, 400), sourcePage: undefined,
    } as ParsedReportItem);
  }

  // Phones
  for (const match of text.matchAll(new RegExp(PHONE, "g"))) {
    const value = match[0].trim();
    if (digits(value).length > 10) continue;
    items.push({
      kind: "phone", label: value, detail: "Phone number listed on your report",
      suggestedReason: "Incorrect personal information", suggestedCategory: "Personal information",
      raw: value, sourcePage: undefined,
    } as ParsedReportItem);
  }

  // Addresses: street line plus nearby city/state/zip
  for (let i = 0; i < rows.length; i++) {
    const street = rows[i].match(new RegExp(String.raw`^(\d{1,6}\s+[A-Za-z0-9.'\-\s]+?\s${STREET}[A-Za-z]*\.?(?:,?\s+(?:Apt|Ste|Unit|#)\s*[\w-]+)?)$`, "i"));
    if (!street) continue;
    const context = rows.slice(i + 1, Math.min(i + 4, rows.length)).join(" ");
    const cityState = context.match(new RegExp(String.raw`([A-Za-z][A-Za-z .'-]{1,30}),?\s+(${STATES})\s+(\d{5}(?:-\d{4})?)`));
    const full = `${street[1].trim()}${cityState ? `, ${cityState[1].trim()}, ${cityState[2]} ${cityState[3]}` : ""}`;
    items.push({
      kind: "address", label: full, detail: cityState ? "Address listed on your report" : "Street address listed on your report",
      suggestedReason: "Incorrect personal information", suggestedCategory: "Personal information",
      raw: full, sourcePage: undefined,
    } as ParsedReportItem);
  }

  // Employers
  for (const match of text.matchAll(/employer(?:\s+name)?\s*[:\-]?\s*([A-Za-z0-9&.,'\- ]{3,60})/gi)) {
    const name = label(match[1]);
    if (name.length < 3) continue;
    items.push({
      kind: "employer", label: name, detail: "Employer listed on your report",
      suggestedReason: "Incorrect personal information", suggestedCategory: "Personal information",
      raw: name, sourcePage: undefined,
    } as ParsedReportItem);
  }

  // Names: rows explicitly labelled as a consumer name
  for (const match of text.matchAll(/(?:consumer|customer|report)?[ \t]*name[ \t]*[:\-][ \t]*([A-Za-z.'\-]+(?:[ \t]+[A-Za-z.'\-]+){1,3})/gi)) {
    const name = label(match[1]);
    if (name.length < 4 || !name.includes(" ")) continue;
    items.push({
      kind: "name", label: name, detail: "Name listed on your report",
      suggestedReason: "Incorrect personal information", suggestedCategory: "Personal information",
      raw: name, sourcePage: undefined,
    } as ParsedReportItem);
  }

  const cleaned = unique(items, item => `${item.kind}:${item.label.toLowerCase()}:${item.detail}`);
  return cleaned.slice(0, 250);
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: bytes, useSystemFonts: true, useWorkerFetch: false }).promise;
  const chunks: string[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 40); pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    let line = "";
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform?.[5] ?? 0;
      if (lastY !== null && Math.abs(y - lastY) > 2) { chunks.push(line); line = ""; }
      line += item.str;
      if ("hasEOL" in item && item.hasEOL) { chunks.push(line); line = ""; }
      lastY = y;
    }
    if (line) chunks.push(line);
    chunks.push("");
  }
  return chunks.join("\n");
}
