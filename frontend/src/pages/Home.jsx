import { Link } from "react-router-dom";
import { ArrowRight, FlaskConical, Calculator, ScanLine, BookOpen } from "lucide-react";

const tiles = [
  { to: "/vendors", title: "Vendor Directory", desc: "Vetted research peptide suppliers with COAs.", Icon: FlaskConical, label: "01" },
  { to: "/calculator", title: "Reconstitution Calculator", desc: "Dose → BAC water → insulin syringe units.", Icon: Calculator, label: "02" },
  { to: "/compare", title: "Price Comparison", desc: "Side-by-side pricing across vendors.", Icon: ScanLine, label: "03" },
  { to: "/resources", title: "Resources & Guides", desc: "How-tos, COAs, dosing references.", Icon: BookOpen, label: "04" },
];

export default function Home() {
  return (
    <div>
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
                  className="absolute -bottom-2 -left-2 text-xl font-serif-glam italic text-[#FF2D87]"
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
      <section className="border-b border-[#E5E5E5]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16">
          <div className="grid md:grid-cols-2 grid-borders border-t border-l border-[#E5E5E5]" data-testid="home-tiles">
            {tiles.map(({ to, title, desc, Icon, label }) => (
              <Link
                key={to}
                to={to}
                data-testid={`tile-${to.slice(1)}`}
                className="group p-10 lg:p-14 bg-white hover:bg-gradient-to-br hover:from-[#FF2D87] hover:to-[#0A0A0A] hover:text-white"
              >
                <div className="flex items-start justify-between mb-12">
                  <span className="font-mono text-xs tracking-[0.3em]">{label}</span>
                  <Icon size={28} strokeWidth={1.5} />
                </div>
                <h3 className="text-3xl lg:text-4xl font-bold tracking-tight mb-3">{title}</h3>
                <p className="text-sm text-[#5C5C5C] group-hover:text-[#A0A0A0] max-w-md">
                  {desc}
                </p>
                <div className="mt-8 text-xs font-mono uppercase tracking-[0.3em] inline-flex items-center gap-2">
                  Enter <ArrowRight size={14} />
                </div>
              </Link>
            ))}
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
