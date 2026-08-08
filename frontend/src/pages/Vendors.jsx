import { useEffect, useState } from "react";
import api from "../lib/api";
import { Star, ExternalLink, Sparkles, Copy, Check } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { toast } from "sonner";
import useSeo from "../hooks/useSeo";

const SECTIONS = [
  { key: "peptides",    label: "Peptides",    description: "Trusted research peptide vendors" },
  { key: "skincare",    label: "Skin Care",   description: "Topicals, serums, cosmetic peptides" },
  { key: "supplements", label: "Supplements", description: "Health & wellness picks" },
  { key: "telehealth",  label: "Telehealth",  description: "Prescription & clinic access" },
  { key: "clothes",     label: "Clothes",     description: "Comfort & style favorites" },
];

const catOf = (v) => {
  const tags = (v.tags || []).map((t) => t.toLowerCase());
  if (tags.some((t) => t.includes("telehealth") || t.includes("tele-health") || t === "clinic" || t === "rx")) return "telehealth";
  if (tags.some((t) => t.includes("skin"))) return "skincare";
  if (tags.some((t) => t === "supplements")) return "supplements";
  if (tags.some((t) => t === "clothes")) return "clothes";
  return "peptides";
};

export default function Vendors() {
  useSeo({
    title: "Vendor Directory",
    description: "Trusted research peptide vendors, COA-verified, with exclusive The Optimized Society discount codes and live promo badges.",
    path: "/vendors",
  });
  const [vendors, setVendors] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [tab, setTab] = useState("peptides");

  useEffect(() => {
    api.get("/vendors").then(({ data }) => setVendors(data)).catch(() => setVendors([]));
    api.get("/promotions").then(({ data }) => setPromotions(data || [])).catch(() => setPromotions([]));
  }, []);

  // Map vendor_id -> best active promotion
  const nowIso = new Date().toISOString();
  const promoByVendor = {};
  for (const p of promotions) {
    if (!p.active) continue;
    if (p.end_date && p.end_date < nowIso) continue;
    if (p.start_date && p.start_date > nowIso) continue;
    const existing = promoByVendor[p.vendor_id];
    if (!existing || (p.discount_percent || 0) > (existing.discount_percent || 0)) {
      promoByVendor[p.vendor_id] = p;
    }
  }

  // Group vendors by category, preserving backend order
  const grouped = {};
  SECTIONS.forEach((s) => { grouped[s.key] = []; });
  (vendors || []).forEach((v) => { grouped[catOf(v)].push(v); });

  const activeSection = SECTIONS.find((s) => s.key === tab) || SECTIONS[0];
  const activeRows = grouped[activeSection.key] || [];

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16">
      <div className="flex items-end justify-between border-b border-[#0A0A0A] pb-6 mb-8">
        <div>
          <div className="eyebrow text-[#B87A6A] mb-3">Directory · 01</div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter">Vendors</h1>
        </div>
        <div className="hidden md:block text-right">
          <div className="text-xs font-mono uppercase tracking-[0.25em] text-[#5C5C5C]">
            Vendors listed
          </div>
          <div className="text-4xl font-mono font-bold">
            {vendors ? String(vendors.length).padStart(2, "0") : "--"}
          </div>
        </div>
      </div>

      {/* Category tabs — one per section, no 'All' */}
      <div className="flex flex-wrap gap-0 border border-[#0A0A0A] mb-8 w-fit max-w-full overflow-x-auto" data-testid="vendor-filter">
        {SECTIONS.map((s) => {
          const count = grouped[s.key]?.length || 0;
          return (
            <button
              key={s.key}
              onClick={() => setTab(s.key)}
              data-testid={`filter-${s.key}`}
              className={`px-4 sm:px-5 py-2 text-xs font-mono uppercase tracking-[0.25em] border-r border-[#0A0A0A] last:border-r-0 whitespace-nowrap ${
                tab === s.key ? "bg-[#B87A6A] text-white" : "bg-white hover:bg-[#F5DED4]"
              }`}
            >
              {s.label} {count > 0 && <span className="opacity-70 ml-1">({count})</span>}
            </button>
          );
        })}
      </div>

      {!vendors && (
        <div className="space-y-2 border border-[#E5E5E5]">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-none" />
          ))}
        </div>
      )}

      {vendors && (
        <section
          key={activeSection.key}
          data-testid={`vendor-section-${activeSection.key}`}
        >
          <div className="mb-4 flex items-end justify-between gap-3 border-b border-[#B87A6A] pb-2">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0A0A0A]">
                {activeSection.label}
              </h2>
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#5C5C5C] mt-0.5">
                {activeSection.description}
              </div>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#B87A6A]">
              {String(activeRows.length).padStart(2, "0")} listed
            </div>
          </div>

          {activeRows.length === 0 ? (
            <p className="font-mono text-sm text-[#5C5C5C] py-8">
              No vendors in this section yet. Check back soon.
            </p>
          ) : (
            <div className="divide-y divide-[#E8CDBF] border border-[#E8CDBF] bg-white">
              {activeRows.map((v) => (
                <VendorRow key={v.id} v={v} promo={promoByVendor[v.id]} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function VendorRow({ v, promo }) {
  const [copied, setCopied] = useState(false);
  const copyCode = (code) => {
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`Code "${code}" copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Couldn't copy code"); }
  };

  return (
    <div
      className="p-4 sm:p-5 flex items-start gap-4 hover:bg-[#FDF8F3] transition-colors"
      data-testid={`vendor-card-${v.slug}`}
    >
      {/* Small logo */}
      <div className="flex-shrink-0 pt-1">
        {v.logo_url ? (
          <img
            src={v.logo_url}
            alt={`${v.name} logo`}
            loading="lazy"
            onError={(e) => {
              try {
                const host = new URL(v.affiliate_url).hostname.replace(/^www\./, "");
                const fallback = `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
                if (e.currentTarget.src !== fallback) {
                  e.currentTarget.src = fallback;
                  return;
                }
              } catch (_) { /* noop */ }
              e.currentTarget.style.display = "none";
            }}
            className="h-12 w-12 sm:h-14 sm:w-14 object-contain rounded-full bg-white border border-[#E8CDBF] p-1"
            data-testid={`vendor-logo-${v.slug}`}
          />
        ) : (
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#F5DED4] flex items-center justify-center font-bold text-[#B87A6A]">
            {v.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Middle */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="text-lg sm:text-xl font-black tracking-tight text-[#0A0A0A] truncate">
            {v.name}
          </h3>
          {v.featured && (
            <Star size={12} className="text-[#B87A6A] fill-[#B87A6A] flex-shrink-0" />
          )}
          {v.promo_badge && (
            <span
              data-testid={`vendor-promo-${v.slug}`}
              className="inline-flex items-center px-2 py-0.5 rounded bg-[#FFE700] text-[#0A0A0A] font-mono font-bold text-[9px] tracking-wider"
            >
              {v.promo_badge}
            </span>
          )}
        </div>
        {v.description && (
          <p className="text-xs text-[#5C5C5C] leading-snug line-clamp-2 mb-2">
            {v.description}
          </p>
        )}

        {/* PROMINENT active promo block */}
        {promo && (
          <div
            className="relative my-2 p-3 border-2 border-[#B87A6A] bg-gradient-to-r from-[#F5DED4] via-white to-[#F5DED4] shadow-[0_2px_10px_rgba(184,122,106,0.2)]"
            data-testid={`vendor-active-promo-${v.slug}`}
          >
            <div className="absolute -top-2 -left-1 inline-flex items-center gap-1 px-2 py-0.5 bg-[#B87A6A] text-white text-[9px] font-mono font-bold uppercase tracking-widest">
              <Sparkles size={10} /> Live Promo
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {promo.discount_percent > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded bg-green-600 text-white font-mono font-black text-sm tracking-wider">
                  {promo.discount_percent}% OFF
                </span>
              )}
              {promo.promo_code && (
                <button
                  type="button"
                  onClick={() => copyCode(promo.promo_code)}
                  data-testid={`vendor-active-promo-copy-${v.slug}`}
                  title="Click to copy"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A0A0A] hover:bg-[#B87A6A] text-white font-mono text-xs font-bold tracking-wider transition-colors"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {promo.promo_code}
                </button>
              )}
            </div>
            {promo.description && (
              <div
                className="mt-2 text-sm text-[#0A0A0A] font-bold leading-snug"
                data-testid={`vendor-active-promo-desc-${v.slug}`}
              >
                {promo.description}
              </div>
            )}
            {(promo.start_date || promo.end_date) && (
              <div className="mt-1.5 text-[10px] font-mono uppercase tracking-widest text-[#5C5C5C]">
                {promo.start_date && (
                  <span>starts {new Date(promo.start_date).toLocaleDateString()}</span>
                )}
                {promo.start_date && promo.end_date && <span> · </span>}
                {promo.end_date && (
                  <span>ends {new Date(promo.end_date).toLocaleDateString()}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Peptide nickname guide — visible bubble (no hidden expander) */}
        {v.nickname_notes && (
          <div
            className="mb-2 border border-[#B87A6A] bg-[#FBF3EC] rounded-lg overflow-hidden"
            data-testid={`vendor-nickname-guide-${v.slug}`}
          >
            <div className="px-3 py-1.5 bg-[#B87A6A] text-white font-mono text-[10px] uppercase tracking-widest font-bold">
              🏷 Peptide Nickname Guide · what {v.name} calls them
            </div>
            <pre className="px-3 py-2 whitespace-pre-wrap font-mono text-xs text-[#0A0A0A] leading-relaxed max-h-40 overflow-y-auto">
              {v.nickname_notes}
            </pre>
          </div>
        )}

        <div className="flex flex-wrap gap-1 items-center">
          {v.tags?.slice(0, 3).map((t) => (
            <Badge
              key={t}
              variant="outline"
              className="rounded-full border-[#E8CDBF] font-mono text-[9px] uppercase tracking-wider px-2 py-0 h-5"
            >
              {t}
            </Badge>
          ))}
        </div>
      </div>

      {/* Right: code + visit */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {v.discount_code && (
          <div
            data-testid={`vendor-code-${v.slug}`}
            className="inline-flex items-center gap-1.5 bg-[#FBF3EC] border border-[#E8CDBF] px-2 py-1 rounded-full whitespace-nowrap"
          >
            <span className="font-mono text-[8px] uppercase tracking-widest text-[#5C5C5C] hidden sm:inline">
              Code
            </span>
            <span className="font-mono font-bold text-xs text-[#B87A6A] tracking-wider">
              {v.discount_code}
            </span>
          </div>
        )}
        <a
          href={v.affiliate_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          data-testid={`vendor-visit-${v.slug}`}
          className="bg-[#0A0A0A] hover:bg-[#B87A6A] text-white px-3 py-2 sm:px-4 sm:py-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest rounded-full transition-colors"
        >
          Visit <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
