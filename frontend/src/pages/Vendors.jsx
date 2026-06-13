import { useEffect, useState } from "react";
import api from "../lib/api";
import { Star, ExternalLink } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";

export default function Vendors() {
  const [vendors, setVendors] = useState(null);

  useEffect(() => {
    api.get("/vendors").then(({ data }) => setVendors(data)).catch(() => setVendors([]));
  }, []);

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
          <div className="text-4xl font-mono font-bold">{vendors ? String(vendors.length).padStart(2, "0") : "--"}</div>
        </div>
      </div>

      {!vendors && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-0 border border-[#E5E5E5]">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-none border-r border-b border-[#E5E5E5]" />
          ))}
        </div>
      )}

      {vendors && vendors.length === 0 && (
        <p className="font-mono text-sm">No vendors yet. Admin can add them from the dashboard.</p>
      )}

      {vendors && vendors.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 grid-borders border-t border-l border-[#E5E5E5]">
          {vendors.map((v) => (
            <div
              key={v.id}
              className="p-8 bg-white flex flex-col"
              data-testid={`vendor-card-${v.slug}`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#5C5C5C]">
                  {v.featured ? "★ Featured" : "Listed"}
                </div>
                <div className="flex items-center gap-1 font-mono text-sm">
                  <Star size={14} fill="#FF2D87" strokeWidth={0} />
                  {v.rating?.toFixed(1)}
                </div>
              </div>
              <h2 className="text-3xl font-bold tracking-tight mb-2">{v.name}</h2>
              <p className="text-sm text-[#5C5C5C] mb-6 flex-1">{v.description}</p>
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
