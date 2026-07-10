import { useEffect, useMemo, useState } from "react";
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
import { RefreshCw, Trash2, RotateCw, Pencil, Check, X, Star, KeyRound, ArrowUp, ArrowDown } from "lucide-react";

const blankVendor = { name: "", slug: "", description: "", affiliate_url: "", logo_url: "", rating: 4.5, tags: [], discount_code: "", promo_badge: "", nickname_notes: "", featured: false, comparison_enabled: true };
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
        <div className="eyebrow text-[#B87A6A] mb-2">Control Room</div>
        <h1 className="text-4xl lg:text-6xl font-black tracking-tighter">Admin Dashboard</h1>
      </div>
      <Tabs defaultValue="vendors">
        <TabsList className="rounded-none bg-white border border-[#0A0A0A] p-0 h-auto flex-wrap">
          {["vendors", "peptides", "prices", "promotions", "resources", "socials", "settings"].map((t) => (
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
        <TabsContent value="promotions" className="mt-8"><PromotionsPanel /></TabsContent>
        <TabsContent value="resources" className="mt-8"><ResourcesPanel /></TabsContent>
        <TabsContent value="socials" className="mt-8"><SocialsPanel /></TabsContent>
        <TabsContent value="settings" className="mt-8"><SettingsPanel /></TabsContent>
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
          <Field label="Promo badge (e.g. BOGO, FREE BAC)" value={form.promo_badge} onChange={(v) => setForm({ ...form, promo_badge: v })} testId="v-promo" />
          <div>
            <Label className="eyebrow text-[#B87A6A]">
              Peptide Nickname Guide{" "}
              <span className="text-[#5C5C5C] normal-case tracking-normal font-mono text-[10px]">
                (one per line · shows publicly on vendor card)
              </span>
            </Label>
            <Textarea
              value={form.nickname_notes}
              onChange={(e) => setForm({ ...form, nickname_notes: e.target.value })}
              placeholder={`Tirzepatide = GLP2, Peptide T\nSemaglutide = GLP-SG\nRetatrutide = GLP3`}
              rows={4}
              className="rounded-none border-[#B87A6A] mt-2 font-mono text-xs"
              data-testid="v-nickname-notes"
            />
          </div>
          <Field label="Rating (0-5)" type="number" value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} />
          <div className="flex items-center justify-between border border-[#E5E5E5] p-3">
            <Label className="eyebrow">Featured</Label>
            <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
          </div>
          <Button onClick={save} data-testid="v-save" className="w-full rounded-none bg-[#B87A6A] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">Add vendor</Button>
        </div>
      </div>
      <div className="lg:col-span-7">
        <SectionHeader title={`Vendors (${items.length})`} />
        <div className="border border-[#E5E5E5]">
          {items.map((v) => (
            <VendorRow key={v.id} vendor={v} onChanged={load} onDelete={() => del(v.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function VendorRow({ vendor, onChanged, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(vendor.nickname_notes || "");
  const [logoUrl, setLogoUrl] = useState(vendor.logo_url || "");
  const [busy, setBusy] = useState(false);
  const [togglingFeat, setTogglingFeat] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const initialLogin = vendor.login_config || { login_url: "", username: "", password: "", username_selector: "", password_selector: "", submit_selector: "" };
  const [loginCfg, setLoginCfg] = useState(initialLogin);
  const [testResult, setTestResult] = useState(null); // { ok, message, screenshot_b64 }
  const [testingLogin, setTestingLogin] = useState(false);

  const putVendor = (patch) =>
    api.put(`/vendors/${vendor.id}`, {
      name: vendor.name,
      slug: vendor.slug,
      description: vendor.description || "",
      affiliate_url: vendor.affiliate_url,
      logo_url: vendor.logo_url || "",
      rating: vendor.rating || 0,
      tags: vendor.tags || [],
      discount_code: vendor.discount_code || "",
      promo_badge: vendor.promo_badge || "",
      nickname_notes: vendor.nickname_notes || "",
      login_config: vendor.login_config || null,
      featured: vendor.featured || false,
      comparison_enabled: vendor.comparison_enabled !== false,
      ...patch,
    });

  const save = async () => {
    setBusy(true);
    try {
      await putVendor({ nickname_notes: notes, logo_url: logoUrl.trim() });
      toast.success("Saved");
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(fmtErr(e.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const toggleFeatured = async () => {
    setTogglingFeat(true);
    try {
      const next = !vendor.featured;
      await putVendor({ featured: next });
      toast.success(next ? `${vendor.name} featured` : `${vendor.name} un-featured`);
      onChanged();
    } catch (e) {
      toast.error(fmtErr(e.response?.data?.detail));
    } finally {
      setTogglingFeat(false);
    }
  };

  const saveLogin = async () => {
    // If all key fields empty, save null to clear
    const empty = !loginCfg.login_url && !loginCfg.username && !loginCfg.password;
    try {
      await putVendor({ login_config: empty ? null : loginCfg });
      toast.success(empty ? "Login config removed" : "Login config saved");
      onChanged();
    } catch (e) {
      toast.error(fmtErr(e.response?.data?.detail));
    }
  };

  const testLogin = async () => {
    setTestingLogin(true);
    setTestResult(null);
    try {
      // First save current values
      await putVendor({ login_config: loginCfg });
      const { data } = await api.post(`/vendors/${vendor.id}/test-login`);
      setTestResult(data);
      if (data.ok) toast.success("Login test passed ✓");
      else toast.error("Login test inconclusive — check screenshot");
    } catch (e) {
      const detail = e.response?.data?.detail || String(e);
      setTestResult({ ok: false, message: detail });
      toast.error(fmtErr(detail));
    } finally {
      setTestingLogin(false);
    }
  };

  const hasLogin = !!(vendor.login_config && vendor.login_config.login_url);

  return (
    <div className="border-b border-[#E5E5E5] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-bold">
            {vendor.name}
          </div>
          <div className="text-xs font-mono text-[#5C5C5C]">{vendor.slug}</div>
          <div className="text-xs mt-1 truncate max-w-[420px]">{vendor.affiliate_url}</div>
          {!editing && vendor.nickname_notes && (
            <pre
              data-testid={`v-notes-preview-${vendor.slug}`}
              className="mt-2 whitespace-pre-wrap text-[11px] font-mono text-[#0A0A0A] bg-[#FBF3EC] border border-[#E8CDBF] px-3 py-2 max-w-[420px]"
            >
              {vendor.nickname_notes}
            </pre>
          )}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={toggleFeatured}
            disabled={togglingFeat}
            title={vendor.featured ? "Click to UN-feature this vendor" : "Click to FEATURE this vendor"}
            data-testid={`v-fav-${vendor.slug}`}
            className={`h-9 w-9 inline-flex items-center justify-center rounded-none transition ${
              vendor.featured
                ? "bg-[#B87A6A] text-white hover:bg-[#0A0A0A]"
                : "bg-white text-[#C0C0C0] border border-[#E5E5E5] hover:text-[#B87A6A] hover:border-[#B87A6A]"
            } ${togglingFeat ? "opacity-50" : ""}`}
          >
            <Star
              size={16}
              fill={vendor.featured ? "currentColor" : "none"}
              strokeWidth={2}
            />
          </button>
          <button
            type="button"
            onClick={() => { setLoginOpen((o) => !o); setEditing(false); }}
            title={hasLogin ? "Login credentials saved — click to edit / test" : "Add login credentials for scraper"}
            data-testid={`v-login-${vendor.slug}`}
            className={`h-9 w-9 inline-flex items-center justify-center rounded-none transition ${
              hasLogin
                ? "bg-[#E8CDBF] text-[#0A0A0A] hover:bg-[#B87A6A] hover:text-white"
                : "bg-white text-[#C0C0C0] border border-[#E5E5E5] hover:text-[#B87A6A] hover:border-[#B87A6A]"
            }`}
          >
            <KeyRound size={16} />
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setEditing((e) => !e); setLoginOpen(false); setNotes(vendor.nickname_notes || ""); setLogoUrl(vendor.logo_url || ""); }}
            className="rounded-none hover:bg-[#B87A6A] hover:text-white"
            title="Edit peptide nickname guide"
            data-testid={`v-edit-${vendor.slug}`}
          >
            <Pencil size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="rounded-none hover:bg-[#E60000] hover:text-white"
            data-testid={`v-del-${vendor.slug}`}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 bg-[#FDF9F5] border border-[#B87A6A] p-3 space-y-3">
          <div>
            <Label className="eyebrow text-[#B87A6A]">Logo URL</Label>
            <div className="flex items-center gap-3 mt-2">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="logo preview"
                  className="h-12 w-12 rounded-full object-contain border border-[#E8CDBF] bg-white flex-shrink-0"
                  onError={(e) => { e.currentTarget.style.opacity = "0.3"; }}
                />
              )}
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://... paste image URL"
                className="rounded-none border-[#0A0A0A] font-mono text-xs h-9 bg-white flex-1"
                data-testid={`v-logo-input-${vendor.slug}`}
              />
            </div>
          </div>

          <div>
          <Label className="eyebrow text-[#B87A6A]">
            Peptide Nickname Guide{" "}
            <span className="text-[#5C5C5C] normal-case tracking-normal font-mono text-[10px]">
              · one per line · shows publicly under this vendor
            </span>
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={`Tirzepatide = GLP2, Peptide T\nSemaglutide = GLP-SG\nRetatrutide = GLP3`}
            rows={5}
            className="rounded-none border-[#0A0A0A] mt-2 font-mono text-xs bg-white"
            data-testid={`v-notes-input-${vendor.slug}`}
          />
          </div>
          <div className="flex gap-2 mt-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => setEditing(false)}
              className="rounded-none h-9 font-mono text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={busy}
              className="rounded-none bg-[#B87A6A] hover:bg-[#0A0A0A] text-white h-9 font-mono uppercase tracking-widest text-xs"
              data-testid={`v-notes-save-${vendor.slug}`}
            >
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {loginOpen && (
        <div className="mt-3 bg-[#FDF9F5] border border-[#B87A6A] p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <Label className="eyebrow text-[#B87A6A]">
              Vendor Login (Scraper Only)
            </Label>
            <span className="text-[9px] font-mono uppercase tracking-widest text-[#5C5C5C]">
              🔒 Stored server-side, never shown publicly
            </span>
          </div>
          <p className="text-[10px] font-mono text-[#5C5C5C] leading-relaxed">
            Use a <b>dedicated research account</b> — not your personal shopping login. Password will be sent to the scraper and stored in your admin DB.
          </p>

          <div className="grid grid-cols-1 gap-2">
            <Input
              value={loginCfg.login_url}
              onChange={(e) => setLoginCfg({ ...loginCfg, login_url: e.target.value })}
              placeholder="Login URL (e.g. https://aminowellusa.com/account/login)"
              className="rounded-none border-[#0A0A0A] h-9 font-mono text-xs bg-white"
              data-testid={`v-login-url-${vendor.slug}`}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={loginCfg.username}
                onChange={(e) => setLoginCfg({ ...loginCfg, username: e.target.value })}
                placeholder="Email / username"
                className="rounded-none border-[#0A0A0A] h-9 font-mono text-xs bg-white"
                data-testid={`v-login-user-${vendor.slug}`}
              />
              <Input
                type="password"
                value={loginCfg.password}
                onChange={(e) => setLoginCfg({ ...loginCfg, password: e.target.value })}
                placeholder="Password"
                className="rounded-none border-[#0A0A0A] h-9 font-mono text-xs bg-white"
                data-testid={`v-login-pass-${vendor.slug}`}
              />
            </div>
            <details className="text-[10px] font-mono">
              <summary className="cursor-pointer text-[#5C5C5C] hover:text-[#B87A6A]">
                Advanced (custom CSS selectors)
              </summary>
              <div className="grid grid-cols-1 gap-2 mt-2">
                <Input
                  value={loginCfg.username_selector}
                  onChange={(e) => setLoginCfg({ ...loginCfg, username_selector: e.target.value })}
                  placeholder='Username selector (blank = auto)  e.g. input[name="email"]'
                  className="rounded-none border-[#E5E5E5] h-9 font-mono text-xs bg-white"
                />
                <Input
                  value={loginCfg.password_selector}
                  onChange={(e) => setLoginCfg({ ...loginCfg, password_selector: e.target.value })}
                  placeholder='Password selector (blank = auto)  e.g. input[type="password"]'
                  className="rounded-none border-[#E5E5E5] h-9 font-mono text-xs bg-white"
                />
                <Input
                  value={loginCfg.submit_selector}
                  onChange={(e) => setLoginCfg({ ...loginCfg, submit_selector: e.target.value })}
                  placeholder='Submit button selector (blank = auto)'
                  className="rounded-none border-[#E5E5E5] h-9 font-mono text-xs bg-white"
                />
              </div>
            </details>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => { setLoginOpen(false); setTestResult(null); }}
              className="rounded-none h-9 font-mono text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={saveLogin}
              className="rounded-none bg-[#0A0A0A] hover:bg-[#B87A6A] text-white h-9 font-mono uppercase tracking-widest text-xs"
              data-testid={`v-login-save-${vendor.slug}`}
            >
              Save
            </Button>
            <Button
              onClick={testLogin}
              disabled={testingLogin || !loginCfg.login_url || !loginCfg.username || !loginCfg.password}
              className="rounded-none bg-[#B87A6A] hover:bg-[#0A0A0A] text-white h-9 font-mono uppercase tracking-widest text-xs"
              data-testid={`v-login-test-${vendor.slug}`}
            >
              {testingLogin ? "Testing…" : "Test login"}
            </Button>
          </div>

          {testResult && (
            <div className={`mt-2 border p-3 text-xs font-mono ${testResult.ok ? "border-green-600 bg-green-50" : "border-[#E60000] bg-red-50"}`}>
              <div className="font-bold mb-1">
                {testResult.ok ? "✓ Login test passed" : "✗ Login test failed / inconclusive"}
              </div>
              <div className="text-[11px]">{testResult.message}</div>
              {testResult.final_url && (
                <div className="mt-1 text-[10px] text-[#5C5C5C] truncate">
                  landed on: {testResult.final_url}
                </div>
              )}
              {testResult.screenshot_b64 && (
                <div className="mt-2">
                  <div className="text-[10px] text-[#5C5C5C] mb-1">Screenshot after login attempt:</div>
                  <img
                    alt="login test result"
                    src={`data:image/jpeg;base64,${testResult.screenshot_b64}`}
                    className="max-w-full border border-[#E5E5E5]"
                    style={{ maxHeight: "300px" }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------- PEPTIDES ----------------- */
function PeptidesPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blankPeptide);
  const [selected, setSelected] = useState(new Set()); // ids selected for merge
  const [keepId, setKeepId] = useState("");
  const [search, setSearch] = useState("");
  const [merging, setMerging] = useState(false);

  const load = () =>
    api.get("/peptides").then(({ data }) => {
      setItems(data);
      // drop stale ids
      setSelected((prev) => {
        const alive = new Set(data.map((p) => p.id));
        return new Set([...prev].filter((id) => alive.has(id)));
      });
    });
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await api.post("/peptides", { ...form, typical_dose_mcg: Number(form.typical_dose_mcg) });
      toast.success("Peptide added"); setForm(blankPeptide); load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
  };
  const del = async (id) => {
    if (!confirm("Delete peptide & its prices?")) return;
    await api.delete(`/peptides/${id}`);
    load();
    toast.success("Deleted");
  };

  const toggleSel = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      // if we removed the current keep target, clear it
      if (id === keepId && !next.has(id)) setKeepId("");
      // if only 1 selected and none set as keep, auto-pick
      if (next.size === 1 && !keepId) setKeepId([...next][0]);
      return next;
    });

  const clearSelection = () => { setSelected(new Set()); setKeepId(""); };

  const runMerge = async () => {
    if (selected.size < 2) { toast.error("Select at least 2 peptides"); return; }
    if (!keepId || !selected.has(keepId)) { toast.error("Pick which one to keep"); return; }
    const mergeIds = [...selected].filter((id) => id !== keepId);
    const keepName = items.find((p) => p.id === keepId)?.name || "?";
    const merged = mergeIds.map((id) => items.find((p) => p.id === id)?.name || "?").join(", ");
    if (!confirm(`Merge ${merged} INTO "${keepName}"?\n\nAll prices from the merged peptides will move to "${keepName}" and the duplicates will be deleted. Aliases will be preserved.`)) return;
    setMerging(true);
    try {
      const { data } = await api.post("/peptides/merge", { keep_id: keepId, merge_ids: mergeIds });
      toast.success(`Merged into ${data.kept} · ${data.prices_moved} prices moved`);
      clearSelection();
      load();
    } catch (e) {
      toast.error(fmtErr(e.response?.data?.detail));
    } finally {
      setMerging(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => {
      const inName = p.name?.toLowerCase().includes(q);
      const inAlias = (p.aliases || []).some((a) => a.toLowerCase().includes(q));
      const inSlug = p.slug?.toLowerCase().includes(q);
      return inName || inAlias || inSlug;
    });
  }, [items, search]);

  const CATEGORIES = ["", "vial", "capsule", "liquid", "nasal", "skincare", "aminos"];

  const setPeptideCategory = async (pid, category) => {
    const p = items.find((x) => x.id === pid);
    if (!p) return;
    try {
      await api.put(`/peptides/${pid}`, {
        name: p.name,
        slug: p.slug,
        description: p.description || "",
        typical_dose_mcg: p.typical_dose_mcg || 0,
        category,
      });
      toast.success(`${p.name} → ${category || "(cleared)"}`);
      load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
  };

  const bulkSetCategory = async (cat) => {
    if (selected.size === 0) return;
    const ids = [...selected];
    if (!confirm(`Set category to "${cat}" for ${ids.length} peptides?`)) return;
    let ok = 0;
    for (const id of ids) {
      try { await setPeptideCategory(id, cat); ok++; } catch (e) { /* skip failed */ }
    }
    toast.success(`Updated ${ok} peptides`);
    clearSelection();
    load();
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 border border-[#0A0A0A] p-6 h-fit">
        <SectionHeader title="New peptide" />
        <div className="space-y-4">
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v, slug: v.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} testId="p-name" />
          <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} />
          <div>
            <Label className="eyebrow text-[#5C5C5C]">Category</Label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              data-testid="p-category"
              className="w-full rounded-none border border-[#0A0A0A] h-11 mt-2 px-3 font-mono text-sm bg-white"
            >
              <option value="">— none —</option>
              <option value="vial">vial</option>
              <option value="capsule">capsule</option>
              <option value="liquid">liquid</option>
              <option value="nasal">nasal spray</option>
              <option value="skincare">skincare</option>
              <option value="aminos">aminos</option>
            </select>
          </div>
          <Field label="Typical dose (mcg)" type="number" value={form.typical_dose_mcg} onChange={(v) => setForm({ ...form, typical_dose_mcg: v })} />
          <div>
            <Label className="eyebrow text-[#5C5C5C]">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-none border-[#0A0A0A] mt-2 font-mono text-sm" />
          </div>
          <Button onClick={save} data-testid="p-save" className="w-full rounded-none bg-[#B87A6A] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">Add peptide</Button>
        </div>

        {/* Merge helper card */}
        <div className="mt-8 border-t border-[#E5E5E5] pt-6">
          <div className="eyebrow text-[#B87A6A] mb-2">Merge duplicates</div>
          <p className="text-xs font-mono text-[#5C5C5C] leading-relaxed">
            Tick boxes on the right to select peptides that are the same
            (e.g. <b>Semaglutide</b> + <b>GLP-SG</b>). Pick which one to keep
            as canonical — all prices move there, and the duplicates are absorbed
            as aliases and deleted.
          </p>
        </div>
      </div>

      <div className="lg:col-span-7">
        <SectionHeader
          title={`Peptides (${items.length})`}
          action={
            selected.size > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#5C5C5C]">
                  {selected.size} selected
                </span>
                <select
                  onChange={(e) => { if (e.target.value) { bulkSetCategory(e.target.value); e.target.value = ""; } }}
                  data-testid="pep-bulk-category"
                  defaultValue=""
                  className="rounded-none border border-[#B87A6A] h-9 px-3 font-mono uppercase tracking-widest text-xs bg-white"
                >
                  <option value="">Set category →</option>
                  <option value="vial">vial</option>
                  <option value="capsule">capsule</option>
                  <option value="liquid">liquid</option>
                  <option value="nasal">nasal spray</option>
                  <option value="skincare">skincare</option>
                  <option value="aminos">aminos</option>
                </select>
                <Button
                  onClick={clearSelection}
                  variant="ghost"
                  className="rounded-none h-9 font-mono uppercase tracking-widest text-xs"
                  data-testid="pep-merge-clear"
                >
                  Clear
                </Button>
                <Button
                  onClick={runMerge}
                  disabled={merging || selected.size < 2 || !keepId}
                  className="rounded-none bg-[#B87A6A] hover:bg-[#0A0A0A] text-white font-mono uppercase tracking-widest text-xs h-9"
                  data-testid="pep-merge-run"
                >
                  {merging ? "Merging…" : "Merge selected"}
                </Button>
              </div>
            ) : null
          }
        />

        {/* Search */}
        <div className="mb-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search peptides by name, slug, or alias…"
            className="rounded-none border-[#0A0A0A] h-9 font-mono text-xs"
            data-testid="pep-search"
          />
        </div>

        {/* Selection panel — shows when at least 1 selected */}
        {selected.size > 0 && (
          <div className="mb-3 border border-[#B87A6A] bg-[#FBF3EC] p-4">
            <div className="eyebrow text-[#B87A6A] mb-2">Keep as canonical</div>
            <div className="flex flex-wrap gap-2">
              {[...selected].map((id) => {
                const p = items.find((x) => x.id === id);
                if (!p) return null;
                const active = id === keepId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setKeepId(id)}
                    data-testid={`pep-keep-${p.slug}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono border transition ${
                      active
                        ? "bg-[#B87A6A] text-white border-[#B87A6A]"
                        : "bg-white text-[#0A0A0A] border-[#E8CDBF] hover:border-[#B87A6A]"
                    }`}
                  >
                    {active && <Check size={12} />}
                    {p.name}
                  </button>
                );
              })}
            </div>
            {selected.size >= 2 && !keepId && (
              <div className="mt-2 text-[10px] font-mono text-[#B87A6A]">
                Click one of the pills above to choose which peptide stays.
              </div>
            )}
          </div>
        )}

        <div className="border border-[#E5E5E5] max-h-[680px] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-6 text-sm font-mono text-[#A0A0A0]">
              {search ? `No peptides match "${search}".` : "No peptides yet."}
            </div>
          )}
          {filtered.map((p) => {
            const isSel = selected.has(p.id);
            const isKeep = keepId === p.id;
            return (
              <div
                key={p.id}
                className={`border-b border-[#E5E5E5] p-3 flex items-start justify-between gap-4 ${
                  isSel ? "bg-[#FBF3EC]" : "bg-white"
                } ${isKeep ? "border-l-4 border-l-[#B87A6A]" : ""}`}
              >
                <label className="flex items-start gap-3 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={() => toggleSel(p.id)}
                    data-testid={`pep-check-${p.slug}`}
                    className="mt-1 h-4 w-4 accent-[#B87A6A] cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">
                      {p.name}
                      {isKeep && (
                        <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-[#B87A6A]">
                          keep ★
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-[#5C5C5C]">
                      {p.slug}
                      {p.category ? ` · ${p.category}` : ""}
                      {(p.typical_dose_mcg || 0) > 0 ? ` · ${p.typical_dose_mcg} mcg typical` : ""}
                    </div>
                    {(p.aliases && p.aliases.length > 0) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.aliases.slice(0, 6).map((a) => (
                          <span key={a} className="inline-block text-[9px] font-mono px-1.5 py-0.5 bg-[#F5DED4] text-[#B87A6A] rounded">
                            {a}
                          </span>
                        ))}
                        {p.aliases.length > 6 && (
                          <span className="inline-block text-[9px] font-mono text-[#5C5C5C]">
                            +{p.aliases.length - 6}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </label>
                <select
                  value={p.category || ""}
                  onChange={(e) => setPeptideCategory(p.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`pep-cat-${p.slug}`}
                  className={`rounded-none h-8 px-2 font-mono text-[10px] uppercase tracking-widest border flex-shrink-0 ${
                    p.category
                      ? "bg-[#F5DED4] text-[#B87A6A] border-[#B87A6A]"
                      : "bg-white text-[#5C5C5C] border-[#E5E5E5]"
                  }`}
                  title="Set category (auto-saves)"
                >
                  <option value="">— none —</option>
                  <option value="vial">vial</option>
                  <option value="capsule">capsule</option>
                  <option value="liquid">liquid</option>
                  <option value="nasal">nasal spray</option>
                  <option value="skincare">skincare</option>
                  <option value="aminos">aminos</option>
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => del(p.id)}
                  className="rounded-none hover:bg-[#E60000] hover:text-white h-8 w-8 flex-shrink-0"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----------------- PRICES (manual-friendly) ----------------- */
function PriceRow({ pr, peptides, vendors, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [size, setSize] = useState(pr.size_mg);
  const [price, setPrice] = useState(pr.price_usd);
  const [url, setUrl] = useState(pr.product_url || "");
  const [label, setLabel] = useState(pr.display_label || "");
  const [priceForm, setPriceForm] = useState(pr.form || "vial");
  const [available, setAvailable] = useState(pr.available !== false);
  const [busy, setBusy] = useState(false);

  const lookup = (arr, id) => arr.find((x) => x.id === id)?.name || "—";

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/prices/${pr.id}`, {
        peptide_id: pr.peptide_id,
        vendor_id: pr.vendor_id,
        size_mg: Number(size) || 0,
        price_usd: Number(price) || 0,
        form: priceForm,
        available,
        product_url: url.trim(),
        display_label: label.trim(),
        scrape_selector: pr.scrape_selector || "",
      });
      toast.success("Updated");
      setEditing(false);
      onChanged();
    } catch (e) {
      toast.error(fmtErr(e.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete ${lookup(peptides, pr.peptide_id)} · ${pr.size_mg}mg?`)) return;
    await api.delete(`/prices/${pr.id}`);
    onChanged();
  };

  if (editing) {
    return (
      <div className="border-b border-[#E5E5E5] p-3 bg-[#FDF9F5] space-y-2 text-sm"
           data-testid={`pr-edit-${pr.id}`}>
        <div className="font-bold">{lookup(peptides, pr.peptide_id)} · {lookup(vendors, pr.vendor_id)}</div>
        <div className="grid grid-cols-12 gap-2 items-center">
          <Input value={size} onChange={(e) => setSize(e.target.value)} type="number" step="0.5"
            placeholder="size (mg)"
            className="col-span-2 rounded-none border-[#0A0A0A] h-9 font-mono text-xs"
            data-testid={`pr-edit-size-${pr.id}`} />
          <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01"
            placeholder="price"
            className="col-span-2 rounded-none border-[#0A0A0A] h-9 font-mono text-xs"
            data-testid={`pr-edit-price-${pr.id}`} />
          <Input value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="product URL"
            className="col-span-6 rounded-none border-[#0A0A0A] h-9 font-mono text-xs"
            data-testid={`pr-edit-url-${pr.id}`} />
          <div className="col-span-2 flex gap-1 justify-end">
            <Button size="icon" onClick={save} disabled={busy}
              className="h-9 w-9 rounded-none bg-[#B87A6A] hover:bg-[#0A0A0A] text-white"
              data-testid={`pr-edit-save-${pr.id}`}>
              <Check size={14} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(false)}
              className="h-9 w-9 rounded-none">
              <X size={14} />
            </Button>
          </div>
        </div>
        <Input value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder={`Vendor nickname (optional) — e.g. "GLP-SG", "Sema-Glow"`}
          className="rounded-none border-[#B87A6A] h-9 font-mono text-xs bg-white"
          data-testid={`pr-edit-label-${pr.id}`} />
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={priceForm}
            onChange={(e) => setPriceForm(e.target.value)}
            className="rounded-none border border-[#0A0A0A] h-9 px-2 font-mono text-xs bg-white"
            data-testid={`pr-edit-form-${pr.id}`}
          >
            {["vial", "capsule", "liquid", "nasal", "skincare", "aminos"].map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <label className="text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              data-testid={`pr-edit-available-${pr.id}`}
              className="h-4 w-4 accent-[#B87A6A]"
            />
            In stock (uncheck to hide from public price tool)
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-[#E5E5E5] p-3 grid grid-cols-12 gap-3 items-center text-sm">
      <div className="col-span-4">
        <div className="font-bold">{lookup(peptides, pr.peptide_id)}</div>
        {pr.display_label && (
          <div className="text-[10px] font-mono text-[#B87A6A] font-bold uppercase tracking-wider">
            “{pr.display_label}”
          </div>
        )}
        <div className="text-[10px] font-mono text-[#5C5C5C]">{lookup(vendors, pr.vendor_id)}</div>
        {pr.product_url && (
          <a href={pr.product_url} target="_blank" rel="noopener noreferrer"
             className="text-[10px] font-mono text-[#B87A6A] hover:underline truncate block max-w-[260px]"
             title={pr.product_url}>
            ↗ {pr.product_url.replace(/^https?:\/\//, "").slice(0, 36)}…
          </a>
        )}
      </div>
      <div className="col-span-2 font-mono text-[#B87A6A] font-bold">
        {pr.size_mg} mg
        <div className="text-[9px] font-mono uppercase tracking-widest text-[#5C5C5C] font-normal">
          {pr.form || "vial"}
          {pr.available === false && <span className="ml-1 text-red-600">· OOS</span>}
        </div>
      </div>
      <div className="col-span-2 font-mono font-bold">${Number(pr.price_usd).toFixed(2)}</div>
      <div className="col-span-2 text-[10px] font-mono text-[#5C5C5C] truncate">
        {pr.last_status || "manual"}
      </div>
      <div className="col-span-2 flex gap-1 justify-end">
        <Button variant="ghost" size="icon" onClick={() => setEditing(true)}
          className="rounded-none hover:bg-[#B87A6A] hover:text-white h-8 w-8"
          data-testid={`pr-edit-btn-${pr.id}`}>
          <Pencil size={14} />
        </Button>
        <Button variant="ghost" size="icon" onClick={remove}
          className="rounded-none hover:bg-[#E60000] hover:text-white h-8 w-8"
          data-testid={`pr-del-${pr.id}`}>
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

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
  const [displayLabel, setDisplayLabel] = useState("");
  const [quickForm, setQuickForm] = useState("vial");

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
        form: quickForm,
        available: true,
        product_url: productUrl.trim(),
        display_label: displayLabel.trim(),
        scrape_selector: "",
      });
      toast.success(`Added ${peptideQuery || lookup(peptides, pid)} · ${sizeMg}mg · $${priceUsd}`);
      // Keep vendor selected, clear the rest
      setPeptideQuery(""); setPeptideId(""); setSizeMg(5);
      setPriceUsd(""); setProductUrl(""); setDisplayLabel("");
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
    const [name, size, price, url = "", label = ""] = parts;
    return {
      name, size: parseFloat(size.replace(/[^\d.]/g, "")) || 0,
      price: parseFloat(price.replace(/[^\d.]/g, "")) || 0, url, label,
    };
  };

  const runBulk = async () => {
    if (!vendorId) { toast.error("Pick a vendor first"); return; }
    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows = lines.map(parseBulkRow).filter(Boolean);
    if (!rows.length) { toast.error("No valid rows. Format: name TAB size TAB price [TAB url] [TAB nickname]"); return; }
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
          product_url: r.url, display_label: r.label, form: quickForm, available: true, scrape_selector: "",
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

  // ---- Recent list state + sort + search ----
  const [recentSearch, setRecentSearch] = useState("");

  const recent = useMemo(() => {
    // Build a name lookup so we can search by peptide name + vendor nickname
    const pepName = (id) => peptides.find((p) => p.id === id)?.name || "";

    let list = vendorId ? items.filter((p) => p.vendor_id === vendorId) : items;

    // Search across peptide name + display_label + vendor name
    if (recentSearch.trim()) {
      const q = recentSearch.trim().toLowerCase();
      list = list.filter((p) => {
        const pn = pepName(p.peptide_id).toLowerCase();
        const lbl = (p.display_label || "").toLowerCase();
        const vn = (vendors.find((v) => v.id === p.vendor_id)?.name || "").toLowerCase();
        return pn.includes(q) || lbl.includes(q) || vn.includes(q);
      });
    }

    // Sort by most recently updated (newest first)
    list = [...list].sort((a, b) => {
      const ad = a.updated_at || "";
      const bd = b.updated_at || "";
      return bd.localeCompare(ad);
    });

    return list.slice(0, 100);
  }, [items, vendorId, recentSearch, peptides, vendors]);

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
                    className="w-full text-left px-3 py-2 text-sm font-mono hover:bg-[#FBF3EC] border-b border-[#F0F0F0]"
                    data-testid={`pr-pep-match-${p.slug}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            {peptideQuery.trim() && !exactMatch && !peptideMatches.length && (
              <div className="mt-1 px-3 py-2 text-xs font-mono text-[#B87A6A] bg-[#FBF3EC] border border-[#E8CDBF]">
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
            <Label className="eyebrow text-[#5C5C5C]">5 · Form</Label>
            <select
              value={quickForm}
              onChange={(e) => setQuickForm(e.target.value)}
              data-testid="pr-form"
              className="w-full rounded-none border border-[#0A0A0A] h-11 mt-2 px-3 font-mono text-sm bg-white"
            >
              {["vial", "capsule", "liquid", "nasal", "skincare", "aminos"].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <Label className="eyebrow text-[#5C5C5C]">6 · Product URL (optional)</Label>
            <Input value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://vendor.com/product/..."
              className="rounded-none border-[#0A0A0A] mt-2 font-mono"
              data-testid="pr-url" />
          </div>

          <div className="mb-4">
            <Label className="eyebrow text-[#B87A6A]">7 · Vendor nickname (optional)</Label>
            <Input value={displayLabel}
              onChange={(e) => setDisplayLabel(e.target.value)}
              placeholder={`e.g. "GLP-SG", "Sema-Glow" — overrides peptide name on this row only`}
              className="rounded-none border-[#B87A6A] mt-2 font-mono"
              data-testid="pr-label" />
          </div>

          <Button onClick={saveOne} disabled={busy === "save"}
            data-testid="pr-save"
            className="w-full rounded-none bg-[#B87A6A] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">
            {busy === "save" ? "Saving…" : "+ Add price (vendor stays)"}
          </Button>
        </div>

        {/* Bulk paste */}
        <div className="border border-[#0A0A0A] p-6">
          <SectionHeader title="Bulk paste" />
          <p className="text-xs font-mono text-[#5C5C5C] mb-3 leading-relaxed">
            Paste one row per line. Format: <b>name [TAB] size [TAB] price [TAB] url [TAB] nickname</b>.
            URL & nickname are optional. Tabs, commas, or multiple spaces all work as separators.
          </p>
          <Textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)}
            placeholder={"BPC-157\t5\t39.99\nTB-500\t5\t59.99\nSemaglutide\t10\t189.00\thttps://...\tGLP-SG"}
            rows={6}
            className="rounded-none border-[#0A0A0A] font-mono text-xs"
            data-testid="pr-bulk-text" />
          <Button onClick={runBulk} disabled={busy === "bulk"}
            data-testid="pr-bulk-go"
            className="w-full mt-3 rounded-none bg-[#0A0A0A] text-white hover:bg-[#B87A6A] h-10 font-mono uppercase tracking-widest text-xs">
            {busy === "bulk" ? "Importing…" : "Import all rows"}
          </Button>
        </div>
      </div>

      {/* RIGHT: Recent + bulk actions */}
      <div className="lg:col-span-7">
        <SectionHeader title={vendorId ? `Recent — ${lookup(vendors, vendorId)}` : "Recent prices"} action={
          <div className="flex gap-2">
            <Button onClick={aiBulkImport} disabled={busy === "ai"} className="rounded-none bg-[#B87A6A] text-white hover:bg-[#0A0A0A] font-mono uppercase tracking-widest text-xs" data-testid="ai-bulk-import">
              <RefreshCw size={14} className={`mr-2 ${busy === "ai" ? "animate-spin" : ""}`} /> AI bulk import
            </Button>
            <Button onClick={scrapeAll} disabled={busy === "all"} className="rounded-none bg-[#0A0A0A] text-white hover:bg-[#B87A6A] font-mono uppercase tracking-widest text-xs" data-testid="scrape-all">
              <RefreshCw size={14} className={`mr-2 ${busy === "all" ? "animate-spin" : ""}`} /> Scrape all
            </Button>
          </div>
        } />
        {/* Search bar */}
        <div className="mb-2 flex items-center gap-3">
          <Input
            value={recentSearch}
            onChange={(e) => setRecentSearch(e.target.value)}
            placeholder="Search recent prices — peptide, vendor, or nickname (e.g. Tirzepatide)"
            className="rounded-none border-[#0A0A0A] font-mono text-xs h-9"
            data-testid="pr-recent-search"
          />
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#5C5C5C] whitespace-nowrap">
            {recent.length} {vendorId ? "for vendor" : "total"} · {items.length} all
          </div>
        </div>
        <div className="border border-[#E5E5E5] max-h-[680px] overflow-y-auto">
          {recent.length === 0 && (
            <div className="p-6 text-sm font-mono text-[#A0A0A0]">
              {recentSearch.trim()
                ? `No prices match "${recentSearch}".`
                : "No prices yet for this vendor."}
            </div>
          )}
          {recent.map((pr) => (
            <PriceRow
              key={pr.id}
              pr={pr}
              peptides={peptides}
              vendors={vendors}
              onChanged={load}
            />
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

  const moveResource = async (index, direction) => {
    const newItems = [...items];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    // Swap
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);  // optimistic update
    try {
      await api.post("/resources/reorder", { ids: newItems.map(r => r.id) });
    } catch (e) {
      toast.error(fmtErr(e.response?.data?.detail));
      load();  // revert on error
    }
  };
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
          <Button onClick={save} data-testid="r-save" className="w-full rounded-none bg-[#B87A6A] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">Add resource</Button>
        </div>
      </div>
      <div className="lg:col-span-7">
        <SectionHeader title={`Resources (${items.length}) · use ↑↓ to reorder`} />
        <div className="border border-[#E5E5E5]">
          {items.map((r, i) => (
            <div key={r.id} className="border-b border-[#E5E5E5] p-4 flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5 flex-shrink-0 pt-1">
                <button
                  type="button"
                  onClick={() => moveResource(i, -1)}
                  disabled={i === 0}
                  data-testid={`r-up-${r.id}`}
                  title="Move up"
                  className="h-6 w-6 border border-[#E5E5E5] bg-white hover:bg-[#B87A6A] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center transition"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => moveResource(i, +1)}
                  disabled={i === items.length - 1}
                  data-testid={`r-down-${r.id}`}
                  title="Move down"
                  className="h-6 w-6 border border-[#E5E5E5] bg-white hover:bg-[#B87A6A] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center transition"
                >
                  <ArrowDown size={12} />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#B87A6A]">
                  #{i + 1} · {r.category}
                </div>
                <div className="font-bold">{r.title}</div>
                <div className="text-xs text-[#5C5C5C]">{r.summary}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(r.id)} className="rounded-none hover:bg-[#E60000] hover:text-white flex-shrink-0"><Trash2 size={16} /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ----------------- SOCIALS ----------------- */
const PLATFORM_OPTIONS = [
  "instagram", "tiktok", "youtube", "twitter", "x", "threads",
  "facebook", "pinterest", "linkedin", "snapchat",
  "podcast", "spotify", "discord", "skool", "telegram", "email", "website", "other"
];
const blankSocial = { platform: "instagram", url: "", label: "", order: 0, enabled: true };

function SocialsPanel() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blankSocial);

  const load = () =>
    api.get("/socials/all").then(({ data }) => setItems(data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.url.trim()) { toast.error("URL required"); return; }
    try {
      await api.post("/socials", { ...form, order: Number(form.order) || 0 });
      toast.success("Added");
      setForm(blankSocial);
      load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
  };

  const toggle = async (s) => {
    await api.put(`/socials/${s.id}`, { ...s, enabled: !s.enabled });
    load();
  };

  const updateOrder = async (s, delta) => {
    await api.put(`/socials/${s.id}`, { ...s, order: (s.order || 0) + delta });
    load();
  };

  const del = async (id) => {
    if (!confirm("Remove this social link?")) return;
    await api.delete(`/socials/${id}`);
    load();
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 border border-[#0A0A0A] p-6">
        <SectionHeader title="New social link" />
        <div className="space-y-4">
          <div>
            <Label className="eyebrow text-[#5C5C5C]">Platform</Label>
            <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
              <SelectTrigger className="rounded-none border-[#0A0A0A] mt-2 font-mono" data-testid="s-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none max-h-80">
                {PLATFORM_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p} className="rounded-none font-mono text-sm capitalize">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="URL (or email if platform=email)" value={form.url}
            onChange={(v) => setForm({ ...form, url: v })} testId="s-url" />
          <Field label="Display label (optional, defaults to platform name)"
            value={form.label} onChange={(v) => setForm({ ...form, label: v })} testId="s-label" />
          <Field label="Order (lower = first)" type="number" value={form.order}
            onChange={(v) => setForm({ ...form, order: v })} />
          <Button onClick={save} data-testid="s-save"
            className="w-full rounded-none bg-[#B87A6A] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">
            + Add social link
          </Button>
          <p className="text-[11px] font-mono text-[#5C5C5C] leading-relaxed">
            Links appear in a small bar at the top of the homepage. Toggle each one on/off here.
          </p>
        </div>
      </div>
      <div className="lg:col-span-7">
        <SectionHeader title={`Social links (${items.length})`} />
        <div className="border border-[#E5E5E5]">
          {items.length === 0 && (
            <div className="p-6 text-sm font-mono text-[#A0A0A0]">
              No social links yet. Add one on the left.
            </div>
          )}
          {items.map((s) => (
            <div key={s.id}
              className="border-b border-[#E5E5E5] p-4 flex items-center gap-3"
              data-testid={`s-row-${s.platform}-${s.id}`}>
              <div className="flex-1 min-w-0">
                <div className="font-bold capitalize">
                  {s.label || s.platform}
                  {!s.enabled && (
                    <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-[#5C5C5C] bg-[#F0F0F0] px-1.5 py-0.5">
                      hidden
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-[#5C5C5C]">
                  {s.platform} · order {s.order || 0}
                </div>
                <div className="text-xs mt-1 truncate text-[#5C5C5C]">{s.url}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => updateOrder(s, -1)}
                  className="rounded-none h-8 w-8" title="Move up"
                  data-testid={`s-up-${s.id}`}>↑</Button>
                <Button variant="ghost" size="icon" onClick={() => updateOrder(s, 1)}
                  className="rounded-none h-8 w-8" title="Move down"
                  data-testid={`s-down-${s.id}`}>↓</Button>
                <Switch checked={s.enabled} onCheckedChange={() => toggle(s)}
                  data-testid={`s-toggle-${s.id}`} />
                <Button variant="ghost" size="icon" onClick={() => del(s.id)}
                  className="rounded-none hover:bg-[#E60000] hover:text-white h-8 w-8"
                  data-testid={`s-del-${s.id}`}>
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

/* ----------------- PROMOTIONS ----------------- */
function PromotionsPanel() {
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [form, setForm] = useState({ vendor_id: "", promo_code: "", discount_percent: 10, description: "", end_date: "", active: true });

  const load = () => Promise.all([
    api.get("/promotions").then(r => setItems(r.data)),
    api.get("/vendors").then(r => setVendors(r.data)),
  ]);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.vendor_id) { toast.error("Pick a vendor"); return; }
    if (!form.promo_code.trim()) { toast.error("Promo code required"); return; }
    try {
      await api.post("/promotions", {
        ...form,
        discount_percent: Number(form.discount_percent) || 0,
        end_date: form.end_date || null,
      });
      toast.success("Promotion added");
      setForm({ vendor_id: "", promo_code: "", discount_percent: 10, description: "", end_date: "", active: true });
      load();
    } catch (e) { toast.error(fmtErr(e.response?.data?.detail)); }
  };

  const toggleActive = async (promo) => {
    await api.put(`/promotions/${promo.id}`, { ...promo, active: !promo.active, end_date: promo.end_date || null });
    load();
  };

  const del = async (id) => {
    if (!confirm("Delete promotion?")) return;
    await api.delete(`/promotions/${id}`);
    load();
  };

  const vname = (id) => vendors.find(v => v.id === id)?.name || "?";
  const now = new Date().toISOString();

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 border border-[#0A0A0A] p-6 h-fit">
        <SectionHeader title="New promotion" />
        <div className="space-y-4">
          <div>
            <Label className="eyebrow text-[#5C5C5C]">Vendor</Label>
            <select
              value={form.vendor_id}
              onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
              className="w-full rounded-none border border-[#0A0A0A] h-11 mt-2 font-mono text-sm px-3"
              data-testid="promo-vendor"
            >
              <option value="">— pick —</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <Field label="Promo code" value={form.promo_code} onChange={(v) => setForm({ ...form, promo_code: v.toUpperCase() })} testId="promo-code" />
          <Field label="Discount %" type="number" value={form.discount_percent} onChange={(v) => setForm({ ...form, discount_percent: v })} testId="promo-discount" />
          <div>
            <Label className="eyebrow text-[#5C5C5C]">Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. 10% off site-wide" className="rounded-none border-[#0A0A0A] mt-2 font-mono text-sm h-11" />
          </div>
          <Field label="End date (optional, YYYY-MM-DD)" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} />
          <Button onClick={save} data-testid="promo-save" className="w-full rounded-none bg-[#B87A6A] text-white hover:bg-[#0A0A0A] h-11 font-mono uppercase tracking-widest text-xs">Add promotion</Button>
        </div>
      </div>

      <div className="lg:col-span-7">
        <SectionHeader title={`Promotions (${items.length})`} />
        <div className="border border-[#E5E5E5]">
          {items.length === 0 && (
            <div className="p-6 text-sm font-mono text-[#A0A0A0]">No promotions yet.</div>
          )}
          {items.map(p => {
            const expired = p.end_date && p.end_date < now;
            return (
              <div key={p.id} className={`border-b border-[#E5E5E5] p-4 flex items-start justify-between gap-4 ${expired ? "opacity-60" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{vname(p.vendor_id)}</span>
                    <span className="px-2 py-0.5 bg-[#F5DED4] text-[#B87A6A] text-[10px] font-mono font-bold rounded tracking-widest">
                      {p.promo_code} · {p.discount_percent}%
                    </span>
                    {!p.active && <span className="text-[10px] font-mono uppercase tracking-widest text-[#5C5C5C]">paused</span>}
                    {expired && <span className="text-[10px] font-mono uppercase tracking-widest text-red-600">expired</span>}
                  </div>
                  {p.description && <div className="text-xs text-[#5C5C5C] mt-1">{p.description}</div>}
                  {p.end_date && <div className="text-[10px] font-mono text-[#5C5C5C] mt-0.5">Ends: {p.end_date.slice(0, 10)}</div>}
                </div>
                <div className="flex gap-2 items-center">
                  <Switch checked={p.active} onCheckedChange={() => toggleActive(p)} data-testid={`promo-toggle-${p.id}`} />
                  <Button variant="ghost" size="icon" onClick={() => del(p.id)} className="rounded-none hover:bg-[#E60000] hover:text-white h-8 w-8"><Trash2 size={14} /></Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----------------- SITE SETTINGS ----------------- */
function SettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bar, setBar] = useState(null);

  const load = () => api.get("/settings").then(r => {
    setSettings(r.data);
    setBar({
      community_bar_enabled: r.data.community_bar_enabled !== false,
      community_bar_url: r.data.community_bar_url || "",
      community_bar_message: r.data.community_bar_message || "",
      community_bar_price: r.data.community_bar_price || "",
      community_bar_cta: r.data.community_bar_cta || "",
    });
  });
  useEffect(() => { load(); }, []);

  const putAll = async (patch) => {
    const merged = { ...settings, ...bar, ...patch };
    await api.put("/settings", {
      price_tool_enabled: !!merged.price_tool_enabled,
      community_bar_enabled: !!merged.community_bar_enabled,
      community_bar_url: (merged.community_bar_url || "").trim(),
      community_bar_message: (merged.community_bar_message || "").trim(),
      community_bar_price: (merged.community_bar_price || "").trim(),
      community_bar_cta: (merged.community_bar_cta || "").trim(),
    });
  };

  const toggle = async (key, value) => {
    setSaving(true);
    try {
      const next = { ...settings, [key]: value };
      await putAll({ [key]: value });
      setSettings(next);
      toast.success(value ? "Turned ON — page will refresh" : "Turned OFF — page will refresh");
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      toast.error(fmtErr(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const saveBar = async () => {
    setSaving(true);
    try {
      await putAll({});
      toast.success("Community bar updated");
      load();
    } catch (e) {
      toast.error(fmtErr(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  if (!settings || !bar) return <div className="font-mono text-sm text-[#5C5C5C]">Loading…</div>;

  return (
    <div className="max-w-3xl space-y-8">
      <SectionHeader title="Site settings" />
      <div className="border border-[#0A0A0A] divide-y divide-[#E5E5E5]">
        <div className="p-6 flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="font-bold text-lg text-[#0A0A0A]">Peptide Price Tool</div>
            <div className="text-xs font-mono text-[#5C5C5C] mt-1 leading-relaxed">
              When <b>OFF</b> the tool disappears from the top nav, the homepage tile, the hero CTA, and the /compare URL redirects to home. Admin & data stay intact — just hidden from visitors.
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#5C5C5C] mt-2">
              Currently: {settings.price_tool_enabled ? "🟢 LIVE — visible to everyone" : "🔴 HIDDEN — visitors can't see it"}
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Switch
              checked={!!settings.price_tool_enabled}
              onCheckedChange={(v) => toggle("price_tool_enabled", v)}
              disabled={saving}
              data-testid="toggle-price-tool"
              className="scale-125"
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#5C5C5C]">
              {settings.price_tool_enabled ? "ON" : "OFF"}
            </span>
          </div>
        </div>
      </div>

      {/* Community bar editor */}
      <div className="border border-[#0A0A0A]">
        <div className="p-6 border-b border-[#E5E5E5] flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="font-bold text-lg text-[#0A0A0A]">Community bar (homepage top banner)</div>
            <div className="text-xs font-mono text-[#5C5C5C] mt-1 leading-relaxed">
              The rose-gold banner at the top of the home page inviting visitors to your community. Toggle off to hide it entirely. Edit the message, price label, CTA, and destination URL below.
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Switch
              checked={!!bar.community_bar_enabled}
              onCheckedChange={(v) => { setBar({ ...bar, community_bar_enabled: v }); toggle("community_bar_enabled", v); }}
              disabled={saving}
              data-testid="toggle-community-bar"
              className="scale-125"
            />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#5C5C5C]">
              {bar.community_bar_enabled ? "ON" : "OFF"}
            </span>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <Label className="eyebrow text-[#5C5C5C]">Message</Label>
            <Input
              value={bar.community_bar_message}
              onChange={(e) => setBar({ ...bar, community_bar_message: e.target.value })}
              placeholder="Join The Optimized Society community"
              data-testid="bar-message"
              className="rounded-none border-[#0A0A0A] h-11 mt-2 font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="eyebrow text-[#5C5C5C]">Price label</Label>
              <Input
                value={bar.community_bar_price}
                onChange={(e) => setBar({ ...bar, community_bar_price: e.target.value })}
                placeholder="$3 one-time"
                data-testid="bar-price"
                className="rounded-none border-[#0A0A0A] h-11 mt-2 font-mono text-sm"
              />
              <div className="text-[10px] font-mono text-[#5C5C5C] mt-1">Leave empty to hide the price chip.</div>
            </div>
            <div>
              <Label className="eyebrow text-[#5C5C5C]">CTA label</Label>
              <Input
                value={bar.community_bar_cta}
                onChange={(e) => setBar({ ...bar, community_bar_cta: e.target.value })}
                placeholder="Join now"
                data-testid="bar-cta"
                className="rounded-none border-[#0A0A0A] h-11 mt-2 font-mono text-sm"
              />
            </div>
          </div>
          <div>
            <Label className="eyebrow text-[#5C5C5C]">Destination URL</Label>
            <Input
              value={bar.community_bar_url}
              onChange={(e) => setBar({ ...bar, community_bar_url: e.target.value })}
              placeholder="https://www.skool.com/..."
              data-testid="bar-url"
              className="rounded-none border-[#0A0A0A] h-11 mt-2 font-mono text-sm"
            />
          </div>
          <Button
            onClick={saveBar}
            disabled={saving}
            data-testid="bar-save"
            className="rounded-none bg-[#B87A6A] hover:bg-[#0A0A0A] text-white font-mono uppercase tracking-widest text-xs h-11"
          >
            {saving ? "Saving…" : "Save community bar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
