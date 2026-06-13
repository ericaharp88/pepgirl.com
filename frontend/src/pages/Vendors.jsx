import { useEffect, useState } from "react";
import api from "../lib/api";
import { Star, ExternalLink } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";

export default function Vendors() {
  const [vendors, setVendors] = useState(null);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    api.get("/vendors").then(({ data }) => setVendors(data)).catch(() => setVendors([]));
  }, []);

  const isSkin = (v) => (v.tags || []).some((t) => t.toLowerCase().includes("skin"));
  const isSupp = (v) => (v.tags || []).some((t) => t.toLowerCase() === "supplements");
  const isClothes = (v) => (v.tags || []).some((t) => t.toLowerCase() === "clothes");
  const filtered = !vendors ? null : vendors.filter((v) =>
    filter === "All" ? true
    : filter === "Skin Care" ? isSkin(v)
    : filter === "Supplements" ? isSupp(v)
    : filter === "Clothes" ? isClothes(v)
    : (!isSkin(v) && !isSupp(v) && !isClothes(v))
  );

  const tabs = ["All", "Peptides", "Skin Care", "Supplements", "Clothes"];

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16">
      <div className="flex items-end justify-between border-b border-[#0A0A0A] pb-6 mb-12">
        <div>
          <div className="eyebrow text-[#FF2D87] mb-3">Directory · 01</div>
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
              filter === t ? "bg-[#FF2D87] text-white" : "bg-white hover:bg-[#FFE3F0]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {!vendors && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#E5E5E5]">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-none border-r border-b border-[#E5E5E5]" />
          ))}
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <p className="font-mono text-sm">No vendors match this filter.</p>
      )}

      {filtered && filtered.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 grid-borders border-t border-l border-[#E5E5E5]">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="p-8 bg-white flex flex-col"
              data-testid={`vendor-card-${v.slug}`}
            >
              <div className="mb-6 flex items-center justify-between gap-3">
                <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#5C5C5C]">
                  {v.featured ? "★ Featured" : "Listed"}
                </div>
                {v.logo_url && (
                  <img
                    src={v.logo_url}
                    alt={`${v.name} logo`}
                    loading="lazy"
                    onError={(e) => {
                      // Fallback: try Google favicon from the vendor's affiliate URL host
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
                    className="h-10 w-10 object-contain rounded-sm bg-white"
                    data-testid={`vendor-logo-${v.slug}`}
                  />
                )}
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">{v.name}</h2>
              <p className="text-sm text-[#5C5C5C] mb-4 flex-1">{v.description}</p>

              {v.discount_code && (
                <div
                  data-testid={`vendor-code-${v.slug}`}
                  className="mb-4 flex items-center gap-2 bg-[#FFF0F7] border border-[#F0CFE0] px-3 py-2 rounded-sm"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5C5C5C]">
                    Code
                  </span>
                  <span className="font-mono font-bold text-sm text-[#FF2D87] tracking-wider">
                    {v.discount_code}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-6">
                {v.tags?.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="rounded-none border-[#0A0A0A] font-mono text-[10px] uppercase tracking-wider"
                  >
                    {t}
                  </Badge>
                ))}
              </div>
              <a
                href={v.affiliate_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                data-testid={`vendor-visit-${v.slug}`}
                className="bg-[#0A0A0A] text-white px-4 py-3 inline-flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-[0.25em] hover:bg-[#FF2D87]"
              >
                Visit Vendor <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
