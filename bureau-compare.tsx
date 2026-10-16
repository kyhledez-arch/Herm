"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, ChevronRight, CircleAlert, Columns3, FileText, Info, LoaderCircle, LockKeyhole, Search, ShieldCheck, Upload } from "lucide-react";
import { getBureau } from "@/lib/bureaus";
import { COMPARE_BUREAUS, COMPARE_FIELD_LABELS, SEVERITY_LABELS, suggestedReasonFor } from "@/lib/bureau-compare";
import { commonAgencyMethods } from "@/lib/submission-methods";
import { apiRequest, fullDate } from "@/lib/client";
import type { Bureau, BureauComparison, CompareGroup, CompareGroup as Group, PageName, ReportItemKind, SubmissionMethod, WorkspaceData } from "@/lib/types";
import type { PanelProps } from "./panels";
import { BureauLogo, EmptyState, Modal, type UploadOptions } from "./shared";

interface CompareResponse extends BureauComparison {
  reports: { bureau: Bureau; documentId: string | null; documentName: string | null; uploadedAt: string | null }[];
}
const money = (cents: number | null) => cents === null || cents === undefined ? "—" : `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const kindLabel: Record<string, string> = { name: "Names", address: "Addresses", phone: "Phone numbers", employer: "Employers" };

function SeverityBadge({ severity }: { severity: Group["severity"] }) {
  return <span className={`compare-severity compare-severity--${severity}`}>{SEVERITY_LABELS[severity]}</span>;
}

function AccountMatrix({ groups, onOpen }: { groups: Group[]; onOpen: (group: Group) => void }) {
  if (!groups.length) return <EmptyState icon={<Columns3 />} title="No accounts to compare yet." description="Upload a report for at least two bureaus and item detection will run automatically." />;
  return <div className="table-scroll"><table className="compare-table"><thead><tr><th>Account</th>{COMPARE_BUREAUS.map(bureau => <th key={bureau}><BureauLogo bureau={bureau} compact /></th>)}</tr></thead><tbody>
    {groups.map(group => <tr key={group.id} onClick={() => onOpen(group)}>
      <td><button className="compare-account-cell"><strong>{group.label}</strong>{group.differences.length > 0 && <span className="compare-flag-count">{group.differences.length} field{group.differences.length === 1 ? "" : "s"} differ</span>}</button></td>
      {COMPARE_BUREAUS.map(bureau => {
        const item = group.byBureau[bureau];
        return <td key={bureau} className={item ? "compare-cell" : "compare-cell compare-cell--missing"}>
          {item ? <span className="compare-values"><span>{money(item.balanceCents)}</span><span>{item.status || "Status not read"}</span>{item.accountLast4 && <span className="compare-last4">••{item.accountLast4}</span>}</span> : <span className="compare-absent">—</span>}
        </td>;
      })}
      <td className="compare-row-action"><SeverityBadge severity={group.severity} /><ChevronRight size={15} /></td>
    </tr>)}
  </tbody></table></div>;
}

export function ComparePanel(props: PanelProps) {
  const { onUpload, onNavigate, onData, onToast, onOpenDispute } = props;
  const [data, setData] = useState<CompareResponse | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | Group["severity"]>("all"), [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<Group | null>(null), [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await apiRequest<CompareResponse>("/api/compare")); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => (data?.groups ?? []).filter(group =>
    (filter === "all" || group.severity === filter) && group.label.toLowerCase().includes(query.toLowerCase())
  ), [data, filter, query]);
  const uploadedCount = data?.reports.filter(report => report.documentId).length ?? 0;

  return <>
    <div className="page-heading"><div><p className="eyebrow">SIDE-BY-SIDE BUREAU REVIEW</p><h1>Four bureaus. One clear view.</h1><p className="page-description">Compare how Experian, Equifax, TransUnion, and Innovis report the same account, and see exactly where they disagree.</p></div><div className="page-actions"><button className="button button-secondary" onClick={() => onNavigate("reports")}>Upload reports <ArrowRight size={15} /></button></div></div>

    <div className="compare-notice"><ShieldCheck size={24} /><div><strong>A difference is a lead to check — not proof of an error.</strong><p>These agencies maintain separate files. The CFPB identifies Equifax, Experian, and TransUnion as the three largest nationwide consumer reporting companies; Innovis is a separate credit-reporting agency. Lenders choose which agencies to report to and when, so an account may legitimately be absent from one file or show a balance from a different reporting date. The FCRA requires reasonable procedures for maximum possible accuracy; it does not guarantee identical reports. Confirm values against your own records before disputing.</p></div></div>

    {loading ? <div className="dashboard-loading" aria-busy="true"><LoaderCircle size={24} className="spin" /><span>Comparing your reports…</span></div> : error ? <div className="workspace-error"><span className="empty-state-icon"><CircleAlert /></span><h1>Let’s reconnect your comparison.</h1><p>{error}</p><button className="button button-primary" onClick={() => void load()}>Try again</button></div> : data ? <>
      <section className="card compare-coverage"><div className="compare-coverage-heading"><h2>Reports in this comparison</h2><span className="soft-tag">{uploadedCount} of 4 bureaus</span></div><div className="compare-coverage-grid">{data.reports.map(report => <div key={report.bureau} className={`compare-coverage-card ${report.documentId ? "" : "compare-coverage-card--missing"}`}>
        <BureauLogo bureau={report.bureau} />
        <strong>{getBureau(report.bureau).name}</strong>
        <span>{report.documentId ? `Added ${fullDate(report.uploadedAt!)}` : "No report uploaded"}</span>
        {report.documentId ? <span className="compare-coverage-count">{data.summary.accountsPerBureau.find(entry => entry.bureau === report.bureau)?.count ?? 0} accounts</span> : <button className="quiet-link" onClick={() => onUpload({ kind: "report", bureau: report.bureau })}>Upload report <Upload size={12} /></button>}
      </div>)}</div>{uploadedCount < 2 && <p className="compare-coverage-hint"><Info size={13} />Upload a report for at least two bureaus to compare accounts. Comparison uses the most recent report for each bureau.</p>}</section>

      <div className="compare-summary">
        <div><span className="compare-summary-number">{data.summary.conflicts}</span><span>Values differ</span></div>
        <div><span className="compare-summary-number">{data.summary.partial}</span><span>Not everywhere</span></div>
        <div><span className="compare-summary-number">{data.summary.single}</span><span>One bureau only</span></div>
        <div><span className="compare-summary-number text-green">{data.summary.consistent}</span><span>Match</span></div>
      </div>

      <section className="card compare-table-card">
        <div className="compare-filters"><div className="pill-tabs"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All <span>{data.groups.length}</span></button><button className={filter === "conflict" ? "active" : ""} onClick={() => setFilter("conflict")}>Values differ <span>{data.summary.conflicts}</span></button><button className={filter === "partial" ? "active" : ""} onClick={() => setFilter("partial")}>Not everywhere <span>{data.summary.partial}</span></button><button className={filter === "single" ? "active" : ""} onClick={() => setFilter("single")}>One bureau <span>{data.summary.single}</span></button><button className={filter === "consistent" ? "active" : ""} onClick={() => setFilter("consistent")}>Match <span>{data.summary.consistent}</span></button></div><div className="input-with-icon"><Search size={15} /><input aria-label="Search accounts" placeholder="Search an account name…" value={query} onChange={e => setQuery(e.target.value)} /></div></div>
        <AccountMatrix groups={groups} onOpen={setOpenGroup} />
        <div className="results-footer">{groups.length} of {data.groups.length} accounts<span>Comparison uses the most recent report uploaded for each bureau.</span></div>
      </section>

      {data.personal.length > 0 && <section className="card compare-personal-card"><div className="card-heading"><h2>Personal information by bureau</h2><span className="soft-tag">Informational</span></div><p className="compare-personal-intro">Names, addresses, phone numbers, and employers commonly differ between bureaus because each receives data from different sources. This is not automatically an error.</p><div className="compare-personal-grid">{(["name", "address", "phone", "employer"] as ReportItemKind[]).map(kind => {
          const rows = data.personal.filter(group => group.kind === kind);
          if (!rows.length) return null;
          return <div className="compare-personal-group" key={kind}><h3>{kindLabel[kind]}</h3>{rows.map(group => <div className="compare-personal-row" key={group.id}><span className="compare-personal-label">{group.label}</span><span className="compare-personal-bureaus">{COMPARE_BUREAUS.filter(bureau => group.byBureau[bureau]).map(bureau => <i key={bureau} title={getBureau(bureau).name}>{bureau.slice(0, 2).toUpperCase()}</i>)}</span></div>)}</div>;
        })}</div></section>}

      <div className="info-note page-info"><LockKeyhole size={17} /><p>Detection and matching are best-effort. Report layouts differ, and an account may be grouped or read incorrectly. Review every row before creating a draft, and confirm the correct value from your own records. A draft is not a submitted dispute.</p></div>
    </> : null}

    {openGroup && <CompareDrawer key={openGroup.id} group={openGroup} reports={data?.reports ?? []} onClose={() => setOpenGroup(null)} onData={onData} onToast={onToast} onOpenDispute={onOpenDispute} busy={busy} setBusy={setBusy} />}
  </>;
}

function CompareDrawer({ group, reports, onClose, onData, onToast, onOpenDispute, busy, setBusy }: {
  group: Group; reports: CompareResponse["reports"]; onClose: () => void;
  onData: (data: WorkspaceData) => void; onToast: (message: string, type?: "success" | "error") => void;
  onOpenDispute: (id: string) => void; busy: boolean; setBusy: (value: boolean) => void;
}) {
  const [bureaus, setBureaus] = useState<Bureau[]>(group.presentAt);
  const [correctValue, setCorrectValue] = useState("");
  const [reviewed, setReviewed] = useState(false), [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const reason = suggestedReasonFor(group.differences);
  const available = commonAgencyMethods(bureaus);
  const [method, setMethod] = useState<SubmissionMethod>("mail");
  const isMissing = group.severity === "partial" || group.severity === "single";

  const create = async () => {
    setBusy(true); setError("");
    try {
      const result = await apiRequest<WorkspaceData & { createdIds: string[] }>("/api/disputes/from-compare", {
        method: "POST", body: JSON.stringify({
          itemIds: group.presentAt.filter(bureau => bureaus.includes(bureau)).map(bureau => group.byBureau[bureau]!.id),
          bureaus, correctValue, reason, requestedAction: "Correct the inaccurate information", submissionMethod: method, reviewed, confirmed,
        }),
      });
      onData(result); onClose(); onOpenDispute(result.createdIds[0]);
      onToast(`${result.createdIds.length} dispute drafts created. Review every detail before submitting.`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return <Modal title={group.label} subtitle={`${group.presentAt.length} of 4 bureaus report this account`} onClose={onClose} drawer className="compare-drawer">
    <div className="detail-status-row"><SeverityBadge severity={group.severity} /><span>{group.differences.length ? `${group.differences.length} field${group.differences.length === 1 ? "" : "s"} differ` : "No field differences detected"}</span></div>
    <div className="detail-body">
      <div className="compare-drawer-grid">
        {COMPARE_BUREAUS.map(bureau => {
          const item = group.byBureau[bureau];
          const report = reports.find(entry => entry.bureau === bureau);
          return <div key={bureau} className={`compare-drawer-bureau ${item ? "" : "compare-drawer-bureau--missing"}`}>
            <BureauLogo bureau={bureau} compact />
            {item ? <dl><div><dt>Balance</dt><dd>{money(item.balanceCents)}</dd></div><div><dt>Status</dt><dd>{item.status || "Not read"}</dd></div><div><dt>Account</dt><dd>{item.accountLast4 ? `••${item.accountLast4}` : "—"}</dd></div></dl> : <p className="compare-drawer-absent">Not reported by this bureau. {report?.documentId ? "" : "No report uploaded."}</p>}
          </div>;
        })}
      </div>

      {group.differences.length > 0 && <section className="compare-differences"><h3>Where they disagree</h3>{group.differences.map(difference => <div className="compare-difference-row" key={difference.field}>
        <strong>{COMPARE_FIELD_LABELS[difference.field]}</strong>
        <div>{COMPARE_BUREAUS.filter(bureau => difference.values[bureau]).map(bureau => <span key={bureau}><i>{getBureau(bureau).name}</i>{difference.values[bureau]}</span>)}</div>
      </div>)}</section>}

      {isMissing && <div className="compare-missing-note"><Info size={17} /><p><strong>This account is not reported by every bureau.</strong> Lenders choose which bureaus to report to, so a missing account is usually not an error and generally cannot be disputed. Only prepare a draft for a bureau that actually reports this item and shows a value you believe is wrong.</p></div>}

      <section className="compare-dispute-form">
        <h3>Prepare dispute drafts</h3>
        <p>Select only the bureaus that report a value you believe is inaccurate. Enter what your own records show — BerheRepairShop cannot determine which bureau is correct.</p>
        <div className="compare-bureau-picks">{group.presentAt.map(bureau => <button type="button" key={bureau} className={`bureau-choice ${bureaus.includes(bureau) ? "selected" : ""}`} aria-pressed={bureaus.includes(bureau)} onClick={() => setBureaus(current => current.includes(bureau) ? current.filter(entry => entry !== bureau) : [...current, bureau])}><BureauLogo bureau={bureau} /><span className="choice-checkbox">{bureaus.includes(bureau) && <Check size={14} />}</span></button>)}</div>
        {bureaus.length > 0 && <div className="field"><label htmlFor="compare-method">Submission route</label><select id="compare-method" value={method} onChange={e => setMethod(e.target.value as SubmissionMethod)}>{(["online", "mail", "phone"] as SubmissionMethod[]).filter(option => available.includes(option)).map(option => <option key={option} value={option}>{option === "online" ? "Online portal · Login required" : option === "mail" ? "By mail · No portal login" : "By phone · No portal login"}</option>)}</select></div>}
        <div className="field"><label htmlFor="compare-correct">What do your own records show? <span className="required">*</span></label><textarea id="compare-correct" rows={3} value={correctValue} maxLength={1000} onChange={e => setCorrectValue(e.target.value)} placeholder="For example: my statement dated 03/15 shows a balance of $840.00 and a current status. Do not include full account numbers or SSNs." /><p className="field-hint">Suggested reason: {reason}. This becomes the basis of your dispute.</p></div>
        <label className="check-label"><input id="compare-review-confirm" type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /><span>I checked this account against my own records (statement, letter, or lender confirmation) and believe the selected bureaus are reporting it inaccurately.</span></label>
        <label className="check-label"><input id="compare-truth-confirm" type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>My explanation is truthful to the best of my knowledge. Drafts are not submitted disputes.</span></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary full-width" onClick={create} disabled={busy || !bureaus.length || correctValue.trim().length < 5 || !reviewed || !confirmed}>{busy ? <LoaderCircle size={16} className="spin" /> : <FileText size={16} />}Create {bureaus.length} draft{bureaus.length === 1 ? "" : "s"}</button>
      </section>
      <div className="info-note"><ShieldCheck size={16} /><p>Before submitting, complete each bureau’s official process. Investigation timelines generally run about 30 days from receipt.</p></div>
    </div>
  </Modal>;
}
