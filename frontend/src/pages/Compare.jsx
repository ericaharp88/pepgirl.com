import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../lib/api";
import { ArrowDown, ArrowUp, ExternalLink, Trophy, CheckCircle2, Copy, Check } from "lucide-react";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import useSeo from "../hooks/useSeo";

const SITE = "https://pepgirl.com";

/* peptide-name -> URL-safe slug (Google-indexable deep link) */
const slugify = (s = "") =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ------------------- Vendor strip with discount codes ------------------- */
function VendorStrip() {
  const [vendors, setVendors] = useState([]);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    api.get("/vendors").then(({ data }) => setVendors(data));
  }, []);

  // Only peptide & skincare vendors belong on the price-comparison page strip.
  const isRelevant = (v) => {
    const tags = (v.tags || []).map((t) => t.toLowerCase());
    return tags.some((t) => t.includes("peptide") || t.includes("skin"));
  };
  const withCodes = vendors.filter((v) => v.discount_code && isRelevant(v));
  if (!withCodes.length) return null;

  const copy = (code) => {
    const done = () => {
      setCopied(code);
      toast.success(`Code "${code}" copied`);
      setTimeout(() => setCopied(null), 1500);
    };
    try {
      const p = navigator.clipboard && navigator.clipboard.writeText(code);
      if (p && typeof p.then === "function") {
        p.then(done).catch(() => {
          try {
            const ta = document.createElement("textarea");
            ta.value = code; document.body.appendChild(ta);
            ta.select(); document.execCommand("copy");
            document.body.removeChild(ta);
            done();
          } catch { toast.error("Couldn't copy code"); }
        });
      } else {
        done();
      }
    } catch { toast.error("Couldn't copy code"); }
  };

  return (
    <div className="mb-8" data-testid="vendor-strip">
      <div className="flex items-center justify-between mb-3">
        <div className="eyebrow text-[#5C5C5C]">All vendor discount codes · tap to copy</div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#5C5C5C]">
          {withCodes.length} codes
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {withCodes.map((v) => (
          <div
            key={v.id}
            className="bg-white border border-[#F0CFE0] rounded-xl p-3 flex items-center gap-2 hover:border-[#FF2D87] transition"
            data-testid={`strip-vendor-${v.slug}`}
          >
            <div className="w-9 h-9 flex-shrink-0 rounded-md bg-white border border-[#F0F0F0] flex items-center justify-center overflow-hidden">
              {v.logo_url ? (
                <img src={v.logo_url} alt={v.name} className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : (
                <span className="text-[10px] font-mono font-bold text-[#5C5C5C]">
                  {v.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <a
                href={v.affiliate_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="text-xs font-bold text-[#0A0A0A] truncate hover:text-[#FF2D87] flex items-center gap-1"
              >
                {v.name}
                {v.featured && <CheckCircle2 size={10} className="text-[#FF2D87] flex-shrink-0" />}
              </a>
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                <button
                  onClick={() => copy(v.discount_code)}
                  data-testid={`strip-code-${v.slug}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FFE4F1] hover:bg-[#FF2D87] hover:text-white text-[10px] font-mono font-bold text-[#FF2D87] tracking-wider transition"
                  title="Click to copy code"
                >
                  {copied === v.discount_code ? <Check size={10} /> : <Copy size={10} />}
                  {v.discount_code}
                </button>
                {v.promo_badge && (
                  <span
                    data-testid={`strip-promo-${v.slug}`}
                    className="inline-block px-1.5 py-0.5 rounded bg-[#FFE700] text-[#0A0A0A] text-[10px] font-mono font-bold tracking-wider"
                    title="Active promotion"
                  >
                    {v.promo_badge}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------- Per-peptide card ------------------- */
function PeptideCard({ peptide, prices, vendors }) {
  // Group prices by size_mg for THIS peptide
  const sizes = useMemo(() => {
    const set = new Set();
    prices.forEach((p) => set.add(p.size_mg || 0));
    return Array.from(set).sort((a, b) => a - b);
  }, [prices]);

  const [selectedSize, setSelectedSize] = useState(sizes[0] ?? 0);
  const [copiedCode, setCopiedCode] = useState(null);

  const copyCode = (code) => {
    if (!code) return;
    const done = () => {
      setCopiedCode(code);
      toast.success(`Code "${code}" copied`);
      setTimeout(() => setCopiedCode(null), 1500);
    };
    try {
      const p = navigator.clipboard && navigator.clipboard.writeText(code);
      if (p && typeof p.then === "function") {
        p.then(done).catch(() => {
          // Fallback: temporary textarea
          try {
            const ta = document.createElement("textarea");
            ta.value = code; document.body.appendChild(ta);
            ta.select(); document.execCommand("copy");
            document.body.removeChild(ta);
            done();
          } catch { toast.error("Couldn't copy code"); }
        });
      } else {
        done();
      }
    } catch { toast.error("Couldn't copy code"); }
  };

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
                {price.display_label && (
                  <div
                    data-testid={`row-label-${peptide.slug}-${price.size_mg}-${vendor.slug}`}
                    className="text-[10px] font-mono uppercase tracking-wider text-[#FF2D87] font-bold truncate"
                    title={`Vendor name for ${peptide.name}: ${price.display_label}`}
                  >
                    “{price.display_label}”
                  </div>
                )}
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  {vendor.discount_code && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyCode(vendor.discount_code); }}
                      data-testid={`row-code-${peptide.slug}-${price.size_mg}-${vendor.slug}`}
                      title="Click to copy code"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#FFE4F1] hover:bg-[#FF2D87] hover:text-white text-[10px] font-mono font-bold text-[#FF2D87] tracking-wider transition cursor-pointer"
                    >
                      {copiedCode === vendor.discount_code ? <Check size={10} /> : <Copy size={10} />}
                      {vendor.discount_code}
                    </button>
                  )}
                  {vendor.promo_badge && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#FFE700] text-[#0A0A0A] text-[10px] font-mono font-bold tracking-wider"
                      title="Active promotion"
                    >
                      {vendor.promo_badge}
                    </span>
                  )}
                </div>
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
  const location = useLocation();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [activeTag, setActiveTag] = useState("All");
  const cardRefs = useRef({});

  // ----- deep-link: /compare?peptide=semaglutide -----
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const peptideParam = (queryParams.get("peptide") || "").trim().toLowerCase();

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

  // ----- Tag filters (keyword-based, work even for AI-imported peptides) -----
  const TAG_FILTERS = useMemo(() => ({
    All: () => true,
    Skin: (p) => /\b(ghk[-\s]?cu|copper|kpv|argireline|snap[-\s]?8|melanotan|epitalon|epithalon|glutathione|cosmetic|skin|serum|cream|peptide.*cu)\b/i.test(p.name),
    GLP: (p) => /\b(semaglutide|tirzepatide|retatrutide|cagrilintide|liraglutide|glp[-\s]?[123]|glp\s?[123](sg|tz|rt|t|r)?|glpsg|am833)\b/i.test(p.name),
    "Nasal Sprays": (p) => /\b(nasal|spray)\b/i.test(p.name),
    Capsules: (p) => /\b(capsules?|caps?|tablets?|pills?)\b/i.test(p.name),
  }), []);

  const TAG_KEYS = ["All", "Skin", "GLP", "Nasal Sprays", "Capsules"];

  // Always show ALL peptides that have prices for SEO crawling.
  // The peptide=? param is used only to spotlight & adjust SEO metadata.
  const visible = useMemo(() => {
    if (!data) return [];
    let arr = data.peptides.filter((p) => (pricesByPeptide[p.id] || []).length > 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((p) => p.name.toLowerCase().includes(q));
    }
    const filterFn = TAG_FILTERS[activeTag] || TAG_FILTERS.All;
    arr = arr.filter(filterFn);
    arr.sort((a, b) =>
      sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
    return arr;
  }, [data, pricesByPeptide, search, sortDir, activeTag, TAG_FILTERS]);

  // Counts per tab (for badges)
  const tagCounts = useMemo(() => {
    if (!data) return {};
    const counts = {};
    const withPrices = data.peptides.filter((p) => (pricesByPeptide[p.id] || []).length > 0);
    TAG_KEYS.forEach((k) => { counts[k] = withPrices.filter(TAG_FILTERS[k]).length; });
    return counts;
  }, [data, pricesByPeptide, TAG_FILTERS]);

  // -------- focused peptide for deep-link SEO --------
  const focusedPeptide = useMemo(() => {
    if (!data || !peptideParam) return null;
    return data.peptides.find(
      (p) => slugify(p.name) === peptideParam || p.name.toLowerCase() === peptideParam
    );
  }, [data, peptideParam]);

  // Scroll deep-linked peptide into view
  useEffect(() => {
    if (!focusedPeptide) return;
    const el = cardRefs.current[focusedPeptide.id];
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    }
  }, [focusedPeptide]);

  // -------- DYNAMIC SEO PAYLOAD --------
  const seoPath = focusedPeptide
    ? `/compare?peptide=${slugify(focusedPeptide.name)}`
    : "/compare";

  const { seoTitle, seoDescription } = useMemo(() => {
    if (focusedPeptide && data) {
      const prs = (pricesByPeptide[focusedPeptide.id] || []);
      const lo = prs.length ? Math.min(...prs.map((p) => p.price_usd)) : 0;
      const hi = prs.length ? Math.max(...prs.map((p) => p.price_usd)) : 0;
      return {
        seoTitle: `${focusedPeptide.name} Price Comparison — Cheapest Vendors`,
        seoDescription: `Compare ${focusedPeptide.name} prices across ${prs.length} listings from trusted research peptide vendors. Prices from $${lo.toFixed(2)}–$${hi.toFixed(2)}. Updated regularly on Pep Girl.`,
      };
    }
    const n = data?.peptides?.length || 0;
    const v = data?.vendors?.length || 0;
    return {
      seoTitle: "Peptide Price Comparison Tool — Compare Every Vendor",
      seoDescription: `Compare research peptide prices across ${v || "trusted"} vendors and ${n || "dozens of"} peptides — including semaglutide, tirzepatide, retatrutide, BPC-157, TB-500, GHK-Cu, and more. Live pricing, cheapest highlighted, every size.`,
    };
  }, [focusedPeptide, data, pricesByPeptide]);

  // Build JSON-LD: ItemList of Product (one per peptide) + FAQPage
  const jsonLd = useMemo(() => {
    if (!data) return [];
    const items = [];
    const peptideList = visible.length > 0 ? visible : data.peptides;
    peptideList.slice(0, 50).forEach((p, idx) => {
      const prs = (pricesByPeptide[p.id] || []);
      if (!prs.length) return;
      const offers = prs.map((pr) => {
        const v = data.vendors.find((vv) => vv.id === pr.vendor_id);
        return {
          "@type": "Offer",
          price: pr.price_usd.toFixed(2),
          priceCurrency: "USD",
          url: pr.product_url || (v && v.affiliate_url) || `${SITE}/compare?peptide=${slugify(p.name)}`,
          availability: "https://schema.org/InStock",
          seller: v ? { "@type": "Organization", name: v.name } : undefined,
        };
      });
      const lo = Math.min(...prs.map((x) => x.price_usd));
      const hi = Math.max(...prs.map((x) => x.price_usd));
      items.push({
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "Product",
          name: p.name,
          description: `Compare ${p.name} prices across trusted peptide vendors on Pep Girl.`,
          url: `${SITE}/compare?peptide=${slugify(p.name)}`,
          category: "Research peptide",
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: lo.toFixed(2),
            highPrice: hi.toFixed(2),
            offerCount: prs.length,
            offers,
          },
        },
      });
    });

    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Peptide Price Comparison",
      url: `${SITE}/compare`,
      numberOfItems: items.length,
      itemListElement: items,
    };

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name: "Peptide Price Tool", item: SITE + "/compare" },
        ...(focusedPeptide
          ? [{
              "@type": "ListItem",
              position: 3,
              name: focusedPeptide.name,
              item: `${SITE}/compare?peptide=${slugify(focusedPeptide.name)}`,
            }]
          : []),
      ],
    };

    const faq = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Where can I compare peptide prices across vendors?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Pep Girl's Peptide Price Tool compares live prices across every trusted research peptide vendor, sorted cheapest first, with discount codes and links to each product page.",
          },
        },
        {
          "@type": "Question",
          name: "How often are peptide prices updated?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Prices are refreshed regularly using a combination of AI-powered web scraping and manual review. Each listing shows the price, size, and a per-mg breakdown so you can spot the cheapest option in seconds.",
          },
        },
        {
          "@type": "Question",
          name: "Which peptides does Pep Girl compare?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Pep Girl tracks GLP-1 peptides (semaglutide, tirzepatide, retatrutide, cagrilintide), healing peptides (BPC-157, TB-500), skin peptides (GHK-Cu, GHK, melanotan), nootropic peptides, and many more across multiple vendors.",
          },
        },
        {
          "@type": "Question",
          name: "Do you offer discount codes for peptide vendors?",
          acceptedAnswer: {
            "@type": "Answer",
            text:
              "Yes — Pep Girl maintains an up-to-date list of vendor discount codes that you can tap to copy directly from the price-comparison page.",
          },
        },
      ],
    };

    return [itemList, breadcrumb, faq];
  }, [data, visible, pricesByPeptide, focusedPeptide]);

  useSeo({
    title: seoTitle,
    description: seoDescription,
    path: seoPath,
    keywords:
      "peptide price comparison, cheapest peptide vendor, semaglutide price, tirzepatide price, retatrutide price, BPC-157 price, TB-500 price, GHK-Cu price, peptide discount codes, research peptides, peptide vendor comparison, Pep Girl",
    jsonLd,
  });

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 font-mono text-sm text-[#5C5C5C]">
        Loading peptides…
      </div>
    );
  }

  // Lists for the SEO content block at the bottom
  const allPeptidesWithPrices = data.peptides.filter((p) => (pricesByPeptide[p.id] || []).length > 0);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
      {/* Header */}
      <div className="border-b border-[#0A0A0A] pb-6 mb-10">
        <div className="eyebrow text-[#FF2D87] mb-3">Tool · 03</div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl lg:text-6xl font-black tracking-tighter">
              Peptide Price Tool
            </h1>
            <p className="text-sm text-[#5C5C5C] mt-3 max-w-2xl">
              Compare trusted vendors, discover hidden deals, and track pricing
              across the industry &mdash; all in one place. Pep Girl Price Tool
              helps you spend less time searching and more time saving.
            </p>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#5C5C5C]">
            {visible.length} of {data.peptides.length} peptides · {data.vendors.length} vendors
          </div>
        </div>
      </div>

      {/* Vendor strip with discount codes */}
      <VendorStrip />

      {/* Tag filter tabs */}
      <div className="flex flex-wrap gap-2 mb-8" data-testid="tag-tabs">
        {TAG_KEYS.map((c) => {
          const n = tagCounts[c] ?? 0;
          const active = activeTag === c;
          return (
            <button
              key={c}
              onClick={() => setActiveTag(c)}
              data-testid={`tag-${c.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              disabled={n === 0 && c !== "All"}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition border ${
                active
                  ? "bg-[#FF2D87] text-white border-[#FF2D87] shadow-[0_4px_14px_rgba(255,45,135,0.35)]"
                  : n === 0
                  ? "bg-[#F8F8F8] text-[#C0C0C0] border-[#F0F0F0] cursor-not-allowed"
                  : "bg-white text-[#0A0A0A] border-[#F0CFE0] hover:bg-[#FFF0F7]"
              }`}
            >
              {c}
              <span className={`text-[10px] font-bold ${active ? "text-white/80" : "text-[#FF2D87]"}`}>
                {n}
              </span>
            </button>
          );
        })}
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0A0A0A] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#FF2D87] transition w-fit"
        >
          Name {sortDir === "asc" ? "A→Z" : "Z→A"}{" "}
          {sortDir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        </button>
      </div>

      {/* Grid of peptide cards */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        data-testid="peptide-grid"
      >
        {visible.map((p) => (
          <div
            key={p.id}
            id={`peptide-${slugify(p.name)}`}
            ref={(el) => { if (el) cardRefs.current[p.id] = el; }}
            className={focusedPeptide && focusedPeptide.id === p.id ? "ring-2 ring-[#FF2D87] rounded-[22px]" : ""}
          >
            <PeptideCard
              peptide={p}
              prices={pricesByPeptide[p.id] || []}
              vendors={data.vendors}
            />
          </div>
        ))}
        {visible.length === 0 && (
          <div className="col-span-full text-center py-12 font-mono text-sm text-[#5C5C5C]">
            No peptides match
          </div>
        )}
      </div>

      {/* ---------------- SEO CONTENT BLOCK ---------------- */}
      <section
        data-testid="seo-content"
        className="mt-20 border-t border-[#F0CFE0] pt-12 grid lg:grid-cols-3 gap-10"
      >
        <div className="lg:col-span-2 space-y-6 text-[#0A0A0A]">
          <div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight mb-3">
              About the Pep Girl Peptide Price Comparison Tool
            </h2>
            <p className="text-sm leading-relaxed text-[#3A3A3A]">
              Pep Girl is the easiest way to compare research peptide prices side-by-side across
              every trusted vendor. We track prices for popular research peptides including
              <strong> semaglutide</strong>, <strong>tirzepatide</strong>, <strong>retatrutide</strong>,
              <strong> cagrilintide</strong>, <strong>BPC-157</strong>, <strong>TB-500</strong>,
              <strong> GHK-Cu</strong>, <strong>NAD+</strong>, <strong>MOTS-c</strong>, melanotan,
              epitalon, KPV, and many more &mdash; in every available size (mg) with the
              <em> price-per-mg</em> calculated automatically so you can spot the cheapest deal instantly.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-black tracking-tight mb-2">How the tool works</h3>
            <ul className="text-sm leading-relaxed text-[#3A3A3A] list-disc list-inside space-y-1">
              <li>Filter by category: GLP-1, skin, nasal sprays, capsules, or browse all.</li>
              <li>Tap any size pill on a peptide card to compare every vendor at that exact size.</li>
              <li>The cheapest vendor for each size is highlighted in pink with the <em>Best Value</em> trophy.</li>
              <li>Tap a vendor discount code to copy it to your clipboard before you check out.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-black tracking-tight mb-2">Frequently asked questions</h3>
            <div className="space-y-3 text-sm leading-relaxed text-[#3A3A3A]">
              <div>
                <div className="font-bold text-[#0A0A0A]">How much does semaglutide cost?</div>
                Semaglutide pricing depends on size (mg) and vendor. The Price Tool above lists every
                current offer, sorted from cheapest to most expensive, with a price-per-mg breakdown.
              </div>
              <div>
                <div className="font-bold text-[#0A0A0A]">Where can I find the cheapest tirzepatide?</div>
                Open the GLP category tab and look for the pink-highlighted card &mdash; that&apos;s the
                lowest current price across our tracked vendors.
              </div>
              <div>
                <div className="font-bold text-[#0A0A0A]">Are these peptides for research only?</div>
                Yes. All products listed are research peptides, sold for laboratory research use only.
                Pep Girl is an educational resource and does not provide medical advice.
              </div>
            </div>
          </div>
        </div>

        {/* Peptide directory for crawlers (and humans) */}
        <aside className="bg-[#FFF0F7] border border-[#F0CFE0] rounded-2xl p-6">
          <div className="eyebrow text-[#FF2D87] mb-3">All Peptides ({allPeptidesWithPrices.length})</div>
          <ul className="flex flex-wrap gap-1.5" data-testid="seo-peptide-list">
            {allPeptidesWithPrices.map((p) => (
              <li key={p.id}>
                <a
                  href={`/compare?peptide=${slugify(p.name)}`}
                  data-testid={`seo-pep-link-${slugify(p.name)}`}
                  className="inline-block px-2.5 py-1 rounded-full text-[11px] font-mono bg-white border border-[#F0CFE0] text-[#0A0A0A] hover:bg-[#FF2D87] hover:text-white hover:border-[#FF2D87] transition"
                >
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
