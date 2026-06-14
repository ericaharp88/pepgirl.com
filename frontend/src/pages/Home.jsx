import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import api from "../lib/api";
import SocialBar from "../components/SocialBar";

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
      {/* HERO */}
      <section className="border-b border-[#E5E5E5]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <div className="eyebrow text-[#FF2D87] mb-6" data-testid="hero-eyebrow">
            Peptide Resources and Education · for the girls · est. 2026
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-[-0.04em] leading-[0.95] mb-12">
            Glow up using peptides{" "}
            <span className="font-serif-glam italic font-normal pink-text">with Erica</span>
          </h1>

          <div className="grid lg:grid-cols-12 gap-12 items-start">
            {/* Paragraph (left) */}
            <div className="lg:col-span-7 order-2 lg:order-1">
              <p className="text-lg lg:text-xl text-[#0A0A0A] leading-relaxed">
                Welcome to <span className="font-bold">Pepgirl.com</span> — a wellness
                and peptide education hub for peptide researchers. Explore trusted vendors,
                science-backed protocols, and tools designed to help you thrive in your research lab.
              </p>
            </div>

            {/* Pic + buttons (right) */}
            <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col items-center">
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -inset-3 rounded-[50%]"
                  style={{
                    background:
                      "conic-gradient(from 180deg, #FF2D87, #FFFFFF, #C0C0C0, #FF6FB5, #FFFFFF, #FF2D87)",
                    filter: "blur(2px)",
                  }}
                />
                <div
                  className="relative overflow-hidden border-4 border-white shadow-[0_0_0_2px_#FF2D87]"
                  style={{ width: 320, height: 430, borderRadius: "50%" }}
                  data-testid="erica-photo"
                >
                  <img
                    src="https://customer-assets.emergentagent.com/job_peptide-hub-37/artifacts/5qrfs077_IMG_0602.jpeg"
                    alt="Erica — Pepgirl.com"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div
                  aria-hidden
                  className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-xl font-serif-glam italic text-[#FF2D87]"
                >
                  ✦ hi, i&apos;m erica ✦
                </div>
              </div>

              {/* CTAs below pic */}
              <div className="mt-10 flex flex-col gap-3 w-full max-w-sm">
                <a
                  href="https://www.skool.com/ericas-elevated-life-9005"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="hero-cta-skool"
                  className="bg-[#FF2D87] text-white px-6 py-4 text-sm font-mono uppercase tracking-[0.2em] hover:bg-[#0A0A0A] inline-flex items-center justify-center gap-3"
                >
                  Join Skool Research Community <ArrowRight size={16} />
                </a>
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    to="/compare"
                    data-testid="hero-cta-compare"
                    className="border border-[#0A0A0A] px-4 py-3 text-xs font-mono uppercase tracking-[0.2em] hover:bg-[#0A0A0A] hover:text-white inline-flex items-center justify-center"
                  >
                    Compare Prices
                  </Link>
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
      <section className="border-b border-[#E5E5E5] bg-gradient-to-b from-[#FFF5FA] to-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20">
          <div className="text-center mb-12">
            <div className="eyebrow text-[#FF2D87] mb-3">Explore the toolkit</div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight font-serif-glam">
              Everything a Pep Girl needs
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
                  className="group relative bg-white rounded-[28px] p-8 lg:p-10 border border-[#F0CFE0] shadow-[0_2px_20px_rgba(255,45,135,0.06)] hover:shadow-[0_12px_40px_rgba(255,45,135,0.18)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
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
                    className="absolute top-5 right-5 text-[#FF2D87] opacity-50 group-hover:opacity-100 transition-opacity"
                    aria-hidden
                  />

                  <div className="flex items-center gap-3 mb-5">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-[#FF2D87] text-white text-[11px] font-mono font-bold tracking-wider">
                      {label}
                    </span>
                    {count !== null && count !== undefined && (
                      <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#5C5C5C]">
                        {count} {teaser}
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl lg:text-3xl font-black tracking-tight mb-3 group-hover:text-[#FF2D87] transition-colors">
                    {title}
                  </h3>
                  <p className="text-sm text-[#5C5C5C] leading-relaxed max-w-md">
                    {desc}
                  </p>

                  <div className="mt-7 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.22em] text-[#0A0A0A] group-hover:text-[#FF2D87] transition-colors">
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
