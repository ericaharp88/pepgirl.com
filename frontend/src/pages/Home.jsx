import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import api from "../lib/api";
import SocialBar from "../components/SocialBar";
import useSeo from "../hooks/useSeo";

const tiles = [
  {
    to: "/vendors",
    title: "Vendor Directory",
    desc: "Trusted research peptide suppliers, COA-verified and pre-vetted.",
    label: "01",
    teaser: "vendors",
    countFrom: "vendors",
  },
  {
    to: "/calculator",
    title: "Calculator Suite",
    desc: "Reconstitution math, TDEE energy needs, and BMI — all in one place.",
    label: "02",
    teaser: "tools",
    countFrom: null,
    staticCount: "3 tools",
  },
  {
    to: "/compare",
    title: "Peptide Price Tool",
    desc: "Compare every peptide, size, and vendor — sorted cheapest first.",
    label: "03",
    teaser: "live prices",
    countFrom: "prices",
  },
  {
    to: "/resources",
    title: "Resources & Guides",
    desc: "Curated guides, protocols, supply lists, and trusted references.",
    label: "04",
    teaser: "sources",
    countFrom: "resources",
  },
];

export default function Home() {
  useSeo({
    title: "Optimize Your Health. Elevate Your Life.",
    description: "The Optimized Society by Erica — Trusted peptide vendors, price comparisons, dosage calculators, and wellness education. Built after losing 90 lbs with GLP-1 peptides.",
    path: "/",
  });
  const [counts, setCounts] = useState({});

  useEffect(() => {
    Promise.allSettled([
      api.get("/vendors").then((r) => ["vendors", r.data?.length || 0]),
      api.get("/resources").then((r) => ["resources", r.data?.length || 0]),
      api.get("/comparison").then((r) => ["prices", r.data?.prices?.length || 0]),
    ]).then((results) => {
      const obj = {};
      results.forEach((s) => { if (s.status === "fulfilled") obj[s.value[0]] = s.value[1]; });
      setCounts(obj);
    });
  }, []);

  return (
    <div>
      <SocialBar />

      {/* HERO — new brand banner + welcome */}
      <section className="border-b border-[#E5E5E5] bg-[#FBF3EC]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-16">
          {/* Brand banner image */}
          <div className="mb-10 lg:mb-14">
            <img
              src="https://customer-assets.emergentagent.com/job_peptide-dosing-1/artifacts/um8tthw6_f0d6925a-f717-444d-8fb2-c7c19d4a9882.png"
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
                <Link
                  to="/compare"
                  data-testid="hero-cta-price-tool"
                  className="bg-[#B87A6A] text-white px-6 py-4 text-sm font-mono uppercase tracking-[0.2em] hover:bg-[#0A0A0A] inline-flex items-center justify-center gap-3"
                >
                  The Optimized Society Price Tool <ArrowRight size={16} />
                </Link>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href="https://www.skool.com/ericas-elevated-life-9005"
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

      {/* TILES */}
      <section className="border-b border-[#E5E5E5] bg-gradient-to-b from-[#FDF8F3] to-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20">
          <div className="text-center mb-12">
            <div className="eyebrow text-[#B87A6A] mb-3">Explore the toolkit</div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight font-serif-glam">
              Everything a The Optimized Society needs
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 lg:gap-6" data-testid="home-tiles">
            {tiles.map(({ to, title, desc, label, teaser, countFrom, staticCount }) => {
              const count = staticCount ?? (countFrom ? counts[countFrom] : null);
              return (
                <Link
                  key={to}
                  to={to}
                  data-testid={`tile-${to.slice(1)}`}
                  className="group relative bg-white rounded-[28px] p-8 lg:p-10 border border-[#E8CDBF] shadow-[0_2px_20px_rgba(255,45,135,0.06)] hover:shadow-[0_12px_40px_rgba(255,45,135,0.18)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  {/* Decorative pink gradient corner */}
                  <div
                    aria-hidden
                    className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: "radial-gradient(circle, rgba(255,45,135,0.18) 0%, transparent 70%)",
                    }}
                  />
                  <Sparkles
                    size={14}
                    className="absolute top-5 right-5 text-[#B87A6A] opacity-50 group-hover:opacity-100 transition-opacity"
                    aria-hidden
                  />

                  <div className="flex items-center gap-3 mb-5">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[#B87A6A] text-white text-[11px] font-mono font-bold tracking-wider">
                      {label}
                    </span>
                    {count !== null && count !== undefined && (
                      <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#5C5C5C]">
                        {count} {teaser}
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl lg:text-3xl font-black tracking-tight mb-3 group-hover:text-[#B87A6A] transition-colors">
                    {title}
                  </h3>
                  <p className="text-sm text-[#5C5C5C] leading-relaxed max-w-md">
                    {desc}
                  </p>

                  <div className="mt-7 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.22em] text-[#0A0A0A] group-hover:text-[#B87A6A] transition-colors">
                    Enter
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* MANIFESTO removed */}
    </div>
  );
}

function Stat({ label, value, mono }) {
  return (
    <div>
      <div className="text-xs font-mono uppercase tracking-[0.25em] text-[#5C5C5C]">{label}</div>
      <div className={`text-4xl font-bold tracking-tight ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
