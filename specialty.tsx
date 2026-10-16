"use client";

import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Briefcase, Building2, Check, ChevronDown, Copy, Database, Download, FileSearch, FileText, Info, LockKeyhole, Mail, Phone, Plus, Search, ShieldCheck, Snowflake, Upload, WalletCards } from "lucide-react";
import { SPECIALTY_AGENCIES, type SpecialtyAgencyDetails } from "@/lib/specialty-agencies";
import { agencySubmissionLabel, defaultAgencyMethod, methodsForAgency, normalizeAgencyMethod } from "@/lib/submission-methods";
import { fullDate } from "@/lib/client";
import type { Bureau, PageName, SubmissionMethod, WorkspaceData } from "@/lib/types";
import type { PanelProps } from "./panels";
import { BureauRouteDetails } from "./submission-routes";
import { EmptyState, type UploadOptions } from "./shared";

type NewDispute = (bureau?: Bureau, method?: SubmissionMethod) => void;
type Navigate = (page: PageName, bureau?: string) => void;
const icons = { banking: Building2, credit: WalletCards, risk: Database, employment: Briefcase };
export function SpecialtyIdentity({ agency, small = false }: { agency: SpecialtyAgencyDetails; small?: boolean }) {
  const Icon = icons[agency.group];
  return <div className={`specialty-identity ${small ? "specialty-identity--small" : ""}`}><span className={`specialty-provider-icon specialty-provider-icon--${agency.id}`}><Icon size={small ? 18 : 23} strokeWidth={1.5} /></span><span><strong>{agency.name}</strong><span>{agency.focus}</span></span></div>;
}

export function SpecialtyOverview({ onNavigate }: { onNavigate: Navigate }) {
  return <section className="card specialty-overview"><div className="specialty-overview-heading"><div><p className="eyebrow">BEYOND THE CREDIT BUREAUS</p><h2>Different reports. The same clear voice.</h2><p>Banking, alternative-finance, consumer risk, and employment records each have their own process.</p></div><button className="quiet-link" onClick={() => onNavigate("specialty")}>Explore all options <ArrowRight size={15} /></button></div><div className="specialty-overview-providers">{SPECIALTY_AGENCIES.map(agency => <button key={agency.id} onClick={() => onNavigate("specialty")}><SpecialtyIdentity agency={agency} small /><ArrowUpRight size={13} /></button>)}</div></section>;
}

export function SpecialtyDirectoryCards({ data, onNew, onNavigate, preferredMethod, query = "" }: { data: WorkspaceData; onNew: NewDispute; onNavigate: Navigate; preferredMethod?: SubmissionMethod; query?: string }) {
  const [methods, setMethods] = useState<Record<string, SubmissionMethod>>(() => Object.fromEntries(SPECIALTY_AGENCIES.map(agency => [agency.id, normalizeAgencyMethod(agency.id, preferredMethod)])));
  useEffect(() => { if (preferredMethod) setMethods(Object.fromEntries(SPECIALTY_AGENCIES.map(agency => [agency.id, normalizeAgencyMethod(agency.id, preferredMethod)]))); }, [preferredMethod]);
  const agencies = SPECIALTY_AGENCIES.filter(agency => `${agency.name} ${agency.focus} ${agency.description}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="specialty-directory"><div className="section-heading"><div><h2>Additional reporting agencies</h2><p className="complaint-section-description">Only verified filing routes are selectable. Support, disclosure, and freeze requests are different actions.</p></div></div>{agencies.length ? <div className="specialty-directory-grid">{agencies.map(agency => {
    const method = methods[agency.id] ?? defaultAgencyMethod(agency.id);
    const count = data.disputes.filter(d => d.bureau === agency.id && d.status !== "resolved").length;
    return <article className="card specialty-dispute-card" key={agency.id} data-provider={agency.id}>
      <div className="specialty-card-top"><SpecialtyIdentity agency={agency} /><span className="specialty-scope-tag">Separate file</span></div>
      <p className="specialty-provider-description">{agency.description}</p>
      <div className="field specialty-route-field"><label htmlFor={`specialty-route-${agency.id}`}>Dispute filing route</label><select id={`specialty-route-${agency.id}`} value={method} onChange={e => setMethods(current => ({ ...current, [agency.id]: e.target.value as SubmissionMethod }))}>{methodsForAgency(agency.id).map(option => <option key={option} value={option}>{agencySubmissionLabel(option, agency.id)}</option>)}</select></div>
      <BureauRouteDetails key={`${agency.id}-${method}`} bureau={agency.id} method={method} compact />
      <p className="specialty-process-note"><Info size={13} /><span>{agency.disputeGuidance}</span></p>
      <button className="button button-primary full-width specialty-prepare-button" onClick={() => onNew(agency.id, method)}><Plus size={15} />Prepare {agency.name} dispute</button>
      <div className="specialty-directory-actions"><button className="quiet-link" onClick={() => onNavigate("disputes", agency.id)}>{count} active · View tracker <ArrowRight size={13} /></button><a className="quiet-link" href={agency.report} target="_blank" rel="noopener noreferrer"><FileSearch size={13} />Request report <ArrowUpRight size={12} /></a></div>
      <details className="specialty-support-details"><summary><span><Phone size={14} />Consumer support & filing limits</span><ChevronDown size={14} /></summary><div><a href={`tel:${agency.phone}`} className="specialty-support-phone">{agency.phone}</a><p>{agency.phoneNote}</p><a href={agency.portal} className="quiet-link" target="_blank" rel="noopener noreferrer">Official dispute guidance <ArrowUpRight size={12} /></a></div></details>
    </article>;
  })}</div> : <EmptyState icon={<Search />} title="No matching providers" description="Try a provider name, banking, income, or consumer report." />}</section>;
}

export function SpecialtyReportCards({ data, onNew, onUpload }: { data: WorkspaceData; onNew: NewDispute; onUpload: (options: UploadOptions) => void }) {
  return <section className="specialty-reports-section"><div className="section-heading"><div><h2>Banking isn’t the only separate file.</h2><p className="complaint-section-description">Request these records directly from each provider. Upload only redacted copies here.</p></div></div><div className="specialty-report-grid">{SPECIALTY_AGENCIES.map(agency => {
    const latest = data.documents.find(file => file.kind === "report" && file.bureau === agency.id);
    return <article className="card specialty-report-card" data-provider={agency.id} key={agency.id}><SpecialtyIdentity agency={agency} small /><div className="specialty-report-file"><FileText size={26} strokeWidth={1.4} /><strong>{latest ? latest.name : `Your ${agency.name} report`}</strong><span>{latest ? `Added ${fullDate(latest.createdAt)}` : agency.reportKind}</span></div><div className="specialty-report-actions">{latest ? <a className="button button-secondary" href={`/api/documents/${latest.id}`}><Download size={14} />Download report</a> : <a className="button button-secondary" href={agency.report} target="_blank" rel="noopener noreferrer">Get {agency.name} report <ArrowUpRight size={14} /></a>}<button className="button button-ghost" onClick={() => onUpload({ kind: "report", bureau: agency.id })}><Upload size={14} />Upload {agency.name} report</button></div><button className="quiet-link specialty-report-dispute" onClick={() => onNew(agency.id, defaultAgencyMethod(agency.id))}>Found an error? Prepare a dispute <ArrowRight size={13} /></button></article>;
  })}</div></section>;
}

function SpecialtyFreezeCard({ agency, onNew }: { agency: SpecialtyAgencyDetails; onNew?: NewDispute }) {
  const [copied, setCopied] = useState(false), [error, setError] = useState("");
  const freeze = agency.freezeOptions, available = freeze.status === "available";
  const copy = async () => { if (!freeze.mailAddress) return; try { await navigator.clipboard.writeText(freeze.mailAddress); setCopied(true); setError(""); } catch { setError("Copy is unavailable. Select and copy the address manually."); } };
  return <article className={`card specialty-freeze-card ${available ? "" : "specialty-freeze-card--contact"}`} key={agency.id} data-provider={agency.id}>
    <div className="specialty-card-top"><SpecialtyIdentity agency={agency} /><span className={`specialty-freeze-type ${available ? "" : "specialty-freeze-type--contact"}`}>{available ? agency.id === "worknumber" ? "Employment data" : "Security freeze" : "Contact provider"}</span></div>
    <h3>{freeze.label}</h3><p className="specialty-freeze-description">{freeze.description}</p>
    <div className="specialty-freeze-buttons"><a className={`button ${available ? "button-primary" : "button-secondary"} full-width`} href={freeze.portal ?? freeze.instructions} target="_blank" rel="noopener noreferrer">{available ? <Snowflake size={15} /> : <Phone size={15} />}{freeze.primaryLabel ?? "Contact Early Warning Consumer Services"}<ArrowUpRight size={14} /></a>{freeze.extraLinks?.map(link => <a className="quiet-link specialty-extra-link" key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}<ArrowUpRight size={13} /></a>)}</div>
    <div className="specialty-freeze-caution"><Info size={14} /><p>{freeze.caution}</p></div>
    <details className="specialty-freeze-alternatives"><summary><span>{available ? <Mail size={15} /> : <Phone size={15} />}{available ? "Mail / phone guidance" : "Consumer support"}</span><ChevronDown size={15} /></summary><div><a className="specialty-support-phone" href={`tel:${freeze.phone}`}><Phone size={14} />{freeze.phone}</a><p>{freeze.phoneNote}</p>{freeze.mailAddress && <><div className="mail-address-heading"><span>{agency.id === "worknumber" ? "Employment freeze address" : "Freeze correspondence address"}</span><button className="quiet-link" onClick={copy} aria-label={`Copy ${agency.name} freeze mailing address`}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</button></div><address className="bureau-mail-address">{freeze.mailAddress}</address></>}{freeze.mailForm && <a className="button button-secondary full-width specialty-freeze-mail-form" href={freeze.mailForm} target="_blank" rel="noopener noreferrer"><FileText size={14} />Official {agency.id === "worknumber" ? "data freeze" : "freeze"} mail form <ArrowUpRight size={13} /></a>}{error && <p className="route-copy-error" role="alert">{error}</p>}<a className="quiet-link specialty-freeze-source" href={freeze.instructions} target="_blank" rel="noopener noreferrer">Official provider instructions <ArrowUpRight size={13} /></a></div></details>
    {onNew && <div className="specialty-freeze-dispute"><span>Correcting inaccurate information?</span><button className="quiet-link" onClick={() => onNew(agency.id, defaultAgencyMethod(agency.id))}>Prepare a separate dispute <ArrowRight size={13} /></button></div>}
  </article>;
}
export function SpecialtyFreezeSection({ onNew }: { onNew?: NewDispute }) {
  return <section className="specialty-freeze-section"><div className="section-heading"><div><h2>Additional files. Separate controls.</h2><p className="complaint-section-description">DataX, LexisNexis, and employment data freeze independently. Early Warning requires checking with Consumer Services.</p></div></div><div className="specialty-freeze-grid">{SPECIALTY_AGENCIES.map(agency => <SpecialtyFreezeCard key={agency.id} agency={agency} onNew={onNew} />)}</div><p className="specialty-footer-note"><LockKeyhole size={13} />Use the provider’s official verification process. Opening a link does not submit, confirm, or monitor a freeze.</p></section>;
}

export function SpecialtyPanel(props: PanelProps) {
  const [tab, setTab] = useState("disputes"), [query, setQuery] = useState("");
  return <><div className="page-heading"><div><p className="eyebrow">SPECIALTY REPORTING AGENCIES</p><h1>More reports. More control.</h1><p className="page-description">Banking, alternative-finance, risk, and employment data—each with its own dispute and protection process.</p></div><div className="page-actions"><button className="button button-secondary" onClick={() => props.onNavigate("disputes")}>Your saved disputes <ArrowRight size={15} /></button></div></div>
    <div className="specialty-page-intro"><ShieldCheck size={24} /><div><strong>One workspace. Provider-specific next steps.</strong><p>These are separate files, not extra copies of your four credit-bureau reports. Both DataX links you supplied are grouped together. No account passwords or identity documents are collected here.</p></div></div>
    <div className="specialty-page-controls"><div className="pill-tabs"><button className={tab === "disputes" ? "active" : ""} onClick={() => setTab("disputes")}>Disputes & reports</button><button className={tab === "freezes" ? "active" : ""} onClick={() => setTab("freezes")}>Freeze & protection options</button></div>{tab === "disputes" && <div className="input-with-icon"><Search size={15} /><input aria-label="Search specialty agencies" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a provider or report type…" /></div>}</div>
    {tab === "disputes" ? <SpecialtyDirectoryCards data={props.data} onNew={props.onNew} onNavigate={props.onNavigate} query={query} /> : <SpecialtyFreezeSection onNew={props.onNew} />}
    <div className="info-note page-info"><Info size={17} /><p>BerheRepairShop prepares and tracks your drafts. Official providers handle filing, identity verification, reinvestigations, and freezes. General support calls and help forms are not proof of a submitted dispute.</p></div>
  </>;
}
