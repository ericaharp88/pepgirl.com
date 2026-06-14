import { useEffect, useState } from "react";
import api from "../lib/api";
import { ArrowRight } from "lucide-react";
import useSeo from "../hooks/useSeo";

export default function Resources() {
  useSeo({
    title: "Resources & Guides",
    description: "Curated peptide research guides, protocols, COA references, supply lists, and trusted external resources.",
    path: "/resources",
  });
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    api.get("/resources").then(({ data }) => setItems(data));
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16">
      <div className="border-b border-[#0A0A0A] pb-6 mb-12">
        <div className="eyebrow text-[#FF2D87] mb-3">Library · 04</div>
        <h1 className="text-5xl lg:text-7xl font-black tracking-tighter">Resources</h1>
        <p className="text-base text-[#5C5C5C] mt-4 max-w-2xl">
          Guides, references, and external research. Curated, not exhaustive.
        </p>
      </div>

      {!items && <p className="font-mono text-sm">Loading…</p>}

      {items && items.length === 0 && (
        <p className="font-mono text-sm">No resources yet.</p>
      )}

      {items && items.length > 0 && (
        <div className="grid md:grid-cols-2 grid-borders border-t border-l border-[#E5E5E5]">
          {items.map((r) => (
            <div
              key={r.id}
              className="p-8 lg:p-12 bg-white"
              data-testid={`resource-${r.id}`}
            >
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#FF2D87] mb-4">
                {r.category}
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight mb-3">{r.title}</h2>
              <p className="text-sm text-[#5C5C5C] mb-6">{r.summary}</p>
              {r.url ? (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#FF2D87] text-white font-mono text-xs uppercase tracking-[0.2em] rounded-full hover:bg-[#0A0A0A] transition shadow-[0_4px_14px_rgba(255,45,135,0.3)]"
                  data-testid={`resource-link-${r.id}`}
                >
                  Visit resource <ArrowRight size={14} />
                </a>
              ) : (
                <>
                  <button
                    onClick={() => setOpen(open === r.id ? null : r.id)}
                    className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] border-b border-[#0A0A0A] hover:text-[#FF2D87] hover:border-[#FF2D87]"
                    data-testid={`resource-toggle-${r.id}`}
                  >
                    {open === r.id ? "Collapse" : "Read"} <ArrowRight size={14} />
                  </button>
                  {open === r.id && (
                    <div className="mt-6 p-6 bg-[#F5F5F5] border-l-2 border-[#FF2D87] text-sm leading-relaxed whitespace-pre-line">
                      {r.content}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
