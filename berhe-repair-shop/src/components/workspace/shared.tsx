"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, ChevronRight, FileText, Inbox, Landmark, X } from "lucide-react";
import { getBureau, STATUS_LABELS } from "@/lib/bureaus";
import { formatDate, initials, relativeTime } from "@/lib/client";
import type { Bureau, Dispute, DisputeStatus, SubmissionMethod } from "@/lib/types";

export type UploadOptions = { kind: "report" | "supporting"; bureau?: Bureau; disputeId?: string; complaintId?: string };
export function BureauLogo({ bureau, compact = false }: { bureau: Bureau; compact?: boolean }) {
  return <span className={`bureau-logo bureau-logo--${bureau} ${compact ? "bureau-logo--compact" : ""}`} aria-label={getBureau(bureau).name}>
    {bureau === "experian" && <><span className="experian-mark"><i /><i /><i /><i /></span><span>experian<span className="logo-registered">®</span></span></>}
    {bureau === "equifax" && <span>EQUIFAX<span className="logo-registered">®</span></span>}
    {bureau === "transunion" && <><span>transunion</span><span className="tu-mark">t<span>u</span></span></>}
    {bureau === "chexsystems" && <><span className="chex-logo-symbol"><Landmark size={19} strokeWidth={1.6} /></span><span>Chex<span className="chex-logo-light">Systems</span></span></>}
    {["earlywarning", "datax", "lexisnexis", "worknumber"].includes(bureau) && <><span className="specialty-inline-mark"><FileText size={17} strokeWidth={1.6} /></span><span className="specialty-inline-name">{getBureau(bureau).name}</span></>}
    {bureau.startsWith("cfpb-") && <><span className="specialty-inline-mark"><FileText size={17} /></span><span className="specialty-inline-name">{getBureau(bureau).name}</span></>}
    {bureau === "innovis" && <><span className="innovis-mark">/</span><span>innovis<span className="logo-registered">®</span></span></>}
  </span>;
}
export function StatusBadge({ status, submissionMethod, receivedAt }: { status: DisputeStatus; submissionMethod?: SubmissionMethod; receivedAt?: string | null }) {
  const label = status === "in_review" && submissionMethod === "mail" && !receivedAt ? "Mailed · delivery pending" : STATUS_LABELS[status];
  return <span className={`status-badge status-badge--${status}`}><span className="status-dot" />{label}</span>;
}
export function CreditorMark({ name }: { name: string }) {
  const style = name.toLowerCase().includes("capital") ? "purple" : name.toLowerCase().includes("portfolio") ? "orange" : name.toLowerCase().includes("chase") ? "blue" : "neutral";
  return <span className={`creditor-mark creditor-mark--${style}`}>{name.toLowerCase().includes("capital") ? "C1" : name.toLowerCase().includes("chase") ? <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M12 5h11l-6 6h-5zM27 12v11l-6-6v-5zM20 27H9l6-6h5zM5 20V9l6 6v5z" fill="currentColor" /></svg> : initials(name)}</span>;
}
export function DisputeTable({ disputes, onDetail, compact = false }: { disputes: Dispute[]; onDetail: (id: string) => void; compact?: boolean }) {
  if (!disputes.length) return <EmptyState icon={<Inbox />} title="A clean slate" description="No disputes here yet. When you create a draft, you’ll find it right here." />;
  return <div className="table-scroll"><table className={`dispute-table ${compact ? "dispute-table--compact" : ""}`}><thead><tr><th>Bank / creditor & issue</th><th>Agency</th><th>Status</th><th>{compact ? "Updated" : "Last updated"}</th><th>Deleted</th><th className="arrow-column"><span className="sr-only">Open</span></th></tr></thead><tbody>{disputes.map(d => <tr key={d.id} onClick={() => onDetail(d.id)}>
    <td><button className="creditor-cell" onClick={e => { e.stopPropagation(); onDetail(d.id); }}><CreditorMark name={d.creditor} /><span><strong>{d.creditor}</strong><span className="table-secondary">{d.reason}</span></span></button></td>
    <td><span className={`bureau-table-name bureau-table-name--${d.bureau}`}>{getBureau(d.bureau).name}</span></td><td><StatusBadge status={d.status} submissionMethod={d.submissionMethod} receivedAt={d.receivedAt} /></td><td className="updated-cell">{compact ? relativeTime(d.updatedAt) : formatDate(d.updatedAt)}</td><td className="deleted-cell">{d.accountsDeleted > 0 ? <span className="deleted-count" title={`${d.accountsDeleted} account${d.accountsDeleted === 1 ? "" : "s"} deleted`}>{d.accountsDeleted}</span> : <span className="deleted-none">—</span>}</td><td><ChevronRight size={15} /></td>
  </tr>)}</tbody></table></div>;
}
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-state-icon">{icon ?? <FileText />}</span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
let scrollLocks = 0;
export function Modal({ title, subtitle, children, onClose, wide = false, drawer = false, className = "" }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean; drawer?: boolean; className?: string }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    setMounted(true);
    const previous = document.activeElement as HTMLElement | null;
    scrollLocks++; document.body.style.overflow = "hidden";
    const timer = setTimeout(() => ref.current?.querySelector<HTMLElement>("button, input, select, textarea, [tabindex='0']")?.focus(), 60);
    const handler = (e: KeyboardEvent) => {
      const dialogs = document.querySelectorAll(".modal-backdrop");
      if (ref.current?.parentElement !== dialogs[dialogs.length - 1]) return;
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); }
      if (e.key === "Tab") {
        const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex='0']") ?? []).filter(el => el.offsetParent !== null);
        const first = items[0], last = items[items.length - 1];
        if (!first) return;
        if (e.shiftKey && (document.activeElement === first || !ref.current?.contains(document.activeElement))) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => { clearTimeout(timer); document.removeEventListener("keydown", handler); scrollLocks--; if (scrollLocks === 0) document.body.style.overflow = ""; previous?.focus(); };
  }, []);
  if (!mounted) return null;
  return createPortal(<div className={`modal-backdrop ${drawer ? "modal-backdrop--drawer" : ""}`} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className={`modal-paper ${wide ? "modal-paper--wide" : ""} ${drawer ? "modal-paper--drawer" : ""} ${className}`}><header className="modal-header"><div><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button close-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></header>{children}</div></div>, document.body);
}
export function ArticleContent({ article }: { article: { id?: string; title: string; category: string; duration: string; intro: string; sections: { title: string; text: string }[] } }) {
  return <div className="article-content"><div className="article-meta"><span className="soft-tag">{article.category}</span><span>{article.duration}</span></div><p className="article-intro">{article.intro}</p>{article.sections.map(section => <section key={section.title}><h3>{section.title}</h3><p>{section.text}</p></section>)}{article.id === "eoscar" && <section className="article-primary-sources"><h3>Primary sources</h3><ul><li><a href="https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-an-error-on-my-credit-report-en-314/" target="_blank" rel="noopener noreferrer">CFPB: how to dispute a credit-report error</a></li><li><a href="https://www.consumerfinance.gov/compliance/supervisory-guidance/bulletin-fcra-requirement-investigate-disputes/" target="_blank" rel="noopener noreferrer">CFPB: furnishers must review all relevant dispute information</a></li><li><a href="https://www.consumerfinance.gov/rules-policy/regulations/1022/43/" target="_blank" rel="noopener noreferrer">Regulation V § 1022.43: direct disputes and exceptions</a></li><li><a href="https://www.law.cornell.edu/uscode/text/15/1681i" target="_blank" rel="noopener noreferrer">FCRA § 611 (15 U.S.C. § 1681i)</a></li></ul></section>}<a className="text-link article-source" href="https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/" target="_blank" rel="noopener noreferrer">Explore the CFPB’s credit report resources <ArrowRight size={15} /></a><div className="info-note"><Check size={17} /><p>Educational guidance only. BerheRepairShop does not offer legal advice, guarantee removals, or predict changes to your credit score.</p></div></div>;
}
