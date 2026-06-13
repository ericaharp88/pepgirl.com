import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import { Input } from "../components/ui/input";

export default function Compare() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ vendorId: null, dir: "asc" }); // sort by price for a vendor column
  const [sortByName, setSortByName] = useState("asc");

  useEffect(() => {
    api.get("/comparison").then(({ data }) => setData(data));
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const { peptides, vendors, prices } = data;
    const priceMap = {}; // peptide_id -> vendor_id -> entry (cheapest size)
    prices.forEach((p) => {
      const k = p.peptide_id;
      priceMap[k] = priceMap[k] || {};
      const existing = priceMap[k][p.vendor_id];
      if (!existing || p.price_usd / p.size_mg < existing.price_usd / existing.size_mg) {
        priceMap[k][p.vendor_id] = p;
      }
    });
    let result = peptides.map((pep) => {
      const cells = vendors.map((v) => priceMap[pep.id]?.[v.id] || null);
      const valid = cells.filter((c) => c && c.price_usd > 0);
      const min = valid.length ? Math.min(...valid.map((c) => c.price_usd)) : null;
      return { peptide: pep, cells, min };
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.peptide.name.toLowerCase().includes(q));
    }
    if (sort.vendorId) {
      result.sort((a, b) => {
        const ai = data.vendors.findIndex((v) => v.id === sort.vendorId);
        const av = a.cells[ai]?.price_usd ?? Infinity;
        const bv = b.cells[ai]?.price_usd ?? Infinity;
        return sort.dir === "asc" ? av - bv : bv - av;
      });
    } else {
      result.sort((a, b) =>
        sortByName === "asc"
          ? a.peptide.name.localeCompare(b.peptide.name)
          : b.peptide.name.localeCompare(a.peptide.name)
      );
    }
    return result;
  }, [data, search, sort, sortByName]);

  if (!data) {
    return <div className="max-w-[1400px] mx-auto px-6 py-16 font-mono text-sm">Loading data…</div>;
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16">
      <div className="border-b border-[#0A0A0A] pb-6 mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="eyebrow text-[#002FA7] mb-3">Tool · 03</div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter">Price Comparison</h1>
          <p className="text-sm text-[#5C5C5C] mt-3">
            Lowest per-mg price highlighted. Sort by column. Last admin-scrape times in tooltips.
          </p>
        </div>
        <div className="w-full md:w-80">
          <div className="eyebrow text-[#5C5C5C] mb-2">Filter</div>
          <Input
            placeholder="Search peptide…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="compare-search"
            className="rounded-none border-[#0A0A0A] font-mono"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-[#0A0A0A]">
        <table className="w-full border-collapse" data-testid="compare-table">
          <thead>
            <tr className="bg-[#0A0A0A] text-white">
              <th
                className="text-left p-4 font-mono text-xs uppercase tracking-[0.2em] cursor-pointer border-r border-[#2A2A2A]"
                onClick={() => { setSort({ vendorId: null, dir: "asc" }); setSortByName(sortByName === "asc" ? "desc" : "asc"); }}
                data-testid="sort-name"
              >
                <span className="inline-flex items-center gap-2">
                  Peptide {sortByName === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                </span>
              </th>
              {data.vendors.map((v) => (
                <th
                  key={v.id}
                  className="text-left p-4 font-mono text-xs uppercase tracking-[0.15em] cursor-pointer border-r border-[#2A2A2A] hover:bg-[#002FA7]"
                  onClick={() => setSort({ vendorId: v.id, dir: sort.vendorId === v.id && sort.dir === "asc" ? "desc" : "asc" })}
                  data-testid={`sort-vendor-${v.slug}`}
                >
                  <div className="flex items-center gap-2">
                    {v.name}
                    {sort.vendorId === v.id && (sort.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ peptide, cells, min }) => (
              <tr key={peptide.id} className="border-t border-[#E5E5E5] row-hover" data-testid={`row-${peptide.slug}`}>
                <td className="p-4 border-r border-[#E5E5E5]">
                  <div className="font-bold">{peptide.name}</div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#5C5C5C] mt-1">
                    {peptide.category}
                  </div>
                </td>
                {cells.map((c, idx) => {
                  const v = data.vendors[idx];
                  if (!c) {
                    return (
                      <td key={v.id} className="p-4 border-r border-[#E5E5E5] font-mono text-[#5C5C5C]">—</td>
                    );
                  }
                  const isBest = min !== null && c.price_usd === min;
                  return (
                    <td
                      key={v.id}
                      className={`p-4 border-r border-[#E5E5E5] font-mono ${isBest ? "bg-[#002FA7] text-white" : ""}`}
                      title={c.last_scraped ? `Updated ${c.last_scraped}` : "Manual entry"}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xl font-bold tracking-tight">
                            ${c.price_usd?.toFixed(2)}
                          </div>
                          <div className="text-[10px] uppercase tracking-wider opacity-70">
                            {c.size_mg} mg · ${(c.price_usd / c.size_mg).toFixed(2)}/mg
                          </div>
                        </div>
                        <a
                          href={c.product_url || v.affiliate_url}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          className={`opacity-70 hover:opacity-100 ${isBest ? "text-white" : "text-[#0A0A0A]"}`}
                          data-testid={`buy-${peptide.slug}-${v.slug}`}
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={data.vendors.length + 1} className="p-8 text-center font-mono text-sm text-[#5C5C5C]">No matches</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs font-mono uppercase tracking-[0.2em] text-[#5C5C5C]">
        Best per-vial price highlighted in <span className="bg-[#002FA7] text-white px-2 py-0.5">blue</span>.
        Per-mg cost shown beneath.
      </p>
    </div>
  );
}
