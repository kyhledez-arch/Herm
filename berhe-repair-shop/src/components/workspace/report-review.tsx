"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Building2, Check, CheckCircle2, FileSearch, FileText, Info, LoaderCircle, LockKeyhole, Mail, Phone, Plus, RefreshCw, Search, ShieldCheck, Upload, User, WalletCards } from "lucide-react";
import { BUREAUS, REPORTING_AGENCIES, getBureau } from "@/lib/bureaus";
import { ITEM_KINDS } from "@/lib/report-parser";
import { agencySubmissionLabel, commonAgencyMethods, defaultAgencyMethod, supportsAgencyMethod } from "@/lib/submission-methods";
import { apiRequest, fullDate } from "@/lib/client";
import type { Bureau, ReportItem, ReportItemKind, SubmissionMethod, WorkspaceData } from "@/lib/types";
import { BureauLogo, EmptyState, Modal, type UploadOptions } from "./shared";

const kindIcon: Record<ReportItemKind, typeof Phone> = {
  account: WalletCards, inquiry: Search, address: Building2, phone: Phone, employer: User, name: FileText,
};
const kindNoun: Record<ReportItemKind, string> = {
  account: "account", inquiry: "inquiry", address: "address", phone: "phone number", employer: "employer", name: "name",
};

export function ReportReview({ documentId, documentName, onClose, onData, onToast, onUpload, onOpenDispute }: {
  documentId: string; documentName: string; onClose: () => void;
  onData: (data: WorkspaceData) => void; onToast: (message: string, type?: "success" | "error") => void;
  onUpload: (options: UploadOptions) => void; onOpenDispute: (id: string) => void;
}) {
  const [items, setItems] = useState<ReportItem[] | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set()), [filter, setFilter] = useState<"all" | ReportItemKind>("all");
  const [stage, setStage] = useState<"select" | "confirm">("select");
  const [bureaus, setBureaus] = useState<Bureau[]>([]), [method, setMethod] = useState<SubmissionMethod>("mail");
  const [reviewed, setReviewed] = useState(false), [confirmed, setConfirmed] = useState(false);

  useEffect(() => { void (async () => {
    setBusy(true); setError("");
    try {
      const existing = await apiRequest<{ items: ReportItem[] }>(`/api/documents/${documentId}/items`);
      if (existing.items.length) { setItems(existing.items); return; }
      const parsed = await apiRequest<{ items: ReportItem[]; detected: number }>(`/api/documents/${documentId}/items`, { method: "POST" });
      setItems(parsed.items);
      if (!parsed.items.length) onToast("No items detected automatically. You can still prepare a dispute manually.");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  })(); }, [documentId]);

  const grouped = useMemo(() => {
    const map = new Map<string, ReportItem[]>();
    for (const item of items ?? []) {
      const group = ITEM_KINDS.find(kind => kind.id === item.kind)?.group ?? "Other";
      map.set(group, [...(map.get(group) ?? []), item]);
    }
    return [...map.entries()];
  }, [items]);
  const visible = (filter === "all" ? (items ?? []) : (items ?? []).filter(item => item.kind === filter));
  const selectedItems = visible.filter(item => selected.has(item.id));
  const availableMethods = commonAgencyMethods(bureaus);
  const toggle = (id: string) => setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleGroup = (groupItems: ReportItem[]) => {
    const ids = groupItems.map(item => item.id), all = ids.every(id => selected.has(id));
    setSelected(current => { const next = new Set(current); ids.forEach(id => all ? next.delete(id) : next.add(id)); return next; });
  };
  const parse = async () => { setBusy(true); setError("");
    try { const result = await apiRequest<{ items: ReportItem[]; detected: number }>(`/api/documents/${documentId}/items`, { method: "POST" }); setItems(result.items); setSelected(new Set()); setStage("select"); onToast(result.detected ? `${result.detected} items detected. Review each one before disputing.` : "No items were detected. Reports vary in format—you can still dispute manually."); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const create = async () => {
    setBusy(true); setError("");
    try {
      const result = await apiRequest<WorkspaceData & { createdIds: string[] }>("/api/disputes/from-items", { method: "POST", body: JSON.stringify({ itemIds: [...selected], bureaus, submissionMethod: method, reviewed, confirmed }) });
      onData(result);
      setBusy(false);
      onClose();
      onOpenDispute(result.createdIds[0]);
      onToast(`${result.createdIds.length} dispute drafts created. Review every detail before submitting.`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const toggleBureau = (id: Bureau) => {
    const next = bureaus.includes(id) ? bureaus.filter(bureau => bureau !== id) : [...bureaus, id];
    setBureaus(next); setMethod(availableMethods.includes(method) || commonAgencyMethods(next).includes(method) ? method : commonAgencyMethods(next)[0] ?? "mail");
  };

  return <Modal title="Review your report" subtitle={documentName} onClose={onClose} drawer className="report-review-drawer">
    <div className="detail-status-row"><span className="soft-tag">Auto-detected items</span><span>Review before disputing</span></div>
    <div className="tab-row report-review-tabs">
      <button className={`tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>All <span>{items?.length ?? 0}</span></button>
      {ITEM_KINDS.filter(kind => (items ?? []).some(item => item.kind === kind.id)).map(kind => <button key={kind.id} className={`tab ${filter === kind.id ? "active" : ""}`} onClick={() => setFilter(kind.id)}>{kind.name} <span>{(items ?? []).filter(item => item.kind === kind.id).length}</span></button>)}
    </div>
    <div className="detail-body">
      {busy && !items ? <div className="loading-main"><LoaderCircle size={24} className="spin" /><span>Reading your report…</span></div> : <>
        {items && !items.length && <EmptyState icon={<FileSearch />} title="No items detected yet." description="Report formats vary widely. Detection is best-effort—you can still prepare a dispute manually, or try a text-based PDF export." action={<div className="empty-state-actions"><button className="button button-secondary" onClick={parse} disabled={busy}><RefreshCw size={15} />Try again</button><button className="button button-primary" onClick={() => { onClose(); onUpload({ kind: "report" }); }}><Upload size={15} />Upload a different report</button></div>} />}
        {items && items.length > 0 && <>
          <div className="report-review-toolbar">
            <span>{selected.size} selected</span>
            <div>
              <button className="quiet-link" onClick={() => setSelected(new Set(visible.map(item => item.id)))}>Select all shown</button>
              <button className="quiet-link" onClick={() => setSelected(new Set())}>Clear</button>
              <button className="quiet-link" onClick={parse} disabled={busy}>{busy ? <LoaderCircle size={13} className="spin" /> : <RefreshCw size={13} />}Re-detect</button>
            </div>
          </div>
          {stage === "select" ? grouped.map(([group, groupItems]) => <section className="report-item-group" key={group}>
            <header>
              <button className="report-group-select" onClick={() => toggleGroup(groupItems)} aria-pressed={groupItems.every(item => selected.has(item.id))}>
                <span className="choice-checkbox">{groupItems.every(item => selected.has(item.id)) && <Check size={13} />}</span>
                <h3>{group}</h3>
              </button>
              <span>{groupItems.length} {groupItems.length === 1 ? "item" : "items"}</span>
            </header>
            {groupItems.map(item => { const Icon = kindIcon[item.kind] ?? FileText; return (
              <div className={`report-item-row ${selected.has(item.id) ? "selected" : ""}`} key={item.id}>
                <label className="report-item-pick">
                  <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} aria-label={`Select ${item.label}`} />
                  <span className="report-item-icon"><Icon size={17} /></span>
                  <span className="report-item-text"><strong>{item.label}</strong><span>{item.detail}</span></span>
                </label>
                <button className="quiet-link report-item-dispute" onClick={() => { setSelected(new Set([item.id])); setStage("confirm"); }} disabled={busy}>Dispute<ArrowRight size={12} /></button>
              </div>
            ); })}
          </section>) : null}
          {stage === "confirm" && <section className="report-confirm">
            <h3>Create drafts for {selected.size} {selected.size === 1 ? "item" : "items"}</h3>
            <div className="report-confirm-summary">{selectedItems.map(item => <span key={item.id}>{item.label}</span>)}</div>
            <div className="wizard-section-title"><h4>Which reporting agency?</h4><p>Drafts are created for each agency you select.</p></div>
            <div className="bureau-selection-grid">{BUREAUS.map(b => <button type="button" key={b.id} className={`bureau-choice ${bureaus.includes(b.id) ? "selected" : ""}`} aria-pressed={bureaus.includes(b.id)} onClick={() => toggleBureau(b.id)}><BureauLogo bureau={b.id} /><span className="choice-checkbox">{bureaus.includes(b.id) && <Check size={14} />}</span><span className="bureau-choice-caption">{b.name} credit report</span></button>)}</div>
            {bureaus.some(id => !BUREAUS.some(b => b.id === id)) && <div className="info-note"><Info size={15} /><p>Specialty and directory agencies support written drafts only.</p></div>}
            <div className="field"><label htmlFor="report-item-method">Submission route</label><select id="report-item-method" value={method} onChange={e => setMethod(e.target.value as SubmissionMethod)}>{["online", "mail", "phone"].filter(option => supportsAgencyMethod(bureaus[0] ?? "experian", option as SubmissionMethod) && availableMethods.includes(option as SubmissionMethod)).map(option => <option key={option} value={option}>{agencySubmissionLabel(option as SubmissionMethod, bureaus[0])}</option>)}</select></div>
            <div className="report-confirm-list">{REPORTING_AGENCIES.filter(agency => bureaus.includes(agency.id) && !BUREAUS.some(b => b.id === agency.id)).map(agency => <button type="button" key={agency.id} className={`bureau-choice ${bureaus.includes(agency.id) ? "selected" : ""}`} onClick={() => toggleBureau(agency.id)}><span className="specialty-inline-name">{agency.name}</span><span className="choice-checkbox">{bureaus.includes(agency.id) && <Check size={14} />}</span></button>)}</div>
            <label className="check-label"><input id="report-review-confirm" type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /><span>I reviewed each selected item and believe it is inaccurate or incomplete. Auto-detection may miss or misread details.</span></label>
            <label className="check-label"><input id="report-truth-confirm" type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /><span>My explanations will be truthful to the best of my knowledge. Drafts are not submitted disputes.</span></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="inline-form-actions">
              <button className="button button-secondary" onClick={() => setStage("select")} disabled={busy}>Back to items</button>
              <button className="button button-primary" onClick={create} disabled={busy || !bureaus.length || !reviewed || !confirmed || !selected.size}>{busy ? <LoaderCircle size={15} className="spin" /> : <Plus size={15} />}Create {selected.size * Math.max(bureaus.length, 1)} drafts</button>
            </div>
          </section>}
          {stage === "select" && <div className="report-review-actions">
            <div><h4>Ready to dispute your selection?</h4><p>{selected.size} {selected.size === 1 ? "item" : "items"} selected · {selected.size * Math.max(bureaus.length, 1)} drafts will be created</p></div>
            <button className="button button-primary" onClick={() => { setStage("confirm"); setBureaus(bureaus.length ? bureaus : []); }} disabled={!selected.size || busy}><ArrowRight size={14} />Dispute selected</button>
          </div>}
          <div className="info-note"><ShieldCheck size={16} /><p><strong>Detection is best-effort.</strong> Report layouts differ, so review every label, account number, and detail before creating drafts. Edit any draft before submitting. A draft is not a submitted dispute.</p></div>
        </>}
      </>}
      {error && !items && <p className="form-error" role="alert">{error}</p>}
    </div>
  </Modal>;
}
