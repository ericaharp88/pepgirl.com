import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { ArrowDown, ArrowUp, ExternalLink, Trophy, CheckCircle2 } from "lucide-react";
import { Input } from "../components/ui/input";

/* ------------------- Per-peptide card ------------------- */
function PeptideCard({ peptide, prices, vendors }) {
  // Group prices by size_mg for THIS peptide
  const sizes = useMemo(() => {
    const set = new Set();
    prices.forEach((p) => set.add(p.size_mg || 0));
    return Array.from(set).sort((a, b) => a - b);
  }, [prices]);

  const [selectedSize, setSelectedSize] = useState(sizes[0] ?? 0);

  // Rows for the currently-selected size, sorted cheapest first
  const rows = useMemo(() => {
    return prices
      .filter((p) => (p.size_mg || 0) === selectedSize)
      .map((p) => {
        const vendor = vendors.find((v) => v.id === p.vendor_id);
        return vendor ? { vendor, price: p } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.price.price_usd - b.price.price_usd);
  }, [prices, selectedSize, vendors]);

  const formatSize = (s) => (s > 0 ? `${s} mg` : "—");

  return (
    <div
      data-testid={`peptide-card-${peptide.slug}`}
      className="bg-white border border-[#F0CFE0] rounded-[20px] p-6 hover:shadow-[0_8px_24px_rgba(255,45,135,0.12)] transition-shadow flex flex-col"
    >
      {/* Header */}
      <h3 className="text-xl font-black tracking-tight mb-3 pb-3 border-b border-[#FFE4F1]">
        {peptide.name}
      </h3>

      {/* Size pills */}
      {sizes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4" data-testid={`sizes-${peptide.slug}`}>
          {sizes.map((s) => {
            const active = s === selectedSize;
            return (
              <button
                key={s}
                onClick={() => setSelectedSize(s)}
                data-testid={`size-${peptide.slug}-${s}`}
                className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded-full transition ${
                  active
                    ? "bg-[#FF2D87] text-white shadow-[0_2px_8px_rgba(255,45,135,0.35)]"
                    : "bg-[#FFF0F7] text-[#5C5C5C] hover:bg-[#FFE4F1]"
                }`}
              >
                {formatSize(s)}
              </button>
            );
          })}
        </div>
      )}

      {/* Vendor rows */}
      <div className="flex-1 space-y-2.5">
        {rows.length === 0 && (
          <div className="text-sm text-[#A0A0A0] font-mono py-4 text-center">
            No vendors for this size
          </div>
        )}
        {rows.map(({ vendor, price }, idx) => {
          const isBest = idx === 0;
          return (
            <div
              key={vendor.id + "-" + price.size_mg}
              data-testid={`row-${peptide.slug}-${price.size_mg}-${vendor.slug}`}
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                isBest
                  ? "border-[#FF2D87] bg-[#FFF0F7]"
                  : "border-[#F0F0F0] hover:border-[#F0CFE0]"
              }`}
            >
              {/* Logo */}
              <div className="w-8 h-8 flex-shrink-0 rounded-md bg-white border border-[#F0F0F0] flex items-center justify-center overflow-hidden">
                {vendor.logo_url ? (
                  <img
                    src={vendor.logo_url}
                    alt={vendor.name}
                    className="w-full h-full object-contain"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <span className="text-[10px] font-mono font-bold text-[#5C5C5C]">
                    {vendor.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Vendor name + code */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[#0A0A0A] truncate">
                    {vendor.name}
                  </span>
                  {vendor.featured && (
                    <CheckCircle2 size={12} className="text-[#FF2D87] flex-shrink-0" />
                  )}
                </div>
                {vendor.discount_code && (
                  <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded bg-[#FFE4F1] text-[10px] font-mono font-bold text-[#FF2D87] tracking-wider">
                    {vendor.discount_code}
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0">
                <div className={`font-bold tracking-tight ${isBest ? "text-[#FF2D87]" : "text-[#0A0A0A]"}`}>
                  ${price.price_usd.toFixed(2)}
                </div>
                {price.size_mg > 0 && (
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#5C5C5C]">
                    ${(price.price_usd / price.size_mg).toFixed(2)}/mg
                  </div>
                )}
              </div>

              {/* Shop button */}
              <a
                href={price.product_url || vendor.affiliate_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                data-testid={`shop-${peptide.slug}-${price.size_mg}-${vendor.slug}`}
                className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider font-bold transition ${
                  isBest
                    ? "bg-[#FF2D87] text-white hover:bg-[#0A0A0A]"
                    : "bg-[#0A0A0A] text-white hover:bg-[#FF2D87]"
                }`}
              >
                Shop <ExternalLink size={10} />
              </a>
            </div>
          );
        })}
      </div>

      {/* Best Value footer */}
      {rows.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#FFE4F1] flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#5C5C5C]">
          <Trophy size={12} className="text-[#FF2D87]" />
          <span className="font-bold text-[#FF2D87]">Best Value:</span>
          <span className="truncate">
            {rows[0].vendor.name} · ${rows[0].price.price_usd.toFixed(2)}
            {rows[0].price.size_mg > 0 &&
              ` · $${(rows[0].price.price_usd / rows[0].price.size_mg).toFixed(2)}/mg`}
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------- Page ------------------- */
export default function Compare() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [activeTag, setActiveTag] = useState("All");

  useEffect(() => {
    api.get("/comparison").then(({ data }) => setData(data));
  }, []);

  // Pre-bucket prices by peptide for fast card lookup
  const pricesByPeptide = useMemo(() => {
    if (!data) return {};
    const m = {};
    data.prices.forEach((p) => {
      if (!p.price_usd || p.price_usd <= 0) return;
      (m[p.peptide_id] = m[p.peptide_id] || []).push(p);
    });
    return m;
  }, [data]);

  // Collect available categories
  const categories = useMemo(() => {
    if (!data) return [];
    const set = new Set();
    data.peptides.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["All", ...Array.from(set).sort()];
  }, [data]);

  const visible = useMemo(() => {
    if (!data) return [];
    let arr = data.peptides.filter((p) => (pricesByPeptide[p.id] || []).length > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (activeTag !== "All") {
      arr = arr.filter((p) => p.category === activeTag);
    }
    arr.sort((a, b) =>
      sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
    return arr;
  }, [data, pricesByPeptide, search, sortDir, activeTag]);

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 font-mono text-sm text-[#5C5C5C]">
        Loading peptides…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
      {/* Header */}
      <div className="border-b border-[#0A0A0A] pb-6 mb-10">
        <div className="eyebrow text-[#FF2D87] mb-3">Tool · 03</div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl lg:text-6xl font-black tracking-tighter">
              Peptide Price Compare
            </h1>
            <p className="text-sm text-[#5C5C5C] mt-3 max-w-2xl">
              Every peptide × every size × every vendor — sorted cheapest first. Best
              value in each card highlighted in pink.
            </p>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#5C5C5C]">
            {visible.length} of {data.peptides.length} peptides · {data.vendors.length} vendors
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
        <Input
          placeholder="Search peptide…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="compare-search"
          className="rounded-full border-[#0A0A0A] font-mono md:max-w-xs"
        />
        <button
          onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
          data-testid="sort-toggle"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF2D87] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#0A0A0A] transition"
        >
          Name {sortDir === "asc" ? "A→Z" : "Z→A"}{" "}
          {sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        </button>
        {categories.length > 2 && (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveTag(c)}
                data-testid={`cat-${c}`}
                className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded-full transition ${
                  activeTag === c
                    ? "bg-[#0A0A0A] text-white"
                    : "bg-[#FFF0F7] text-[#5C5C5C] hover:bg-[#FFE4F1]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid of peptide cards */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        data-testid="peptide-grid"
      >
        {visible.map((p) => (
          <PeptideCard
            key={p.id}
            peptide={p}
            prices={pricesByPeptide[p.id] || []}
            vendors={data.vendors}
          />
        ))}
        {visible.length === 0 && (
          <div className="col-span-full text-center py-12 font-mono text-sm text-[#5C5C5C]">
            No peptides match
          </div>
        )}
      </div>
    </div>
  );
}
