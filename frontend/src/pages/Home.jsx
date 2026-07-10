import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
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

  return (
    <div>
      <SocialBar />

      {/* HERO — new brand banner + welcome */}
      <section className="border-b border-[#E5E5E5] bg-[#FBF3EC]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-16">
          {/* Community bar */}
          {settings?.community_bar_enabled !== false && (
            <a
              href={settings?.community_bar_url || "https://www.skool.com/ericas-elevated-life-9005"}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="community-bar"
              className="group block mb-6 border-2 border-[#B87A6A] bg-gradient-to-r from-[#F5DED4] via-white to-[#F5DED4] hover:from-[#B87A6A] hover:to-[#B87A6A] hover:text-white transition-colors"
            >
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-6 py-4 text-center">
                <Sparkles size={18} className="text-[#B87A6A] group-hover:text-white transition-colors flex-shrink-0" />
                <span
                  className="text-sm sm:text-base font-bold text-[#0A0A0A] group-hover:text-white transition-colors"
                  data-testid="community-bar-message"
                >
                  {settings?.community_bar_message || "Join The Optimized Society community"}
                </span>
                {(settings?.community_bar_price || "").trim() && (
                  <>
                    <span className="hidden sm:inline text-[#B87A6A] group-hover:text-white/60 transition-colors">·</span>
                    <span
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#B87A6A] group-hover:bg-white group-hover:text-[#B87A6A] text-white text-xs font-mono font-bold uppercase tracking-widest rounded-full transition-colors"
                      data-testid="community-bar-price"
                    >
                      {settings.community_bar_price}
                    </span>
                  </>
                )}
                <span
                  className="text-xs font-mono uppercase tracking-widest text-[#B87A6A] group-hover:text-white transition-colors inline-flex items-center gap-1"
                  data-testid="community-bar-cta"
                >
                  {settings?.community_bar_cta || "Join now"} <ArrowRight size={12} />
                </span>
              </div>
            </a>
          )}

          {/* Link-in-bio quick links — top of page */}
          <nav
            data-testid="linkinbio-quicklinks"
            className="mb-8 lg:mb-10 max-w-md mx-auto flex flex-col gap-2.5"
            aria-label="Quick navigation"
          >
            <div className="eyebrow text-[#B87A6A] text-center mb-1">Quick Links</div>
            {[
              { to: "/compare", label: "Peptide Price Tool", enabled: priceToolOn },
              { to: "/vendors", label: "Vendor Directory", enabled: true },
              { to: "/calculator", label: "Calculator Suite", enabled: true },
              { to: "/resources", label: "Resources & Guides", enabled: true },
            ].filter(l => l.enabled).map(l => (
              <Link
                key={l.to}
                to={l.to}
                data-testid={`linkinbio-${l.to.slice(1)}`}
                className="group flex items-center justify-between gap-3 px-5 py-3.5 bg-white border-2 border-[#B87A6A] hover:bg-[#B87A6A] hover:text-white rounded-full transition-all shadow-[0_2px_10px_rgba(184,122,106,0.15)] hover:shadow-[0_6px_20px_rgba(184,122,106,0.35)]"
              >
                <span className="text-sm font-bold uppercase tracking-widest font-mono">{l.label}</span>
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </nav>

          {/* Brand banner image */}
          <div className="mb-10 lg:mb-14">
            <img
              src="https://customer-assets.emergentagent.com/job_peptide-dosing-1/artifacts/3alss7km_new%20cover.png"
              alt="The Optimized Society by Erica — Optimize Your Health. Elevate Your Life."
              className="w-full h-auto rounded-none block mx-auto"
              style={{ maxHeight: "560px", objectFit: "contain" }}
              data-testid="hero-banner"
            />
          </div>

          <div className="eyebrow text-[#B87A6A] mb-6 text-center" data-testid="hero-eyebrow">
            Optimize Your Health · Elevate Your Life · est. 2026
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-[-0.04em] leading-[0.95] mb-10 text-center">
            The{" "}
            <span className="font-serif-glam italic font-normal pink-text">
              Optimized Society
            </span>
          </h1>

          <div className="flex flex-col gap-12 items-stretch lg:items-center">
            {/* Paragraph (top on desktop, below image on mobile) */}
            <div className="order-2 lg:order-1 lg:max-w-3xl lg:text-center lg:mx-auto">
              <p className="text-lg lg:text-xl text-[#0A0A0A] leading-relaxed">
                Welcome to{" "}
                <span className="font-bold">The Optimized Society</span> — a wellness
                and peptide education hub curated by Erica. Explore trusted vendors,
                science-backed protocols, and tools designed to help you optimize your
                health and elevate your life.
              </p>
            </div>

            {/* Before/After pair + buttons (centered on desktop) */}
            <div className="order-1 lg:order-2 flex flex-col items-center w-full">
              <div className="relative w-full max-w-md" data-testid="before-after">
                {/* "-90 LBS" headline */}
                <div className="text-center mb-4 px-4 overflow-visible">
                  <div className="eyebrow text-[#5C5C5C]">My peptide journey</div>
                  <div className="mt-2 text-4xl sm:text-5xl font-black tracking-tighter leading-[1.2] pb-2 text-[#B87A6A]">
                    −90 lbs
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* BEFORE */}
                  <div className="relative">
                    <div className="overflow-hidden rounded-2xl border-4 border-white shadow-[0_0_0_2px_#E8CDBF,0_8px_24px_rgba(255,45,135,0.12)] aspect-[3/4] bg-[#FBF3EC]">
                      <img
                        src="https://customer-assets.emergentagent.com/job_peptide-dosing-1/artifacts/dbdnfsu5_IMG_0986.jpg"
                        alt="Erica — before peptides"
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute -top-2 -left-2 bg-white border border-[#E8CDBF] px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.18em] text-[#5C5C5C] shadow-sm">
                      Before
                    </div>
                  </div>

                  {/* AFTER */}
                  <div className="relative">
                    <div className="overflow-hidden rounded-2xl border-4 border-white shadow-[0_0_0_2px_#B87A6A,0_8px_24px_rgba(255,45,135,0.25)] aspect-[3/4] bg-[#FBF3EC]">
                      <img
                        src="https://customer-assets.emergentagent.com/job_peptide-dosing-1/artifacts/p90s5a8i_IMG_0603.JPG"
                        alt="Erica — after peptides"
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="absolute -top-2 -right-2 bg-[#B87A6A] text-white px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.18em] shadow-[0_4px_14px_rgba(255,45,135,0.35)]">
                      After
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center text-xs font-mono uppercase tracking-[0.2em] text-[#5C5C5C]">
                  ✦ hi, i&apos;m erica ✦
                </div>
              </div>

              {/* My Story bio */}
              <div
                data-testid="my-story"
                className="mt-10 w-full max-w-md bg-white rounded-[24px] border border-[#E8CDBF] p-6 lg:p-7 shadow-[0_2px_20px_rgba(255,45,135,0.06)]"
              >
                <div className="eyebrow text-[#B87A6A] mb-3">My Story</div>
                <p className="text-sm text-[#0A0A0A] leading-relaxed">
                  Eleven years ago, I made one of the biggest decisions of my life
                  &mdash; weight loss surgery. It gave me a fresh start, but over time
                  the weight crept back, and with it came years of frustration, shame,
                  and feeling like I had failed myself. I tried everything to get back
                  on track and nothing seemed to work.
                </p>
                <p className="text-sm text-[#0A0A0A] leading-relaxed mt-4">
                  Then on{" "}
                  <span className="font-bold text-[#B87A6A]">June 1st, 2025</span>,
                  everything changed.
                </p>
                <p className="text-sm text-[#0A0A0A] leading-relaxed mt-4">
                  I discovered GLP-1 peptides and within a year I lost{" "}
                  <span className="font-bold text-[#B87A6A]">90 pounds</span>. Not just
                  the weight &mdash; I got my confidence back, my energy back, my life
                  back. What started as my own desperate search for answers turned into
                  a full-on passion for research. I started digging into peptides,
                  vendors, pricing, and protocols because I needed to know everything
                  &mdash; and once I did, I couldn&apos;t stop sharing it with others.
                </p>
              </div>

              {/* CTAs below pic */}
              <div className="mt-10 flex flex-col gap-3 w-full max-w-sm">
                {priceToolOn ? (
                  <Link
                    to="/compare"
                    data-testid="hero-cta-price-tool"
                    className="bg-[#B87A6A] text-white px-6 py-4 text-sm font-mono uppercase tracking-[0.2em] hover:bg-[#0A0A0A] inline-flex items-center justify-center gap-3"
                  >
                    The Optimized Society Price Tool <ArrowRight size={16} />
                  </Link>
                ) : (
                  <Link
                    to="/vendors"
                    data-testid="hero-cta-vendors"
                    className="bg-[#B87A6A] text-white px-6 py-4 text-sm font-mono uppercase tracking-[0.2em] hover:bg-[#0A0A0A] inline-flex items-center justify-center gap-3"
                  >
                    Browse Vendors <ArrowRight size={16} />
                  </Link>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={settings?.community_bar_url || "https://www.skool.com/ericas-elevated-life-9005"}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="hero-cta-skool"
                    className="border border-[#0A0A0A] px-4 py-3 text-xs font-mono uppercase tracking-[0.2em] hover:bg-[#0A0A0A] hover:text-white inline-flex items-center justify-center"
                  >
                    Join Community
                  </a>
                  <Link
                    to="/calculator"
                    data-testid="hero-cta-calc"
                    className="border border-[#0A0A0A] px-4 py-3 text-xs font-mono uppercase tracking-[0.2em] hover:bg-[#0A0A0A] hover:text-white inline-flex items-center justify-center"
                  >
                    Calculator
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MANIFESTO removed */}
    </div>
  );
}
