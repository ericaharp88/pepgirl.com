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

const blankVendor = { name: "", slug: "", description: "", affiliate_url: "", logo_url: "", rating: 4.5, tags: [], featured: false };
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
        <div className="eyebrow text-[#002FA7] mb-2">Control Room</div>
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
          <Field label="Rating (0-5)" type="number" value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
          <div className="flex items-center justify-between border border-[#E5E5E5] p-3">
            <Label className="eyebrow">Featured</Label>
            <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
          </div>
          <Button onClick={save} data-testid="v-save" className="w-full rounded-none bg-[#002FA7] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">Add vendor</Button>
        </div>
      </div>
      <div className="lg:col-span-7">
        <SectionHeader title={`Vendors (${items.length})`} />
        <div className="border border-[#E5E5E5]">
          {items.map((v) => (
            <div key={v.id} className="border-b border-[#E5E5E5] p-4 flex items-start justify-between gap-4">
              <div>
                <div className="font-bold">{v.name} {v.featured && <span className="ml-2 text-xs font-mono text-[#002FA7]">★</span>}</div>
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
          <Button onClick={save} data-testid="p-save" className="w-full rounded-none bg-[#002FA7] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">Add peptide</Button>
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

/* ----------------- PRICES ----------------- */
function PricesPanel() {
  const [items, setItems] = useState([]);
  const [peptides, setPeptides] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState(blankPrice);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    const [pr, pe, vn] = await Promise.all([api.get("/prices"), api.get("/peptides"), api.get("/vendors")]);
    setItems(pr.data); setPeptides(pe.data); setVendors(vn.data);
  };
  useEffect(() => { load(); }, []);

  const lookup = (arr, id, key = "name") => arr.find((x) => x.id === id)?.[key] || "—";

  const save = async () => {
    try {
      await api.post("/prices", { ...form, size_mg: Number(form.size_mg), price_usd: Number(form.price_usd) });
      toast.success("Price added"); setForm(blankPrice); load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
  };
  const del = async (id) => { await api.delete(`/prices/${id}`); load(); };
  const scrape = async (id) => {
    setBusy(id);
    try {
      const { data } = await api.post(`/prices/${id}/scrape`);
      toast.success(`Scraped → $${data.price_usd}`); load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
    finally { setBusy(null); }
  };
  const scrapeAll = async () => {
    setBusy("all");
    try {
      const { data } = await api.post("/prices/scrape-all");
      toast.success(`Done · ok ${data.ok} · skipped ${data.skipped} · errors ${data.errors}`);
      load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
    finally { setBusy(null); }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 border border-[#0A0A0A] p-6">
        <SectionHeader title="New price entry" />
        <div className="space-y-4">
          <div>
            <Label className="eyebrow text-[#5C5C5C]">Peptide</Label>
            <Select value={form.peptide_id} onValueChange={(v) => setForm({ ...form, peptide_id: v })}>
              <SelectTrigger className="rounded-none border-[#0A0A0A] mt-2 font-mono" data-testid="pr-peptide"><SelectValue placeholder="Select peptide" /></SelectTrigger>
              <SelectContent className="rounded-none">
                {peptides.map((p) => <SelectItem key={p.id} value={p.id} className="rounded-none font-mono text-sm">{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="eyebrow text-[#5C5C5C]">Vendor</Label>
            <Select value={form.vendor_id} onValueChange={(v) => setForm({ ...form, vendor_id: v })}>
              <SelectTrigger className="rounded-none border-[#0A0A0A] mt-2 font-mono" data-testid="pr-vendor"><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent className="rounded-none">
                {vendors.map((v) => <SelectItem key={v.id} value={v.id} className="rounded-none font-mono text-sm">{v.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Field label="Vial size (mg)" type="number" value={form.size_mg} onChange={(v) => setForm({ ...form, size_mg: v })} />
          <Field label="Price (USD)" type="number" value={form.price_usd} onChange={(v) => setForm({ ...form, price_usd: v })} />
          <Field label="Product URL (for scrape)" value={form.product_url} onChange={(v) => setForm({ ...form, product_url: v })} testId="pr-url" />
          <Field label="CSS Selector (price element)" value={form.scrape_selector} onChange={(v) => setForm({ ...form, scrape_selector: v })} testId="pr-selector" />
          <div className="text-[11px] font-mono text-[#5C5C5C] leading-relaxed">
            Tip: CSS selector example → <code>.price .amount</code> or <code>span.product-price</code>
          </div>
          <Button onClick={save} data-testid="pr-save" className="w-full rounded-none bg-[#002FA7] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">Add price</Button>
        </div>
      </div>
      <div className="lg:col-span-7">
        <SectionHeader title={`Prices (${items.length})`} action={
          <Button onClick={scrapeAll} disabled={busy === "all"} className="rounded-none bg-[#0A0A0A] text-white hover:bg-[#002FA7] font-mono uppercase tracking-widest text-xs" data-testid="scrape-all">
            <RefreshCw size={14} className={`mr-2 ${busy === "all" ? "animate-spin" : ""}`} /> Scrape all
          </Button>
        } />
        <div className="border border-[#E5E5E5] max-h-[600px] overflow-y-auto">
          {items.map((pr) => (
            <div key={pr.id} className="border-b border-[#E5E5E5] p-3 grid grid-cols-12 gap-3 items-center text-sm">
              <div className="col-span-3"><div className="font-bold">{lookup(peptides, pr.peptide_id)}</div><div className="text-[10px] font-mono text-[#5C5C5C]">{pr.size_mg} mg</div></div>
              <div className="col-span-3 font-mono text-xs">{lookup(vendors, pr.vendor_id)}</div>
              <div className="col-span-2 font-mono text-xl font-bold">${pr.price_usd?.toFixed(2)}</div>
              <div className="col-span-2 text-[10px] font-mono text-[#5C5C5C] truncate" title={pr.last_status}>{pr.last_status}</div>
              <div className="col-span-2 flex gap-2 justify-end">
                <Button variant="ghost" size="icon" onClick={() => scrape(pr.id)} disabled={busy === pr.id || !pr.product_url} className="rounded-none hover:bg-[#002FA7] hover:text-white" data-testid={`scrape-${pr.id}`}>
                  <RotateCw size={14} className={busy === pr.id ? "animate-spin" : ""} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => del(pr.id)} className="rounded-none hover:bg-[#E60000] hover:text-white"><Trash2 size={14} /></Button>
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
          <Button onClick={save} data-testid="r-save" className="w-full rounded-none bg-[#002FA7] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">Add resource</Button>
        </div>
      </div>
      <div className="lg:col-span-7">
        <SectionHeader title={`Resources (${items.length})`} />
        <div className="border border-[#E5E5E5]">
          {items.map((r) => (
            <div key={r.id} className="border-b border-[#E5E5E5] p-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#002FA7]">{r.category}</div>
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
