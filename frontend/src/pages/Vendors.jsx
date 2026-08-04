import { useEffect, useState } from "react";
import api from "../lib/api";
import { Star, ExternalLink } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import useSeo from "../hooks/useSeo";

export default function Vendors() {
  useSeo({
    title: "Vendor Directory",
    description: "Trusted research peptide vendors, COA-verified, with exclusive The Optimized Society discount codes and live promo badges.",
    path: "/vendors",
  });
  const [vendors, setVendors] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    api.get("/vendors").then(({ data }) => setVendors(data)).catch(() => setVendors([]));
    api.get("/promotions").then(({ data }) => setPromotions(data || [])).catch(() => setPromotions([]));
  }, []);

  // Map vendor_id -> best active promotion (highest discount first)
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

  const isSkin = (v) => (v.tags || []).some((t) => t.toLowerCase().includes("skin"));
  const isSupp = (v) => (v.tags || []).some((t) => t.toLowerCase() === "supplements");
  const isClothes = (v) => (v.tags || []).some((t) => t.toLowerCase() === "clothes");
  const filtered = !vendors ? null : vendors
    .filter((v) =>
      filter === "All" ? true
      : filter === "Skin Care" ? isSkin(v)
      : filter === "Supplements" ? isSupp(v)
      : filter === "Clothes" ? isClothes(v)
      : (!isSkin(v) && !isSupp(v) && !isClothes(v))
    );
  // NOTE: honour backend `order` field — do not re-sort on client.

  const tabs = ["All", "Peptides", "Skin Care", "Supplements", "Clothes"];

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16">
      <div className="flex items-end justify-between border-b border-[#0A0A0A] pb-6 mb-12">
        <div>
          <div className="eyebrow text-[#B87A6A] mb-3">Directory · 01</div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter">Vendors</h1>
        </div>
        <div className="hidden md:block text-right">
          <div className="text-xs font-mono uppercase tracking-[0.25em] text-[#5C5C5C]">
            Vendors listed
          </div>
          <div className="text-4xl font-mono font-bold">{filtered ? String(filtered.length).padStart(2, "0") : "--"}</div>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-0 border border-[#0A0A0A] mb-10 w-fit" data-testid="vendor-filter">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            data-testid={`filter-${t.toLowerCase().replace(/\s+/g, "-")}`}
            className={`px-5 py-2 text-xs font-mono uppercase tracking-[0.25em] border-r border-[#0A0A0A] last:border-r-0 ${
              filter === t ? "bg-[#B87A6A] text-white" : "bg-white hover:bg-[#F5DED4]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {!vendors && (
        <div className="space-y-2 border border-[#E5E5E5]">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-none" />
          ))}
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <p className="font-mono text-sm">No vendors match this filter.</p>
      )}

      {filtered && filtered.length > 0 && (
        <div className="divide-y divide-[#E8CDBF] border border-[#E8CDBF] bg-white">
          {filtered.map((v) => {
            const activePromo = promoByVendor[v.id];
            return (
            <div
              key={v.id}
              className="p-4 sm:p-5 flex items-center gap-4 hover:bg-[#FDF8F3] transition-colors"
              data-testid={`vendor-card-${v.slug}`}
            >
              {/* Small logo */}
              <div className="flex-shrink-0">
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

              {/* Middle: name + description + tags */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#0A0A0A] truncate">
                    {v.name}
                  </h2>
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
                  <p className="text-xs text-[#5C5C5C] leading-snug line-clamp-2 mb-1">
                    {v.description}
                  </p>
                )}
                {activePromo && (
                  <div
                    className="mb-1.5 inline-flex items-center gap-1.5 flex-wrap"
                    data-testid={`vendor-active-promo-${v.slug}`}
                  >
                    {activePromo.discount_percent > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-100 text-green-800 font-mono font-bold text-[9px] tracking-wider">
                        {activePromo.discount_percent}% OFF
                      </span>
                    )}
                    {activePromo.discount_description && (
                      <span className="text-[10px] font-mono text-[#0A0A0A] font-bold">
                        {activePromo.discount_description}
                      </span>
                    )}
                    {activePromo.promo_code && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5DED4] font-mono text-[10px] font-bold text-[#B87A6A] tracking-wider">
                        code: {activePromo.promo_code}
                      </span>
                    )}
                    {activePromo.end_date && (
                      <span className="text-[9px] font-mono text-[#5C5C5C] uppercase tracking-wider">
                        ends {new Date(activePromo.end_date).toLocaleDateString()}
                      </span>
                    )}
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
                  {v.nickname_notes && (
                    <details
                      className="inline-block"
                      data-testid={`vendor-nickname-guide-${v.slug}`}
                    >
                      <summary className="cursor-pointer select-none px-2 py-0.5 rounded-full bg-[#FBF3EC] border border-[#E8CDBF] hover:bg-[#F5DED4] font-mono text-[9px] uppercase tracking-wider text-[#B87A6A]">
                        Nicknames ↓
                      </summary>
                      <pre className="mt-2 p-3 whitespace-pre-wrap font-mono text-xs text-[#0A0A0A] leading-relaxed bg-[#FBF3EC] border border-[#E8CDBF]">
                        {v.nickname_notes}
                      </pre>
                    </details>
                  )}
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
          })}
        </div>
      )}
    </div>
  );
}
