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
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-28 grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <div className="eyebrow text-[#FF2D87] mb-6" data-testid="hero-eyebrow">
              Peptide price intelligence · for the girls · est. 2026
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-[-0.04em] leading-[0.92]">
              Compare, calculate,<br/>
              source peptides<br/>
              <span className="pink-text font-serif-glam italic font-normal">like a girl.</span>
            </h1>
            <p className="mt-8 text-lg max-w-2xl text-[#5C5C5C] leading-relaxed">
              The no-nonsense affiliate hub for research peptides — with the receipts.
              Vendor prices side-by-side, a calculator that turns mcg into syringe units,
              and zero gatekeeping. Sparkles included.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/compare"
                data-testid="hero-cta-compare"
                className="bg-[#FF2D87] text-white px-6 py-4 text-sm font-mono uppercase tracking-[0.2em] hover:bg-[#0A0A0A] inline-flex items-center gap-3"
              >
                Compare Prices <ArrowRight size={16} />
              </Link>
              <Link
                to="/calculator"
                data-testid="hero-cta-calc"
                className="border border-[#0A0A0A] px-6 py-4 text-sm font-mono uppercase tracking-[0.2em] hover:bg-[#0A0A0A] hover:text-white inline-flex items-center gap-3"
              >
                Open Calculator
              </Link>
            </div>
          </div>
          <div className="lg:col-span-4 border-l border-[#E5E5E5] pl-8 hidden lg:block">
            <div className="space-y-6">
              <Stat label="Vendors tracked" value="04" />
              <Stat label="Peptides indexed" value="06" />
              <Stat label="Live price points" value="24" />
              <Stat label="Disclosure" value="Affiliate" mono />
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

      {/* MANIFESTO */}
      <section>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20 grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3">
            <div className="eyebrow text-[#5C5C5C]">Manifesto</div>
          </div>
          <div className="lg:col-span-9">
            <p className="text-2xl lg:text-4xl font-light leading-snug tracking-tight">
              We don&apos;t sell peptides — we help girls <span className="bg-[#FF2D87] text-white px-2">find honest vendors</span>, decode certificates of analysis, and stop guessing at syringe units. Every link with a &ldquo;ref=&rdquo; earns us a small commission — never at your cost. <span className="chrome-text font-serif-glam">✦ glittery transparency ✦</span>
            </p>
          </div>
        </div>
      </section>
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
