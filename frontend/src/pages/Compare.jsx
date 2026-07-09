import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../lib/api";
import { ChevronDown, ChevronUp, ExternalLink, Copy, Check, Search } from "lucide-react";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import useSeo from "../hooks/useSeo";

const SITE = "https://optimizedsociety.com";

/* -------- helpers -------- */
const slugify = (s = "") => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const FORMS = [
  { key: "all", label: "All forms" },
  { key: "vial", label: "Vials" },
  { key: "capsule", label: "Capsules" },
  { key: "liquid", label: "Liquid" },
  { key: "nasal", label: "Nasal Spray" },
  { key: "skincare", label: "Skin Care" },
  { key: "aminos", label: "Aminos" },
];

const POPULAR = [
  "Tirzepatide", "Retatrutide", "GHK-Cu", "Glutathione",
  "Selank", "Semax", "MOTS-c", "KLOW", "Glow",
];

const PAGE_SIZE = 20;

/* -------- fuzzy matcher -------- */
function fuzzyMatch(q, str) {
  if (!q) return true;
  q = q.toLowerCase(); str = str.toLowerCase();
  if (str.includes(q)) return true;
  // simple sub-sequence match (all chars of q appear in order in str)
  let i = 0;
  for (const ch of str) { if (ch === q[i]) i++; if (i === q.length) return true; }
  return false;
}

/* ---------------- MAIN ---------------- */
export default function Compare() {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [exactOnly, setExactOnly] = useState(false);
  const [form, setForm] = useState("all");
  const [expanded, setExpanded] = useState(new Set());
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(null);

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const focusParam = (queryParams.get("peptide") || "").trim().toLowerCase();

  useEffect(() => {
    api.get("/comparison").then(({ data }) => setData(data)).catch(() => setData({ peptides: [], vendors: [], prices: [], promotions: [] }));
  }, []);

  // Lookup maps
  const vendorMap = useMemo(() => {
    const m = {}; (data?.vendors || []).forEach(v => m[v.id] = v); return m;
  }, [data]);

  const promoByVendor = useMemo(() => {
    const m = {}; (data?.promotions || []).forEach(p => { if (p.active) m[p.vendor_id] = p; }); return m;
  }, [data]);

  const pricesByPeptide = useMemo(() => {
    const m = {};
    (data?.prices || []).forEach(p => {
      if (!p.price_usd || p.price_usd <= 0) return;
      if (p.available === false) return;
      const v = vendorMap[p.vendor_id];
      if (!v || v.status === "unavailable") return;
      (m[p.peptide_id] = m[p.peptide_id] || []).push(p);
    });
    return m;
  }, [data, vendorMap]);

  const priceWithPromo = (price, vendor) => {
    const promo = promoByVendor[vendor.id];
    if (!promo || !promo.discount_percent) return { final: price, original: price, promo: null };
    const final = +(price * (1 - promo.discount_percent / 100)).toFixed(2);
    return { final, original: price, promo };
  };

  const visiblePeptides = useMemo(() => {
    if (!data) return [];
    let arr = (data.peptides || []).filter(p => (pricesByPeptide[p.id] || []).length > 0);
    // form filter — match if peptide category = form OR any price.form = form
    if (form !== "all") {
      arr = arr.filter(p => {
        if ((p.category || "").toLowerCase() === form) return true;
        return (pricesByPeptide[p.id] || []).some(pr => (pr.form || "vial") === form);
      });
    }
    if (search.trim()) {
      const q = search.trim();
      arr = arr.filter(p => {
        const strings = [p.name, ...(p.aliases || [])];
        if (exactOnly) return strings.some(s => s.toLowerCase().includes(q.toLowerCase()));
        return strings.some(s => fuzzyMatch(q, s));
      });
    }
    // sort by cheapest available price/mg
    const priceMg = (pep) => {
      const prs = pricesByPeptide[pep.id] || [];
      return Math.min(...prs.map(p => {
        const v = vendorMap[p.vendor_id];
        const { final } = priceWithPromo(p.price_usd, v || {});
        return p.size_mg > 0 ? final / p.size_mg : Infinity;
      }));
    };
    arr.sort((a, b) => priceMg(a) - priceMg(b));
    return arr;
  }, [data, pricesByPeptide, form, search, exactOnly, promoByVendor, vendorMap]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(visiblePeptides.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageItems = visiblePeptides.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, form, exactOnly]);

  // Auto-expand focused peptide from ?peptide= param
  useEffect(() => {
    if (!data || !focusParam) return;
    const pep = data.peptides.find(p => slugify(p.name) === focusParam || p.name.toLowerCase() === focusParam);
    if (pep) setExpanded(new Set([pep.id]));
  }, [data, focusParam]);

  const toggle = (id) => setExpanded(prev => {
    const s = new Set(prev);
    if (s.has(id)) s.delete(id); else s.add(id);
    return s;
  });

  const copyCode = (code) => {
    if (!code) return;
    const done = () => { setCopied(code); toast.success(`Code "${code}" copied`); setTimeout(() => setCopied(null), 1500); };
    try {
      const p = navigator.clipboard && navigator.clipboard.writeText(code);
      if (p?.then) p.then(done).catch(() => {
        const ta = document.createElement("textarea"); ta.value = code; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); done();
      });
      else done();
    } catch { toast.error("Couldn't copy code"); }
  };

  useSeo({
    title: "Peptide Price Comparison",
    description: "Compare research peptide prices across trusted vendors. Live pricing, promo discounts applied automatically, sorted cheapest first.",
    path: "/compare",
  });

  if (!data) return <div className="max-w-7xl mx-auto px-6 py-16 font-mono text-sm text-[#5C5C5C]">Loading…</div>;

  if (!(data.vendors || []).length || !(data.peptides || []).length) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <div className="eyebrow text-[#B87A6A] mb-3">Peptide Price Tool</div>
        <h1 className="text-4xl font-black mb-4">No vendors currently listed</h1>
        <p className="text-sm text-[#5C5C5C]">Check back soon — new vendors and prices are added weekly.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
      {/* Header */}
      <div className="border-b border-[#0A0A0A] pb-6 mb-6">
        <div className="eyebrow text-[#B87A6A] mb-3">Tool · 03</div>
        <h1 className="text-4xl lg:text-5xl font-black tracking-tighter">Peptide Price Tool</h1>
        <p className="text-sm text-[#5C5C5C] mt-2 max-w-2xl">
          Live vendor pricing with active promo codes applied — sorted cheapest per mg. Click any row to expand and see every vendor.
        </p>
      </div>

      {/* Vendor strip — clickable discount codes */}
      <VendorStrip vendors={data.vendors} copyCode={copyCode} copied={copied} />

      {/* Active Promotions strip */}
      <PromotionsStrip
        promotions={data.promotions || []}
        vendorMap={vendorMap}
        copyCode={copyCode}
        copied={copied}
      />

      {/* Form filter pills */}
      <div className="flex flex-wrap gap-2 mb-4" data-testid="form-filters">
        {FORMS.map(f => (
          <button
            key={f.key}
            onClick={() => setForm(f.key)}
            data-testid={`form-${f.key}`}
            className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider border transition ${
              form === f.key
                ? "bg-[#B87A6A] text-white border-[#B87A6A] shadow-[0_4px_14px_rgba(184,122,106,0.35)]"
                : "bg-white text-[#0A0A0A] border-[#E8CDBF] hover:bg-[#FBF3EC]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Popular pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#5C5C5C] mr-1">Popular:</span>
        {POPULAR.map(p => (
          <button
            key={p}
            onClick={() => setSearch(p)}
            data-testid={`pop-${slugify(p)}`}
            className="px-3 py-1.5 rounded-full text-[11px] font-mono bg-[#F5DED4] text-[#0A0A0A] border border-[#E8CDBF] hover:bg-[#B87A6A] hover:text-white hover:border-[#B87A6A] transition"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Search + exact-match toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5C5C] pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search peptides (e.g. Semaglutide, BPC-157, MOTS-c)"
            data-testid="compare-search"
            className="rounded-full border-[#0A0A0A] font-mono pl-10 h-11"
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-mono text-[#0A0A0A] whitespace-nowrap">
          <input
            type="checkbox"
            checked={exactOnly}
            onChange={(e) => setExactOnly(e.target.checked)}
            data-testid="exact-toggle"
            className="h-4 w-4 accent-[#B87A6A]"
          />
          Exact match only
        </label>
      </div>

      {/* Result summary */}
      <div className="text-xs font-mono uppercase tracking-widest text-[#5C5C5C] mb-4" data-testid="results-count">
        Showing {pageItems.length} of {visiblePeptides.length} peptides
      </div>

      {/* Result cards */}
      <div className="space-y-3">
        {pageItems.length === 0 && (
          <div className="text-center py-12 font-mono text-sm text-[#5C5C5C]">
            No peptides match your filters. Try clearing search or switching form.
          </div>
        )}
        {pageItems.map(pep => (
          <PeptideAccordion
            key={pep.id}
            peptide={pep}
            prices={pricesByPeptide[pep.id] || []}
            vendorMap={vendorMap}
            promoByVendor={promoByVendor}
            expanded={expanded.has(pep.id)}
            onToggle={() => toggle(pep.id)}
            copyCode={copyCode}
            copied={copied}
            formFilter={form}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-10">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            data-testid="page-prev"
            className="px-4 py-2 rounded-full bg-white border border-[#0A0A0A] font-mono text-xs uppercase tracking-widest disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="font-mono text-xs text-[#5C5C5C]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            data-testid="page-next"
            className="px-4 py-2 rounded-full bg-white border border-[#0A0A0A] font-mono text-xs uppercase tracking-widest disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Accordion card ---------------- */
function PeptideAccordion({ peptide, prices, vendorMap, promoByVendor, expanded, onToggle, copyCode, copied, formFilter }) {
  const rows = useMemo(() => {
    let arr = prices.map(p => {
      const v = vendorMap[p.vendor_id]; if (!v) return null;
      const promo = promoByVendor[v.id] || null;
      const finalPrice = promo?.discount_percent ? +(p.price_usd * (1 - promo.discount_percent / 100)).toFixed(2) : p.price_usd;
      return {
        price: p,
        vendor: v,
        promo,
        finalPrice,
        pricePerMg: p.size_mg > 0 ? finalPrice / p.size_mg : Infinity,
      };
    }).filter(Boolean);
    if (formFilter !== "all") {
      // If the peptide itself is tagged with this category, show ALL its rows.
      // Otherwise only show price rows whose form matches (physical form filter).
      const categoryMatch = (peptide.category || "").toLowerCase() === formFilter;
      if (!categoryMatch) {
        arr = arr.filter(r => (r.price.form || "vial") === formFilter);
      }
    }
    arr.sort((a, b) => a.pricePerMg - b.pricePerMg);
    return arr;
  }, [prices, vendorMap, promoByVendor, formFilter, peptide.category]);

  if (rows.length === 0) return null;
  const best = rows[0];
  const cheapestFrom = best.finalPrice;
  const cheapestPerMg = best.pricePerMg;
  const vendorCount = new Set(rows.map(r => r.vendor.id)).size;

  return (
    <div
      className="border border-[#E8CDBF] bg-white rounded-none overflow-hidden"
      data-testid={`card-${peptide.slug || slugify(peptide.name)}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 p-4 hover:bg-[#FBF3EC] transition text-left"
        data-testid={`card-header-${peptide.slug || slugify(peptide.name)}`}
      >
        <div className="flex-1 min-w-0">
          <div className="text-base lg:text-lg font-black tracking-tight text-[#0A0A0A] truncate">
            {peptide.name}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#5C5C5C] mt-0.5">
            {vendorCount} vendor{vendorCount > 1 ? "s" : ""} · from ${cheapestPerMg.toFixed(2)}/mg
          </div>
        </div>
        <div className="text-right whitespace-nowrap">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#B87A6A]">From</div>
          <div className="text-xl font-black text-[#0A0A0A]">${cheapestFrom.toFixed(2)}</div>
        </div>
        {expanded ? <ChevronUp size={18} className="flex-shrink-0" /> : <ChevronDown size={18} className="flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-[#E8CDBF] bg-[#FDF8F3]" data-testid={`card-body-${peptide.slug || slugify(peptide.name)}`}>
          {/* Mobile: stacked card layout — no horizontal scroll needed */}
          <div className="sm:hidden divide-y divide-[#F0E4DA]">
            {rows.map((r, i) => (
              <div key={r.price.id} className={`p-3 ${i === 0 ? "bg-[#F5DED4]" : ""}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-[#0A0A0A] truncate">{r.vendor.name}</div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#5C5C5C]">
                      {r.price.size_mg}mg · {r.price.form || "vial"}
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    {r.promo?.discount_percent ? (
                      <div>
                        <div className="text-[10px] line-through text-[#A0A0A0]">${r.price.price_usd.toFixed(2)}</div>
                        <div className="text-base font-black text-green-700">${r.finalPrice.toFixed(2)}</div>
                      </div>
                    ) : (
                      <div className="text-base font-black text-[#0A0A0A]">${r.price.price_usd.toFixed(2)}</div>
                    )}
                    <div className="text-[10px] font-mono text-[#5C5C5C]">${r.pricePerMg.toFixed(2)}/mg</div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1 flex-wrap">
                    {r.promo?.discount_percent > 0 && (
                      <span
                        className="inline-block px-1.5 py-0.5 rounded bg-green-100 text-green-800 text-[9px] font-bold tracking-wider"
                        data-testid={`promo-badge-mobile-${r.vendor.slug}`}
                      >
                        {r.promo.discount_percent}% OFF
                      </span>
                    )}
                    {r.promo?.promo_code ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copyCode(r.promo.promo_code); }}
                        data-testid={`copy-mobile-${r.vendor.slug}-${r.promo.promo_code}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F5DED4] hover:bg-[#B87A6A] hover:text-white text-[10px] font-bold text-[#B87A6A] tracking-wider transition"
                      >
                        {copied === r.promo.promo_code ? <Check size={10} /> : <Copy size={10} />}
                        {r.promo.promo_code}
                      </button>
                    ) : r.vendor.discount_code ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copyCode(r.vendor.discount_code); }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F5DED4] hover:bg-[#B87A6A] hover:text-white text-[10px] font-bold text-[#B87A6A] tracking-wider transition"
                      >
                        {copied === r.vendor.discount_code ? <Check size={10} /> : <Copy size={10} />}
                        {r.vendor.discount_code}
                      </button>
                    ) : null}
                  </div>
                  <a
                    href={r.price.product_url || r.vendor.affiliate_url}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    data-testid={`go-mobile-${r.vendor.slug}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0A0A0A] hover:bg-[#B87A6A] text-white text-[10px] uppercase tracking-wider transition font-bold"
                  >
                    Go <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: full table */}
          <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs font-mono min-w-[720px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-[#5C5C5C] border-b border-[#E8CDBF]">
                <th className="text-left px-4 py-2">Vendor</th>
                <th className="text-left px-3 py-2">Size</th>
                <th className="text-left px-3 py-2">Form</th>
                <th className="text-left px-3 py-2">Price</th>
                <th className="text-left px-3 py-2">Price / mg</th>
                <th className="text-left px-3 py-2">Code</th>
                <th className="text-right px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.price.id} className={`border-b border-[#F0E4DA] ${i === 0 ? "bg-[#F5DED4]" : ""}`}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-bold text-sm text-[#0A0A0A]">{r.vendor.name}</div>
                    {r.promo?.discount_percent > 0 && (
                      <span
                        className="inline-block mt-1 px-1.5 py-0.5 rounded bg-green-100 text-green-800 text-[9px] font-bold tracking-wider"
                        data-testid={`promo-badge-${r.vendor.slug}`}
                      >
                        {r.promo.discount_percent}% OFF
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">{r.price.size_mg}mg</td>
                  <td className="px-3 py-3 align-top uppercase text-[10px] tracking-widest">{r.price.form || "vial"}</td>
                  <td className="px-3 py-3 align-top">
                    {r.promo?.discount_percent ? (
                      <div>
                        <span className="line-through text-[#A0A0A0] mr-1">${r.price.price_usd.toFixed(2)}</span>
                        <span className="font-bold text-green-700">${r.finalPrice.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="font-bold">${r.price.price_usd.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">${r.pricePerMg.toFixed(2)}</td>
                  <td className="px-3 py-3 align-top">
                    {r.promo?.promo_code ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copyCode(r.promo.promo_code); }}
                        data-testid={`copy-${r.vendor.slug}-${r.promo.promo_code}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F5DED4] hover:bg-[#B87A6A] hover:text-white text-[10px] font-bold text-[#B87A6A] tracking-wider transition"
                        title="Click to copy"
                      >
                        {copied === r.promo.promo_code ? <Check size={10} /> : <Copy size={10} />}
                        {r.promo.promo_code} · {r.promo.discount_percent}%
                      </button>
                    ) : r.vendor.discount_code ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copyCode(r.vendor.discount_code); }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#F5DED4] hover:bg-[#B87A6A] hover:text-white text-[10px] font-bold text-[#B87A6A] tracking-wider transition"
                      >
                        {copied === r.vendor.discount_code ? <Check size={10} /> : <Copy size={10} />}
                        {r.vendor.discount_code}
                      </button>
                    ) : <span className="text-[#C0C0C0]">—</span>}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <a
                      href={r.price.product_url || r.vendor.affiliate_url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      data-testid={`go-${r.vendor.slug}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0A0A0A] hover:bg-[#B87A6A] text-white text-[10px] uppercase tracking-wider transition"
                    >
                      Go <ExternalLink size={10} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Vendor strip (top of price tool) ---------------- */
function VendorStrip({ vendors, copyCode, copied }) {
  // Filter to comparison-enabled vendors that have a discount code
  const rows = useMemo(() => {
    return (vendors || [])
      .filter(v => v && v.discount_code && v.comparison_enabled !== false)
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }, [vendors]);

  if (!rows.length) return null;

  return (
    <div className="mb-6 border border-[#E8CDBF] bg-[#FDF8F3] p-3" data-testid="vendor-strip">
      <div className="text-[10px] font-mono uppercase tracking-widest text-[#B87A6A] mb-2 flex items-center gap-2">
        <span className="font-bold">Vendor Codes</span>
        <span className="text-[#5C5C5C] normal-case tracking-normal">· click to copy · tap logo to visit</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {rows.map(v => (
          <div
            key={v.id}
            className="inline-flex items-center gap-2 bg-white border border-[#E8CDBF] hover:border-[#B87A6A] px-2 py-1.5 transition"
            data-testid={`strip-${v.slug}`}
          >
            <a
              href={v.affiliate_url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              title={`Visit ${v.name}`}
              className="flex items-center gap-1.5"
            >
              {v.logo_url ? (
                <img
                  src={v.logo_url}
                  alt={v.name}
                  className="h-6 w-6 rounded-full object-contain bg-white flex-shrink-0"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-[#F5DED4] flex items-center justify-center text-[10px] font-bold text-[#B87A6A]">
                  {v.name.charAt(0)}
                </div>
              )}
              <span className="text-xs font-bold text-[#0A0A0A] hover:text-[#B87A6A] whitespace-nowrap">
                {v.name}
              </span>
            </a>
            <button
              type="button"
              onClick={() => copyCode(v.discount_code)}
              data-testid={`strip-code-${v.slug}`}
              title={`Copy code ${v.discount_code}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5DED4] hover:bg-[#B87A6A] hover:text-white text-[10px] font-bold text-[#B87A6A] tracking-widest transition cursor-pointer"
            >
              {copied === v.discount_code ? <Check size={10} /> : <Copy size={10} />}
              {v.discount_code}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Promotions strip ---------------- */
function PromotionsStrip({ promotions, vendorMap, copyCode, copied }) {
  const now = new Date().toISOString();
  const active = (promotions || []).filter(
    p => p.active
      && (!p.end_date || p.end_date > now)
      && (!p.start_date || p.start_date <= now)
  );
  if (!active.length) return null;

  return (
    <div className="mb-6 border-2 border-[#B87A6A] bg-gradient-to-r from-[#F5DED4] via-white to-[#F5DED4] p-3" data-testid="promotions-strip">
      <div className="text-[10px] font-mono uppercase tracking-widest text-[#B87A6A] mb-2 flex items-center gap-2">
        <span className="font-bold">🔥 Active Promotions</span>
        <span className="text-[#5C5C5C] normal-case tracking-normal">· auto-applied at checkout · click code to copy</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {active.map(promo => {
          const v = vendorMap[promo.vendor_id];
          if (!v) return null;
          return (
            <div
              key={promo.id}
              className="inline-flex items-center gap-2 bg-white border border-[#E8CDBF] hover:border-[#B87A6A] px-3 py-2 transition"
              data-testid={`promo-strip-${v.slug}`}
            >
              {v.logo_url && (
                <img
                  src={v.logo_url}
                  alt={v.name}
                  className="h-6 w-6 rounded-full object-contain bg-white flex-shrink-0"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#0A0A0A] leading-tight">
                  {v.name}
                </div>
                {promo.description && (
                  <div className="text-[10px] font-mono text-[#5C5C5C] leading-tight mt-0.5">
                    {promo.description}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block px-1.5 py-0.5 rounded bg-green-100 text-green-800 text-[10px] font-bold tracking-wider">
                  {promo.discount_percent}% OFF
                </span>
                <button
                  type="button"
                  onClick={() => copyCode(promo.promo_code)}
                  data-testid={`promo-strip-code-${v.slug}`}
                  title="Click to copy code"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#B87A6A] hover:bg-[#0A0A0A] text-white text-[10px] font-bold tracking-widest transition cursor-pointer"
                >
                  {copied === promo.promo_code ? <Check size={10} /> : <Copy size={10} />}
                  {promo.promo_code}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
