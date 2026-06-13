import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import { Input } from "../components/ui/input";

export default function Compare() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ vendorId: null, dir: "asc" });
  const [sortByName, setSortByName] = useState("asc");

  useEffect(() => {
    api.get("/comparison").then(({ data }) => setData(data));
  }, []);

  /**
   * Build one row per (peptide × size_mg) so users can see EVERY size each vendor offers.
   * Each row has a cells[] array aligned with data.vendors.
   */
  const rows = useMemo(() => {
    if (!data) return [];
    const { peptides, vendors, prices } = data;

    // Group: key = `${peptide_id}|${size_mg}` -> { peptide, size, byVendor: { vid: price } }
    const groups = new Map();
    prices.forEach((p) => {
      if (!p.price_usd || p.price_usd <= 0) return;
      const key = `${p.peptide_id}|${p.size_mg}`;
      if (!groups.has(key)) {
        const peptide = peptides.find((x) => x.id === p.peptide_id);
        if (!peptide) return;
        groups.set(key, { peptide, size_mg: p.size_mg, byVendor: {} });
      }
      const g = groups.get(key);
      // If duplicates (same peptide/size/vendor), keep cheapest
      if (!g.byVendor[p.vendor_id] || p.price_usd < g.byVendor[p.vendor_id].price_usd) {
        g.byVendor[p.vendor_id] = p;
      }
    });

    let result = Array.from(groups.values()).map((g) => {
      const cells = vendors.map((v) => g.byVendor[v.id] || null);
      const valid = cells.filter((c) => c && c.price_usd > 0).map((c) => c.price_usd);
      const min = valid.length ? Math.min(...valid) : null;
      return { peptide: g.peptide, size_mg: g.size_mg, cells, min };
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
      result.sort((a, b) => {
        const cmp = a.peptide.name.localeCompare(b.peptide.name);
        if (cmp !== 0) return sortByName === "asc" ? cmp : -cmp;
        return (a.size_mg || 0) - (b.size_mg || 0);
      });
    }

    return result;
  }, [data, search, sort, sortByName]);

  if (!data) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-16 font-mono text-sm">
        Loading data…
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-16">
      <div className="border-b border-[#0A0A0A] pb-6 mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="eyebrow text-[#FF2D87] mb-3">Tool · 03</div>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter">
            Price Comparison
          </h1>
          <p className="text-sm text-[#5C5C5C] mt-3">
            Every peptide × every size × every vendor. Cheapest in each row highlighted in
            pink. Sort by any column.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-80">
          <div className="eyebrow text-[#5C5C5C]">Filter</div>
          <Input
            placeholder="Search peptide…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="compare-search"
            className="rounded-none border-[#0A0A0A] font-mono"
          />
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#5C5C5C]">
            {rows.length} rows · {data.peptides.length} peptides
          </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-[#0A0A0A]">
        <table className="w-full border-collapse" data-testid="compare-table">
          <thead>
            <tr className="bg-[#0A0A0A] text-white">
              <th
                className="text-left p-3 font-mono text-xs uppercase tracking-[0.2em] cursor-pointer border-r border-[#2A2A2A] sticky left-0 bg-[#0A0A0A] z-10 min-w-[220px]"
                onClick={() => {
                  setSort({ vendorId: null, dir: "asc" });
                  setSortByName(sortByName === "asc" ? "desc" : "asc");
                }}
                data-testid="sort-name"
              >
                <span className="inline-flex items-center gap-2">
                  Peptide / Size{" "}
                  {sortByName === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                </span>
              </th>
              {data.vendors.map((v) => (
                <th
                  key={v.id}
                  className="text-left p-3 font-mono text-[10px] uppercase tracking-[0.12em] cursor-pointer border-r border-[#2A2A2A] hover:bg-[#FF2D87] min-w-[120px]"
                  onClick={() =>
                    setSort({
                      vendorId: v.id,
                      dir:
                        sort.vendorId === v.id && sort.dir === "asc" ? "desc" : "asc",
                    })
                  }
                  data-testid={`sort-vendor-${v.slug}`}
                >
                  <div className="flex items-center gap-1">
                    {v.name}
                    {sort.vendorId === v.id &&
                      (sort.dir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ peptide, size_mg, cells, min }) => (
              <tr
                key={`${peptide.id}-${size_mg}`}
                className="border-t border-[#E5E5E5] row-hover"
                data-testid={`row-${peptide.slug}-${size_mg}`}
              >
                <td className="p-3 border-r border-[#E5E5E5] sticky left-0 bg-white z-10">
                  <div className="font-bold text-sm">{peptide.name}</div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#FF2D87] mt-0.5">
                    {size_mg > 0 ? `${size_mg} mg` : "—"}
                    {peptide.category && (
                      <span className="text-[#5C5C5C] ml-2">{peptide.category}</span>
                    )}
                  </div>
                </td>
                {cells.map((c, idx) => {
                  const v = data.vendors[idx];
                  if (!c) {
                    return (
                      <td
                        key={v.id}
                        className="p-3 border-r border-[#E5E5E5] font-mono text-[#C0C0C0] text-center text-sm"
                      >
                        —
                      </td>
                    );
                  }
                  const isBest = min !== null && c.price_usd === min;
                  return (
                    <td
                      key={v.id}
                      className={`p-3 border-r border-[#E5E5E5] font-mono ${
                        isBest ? "bg-[#FF2D87] text-white" : ""
                      }`}
                      title={
                        c.last_scraped
                          ? `Updated ${new Date(c.last_scraped).toLocaleDateString()}`
                          : "Manual entry"
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-lg font-bold tracking-tight leading-none">
                            ${c.price_usd?.toFixed(2)}
                          </div>
                          {size_mg > 0 && (
                            <div className="text-[10px] uppercase tracking-wider opacity-70 mt-1">
                              ${(c.price_usd / size_mg).toFixed(2)}/mg
                            </div>
                          )}
                        </div>
                        <a
                          href={c.product_url || v.affiliate_url}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          className={`opacity-70 hover:opacity-100 flex-shrink-0 ${
                            isBest ? "text-white" : "text-[#0A0A0A]"
                          }`}
                          data-testid={`buy-${peptide.slug}-${size_mg}-${v.slug}`}
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={data.vendors.length + 1}
                  className="p-8 text-center font-mono text-sm text-[#5C5C5C]"
                >
                  No matches
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs font-mono uppercase tracking-[0.2em] text-[#5C5C5C]">
        Cheapest absolute price in each row highlighted in{" "}
        <span className="bg-[#FF2D87] text-white px-2 py-0.5">pink</span>. Per-mg cost
        shown beneath.
      </p>
    </div>
  );
}
