import type { Bureau, BureauComparison, CompareDifference, CompareGroup, PersonalGroup, ReportItem } from "./types";

/** The four credit-reporting agencies in this comparison: the three largest nationwide CRAs plus Innovis. */
export const COMPARE_BUREAUS: Bureau[] = ["experian", "equifax", "transunion", "innovis"];
export const COMPARE_FIELD_LABELS: Record<CompareDifference["field"], string> = {
  balance: "Reported balance", status: "Reported status", accountLast4: "Account number",
};
export const SEVERITY_LABELS: Record<CompareGroup["severity"], string> = {
  conflict: "Values differ", partial: "Not reported everywhere", single: "One bureau only", consistent: "Matches across bureaus",
};

export interface CompareItemRef { item: ReportItem; bureau: Bureau }

const CORPORATE_SUFFIXES = new Set(["INC", "LLC", "LP", "CORP", "CORPORATION", "CO", "COMPANY", "NA", "PLC", "USA", "THE", "BANK"]);

export function normalizeCreditor(name: string) {
  const words = name.toUpperCase().replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  while (words.length > 1 && CORPORATE_SUFFIXES.has(words[words.length - 1])) words.pop();
  return words.join(" ");
}

export function similarity(a: string, b: string) {
  const na = normalizeCreditor(a), nb = normalizeCreditor(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = new Set(na.split(" ")), tb = new Set(nb.split(" "));
  let shared = 0; for (const token of ta) if (tb.has(token)) shared++;
  let score = shared / (ta.size + tb.size - shared);
  if (na.startsWith(nb) || nb.startsWith(na)) score = Math.max(score, 0.85);
  return score;
}

/**
 * Groups the same tradeline across bureaus. Each group holds at most one item per bureau so a
 * creditor with two separate accounts does not get merged into one row.
 */
function buildAccountGroups(refs: CompareItemRef[]) {
  const groups: { label: string; refs: CompareItemRef[] }[] = [];
  for (const ref of refs) {
    let bestIndex = -1, bestScore = 0;
    for (let index = 0; index < groups.length; index++) {
      const group = groups[index];
      if (group.refs.some(existing => existing.bureau === ref.bureau)) continue;
      const score = similarity(ref.item.label, group.label);
      const sharedLast4 = !!ref.item.accountLast4 && group.refs.some(existing => existing.item.accountLast4 === ref.item.accountLast4);
      const threshold = ref.item.accountLast4 || sharedLast4 ? 0.4 : 0.8;
      if (score >= threshold && score > bestScore) { bestScore = score; bestIndex = index; }
    }
    if (bestIndex >= 0) groups[bestIndex].refs.push(ref);
    else groups.push({ label: ref.item.label, refs: [ref] });
  }
  return groups;
}

const money = (cents: number | null | undefined) => cents === null || cents === undefined ? "" : `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function buildComparison(refs: CompareItemRef[]): BureauComparison {
  const accountRefs = refs.filter(ref => ref.item.kind === "account");
  const groups: CompareGroup[] = buildAccountGroups(accountRefs).map((group, index) => {
    const byBureau: Partial<Record<Bureau, ReportItem>> = {};
    for (const ref of group.refs) if (!byBureau[ref.bureau]) byBureau[ref.bureau] = ref.item;
    const presentAt = COMPARE_BUREAUS.filter(bureau => byBureau[bureau]);
    const missingAt = COMPARE_BUREAUS.filter(bureau => !byBureau[bureau]);
    const differences: CompareDifference[] = [];
    for (const field of ["balanceCents", "status", "accountLast4"] as const) {
      const values = presentAt.map(bureau => ({ bureau, value: byBureau[bureau]![field] }));
      const defined = values.filter(entry => entry.value !== null && entry.value !== undefined && entry.value !== "");
      if (defined.length < 2) continue;
      if (!defined.every(entry => String(entry.value) === String(defined[0].value))) {
        const mapped: Partial<Record<Bureau, string>> = {};
        for (const entry of defined) mapped[entry.bureau] = field === "balanceCents" ? money(entry.value as number) : String(entry.value);
        differences.push({ field: field === "balanceCents" ? "balance" : field, values: mapped });
      }
    }
    const severity: CompareGroup["severity"] = differences.length ? "conflict" : presentAt.length === 1 ? "single" : presentAt.length < COMPARE_BUREAUS.length ? "partial" : "consistent";
    return { id: `account-${index}`, label: group.label, presentAt, missingAt, byBureau, differences, severity };
  }).sort((a, b) => (a.severity === "conflict" ? -1 : 1) - (b.severity === "conflict" ? -1 : 1) || a.label.localeCompare(b.label));

  const personalKinds = new Set(["name", "address", "phone", "employer"]);
  const personalMap = new Map<string, PersonalGroup>();
  for (const ref of refs) {
    if (!personalKinds.has(ref.item.kind)) continue;
    const key = `${ref.item.kind}:${normalizeCreditor(ref.item.label)}`;
    if (!personalMap.has(key)) personalMap.set(key, { id: key, kind: ref.item.kind, label: ref.item.label, presentAt: [], byBureau: {} });
    const group = personalMap.get(key)!;
    if (!group.byBureau[ref.bureau]) { group.byBureau[ref.bureau] = ref.item; group.presentAt.push(ref.bureau); }
  }
  const personal = [...personalMap.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label));

  const summary = {
    bureausWithReports: COMPARE_BUREAUS.filter(bureau => refs.some(ref => ref.bureau === bureau)),
    totalAccounts: groups.length,
    conflicts: groups.filter(group => group.severity === "conflict").length,
    partial: groups.filter(group => group.severity === "partial").length,
    single: groups.filter(group => group.severity === "single").length,
    consistent: groups.filter(group => group.severity === "consistent").length,
    accountsPerBureau: COMPARE_BUREAUS.map(bureau => ({ bureau, count: accountRefs.filter(ref => ref.bureau === bureau).length })),
  };
  return { groups, personal, summary };
}

export function suggestedReasonFor(differences: CompareDifference[]) {
  if (differences.some(difference => difference.field === "balance")) return "Incorrect account balance";
  if (differences.some(difference => difference.field === "status")) return "Incorrect account status";
  return "Other inaccurate information";
}
