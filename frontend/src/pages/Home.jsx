import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Star, Copy, Check, Play } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useSettings } from "../lib/settings";
import SocialBar from "../components/SocialBar";
import useSeo from "../hooks/useSeo";

export default function Home() {
  useSeo({
    title: "Optimize Your Health. Elevate Your Life.",
    description: "The Optimized Society by Erica — Trusted peptide vendors, price comparisons, dosage calculators, and wellness education. Built after losing 90 lbs with GLP-1 peptides.",
    path: "/",
  });
  const { settings } = useSettings();
  const priceToolOn = settings?.price_tool_enabled !== false;

  const [reviews, setReviews] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [promos, setPromos] = useState([]);

  useEffect(() => {
    api.get("/reviews").then(({ data }) => setReviews(data || [])).catch(() => {});
    api.get("/vendors").then(({ data }) => setVendors(data || [])).catch(() => {});
    api.get("/promotions").then(({ data }) => setPromos(data || [])).catch(() => {});
  }, []);

  const nowIso = new Date().toISOString();
  const promoByVendor = {};
  for (const p of promos) {
    if (!p.active) continue;
    if (p.end_date && p.end_date < nowIso) continue;
    if (p.start_date && p.start_date > nowIso) continue;
    if (!promoByVendor[p.vendor_id] || (p.discount_percent || 0) > (promoByVendor[p.vendor_id].discount_percent || 0)) {
      promoByVendor[p.vendor_id] = p;
    }
  }
  const featured = vendors.filter((v) => v.featured).slice(0, 8);
  const secondary = vendors.filter((v) => !v.featured).slice(0, 6);

  return (
    <div className="bg-[#FBF3EC]">
      <SocialBar />

      {/* ═══════════ HERO ═══════════ */}
      <section className="border-b border-[#E8CDBF]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* LEFT — text */}
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.28em] text-[#B87A6A] font-semibold mb-6" data-testid="hero-eyebrow">
                {settings?.home_hero_eyebrow || "Peptide Education · Wellness · Community"}
              </div>
              <h1 className="font-serif-luxe text-5xl sm:text-6xl lg:text-7xl leading-[1.02] text-[#0A0A0A] font-semibold" data-testid="hero-headline">
                {(settings?.home_hero_title || "Optimize your health. Elevate your life.").split(".").filter(Boolean).map((s, i, arr) => (
                  <span key={i}>
                    {i === arr.length - 1 && arr.length > 1 ? (
                      <>
                        <span className="italic text-[#B87A6A]">{s.trim()}</span>.
                      </>
                    ) : (
                      <>
                        {s.trim()}.{i < arr.length - 1 && <br />}
                      </>
                    )}
                  </span>
                ))}
              </h1>
              <p className="mt-6 text-base sm:text-lg text-[#3A3A3A] leading-relaxed max-w-xl" data-testid="hero-intro">
                {settings?.home_hero_intro || "I'm Erica. After losing 90 pounds on GLP-1 peptides, I built this corner of the internet to share the vendors, protocols, and tools that actually move the needle — nothing gate-kept."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={settings?.community_bar_url || "https://www.skool.com/ericas-elevated-life-9005"}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="hero-cta-community"
                  className="inline-flex items-center gap-2 bg-[#0A0A0A] hover:bg-[#B87A6A] text-white px-6 py-3.5 text-sm font-mono uppercase tracking-widest transition-colors rounded-full"
                >
                  Join Community <ArrowRight size={16} />
                </a>
                {priceToolOn && (
                  <Link
                    to="/compare"
                    data-testid="hero-cta-compare"
                    className="inline-flex items-center gap-2 bg-white border-2 border-[#B87A6A] text-[#B87A6A] hover:bg-[#B87A6A] hover:text-white px-6 py-3.5 text-sm font-mono uppercase tracking-widest transition-colors rounded-full"
                  >
                    Compare Prices <ArrowRight size={16} />
                  </Link>
                )}
              </div>
            </div>

            {/* RIGHT — portrait pair */}
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <div className="overflow-hidden rounded-3xl border-4 border-white shadow-[0_0_0_2px_#E8CDBF,0_12px_40px_rgba(184,122,106,0.2)] aspect-[3/4] bg-[#FBF3EC]">
                    <img src="https://customer-assets.emergentagent.com/job_peptide-dosing-1/artifacts/dbdnfsu5_IMG_0986.jpg" alt="Erica before peptides" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="absolute -top-2 -left-2 bg-white border border-[#E8CDBF] px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.18em] text-[#5C5C5C]">Before</div>
                </div>
                <div className="relative mt-8">
                  <div className="overflow-hidden rounded-3xl border-4 border-white shadow-[0_0_0_2px_#B87A6A,0_12px_40px_rgba(184,122,106,0.35)] aspect-[3/4] bg-[#FBF3EC]">
                    <img src="https://customer-assets.emergentagent.com/job_peptide-dosing-1/artifacts/p90s5a8i_IMG_0603.JPG" alt="Erica after peptides" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-[#B87A6A] text-white px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.18em]">After</div>
                </div>
              </div>
              <div className="absolute left-1/2 -bottom-4 -translate-x-1/2 bg-white border-2 border-[#B87A6A] text-[#B87A6A] px-5 py-2 rounded-full font-mono text-sm font-bold shadow-lg tracking-widest">
                −90 LBS
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ STATS ═══════════ */}
      <section className="border-b border-[#E8CDBF] bg-[#0A0A0A] text-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-14 grid sm:grid-cols-3 gap-10 text-center">
          {[
            { n: settings?.home_stat_1_value || "−90 lbs", t: settings?.home_stat_1_label || "My peptide journey", tid: "stat-card-weight" },
            { n: settings?.home_stat_2_value || "150+", t: settings?.home_stat_2_label || "Vendor codes curated", tid: "stat-card-vendors" },
            { n: settings?.home_stat_3_value || "3", t: settings?.home_stat_3_label || "Free calculators & tools", tid: "stat-card-tools" },
          ].map((s) => (
            <div key={s.tid} data-testid={s.tid}>
              <div className="font-serif-luxe text-5xl sm:text-6xl text-[#F5DED4] font-semibold">{s.n}</div>
              <div className="mt-2 text-[11px] font-mono uppercase tracking-[0.28em] text-[#FFB8D8]">{s.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ MEET ERICA ═══════════ */}
      <section className="border-b border-[#E8CDBF]" data-testid="meet-erica-card">
        <div className="max-w-[1000px] mx-auto px-6 lg:px-12 py-20 text-center">
          <div className="text-xs font-mono uppercase tracking-[0.28em] text-[#B87A6A] font-semibold mb-3">Meet Erica</div>
          {(settings?.home_meet_title || "").trim() && (
            <h2 className="font-serif-luxe text-4xl sm:text-5xl font-semibold text-[#0A0A0A]" data-testid="meet-title">
              {settings.home_meet_title}
            </h2>
          )}
          <div className="mt-8 relative inline-block">
            <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-full overflow-hidden border-4 border-white shadow-[0_0_0_3px_#B87A6A,0_12px_40px_rgba(184,122,106,0.35)] mx-auto">
              <img src="https://customer-assets.emergentagent.com/job_peptide-dosing-1/artifacts/p90s5a8i_IMG_0603.JPG" alt="Erica" className="w-full h-full object-cover" />
            </div>
          </div>
          <p className="mt-8 text-base sm:text-lg text-[#3A3A3A] leading-relaxed max-w-2xl mx-auto whitespace-pre-line" data-testid="meet-body">
            {settings?.home_meet_body || "Eleven years ago I chose weight-loss surgery. The weight came back. On June 1, 2025 I found GLP-1 peptides and everything changed. Now I share every vendor, code, and protocol I use."}
          </p>
        </div>
      </section>

      {/* ═══════════ REVIEWS CAROUSEL ═══════════ */}
      {reviews.length > 0 && (
        <section className="border-b border-[#E8CDBF] bg-[#FDF8F3]" data-testid="reviews-section">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20">
            <div className="text-center mb-10">
              <div className="text-xs font-mono uppercase tracking-[0.28em] text-[#B87A6A] font-semibold mb-3">Community Reviews</div>
              <h2 className="font-serif-luxe text-4xl sm:text-5xl font-semibold text-[#0A0A0A]">Hear from The Optimized Society.</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  data-testid="review-card"
                  className="bg-white rounded-2xl border border-[#E8CDBF] p-6 shadow-[0_2px_20px_rgba(184,122,106,0.06)] hover:shadow-[0_8px_30px_rgba(184,122,106,0.18)] transition-shadow"
                >
                  <div className="flex items-center gap-1 mb-3" data-testid="review-rating-stars">
                    {Array.from({ length: r.rating || 5 }).map((_, i) => (
                      <Star key={i} size={14} className="text-[#B87A6A] fill-[#B87A6A]" />
                    ))}
                  </div>
                  <p className="font-serif-luxe text-lg italic text-[#0A0A0A] leading-relaxed">
                    &ldquo;{r.quote}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F5DED4] border border-[#E8CDBF] flex items-center justify-center font-bold text-[#B87A6A]">
                      {(r.author || "?").charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#0A0A0A]">{r.author}</div>
                      {r.location && <div className="text-[10px] font-mono uppercase tracking-widest text-[#5C5C5C]">{r.location}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ TRUSTED VENDORS ═══════════ */}
      <section className="border-b border-[#E8CDBF]" data-testid="trusted-vendors-grid">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20">
          <div className="mb-10">
            <div className="text-xs font-mono uppercase tracking-[0.28em] text-[#B87A6A] font-semibold mb-3">Trusted Vendors</div>
            <h2 className="font-serif-luxe text-4xl sm:text-5xl font-semibold text-[#0A0A0A]">The exact vendors I use.</h2>
            <p className="mt-3 text-sm text-[#5C5C5C] max-w-xl">Every code below is mine — save on peptides, skin care, supplements, and telehealth.</p>
          </div>

          {/* PEP MATCH banner */}
          {priceToolOn && (
            <Link
              to="/compare"
              data-testid="pep-match-banner"
              className="group block mb-8 bg-gradient-to-r from-[#F5DED4] via-white to-[#F5DED4] border-2 border-[#B87A6A] rounded-2xl p-6 hover:shadow-[0_10px_40px_rgba(184,122,106,0.3)] transition-shadow"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-[#B87A6A] font-bold">Find your best fit</div>
                  <div className="mt-1 font-serif-luxe text-2xl sm:text-3xl font-semibold text-[#0A0A0A]">The Optimized Society Price Tool</div>
                  <div className="mt-1 text-sm text-[#3A3A3A]">Compare every peptide, size, and vendor — sorted cheapest first.</div>
                </div>
                <span className="inline-flex items-center gap-2 bg-[#0A0A0A] group-hover:bg-[#B87A6A] text-white px-5 py-3 font-mono text-xs uppercase tracking-widest rounded-full transition-colors">
                  Compare Prices <ArrowRight size={14} />
                </span>
              </div>
            </Link>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((v) => <VendorCard key={v.id} v={v} promo={promoByVendor[v.id]} />)}
          </div>
          <div className="mt-8 text-center">
            <Link to="/vendors" data-testid="all-vendors-btn" className="inline-flex items-center gap-2 border-2 border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white px-6 py-3 font-mono text-xs uppercase tracking-widest transition-colors rounded-full">
              See all vendors <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ JOIN THE CIRCLE ═══════════ */}
      <section className="border-b border-[#E8CDBF] bg-[#FDF8F3]" data-testid="community-circle-grid">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20">
          <div className="text-center mb-12">
            <div className="text-xs font-mono uppercase tracking-[0.28em] text-[#B87A6A] font-semibold mb-3">Join The Circle</div>
            <h2 className="font-serif-luxe text-4xl sm:text-5xl font-semibold text-[#0A0A0A]">Connect. Learn. Grow.</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <CircleCard testid="community-card-skool" title="Skool Community" desc="Daily support, live calls, real accountability." tag={settings?.community_bar_price || "$3 one-time"} cta="Join the community" href={settings?.community_bar_url || "https://www.skool.com/ericas-elevated-life-9005"} />
            <CircleCard testid="community-card-resources" title="Resources & Guides" desc="Protocols, dosing charts, and curated reads." tag="Free · always updated" cta="Browse resources" href="/resources" internal />
            <CircleCard testid="community-card-calc" title="Calculator Suite" desc="Reconstitution, TDEE, BMI — no math required." tag="3 tools · free" cta="Open calculators" href="/calculator" internal />
          </div>
        </div>
      </section>

      {/* ═══════════ MORE THINGS I LOVE (secondary vendors) ═══════════ */}
      {secondary.length > 0 && (
        <section className="border-b border-[#E8CDBF]" data-testid="secondary-vendors-grid">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20">
            <div className="mb-8">
              <div className="text-xs font-mono uppercase tracking-[0.28em] text-[#B87A6A] font-semibold mb-3">More things I love</div>
              <h2 className="font-serif-luxe text-4xl sm:text-5xl font-semibold text-[#0A0A0A]">Beyond peptides.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {secondary.map((v) => <VendorCard key={v.id} v={v} promo={promoByVendor[v.id]} compact />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ NEWSLETTER ═══════════ */}
      <section className="bg-[#0A0A0A] text-white" data-testid="newsletter-section">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.28em] text-[#F5DED4] font-semibold mb-3">Free Weekly Newsletter</div>
            <h2 className="font-serif-luxe text-4xl sm:text-5xl font-semibold" data-testid="newsletter-title">
              {settings?.home_newsletter_title || "Peptide education + exclusive deals every week."}
            </h2>
            <p className="mt-4 text-[#E5D6CB] leading-relaxed whitespace-pre-line" data-testid="newsletter-body">
              {settings?.home_newsletter_body || "Practical protocols, research you can use, and vendor discounts — delivered free."}
            </p>
          </div>
          <div className="bg-white text-[#0A0A0A] rounded-2xl p-6 sm:p-8">
            <div className="text-[10px] font-mono uppercase tracking-[0.28em] text-[#B87A6A] font-bold mb-4">This week&apos;s inside look</div>
            <ul className="space-y-2 text-sm mb-6">
              {[
                "New peptide education & protocol breakdowns",
                "Research updates you can actually use",
                "Exclusive vendor deals & fresh drops",
                "First access to new resources & community updates",
              ].map((li) => (
                <li key={li} className="flex items-start gap-2">
                  <span className="text-[#B87A6A] mt-0.5">›</span>
                  <span>{li}</span>
                </li>
              ))}
            </ul>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const email = e.target.email.value.trim();
                if (!email) return;
                try {
                  const { data } = await api.post("/subscribers", { email, source: "home_newsletter" });
                  toast.success(data.already_subscribed ? "You're already on the list — welcome back!" : "Subscribed! Talk soon.");
                  e.target.reset();
                } catch (err) {
                  toast.error(err.response?.data?.detail || "Couldn't subscribe — try again.");
                }
              }}
              className="flex gap-2"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="you@email.com"
                data-testid="newsletter-email-input"
                className="flex-1 rounded-full border-2 border-[#E8CDBF] focus:border-[#B87A6A] outline-none px-4 py-3 font-mono text-sm"
              />
              <button
                type="submit"
                data-testid="newsletter-submit-btn"
                className="bg-[#B87A6A] hover:bg-[#0A0A0A] text-white px-6 py-3 font-mono text-xs uppercase tracking-widest rounded-full transition-colors"
              >
                Subscribe Free
              </button>
            </form>
            <div className="mt-3 text-[10px] font-mono text-[#5C5C5C]">No spam. Unsubscribe anytime.</div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═══════════ shared VendorCard ═══════════ */
function VendorCard({ v, promo, compact }) {
  const [copied, setCopied] = useState(false);
  const copy = (code) => {
    if (!code) return;
    try {
      navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(`Code "${code}" copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Couldn't copy"); }
  };
  return (
    <div
      data-testid={`vendor-card-${v.slug}`}
      className={`group bg-white rounded-2xl border border-[#E8CDBF] hover:border-[#B87A6A] p-5 flex flex-col shadow-[0_2px_16px_rgba(184,122,106,0.05)] hover:shadow-[0_10px_30px_rgba(184,122,106,0.18)] transition-all ${compact ? "" : ""}`}
    >
      <div className="flex items-start gap-3 mb-3">
        {v.logo_url ? (
          <img
            src={v.logo_url}
            alt={v.name}
            data-testid={`vendor-logo-${v.slug}`}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            className="w-11 h-11 rounded-full object-contain bg-white border border-[#E8CDBF] p-0.5 flex-shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-[#F5DED4] flex items-center justify-center font-bold text-[#B87A6A] flex-shrink-0">
            {v.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-serif-luxe text-lg font-semibold text-[#0A0A0A] truncate">{v.name}</div>
          <div className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
          </div>
        </div>
      </div>
      {v.description && (
        <p className="text-xs text-[#5C5C5C] leading-snug line-clamp-2 mb-3">{v.description}</p>
      )}
      {promo && promo.discount_percent > 0 && (
        <div className="mb-3 inline-flex items-center gap-1.5 self-start px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-bold tracking-widest">
          <Sparkles size={10} /> {promo.discount_percent}% OFF
        </div>
      )}
      <div className="mt-auto flex items-center gap-2">
        {v.discount_code && (
          <button
            type="button"
            onClick={() => copy(v.discount_code)}
            data-testid={`vendor-promo-copy-btn-${v.slug}`}
            className="inline-flex items-center gap-1.5 bg-[#FBF3EC] hover:bg-[#F5DED4] border border-[#E8CDBF] hover:border-[#B87A6A] px-3 py-1.5 rounded-full font-mono text-[11px] font-bold text-[#B87A6A] tracking-widest transition-colors"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />} {v.discount_code}
          </button>
        )}
        <a
          href={v.affiliate_url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          data-testid={`vendor-visit-${v.slug}`}
          className="ml-auto inline-flex items-center gap-1 bg-[#0A0A0A] group-hover:bg-[#B87A6A] text-white px-4 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-widest transition-colors"
        >
          Shop <ArrowRight size={11} />
        </a>
      </div>
    </div>
  );
}

/* ═══════════ Circle community card ═══════════ */
function CircleCard({ testid, title, desc, tag, cta, href, internal }) {
  const Wrap = internal ? Link : "a";
  const props = internal
    ? { to: href }
    : { href, target: "_blank", rel: "noopener noreferrer" };
  return (
    <Wrap
      {...props}
      data-testid={testid}
      className="group block bg-white rounded-2xl border border-[#E8CDBF] hover:border-[#B87A6A] p-6 shadow-[0_2px_16px_rgba(184,122,106,0.05)] hover:shadow-[0_10px_30px_rgba(184,122,106,0.18)] transition-all"
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-[#B87A6A] font-bold mb-2">{tag}</div>
      <div className="font-serif-luxe text-2xl font-semibold text-[#0A0A0A] group-hover:text-[#B87A6A] transition-colors">{title}</div>
      <p className="mt-2 text-sm text-[#5C5C5C] leading-relaxed">{desc}</p>
      <div className="mt-5 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#0A0A0A] group-hover:text-[#B87A6A] transition-colors">
        {cta} <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
      </div>
    </Wrap>
  );
}
