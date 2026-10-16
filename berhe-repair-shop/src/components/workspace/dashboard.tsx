"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Bell, BookOpen, Columns3, Check, CheckCircle2, ChevronDown, ChevronRight, CircleAlert, CircleHelp, FileSearch, Files, FileText, FolderOpen, Handshake, Landmark, LayoutDashboard, LayoutGrid, LoaderCircle, LockKeyhole, Menu, Search, Settings, ShieldCheck, Snowflake, Sparkles, X } from "lucide-react";
import { BUREAUS, REPORTING_AGENCIES, getBureau, GUIDE_ARTICLES } from "@/lib/bureaus";
import { COMPLAINT_CHANNELS, getComplaintChannel } from "@/lib/complaints";
import { apiRequest, downloadJson, initials, relativeTime } from "@/lib/client";
import type { Activity, Bureau, ComplaintChannel, PageName, SubmissionMethod, WorkspaceData } from "@/lib/types";
import { ArticleContent, BureauLogo, Modal, type UploadOptions } from "./shared";
import { BureausPanel, DisputesPanel, DocumentsPanel, LearningPanel, OverviewPanel, ReportsPanel, SettingsPanel, type PanelProps } from "./panels";
import { DisputeDetail, NewDisputeModal, UploadModal } from "./modals";
import { ComplaintDetail, ComplaintFormModal, ComplaintsPanel } from "./complaints";
import { ProtectionPanel } from "./protection";
import { CLARITY } from "@/lib/protection";
import { SPECIALTY_AGENCIES } from "@/lib/specialty-agencies";
import { normalizeAgencyMethod } from "@/lib/submission-methods";
import { SpecialtyPanel } from "./specialty";
import { CompanyDirectoryPanel } from "./company-directory";
import { ReportReview } from "./report-review";
import { ComparePanel } from "./bureau-compare";
import { getCfpbCompany, isCatalogAgency } from "@/lib/cfpb-directory";

const NAV = [
  { id: "overview" as PageName, label: "Overview", icon: LayoutDashboard },
  { id: "disputes" as PageName, label: "My disputes", icon: Files },
  { id: "complaints" as PageName, label: "CFPB & BBB", icon: Handshake },
  { id: "compare" as PageName, label: "Compare bureaus", icon: Columns3 },
  { id: "reports" as PageName, label: "Credit reports", icon: FileSearch },
  { id: "documents" as PageName, label: "Documents", icon: FolderOpen },
];
const RESOURCES = [{ id: "companies" as PageName, label: "Company directory", icon: BookOpen }, { id: "bureaus" as PageName, label: "Bureau directory", icon: Landmark }, { id: "specialty" as PageName, label: "Specialty agencies", icon: FileSearch }, { id: "protection" as PageName, label: "Security freezes", icon: Snowflake }, { id: "learn" as PageName, label: "Learning center", icon: BookOpen }];
const PAGE_LABELS: Record<PageName, string> = { overview: "Overview", disputes: "My disputes", complaints: "Complaints & escalation", compare: "Compare bureaus", reports: "Credit reports", documents: "Documents", bureaus: "Bureau directory", companies: "Company directory", specialty: "Specialty agencies", protection: "Security freezes", learn: "Learning center", settings: "Settings" };
const PANELS = { overview: OverviewPanel, disputes: DisputesPanel, complaints: ComplaintsPanel, compare: ComparePanel, reports: ReportsPanel, documents: DocumentsPanel, bureaus: BureausPanel, companies: CompanyDirectoryPanel, specialty: SpecialtyPanel, protection: ProtectionPanel, learn: LearningPanel, settings: SettingsPanel };
type ComplaintFormOptions = { channel?: ComplaintChannel; relatedDisputeId?: string; editingId?: string };

export default function Dashboard() {
  const [data, setData] = useState<WorkspaceData | null>(null), [loadError, setLoadError] = useState("");
  const [page, setPage] = useState<PageName>("overview"), [bureauFilter, setBureauFilter] = useState("all");
  const [wizard, setWizard] = useState<{ bureau?: Bureau; method?: SubmissionMethod } | null>(null), [detailId, setDetailId] = useState<string | null>(null), [upload, setUpload] = useState<UploadOptions | null>(null);
  const [complaintForm, setComplaintForm] = useState<ComplaintFormOptions | null>(null), [complaintId, setComplaintId] = useState<string | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null), [activityOpen, setActivityOpen] = useState(false), [helpOpen, setHelpOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false), [menu, setMenu] = useState<string | null>(null), [seen, setSeen] = useState(false);
  const [search, setSearch] = useState(""), [searchFocused, setSearchFocused] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [directoryCompanyId, setDirectoryCompanyId] = useState<string | undefined>(), [directoryRequestId, setDirectoryRequestId] = useState<string | undefined>();
  const [reviewDocument, setReviewDocument] = useState<{ id: string; name: string } | null>(null);
  const [pendingDisputeId, setPendingDisputeId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null), headerRef = useRef<HTMLElement>(null);
  const dataRef = useRef<WorkspaceData | null>(null);
  dataRef.current = data;
  const load = useCallback(async () => { setLoadError(""); try { setData(await apiRequest<WorkspaceData>("/api/workspace")); } catch (e) { setLoadError((e as Error).message); } }, []);
  useEffect(() => {
    void load();
    const readPage = () => { const view = new URLSearchParams(window.location.search).get("view"); setPage(view && Object.hasOwn(PAGE_LABELS, view) ? view as PageName : "overview"); setDirectoryCompanyId(new URLSearchParams(window.location.search).get("company") ?? undefined); };
    readPage(); window.addEventListener("popstate", readPage); return () => window.removeEventListener("popstate", readPage);
  }, [load]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 5000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (!pendingDisputeId || !data?.disputes.some(d => d.id === pendingDisputeId)) return; setDetailId(pendingDisputeId); setPendingDisputeId(null); }, [pendingDisputeId, data]);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); } if (e.key === "Escape") { setMenu(null); setSearchFocused(false); setMobileOpen(false); } };
    const click = (e: MouseEvent) => { if (!headerRef.current?.contains(e.target as Node)) { setMenu(null); setSearchFocused(false); } };
    document.addEventListener("keydown", keyboard); document.addEventListener("mousedown", click);
    return () => { document.removeEventListener("keydown", keyboard); document.removeEventListener("mousedown", click); };
  }, []);
  const notify = useCallback((message: string, type: "success" | "error" = "success") => setToast({ message, type }), []);
  const navigate = (next: PageName, bureau?: string) => {
    setDirectoryCompanyId(next === "companies" ? bureau : undefined); setDirectoryRequestId(undefined);
    setPage(next); if (next === "disputes") setBureauFilter(bureau || "all"); setMobileOpen(false); setMenu(null); setSearch(""); setSearchFocused(false);
    window.history.pushState({}, "", next === "overview" ? "/" : `/?view=${next}${next === "companies" && bureau ? `&company=${encodeURIComponent(bureau)}` : ""}`); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const closeHeaderMenus = () => { setMenu(null); setSearchFocused(false); setSearch(""); };
  const openDetail = (id: string) => {
    if (!dataRef.current?.disputes.some(d => d.id === id)) { notify("This dispute has been removed from your workspace.", "error"); return; }
    setComplaintId(null); setDetailId(id); closeHeaderMenus();
  };
  const openComplaintDetail = (id: string) => {
    if (!dataRef.current?.complaints.some(c => c.id === id)) { notify("This complaint has been removed from your workspace.", "error"); return; }
    setDetailId(null); setComplaintForm(null); setComplaintId(id); closeHeaderMenus();
  };
  const openNewComplaint = (channel?: ComplaintChannel, relatedDisputeId?: string) => {
    setWizard(null); setDetailId(null); setComplaintId(null); setComplaintForm({ channel, relatedDisputeId }); setMobileOpen(false); closeHeaderMenus();
  };
  const openUpload = (options: UploadOptions) => { setDetailId(null); setComplaintId(null); setUpload(options); };
  const openActivity = (activity: Activity) => {
    setMenu(null);
    if (activity.requestId) { setActivityOpen(false); navigate("companies"); setDirectoryRequestId(activity.requestId); }
    else if (activity.complaintId) { setActivityOpen(false); openComplaintDetail(activity.complaintId); }
    else if (activity.disputeId) { setActivityOpen(false); openDetail(activity.disputeId); }
    else setActivityOpen(true);
  };
  const Panel = PANELS[page];
  const activeCount = data?.disputes.filter(d => d.status !== "resolved").length ?? 0;
  const complaintCount = data?.complaints.filter(c => c.status !== "resolved").length ?? 0;
  const name = data?.workspace.name || "Your workspace";
  const article = GUIDE_ARTICLES.find(a => a.id === articleId);
  const detail = data?.disputes.find(d => d.id === detailId);
  const complaint = data?.complaints.find(c => c.id === complaintId);
  const editingComplaint = data?.complaints.find(c => c.id === complaintForm?.editingId);
  const query = search.trim().toLowerCase();
  const searchDisputes = data?.disputes.filter(d => `${d.creditor} ${d.reason} ${getBureau(d.bureau).name}`.toLowerCase().includes(query)).slice(0, 5) ?? [];
  const searchComplaints = data?.complaints.filter(c => `${c.company} ${c.issue} ${c.channel}`.toLowerCase().includes(query)).slice(0, 4) ?? [];
  const searchRequests = data?.requests.filter(row => `${getCfpbCompany(row.companyId)?.name ?? row.companyId} ${row.kind} request`.toLowerCase().includes(query)).slice(0, 3) ?? [];
  const searchDocs = data?.documents.filter(d => d.name.toLowerCase().includes(query)).slice(0, 3) ?? [];
  const searchBureaus = REPORTING_AGENCIES.filter(b => b.name.toLowerCase().includes(query)).slice(0, 8);
  const searchChannels = COMPLAINT_CHANNELS.filter(c => `${c.name} ${c.fullName} ${c.domain}`.toLowerCase().includes(query));
  const searchClarity = `${CLARITY.name} security freeze credit protection`.toLowerCase().includes(query);
  const searchChexFreeze = "ChexSystems banking history security freeze".toLowerCase().includes(query);
  const searchSpecialtyFreezes = SPECIALTY_AGENCIES.filter(agency => `${agency.name} ${agency.focus} ${agency.freezeOptions.label} freeze protection`.toLowerCase().includes(query));
  const panelProps: PanelProps | null = data ? { data, onNew: (bureau, method) => setWizard({ bureau, method: bureau ? normalizeAgencyMethod(bureau, method) : method }), onDetail: openDetail, onNewComplaint: openNewComplaint, onComplaintDetail: openComplaintDetail, onUpload: openUpload, onNavigate: navigate, onArticle: setArticleId, onData: setData, onToast: notify, onActivity: () => setActivityOpen(true), bureauFilter, setBureauFilter, directoryCompanyId, directoryRequestId, onReviewReport: (id, name) => { setDetailId(null); setComplaintId(null); setReviewDocument({ id, name }); }, onOpenDispute: setPendingDisputeId } : null;

  return <div className="app-shell">
    <a href="#workspace-content" className="skip-link">Skip to workspace</a>
    {mobileOpen && <div className="mobile-nav-overlay" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
      <button className="brand" onClick={() => navigate("overview")} aria-label="BerheRepairShop home"><span className="brand-symbol"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 27 7v9c0 7-6 11-11 14C11 27 5 23 5 16V7Z" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" /><path d="m10.5 16 3.8 3.8 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span>Berhe<span className="brand-light">RepairShop</span></span></button>
      <button className="workspace-switch" onClick={() => navigate("settings")}><span className="workspace-symbol"><LayoutGrid size={17} /></span><span><strong>Personal workspace</strong><span>One place. A fresh start.</span></span><ChevronDown size={14} /></button>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Workspace navigation">{NAV.map(item => <button className={`nav-item ${page === item.id ? "nav-item--active" : ""}`} key={item.id} onClick={() => navigate(item.id)}><item.icon size={19} strokeWidth={1.7} /><span>{item.label}</span>{item.id === "disputes" && activeCount > 0 && <span className="nav-count">{activeCount}</span>}{item.id === "complaints" && (complaintCount > 0 ? <span className="nav-count">{complaintCount}</span> : <span className="nav-new-dot" />)}</button>)}</nav>
      <div className="nav-label resources-label">RESOURCES</div>
      <nav aria-label="Resources navigation">{RESOURCES.map(item => <button className={`nav-item ${page === item.id ? "nav-item--active" : ""}`} key={item.id} onClick={() => navigate(item.id)}><item.icon size={19} strokeWidth={1.7} /><span>{item.label}</span>{item.id === "learn" && <span className="nav-new-dot" />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-guide"><span className="sidebar-guide-icon"><Sparkles size={19} /></span><h3>A clearer path forward.</h3><p>A little guidance can make<br />a big difference.</p><button onClick={() => navigate("learn")}>Explore the guides <ArrowRight size={15} /></button><span className="sidebar-guide-decoration" /></div><button className="nav-item" onClick={() => setHelpOpen(true)}><CircleHelp size={19} strokeWidth={1.7} /><span>Help & support</span></button><button className={`nav-item ${page === "settings" ? "nav-item--active" : ""}`} onClick={() => navigate("settings")}><Settings size={19} strokeWidth={1.7} /><span>Settings</span></button><div className="sidebar-privacy"><LockKeyhole size={13} /><span>Your data. Your business.</span></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar" ref={headerRef}>
        <div className="topbar-left"><button className="icon-button mobile-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open navigation"><Menu size={21} /></button><div className="breadcrumb"><button onClick={() => navigate("overview")}><LayoutGrid size={15} /><span>Workspace</span></button><ChevronRight size={13} /><strong>{PAGE_LABELS[page]}</strong></div>{data?.workspace.isDemo && <button className="demo-badge" onClick={() => navigate("settings")} title="This workspace includes example data"><span />Demo mode</button>}</div>
        <div className="topbar-right">
          <div className={`global-search ${searchFocused ? "global-search--focused" : ""}`}><Search size={16} /><input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} onFocus={() => { setSearchFocused(true); setMenu(null); }} placeholder="Search your workspace…" aria-label="Search your workspace" /><kbd>⌘ K</kbd>
            {searchFocused && query && <div className="search-results"><div className="popover-label">WORKSPACE RESULTS</div>
              {searchDisputes.map(d => <button key={d.id} onClick={() => openDetail(d.id)}><span className="search-result-icon"><FileText size={17} /></span><span><strong>{d.creditor}</strong><small>{getBureau(d.bureau).name} · {d.reason}</small></span><ChevronRight size={14} /></button>)}
              {searchComplaints.map(c => <button key={c.id} onClick={() => openComplaintDetail(c.id)}><span className="search-result-icon"><Handshake size={17} /></span><span><strong>{c.company}</strong><small>{getComplaintChannel(c.channel).name} complaint · {c.issue}</small></span><ChevronRight size={14} /></button>)}
              {searchRequests.map(row => <button key={row.id} onClick={() => { navigate("companies"); setDirectoryRequestId(row.id); }}><span className="search-result-icon"><FileSearch size={17} /></span><span><strong>{getCfpbCompany(row.companyId)?.name ?? "Company request"}</strong><small>{row.kind === "report" ? "Report request plan" : "Freeze request plan"} · Recorded by you</small></span><ChevronRight size={14} /></button>)}
              {searchDocs.map(d => <a key={d.id} href={`/api/documents/${d.id}`} onClick={() => setSearchFocused(false)}><span className="search-result-icon"><FolderOpen size={17} /></span><span><strong>{d.name}</strong><small>Document{d.isSample ? " · Sample" : ""}</small></span><ArrowUpRight size={14} /></a>)}
              {searchBureaus.map(b => <button key={b.id} onClick={() => navigate(isCatalogAgency(b.id) ? "companies" : SPECIALTY_AGENCIES.some(a => a.id === b.id) ? "specialty" : "bureaus", isCatalogAgency(b.id) ? b.id : undefined)}><span className="search-result-icon"><Landmark size={17} /></span><span><strong>{b.name}</strong><small>{b.id === "chexsystems" ? "Banking consumer report · Dispute options" : SPECIALTY_AGENCIES.some(a => a.id === b.id) ? "Specialty consumer report · Verified filing routes" : "Official bureau directory"}</small></span><ChevronRight size={14} /></button>)}
              {searchChannels.map(c => <button key={c.id} onClick={() => navigate("complaints")}><span className="search-result-icon"><Handshake size={17} /></span><span><strong>{c.name} complaint option</strong><small>{c.fullName}</small></span><ChevronRight size={14} /></button>)}
              {searchClarity && <button onClick={() => navigate("protection")}><span className="search-result-icon"><Snowflake size={17} /></span><span><strong>Clarity Services security freeze</strong><small>Separate consumer file · Official freeze options</small></span><ChevronRight size={14} /></button>}
              {searchChexFreeze && <button onClick={() => navigate("protection")}><span className="search-result-icon"><Snowflake size={17} /></span><span><strong>ChexSystems security freeze</strong><small>Separate banking file · Official freeze options</small></span><ChevronRight size={14} /></button>}
              {searchSpecialtyFreezes.map(agency => <button key={`freeze-${agency.id}`} onClick={() => navigate("protection")}><span className="search-result-icon"><Snowflake size={17} /></span><span><strong>{agency.name} {agency.freezeOptions.status === "available" ? agency.id === "worknumber" ? "employment data freeze" : "freeze options" : "protection guidance"}</strong><small>{agency.freezeOptions.status === "available" ? "Separate provider file · Official request options" : "No public freeze route verified · Contact provider"}</small></span><ChevronRight size={14} /></button>)}
              {!searchDisputes.length && !searchComplaints.length && !searchDocs.length && !searchRequests.length && !searchBureaus.length && !searchChannels.length && !searchClarity && !searchChexFreeze && !searchSpecialtyFreezes.length && <div className="search-no-results"><Search size={23} /><strong>No matches just yet.</strong><span>Try a company, bureau, complaint channel, or document.</span></div>}
            </div>}
          </div>
          <div className="notification-wrap"><button className={`icon-button notification-button ${menu === "notifications" ? "is-active" : ""}`} aria-label="View notifications" aria-expanded={menu === "notifications"} onClick={() => { setMenu(menu === "notifications" ? null : "notifications"); setSearchFocused(false); setSeen(true); }}><Bell size={19} strokeWidth={1.7} />{!seen && !!data?.activities.length && <span className="notification-dot" />}</button>{menu === "notifications" && <div className="notification-popover"><div className="popover-heading"><h3>You’re in the loop.</h3><span className="soft-tag">Activity</span></div>{data?.activities.slice(0, 4).map(a => <button key={a.id} className="notification-row" onClick={() => openActivity(a)}><span className={`activity-symbol ${a.type === "resolved" ? "tinted-green" : "tinted-purple"}`}>{a.type === "resolved" ? <Check size={15} /> : a.complaintId ? <Handshake size={15} /> : <FileText size={15} />}</span><span><strong>{a.title}</strong><small>{relativeTime(a.createdAt)}</small></span></button>)}{!data?.activities.length && <p className="popover-empty">Your updates will appear here.</p>}<button className="popover-bottom-link" onClick={() => { setActivityOpen(true); setMenu(null); }}>See your full timeline <ArrowRight size={15} /></button></div>}</div>
          <div className="topbar-divider" />
          <div className="profile-wrap"><button className="profile-button" onClick={() => { setMenu(menu === "profile" ? null : "profile"); setSearchFocused(false); }} aria-expanded={menu === "profile"}><span className="avatar">{initials(name)}</span><span className="profile-name"><strong>{name}</strong><span>Personal workspace</span></span><ChevronDown size={14} /></button>{menu === "profile" && <div className="profile-popover"><div className="popover-label">YOUR WORKSPACE</div><button onClick={() => navigate("settings")}><Settings size={16} />Profile & settings</button><button onClick={() => { if (data) { downloadJson(data); notify("Workspace data exported, including complaints. Document files are not included."); } setMenu(null); }}><FolderOpen size={16} />Export workspace</button><button onClick={() => { setHelpOpen(true); setMenu(null); }}><CircleHelp size={16} />Get a little guidance</button></div>}</div>
        </div>
      </header>
      <main id="workspace-content" className="workspace-content">{data && panelProps ? <Panel {...panelProps} /> : loadError ? <div className="workspace-error"><span className="empty-state-icon"><CircleAlert /></span><h1>Let’s reconnect your workspace.</h1><p>{loadError}</p><button className="button button-primary" onClick={() => void load()}><ArrowRight size={16} />Try again</button></div> : <div className="dashboard-loading" aria-busy="true"><div className="loading-heading"><span className="skeleton skeleton-eyebrow" /><span className="skeleton skeleton-title" /><span className="skeleton skeleton-description" /></div><div className="metrics-grid">{[0, 1, 2, 3].map(n => <div className="metric-card loading-card" key={n}><span className="skeleton skeleton-label" /><span className="skeleton skeleton-number" /><span className="skeleton skeleton-label" /></div>)}</div><div className="bureau-grid">{BUREAUS.map(b => <div className="bureau-card" key={b.id}><BureauLogo bureau={b.id} /><span className="skeleton skeleton-label" /></div>)}</div><div className="loading-main"><LoaderCircle size={25} className="spin" /><span>Making room for your next chapter…</span></div></div>}</main>
    </div>
    {data && wizard && <NewDisputeModal data={data} initialBureau={wizard.bureau} initialMethod={wizard.method} onClose={() => setWizard(null)} onComplaintOption={openNewComplaint} onCreated={(result, id) => { setData(result); setWizard(null); setDetailId(id); notify("Your dispute draft is ready. Review it before submitting."); }} />}
    {data && detail && !upload && <DisputeDetail key={detail.id} data={data} dispute={detail} onClose={() => setDetailId(null)} onData={setData} onToast={notify} onUpload={openUpload} onComplaintOption={channel => openNewComplaint(channel, detail.isSample ? undefined : detail.id)} />}
    {data && complaintForm && <ComplaintFormModal key={complaintForm.editingId ?? `${complaintForm.channel}-${complaintForm.relatedDisputeId}`} data={data} initialChannel={complaintForm.channel} relatedDisputeId={complaintForm.relatedDisputeId} editing={editingComplaint} onClose={() => { if (complaintForm.editingId) setComplaintId(complaintForm.editingId); setComplaintForm(null); }} onSaved={(result, id) => { setData(result); setComplaintForm(null); setComplaintId(id); notify(editingComplaint ? "Complaint draft updated. Nothing was sent to the portal." : "Complaint draft saved. Review and submit on the official portal."); }} />}
    {data && complaint && !upload && !complaintForm && <ComplaintDetail key={complaint.id} data={data} complaint={complaint} onClose={() => setComplaintId(null)} onData={setData} onToast={notify} onUpload={openUpload} onEdit={() => { setComplaintId(null); setComplaintForm({ editingId: complaint.id }); }} onDispute={openDetail} />}
    {data && reviewDocument && <ReportReview key={reviewDocument.id} documentId={reviewDocument.id} documentName={reviewDocument.name} onClose={() => setReviewDocument(null)} onData={setData} onToast={notify} onUpload={openUpload} onOpenDispute={setPendingDisputeId} />}
    {data && upload && <UploadModal data={data} options={upload} onClose={() => { if (upload.complaintId) setComplaintId(upload.complaintId); else if (upload.disputeId) setDetailId(upload.disputeId); setUpload(null); }} onUploaded={result => { setData(result); setUpload(null); const report = result.documents.find(file => file.kind === "report"); if (upload.kind === "report" && report) { setReviewDocument({ id: report.id, name: report.name }); notify("Report saved. Select the items you want to dispute."); } else { if (upload.complaintId) setComplaintId(upload.complaintId); if (upload.disputeId) setDetailId(upload.disputeId); notify("Document saved. Attach it separately on the official portal."); } }} />}
    {article && <Modal title={article.title} subtitle="A little know-how for your next step." onClose={() => setArticleId(null)} wide><ArticleContent article={article} /></Modal>}
    {activityOpen && <Modal title="Every step tells a story." subtitle="Your dispute and complaint activity, from the first draft onward." onClose={() => setActivityOpen(false)}><div className="modal-body history-list">{data?.activities.map(a => <button key={a.id} className="activity-row" onClick={() => { if (a.disputeId || a.complaintId || a.requestId) openActivity(a); }}><span className={`activity-symbol ${a.type === "resolved" ? "tinted-green" : a.type === "document" ? "tinted-blue" : "tinted-purple"}`}>{a.type === "resolved" ? <Check size={16} /> : a.type === "document" ? <FolderOpen size={16} /> : a.complaintId ? <Handshake size={16} /> : <FileText size={16} />}</span><span className="activity-text"><strong>{a.title}</strong><span>{a.description}</span><time>{new Date(a.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></span>{(a.disputeId || a.complaintId || a.requestId) && <ChevronRight size={15} />}</button>)}{!data?.activities.length && <p className="body-copy">Your first step will appear here.</p>}</div></Modal>}
    {helpOpen && <Modal title="A little help. A clearer path." subtitle="Find the right information for your next step." onClose={() => setHelpOpen(false)}><div className="modal-body help-body"><div className="help-callout"><ShieldCheck size={25} /><p>BerheRepairShop helps you prepare and track. Official bureaus, CFPB, and BBB handle their own submissions and responses. Nothing is submitted automatically.</p></div><button className="help-link" onClick={() => { setHelpOpen(false); setArticleId("first"); }}><BookOpen size={21} /><span><strong>Start with the essentials</strong><span>A simple guide to your first dispute</span></span><ArrowRight size={17} /></button><button className="help-link" onClick={() => { setHelpOpen(false); navigate("companies"); }}><BookOpen size={21} /><span><strong>Full CFPB 2025 company directory</strong><span>Report, dispute, and freeze guidance across 11 markets</span></span><ArrowRight size={17} /></button><button className="help-link" onClick={() => { setHelpOpen(false); navigate("bureaus"); }}><Landmark size={21} /><span><strong>Choose your bureau submission route</strong><span>Online login, or no-login mail and phone options</span></span><ArrowRight size={17} /></button><button className="help-link" onClick={() => { setHelpOpen(false); navigate("specialty"); }}><FileSearch size={21} /><span><strong>Specialty reports and dispute routes</strong><span>Early Warning, DataX, LexisNexis & The Work Number</span></span><ArrowRight size={17} /></button><button className="help-link" onClick={() => { setHelpOpen(false); navigate("protection"); }}><Snowflake size={21} /><span><strong>ChexSystems, Clarity & bureau freezes</strong><span>Official request links—not dispute submissions</span></span><ArrowRight size={17} /></button><button className="help-link" onClick={() => { setHelpOpen(false); navigate("complaints"); }}><Handshake size={21} /><span><strong>Explore CFPB & BBB complaints</strong><span>Additional channels when you need another path</span></span><ArrowRight size={17} /></button><a className="help-link" href="https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/" target="_blank" rel="noopener noreferrer"><CircleHelp size={21} /><span><strong>Find trusted consumer guidance</strong><span>Free credit-report resources from the CFPB</span></span><ArrowUpRight size={17} /></a><div className="info-note"><CircleHelp size={18} /><p>Only dispute information you genuinely believe is inaccurate or incomplete. This app does not provide legal advice or guarantee a credit-score increase.</p></div></div></Modal>}
    {toast && <div className={`toast toast--${toast.type}`} role={toast.type === "error" ? "alert" : "status"}>{toast.type === "success" ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}<span>{toast.message}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={15} /></button></div>}
  </div>;
}
