import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import api from "../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Trash2, RotateCw } from "lucide-react";

const blankVendor = { name: "", slug: "", description: "", affiliate_url: "", logo_url: "", rating: 4.5, tags: [], discount_code: "", featured: false, comparison_enabled: true };
const blankResource = { title: "", category: "Guide", summary: "", url: "", content: "" };
const blankPeptide = { name: "", slug: "", description: "", typical_dose_mcg: 0, category: "" };
const blankPrice = { peptide_id: "", vendor_id: "", size_mg: 5, price_usd: 0, product_url: "", scrape_selector: "" };

export default function Admin() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 font-mono text-sm">Checking session…</div>;
  if (!user || user.role !== "admin") return <Navigate to="/login" replace state={{ from: "/admin" }} />;

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12">
      <div className="border-b border-[#0A0A0A] pb-4 mb-8">
        <div className="eyebrow text-[#FF2D87] mb-2">Control Room</div>
        <h1 className="text-4xl lg:text-6xl font-black tracking-tighter">Admin Dashboard</h1>
      </div>
      <Tabs defaultValue="vendors">
        <TabsList className="rounded-none bg-white border border-[#0A0A0A] p-0 h-auto">
          {["vendors", "peptides", "prices", "resources"].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              data-testid={`tab-${t}`}
              className="rounded-none border-r border-[#0A0A0A] last:border-r-0 px-6 py-3 data-[state=active]:bg-[#0A0A0A] data-[state=active]:text-white font-mono uppercase tracking-widest text-xs"
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="vendors" className="mt-8"><VendorsPanel /></TabsContent>
        <TabsContent value="peptides" className="mt-8"><PeptidesPanel /></TabsContent>
        <TabsContent value="prices" className="mt-8"><PricesPanel /></TabsContent>
        <TabsContent value="resources" className="mt-8"><ResourcesPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function fmtErr(d) {
  if (!d) return "Error";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(d);
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between border-b border-[#0A0A0A] pb-3 mb-6">
      <h2 className="text-xl font-bold uppercase font-mono tracking-widest">{title}</h2>
      {action}
    </div>
  );
}

/* ----------------- VENDORS ----------------- */
function VendorsPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blankVendor);
  const [tagsStr, setTagsStr] = useState("");

  const load = () => api.get("/vendors").then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const payload = { ...form, tags: tagsStr.split(",").map((s) => s.trim()).filter(Boolean), rating: Number(form.rating) };
      await api.post("/vendors", payload);
      toast.success("Vendor added");
      setForm(blankVendor); setTagsStr("");
      load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
  };
  const del = async (id) => {
    if (!confirm("Delete this vendor and its prices?")) return;
    await api.delete(`/vendors/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 border border-[#0A0A0A] p-6">
        <SectionHeader title="New vendor" />
        <div className="space-y-4">
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v, slug: v.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} testId="v-name" />
          <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} testId="v-slug" />
          <Field label="Affiliate URL" value={form.affiliate_url} onChange={(v) => setForm({ ...form, affiliate_url: v })} testId="v-url" />
          <Field label="Logo URL" value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} />
          <div>
            <Label className="eyebrow text-[#5C5C5C]">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-none border-[#0A0A0A] mt-2 font-mono text-sm" data-testid="v-desc" />
          </div>
          <Field label="Tags (comma-sep)" value={tagsStr} onChange={setTagsStr} />
          <Field label="Discount code" value={form.discount_code} onChange={(v) => setForm({ ...form, discount_code: v })} testId="v-code" />
          <Field label="Rating (0-5)" type="number" value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
          <div className="flex items-center justify-between border border-[#E5E5E5] p-3">
            <Label className="eyebrow">Featured</Label>
            <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
          </div>
          <div className="flex items-center justify-between border border-[#E5E5E5] p-3">
            <div>
              <Label className="eyebrow">In price comparison</Label>
              <div className="text-[10px] font-mono text-[#5C5C5C] mt-0.5">
                Off = vendor stays on /vendors but is excluded from /compare & AI scrape
              </div>
            </div>
            <Switch
              checked={form.comparison_enabled !== false}
              onCheckedChange={(v) => setForm({ ...form, comparison_enabled: v })}
              data-testid="v-comparison-enabled"
            />
          </div>
          <Button onClick={save} data-testid="v-save" className="w-full rounded-none bg-[#FF2D87] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">Add vendor</Button>
        </div>
      </div>
      <div className="lg:col-span-7">
        <SectionHeader title={`Vendors (${items.length})`} />
        <div className="border border-[#E5E5E5]">
          {items.map((v) => (
            <div key={v.id} className="border-b border-[#E5E5E5] p-4 flex items-start justify-between gap-4">
              <div>
                <div className="font-bold">
                  {v.name}
                  {v.featured && <span className="ml-2 text-xs font-mono text-[#FF2D87]">★</span>}
                  {v.comparison_enabled === false && (
                    <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-[#5C5C5C] bg-[#F0F0F0] px-1.5 py-0.5">
                      no compare
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-[#5C5C5C]">{v.slug}</div>
                <div className="text-xs mt-1 truncate max-w-[420px]">{v.affiliate_url}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(v.id)} className="rounded-none hover:bg-[#E60000] hover:text-white" data-testid={`v-del-${v.slug}`}><Trash2 size={16} /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------- PEPTIDES ----------------- */
function PeptidesPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blankPeptide);
  const load = () => api.get("/peptides").then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await api.post("/peptides", { ...form, typical_dose_mcg: Number(form.typical_dose_mcg) });
      toast.success("Peptide added"); setForm(blankPeptide); load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
  };
  const del = async (id) => { if (!confirm("Delete peptide & its prices?")) return; await api.delete(`/peptides/${id}`); load(); toast.success("Deleted"); };

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 border border-[#0A0A0A] p-6">
        <SectionHeader title="New peptide" />
        <div className="space-y-4">
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v, slug: v.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} testId="p-name" />
          <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} />
          <Field label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
          <Field label="Typical dose (mcg)" type="number" value={form.typical_dose_mcg} onChange={(v) => setForm({ ...form, typical_dose_mcg: v })} />
          <div>
            <Label className="eyebrow text-[#5C5C5C]">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-none border-[#0A0A0A] mt-2 font-mono text-sm" />
          </div>
          <Button onClick={save} data-testid="p-save" className="w-full rounded-none bg-[#FF2D87] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">Add peptide</Button>
        </div>
      </div>
      <div className="lg:col-span-7">
        <SectionHeader title={`Peptides (${items.length})`} />
        <div className="border border-[#E5E5E5]">
          {items.map((p) => (
            <div key={p.id} className="border-b border-[#E5E5E5] p-4 flex items-start justify-between gap-4">
              <div>
                <div className="font-bold">{p.name}</div>
                <div className="text-xs font-mono text-[#5C5C5C]">{p.category} · {p.typical_dose_mcg} mcg typical</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(p.id)} className="rounded-none hover:bg-[#E60000] hover:text-white"><Trash2 size={16} /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------- PRICES (manual-friendly) ----------------- */
function PricesPanel() {
  const [items, setItems] = useState([]);
  const [peptides, setPeptides] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [busy, setBusy] = useState(null);

  // Quick-add form state — vendor stays selected across saves
  const [vendorId, setVendorId] = useState("");
  const [peptideQuery, setPeptideQuery] = useState("");
  const [peptideId, setPeptideId] = useState("");
  const [sizeMg, setSizeMg] = useState(5);
  const [priceUsd, setPriceUsd] = useState("");
  const [productUrl, setProductUrl] = useState("");

  // Bulk paste box
  const [bulkText, setBulkText] = useState("");

  const load = async () => {
    const [pr, pe, vn] = await Promise.all([
      api.get("/prices"), api.get("/peptides"), api.get("/vendors")
    ]);
    setItems(pr.data); setPeptides(pe.data); setVendors(vn.data);
  };
  useEffect(() => { load(); }, []);

  const lookup = (arr, id, key = "name") => arr.find((x) => x.id === id)?.[key] || "—";

  // ----- Peptide autocomplete -----
  const peptideMatches = peptideQuery.trim()
    ? peptides
        .filter((p) => p.name.toLowerCase().includes(peptideQuery.toLowerCase()))
        .slice(0, 8)
    : [];
  const exactMatch = peptides.find(
    (p) => p.name.toLowerCase() === peptideQuery.trim().toLowerCase()
  );

  const ensurePeptide = async () => {
    if (peptideId) return peptideId;
    if (exactMatch) return exactMatch.id;
    if (!peptideQuery.trim()) return null;
    const name = peptideQuery.trim();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { data } = await api.post("/peptides", {
      name, slug, description: "", typical_dose_mcg: 0, category: "",
    });
    const fresh = await api.get("/peptides");
    setPeptides(fresh.data);
    return data.id;
  };

  const saveOne = async () => {
    if (!vendorId) { toast.error("Pick a vendor first"); return; }
    if (!peptideQuery.trim() && !peptideId) { toast.error("Type a peptide name"); return; }
    if (!priceUsd || Number(priceUsd) <= 0) { toast.error("Enter a price"); return; }
    setBusy("save");
    try {
      const pid = await ensurePeptide();
      if (!pid) { toast.error("Could not resolve peptide"); return; }
      await api.post("/prices", {
        peptide_id: pid, vendor_id: vendorId,
        size_mg: Number(sizeMg) || 0,
        price_usd: Number(priceUsd),
        product_url: productUrl.trim(),
        scrape_selector: "",
      });
      toast.success(`Added ${peptideQuery || lookup(peptides, pid)} · ${sizeMg}mg · $${priceUsd}`);
      // Keep vendor selected, clear the rest
      setPeptideQuery(""); setPeptideId(""); setSizeMg(5);
      setPriceUsd(""); setProductUrl("");
      load();
    } catch (e) {
      toast.error(fmtErr(e.response?.data?.detail));
    } finally {
      setBusy(null);
    }
  };

  // ----- Bulk paste -----
  const parseBulkRow = (line) => {
    // Accept tab OR comma OR multiple spaces
    const parts = line.split(/\t|,|\s{2,}/).map((s) => s.trim()).filter(Boolean);
    if (parts.length < 3) return null;
    const [name, size, price, url = ""] = parts;
    return {
      name, size: parseFloat(size.replace(/[^\d.]/g, "")) || 0,
      price: parseFloat(price.replace(/[^\d.]/g, "")) || 0, url,
    };
  };

  const runBulk = async () => {
    if (!vendorId) { toast.error("Pick a vendor first"); return; }
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows = lines.map(parseBulkRow).filter(Boolean);
    if (!rows.length) { toast.error("No valid rows. Format: name TAB size TAB price [TAB url]"); return; }
    if (!confirm(`Add ${rows.length} prices to ${lookup(vendors, vendorId)}?`)) return;
    setBusy("bulk");
    let added = 0, failed = 0;
    let freshPeptides = peptides;
    for (const r of rows) {
      try {
        let pep = freshPeptides.find((p) => p.name.toLowerCase() === r.name.toLowerCase());
        if (!pep) {
          const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const { data } = await api.post("/peptides", {
            name: r.name, slug, description: "", typical_dose_mcg: 0, category: "",
          });
          pep = data;
          freshPeptides = [...freshPeptides, pep];
        }
        await api.post("/prices", {
          peptide_id: pep.id, vendor_id: vendorId,
          size_mg: r.size, price_usd: r.price,
          product_url: r.url, scrape_selector: "",
        });
        added += 1;
      } catch (e) {
        failed += 1;
      }
    }
    toast.success(`Bulk done · added ${added} · failed ${failed}`);
    setBulkText("");
    setBusy(null);
    load();
  };

  const del = async (id) => { await api.delete(`/prices/${id}`); load(); };
  const scrapeAll = async () => {
    setBusy("all");
    try {
      const { data } = await api.post("/prices/scrape-all");
      toast.success(`Done · ok ${data.ok} · skipped ${data.skipped} · errors ${data.errors}`);
      load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
    finally { setBusy(null); }
  };

  const aiBulkImport = async () => {
    if (!confirm("Run AI bulk import for ALL comparison-enabled vendors? Takes 2-5 min and uses Emergent LLM credits (~$1-3).")) return;
    setBusy("ai");
    try {
      const { data } = await api.post("/prices/bulk-import", null, { timeout: 600000 });
      toast.success(`AI import done · +${data.peptides_added} peptides · +${data.prices_added} prices · ${data.prices_updated} updated`);
      load();
    } catch (e) {
      toast.error(fmtErr(e.response?.data?.detail) || "Import may have timed out — refresh to see partial results");
    } finally { setBusy(null); }
  };

  // Filter the "Recent" list to the currently-selected vendor for fast verification
  const recent = vendorId
    ? items.filter((p) => p.vendor_id === vendorId).slice(0, 30)
    : items.slice(0, 30);

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      {/* LEFT: Quick add */}
      <div className="lg:col-span-5 space-y-6">
        <div className="border border-[#0A0A0A] p-6">
          <SectionHeader title="Quick add price" />

          {/* Vendor selector — sticky across saves */}
          <div className="mb-5">
            <Label className="eyebrow text-[#5C5C5C]">1 · Vendor (stays selected)</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger className="rounded-none border-[#0A0A0A] mt-2 font-mono" data-testid="pr-vendor">
                <SelectValue placeholder="Pick a vendor first…" />
              </SelectTrigger>
              <SelectContent className="rounded-none max-h-80">
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="rounded-none font-mono text-sm">
                    {v.name} {v.comparison_enabled === false && "· (no compare)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Peptide autocomplete */}
          <div className="mb-4">
            <Label className="eyebrow text-[#5C5C5C]">2 · Peptide (type to search)</Label>
            <Input
              value={peptideQuery}
              onChange={(e) => { setPeptideQuery(e.target.value); setPeptideId(""); }}
              placeholder="e.g. BPC-157"
              className="rounded-none border-[#0A0A0A] mt-2 font-mono"
              data-testid="pr-peptide-search"
            />
            {peptideMatches.length > 0 && !exactMatch && !peptideId && (
              <div className="mt-1 border border-[#E5E5E5] bg-white max-h-40 overflow-y-auto">
                {peptideMatches.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setPeptideQuery(p.name); setPeptideId(p.id); }}
                    className="w-full text-left px-3 py-2 text-sm font-mono hover:bg-[#FFF0F7] border-b border-[#F0F0F0]"
                    data-testid={`pr-pep-match-${p.slug}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            {peptideQuery.trim() && !exactMatch && !peptideMatches.length && (
              <div className="mt-1 px-3 py-2 text-xs font-mono text-[#FF2D87] bg-[#FFF0F7] border border-[#F0CFE0]">
                + New peptide will be created: <b>{peptideQuery.trim()}</b>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Label className="eyebrow text-[#5C5C5C]">3 · Size (mg)</Label>
              <Input type="number" step="0.5" value={sizeMg}
                onChange={(e) => setSizeMg(e.target.value)}
                className="rounded-none border-[#0A0A0A] mt-2 font-mono"
                data-testid="pr-size" />
            </div>
            <div>
              <Label className="eyebrow text-[#5C5C5C]">4 · Price (USD)</Label>
              <Input type="number" step="0.01" value={priceUsd}
                placeholder="39.99"
                onChange={(e) => setPriceUsd(e.target.value)}
                className="rounded-none border-[#0A0A0A] mt-2 font-mono"
                data-testid="pr-price" />
            </div>
          </div>

          <div className="mb-4">
            <Label className="eyebrow text-[#5C5C5C]">5 · Product URL (optional)</Label>
            <Input value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://vendor.com/product/..."
              className="rounded-none border-[#0A0A0A] mt-2 font-mono"
              data-testid="pr-url" />
          </div>

          <Button onClick={saveOne} disabled={busy === "save"}
            data-testid="pr-save"
            className="w-full rounded-none bg-[#FF2D87] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">
            {busy === "save" ? "Saving…" : "+ Add price (vendor stays)"}
          </Button>
        </div>

        {/* Bulk paste */}
        <div className="border border-[#0A0A0A] p-6">
          <SectionHeader title="Bulk paste" />
          <p className="text-xs font-mono text-[#5C5C5C] mb-3 leading-relaxed">
            Paste one row per line. Format: <b>name [TAB] size [TAB] price [TAB] url(optional)</b>.
            Tabs, commas, or multiple spaces all work as separators.
          </p>
          <Textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)}
            placeholder={"BPC-157\t5\t39.99\nTB-500\t5\t59.99\nSemaglutide\t10\t189.00"}
            rows={6}
            className="rounded-none border-[#0A0A0A] font-mono text-xs"
            data-testid="pr-bulk-text" />
          <Button onClick={runBulk} disabled={busy === "bulk"}
            data-testid="pr-bulk-go"
            className="w-full mt-3 rounded-none bg-[#0A0A0A] text-white hover:bg-[#FF2D87] h-10 font-mono uppercase tracking-widest text-xs">
            {busy === "bulk" ? "Importing…" : "Import all rows"}
          </Button>
        </div>
      </div>

      {/* RIGHT: Recent + bulk actions */}
      <div className="lg:col-span-7">
        <SectionHeader title={vendorId ? `Recent — ${lookup(vendors, vendorId)}` : "Recent prices"} action={
          <div className="flex gap-2">
            <Button onClick={aiBulkImport} disabled={busy === "ai"} className="rounded-none bg-[#FF2D87] text-white hover:bg-[#0A0A0A] font-mono uppercase tracking-widest text-xs" data-testid="ai-bulk-import">
              <RefreshCw size={14} className={`mr-2 ${busy === "ai" ? "animate-spin" : ""}`} /> AI bulk import
            </Button>
            <Button onClick={scrapeAll} disabled={busy === "all"} className="rounded-none bg-[#0A0A0A] text-white hover:bg-[#FF2D87] font-mono uppercase tracking-widest text-xs" data-testid="scrape-all">
              <RefreshCw size={14} className={`mr-2 ${busy === "all" ? "animate-spin" : ""}`} /> Scrape all
            </Button>
          </div>
        } />
        <div className="border border-[#E5E5E5] max-h-[680px] overflow-y-auto">
          {recent.length === 0 && (
            <div className="p-6 text-sm font-mono text-[#A0A0A0]">No prices yet for this vendor.</div>
          )}
          {recent.map((pr) => (
            <div key={pr.id} className="border-b border-[#E5E5E5] p-3 grid grid-cols-12 gap-3 items-center text-sm">
              <div className="col-span-4">
                <div className="font-bold">{lookup(peptides, pr.peptide_id)}</div>
                <div className="text-[10px] font-mono text-[#5C5C5C]">{lookup(vendors, pr.vendor_id)}</div>
              </div>
              <div className="col-span-2 font-mono text-[#FF2D87] font-bold">{pr.size_mg} mg</div>
              <div className="col-span-2 font-mono font-bold">${Number(pr.price_usd).toFixed(2)}</div>
              <div className="col-span-3 text-[10px] font-mono text-[#5C5C5C] truncate">
                {pr.last_status || "manual"}
              </div>
              <div className="col-span-1 flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => del(pr.id)}
                  className="rounded-none hover:bg-[#E60000] hover:text-white h-8 w-8"
                  data-testid={`pr-del-${pr.id}`}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------- RESOURCES ----------------- */
function ResourcesPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blankResource);
  const load = () => api.get("/resources").then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try { await api.post("/resources", form); toast.success("Saved"); setForm(blankResource); load(); }
    catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
  };
  const del = async (id) => { await api.delete(`/resources/${id}`); load(); };

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 border border-[#0A0A0A] p-6">
        <SectionHeader title="New resource" />
        <div className="space-y-4">
          <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} testId="r-title" />
          <div>
            <Label className="eyebrow text-[#5C5C5C]">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger className="rounded-none border-[#0A0A0A] mt-2 font-mono"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-none">
                {["Guide", "Research", "Reference", "News"].map((c) => <SelectItem key={c} value={c} className="rounded-none font-mono text-sm">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Field label="Summary" value={form.summary} onChange={(v) => setForm({ ...form, summary: v })} />
          <Field label="External URL (optional)" value={form.url} onChange={(v) => setForm({ ...form, url: v })} />
          <div>
            <Label className="eyebrow text-[#5C5C5C]">Content (if internal)</Label>
            <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} className="rounded-none border-[#0A0A0A] mt-2 font-mono text-sm" />
          </div>
          <Button onClick={save} data-testid="r-save" className="w-full rounded-none bg-[#FF2D87] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">Add resource</Button>
        </div>
      </div>
      <div className="lg:col-span-7">
        <SectionHeader title={`Resources (${items.length})`} />
        <div className="border border-[#E5E5E5]">
          {items.map((r) => (
            <div key={r.id} className="border-b border-[#E5E5E5] p-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#FF2D87]">{r.category}</div>
                <div className="font-bold">{r.title}</div>
                <div className="text-xs text-[#5C5C5C]">{r.summary}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(r.id)} className="rounded-none hover:bg-[#E60000] hover:text-white"><Trash2 size={16} /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", testId }) {
  return (
    <div>
      <Label className="eyebrow text-[#5C5C5C]">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        className="rounded-none border-[#0A0A0A] mt-2 font-mono text-sm h-11"
      />
    </div>
  );
}
