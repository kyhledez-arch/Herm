import { CFPB_COMPANIES, CFPB_MARKETS, CFPB_SOURCE_URL } from "@/lib/cfpb-directory";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") ?? "").slice(0, 200).toLowerCase();
  const market = params.get("market") ?? "all", service = params.get("service") ?? "all";
  if (market !== "all" && !CFPB_MARKETS.includes(market)) return Response.json({ error: "Choose a valid market." }, { status: 400 });
  if (!["all", "report", "dispute", "freeze", "unknown"].includes(service)) return Response.json({ error: "Choose a valid directory service." }, { status: 400 });
  const page = Number(params.get("page") ?? 1), pageSize = Number(params.get("pageSize") ?? 12);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return Response.json({ error: "Choose valid pagination values." }, { status: 400 });
  const filtered = CFPB_COMPANIES.filter(company => (market === "all" || company.market === market) && (service !== "freeze" || company.freezeListed) && (service !== "unknown" || !company.freezeListed) && `${company.name} ${company.market} ${company.description}`.toLowerCase().includes(query)).sort((a, b) => a.name.localeCompare(b.name));
  return Response.json({ companies: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, allCompanyCount: CFPB_COMPANIES.length, markets: CFPB_MARKETS, source: { year: 2025, url: CFPB_SOURCE_URL, note: "Dated source snapshot. Verify current provider contacts, eligibility, and methods before requesting a service." }, page, pageSize });
}
