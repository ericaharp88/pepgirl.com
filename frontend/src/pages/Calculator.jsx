import { useMemo, useState } from "react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Calculator() {
  const [peptideMg, setPeptideMg] = useState(5);
  const [bacWaterMl, setBacWaterMl] = useState(2);
  const [doseMcg, setDoseMcg] = useState(250);
  const [syringeUnits, setSyringeUnits] = useState(100); // U-100 = 100 units / 1 mL
  const [dosesPerWeek, setDosesPerWeek] = useState(7);

  const result = useMemo(() => {
    const mg = Number(peptideMg) || 0;
    const ml = Number(bacWaterMl) || 0;
    const dose = Number(doseMcg) || 0;
    const sUnits = Number(syringeUnits) || 0;
    const freq = Number(dosesPerWeek) || 0;
    if (!mg || !ml || !dose || !sUnits) {
      return { concentration: 0, doseMl: 0, drawUnits: 0, dosesPerVial: 0, weeks: 0, days: 0, error: null };
    }
    const conc = (mg * 1000) / ml; // mcg per mL
    const dMl = dose / conc; // mL per dose
    const draw = dMl * sUnits; // units per dose on syringe
    const totalMcg = mg * 1000;
    const dosesPerVial = totalMcg / dose;
    const days = freq > 0 ? (dosesPerVial / freq) * 7 : 0;
    const weeks = freq > 0 ? dosesPerVial / freq : 0;
    let err = null;
    if (draw > sUnits) err = `Dose exceeds full syringe (${sUnits} units). Increase BAC water or split doses.`;
    return { concentration: conc, doseMl: dMl, drawUnits: draw, dosesPerVial, weeks, days, error: err };
  }, [peptideMg, bacWaterMl, doseMcg, syringeUnits, dosesPerWeek]);

  const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");

  const presets = [
    { name: "BPC-157", mg: 5, ml: 2, dose: 250 },
    { name: "TB-500", mg: 5, ml: 2, dose: 2000 },
    { name: "Semaglutide", mg: 5, ml: 2, dose: 250 },
    { name: "Tirzepatide", mg: 10, ml: 2, dose: 2500 },
    { name: "Ipamorelin", mg: 5, ml: 2, dose: 200 },
    { name: "CJC-1295", mg: 5, ml: 2, dose: 100 },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16">
      {/* Header */}
      <div className="border-b border-[#0A0A0A] pb-6 mb-12">
        <div className="eyebrow text-[#FF2D87] mb-3">Tool · 02</div>
        <h1 className="text-5xl lg:text-7xl font-black tracking-tighter">
          Reconstitution Calculator
        </h1>
        <p className="text-base text-[#5C5C5C] mt-4 max-w-2xl">
          Convert a peptide vial + BAC water volume into an exact draw on a U-100 insulin
          syringe — and see how long a vial will last at your dosing schedule.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-0 border border-[#0A0A0A]">
        {/* ────────────── INPUTS ────────────── */}
        <div className="lg:col-span-7 p-8 lg:p-12 border-r border-[#0A0A0A]">
          {/* Section: Vial */}
          <SectionLabel num="01" title="Your vial" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
            <Field label="Peptide in vial" suffix="mg" value={peptideMg} onChange={setPeptideMg} testId="calc-peptide-mg" />
            <Field label="BAC water added" suffix="mL" value={bacWaterMl} onChange={setBacWaterMl} testId="calc-bac-ml" />
          </div>

          {/* Section: Dose */}
          <SectionLabel num="02" title="Your dose" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
            <Field label="Desired dose" suffix="mcg" value={doseMcg} onChange={setDoseMcg} testId="calc-dose-mcg" />
            <Field label="Doses per week" suffix="x" value={dosesPerWeek} onChange={setDosesPerWeek} testId="calc-doses-week" />
          </div>
          <div className="flex flex-wrap gap-2 mb-10 -mt-4">
            {[
              { l: "Daily", v: 7 }, { l: "5×/wk", v: 5 }, { l: "3×/wk", v: 3 },
              { l: "2×/wk", v: 2 }, { l: "Weekly", v: 1 },
            ].map((c) => (
              <button
                key={c.l}
                onClick={() => setDosesPerWeek(c.v)}
                data-testid={`freq-${c.v}`}
                className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] border ${
                  Number(dosesPerWeek) === c.v
                    ? "bg-[#FF2D87] text-white border-[#FF2D87]"
                    : "border-[#0A0A0A] hover:bg-[#FFE3F0]"
                }`}
              >
                {c.l}
              </button>
            ))}
          </div>

          {/* Section: Syringe */}
          <SectionLabel num="03" title="Your syringe" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Syringe capacity" suffix="U / mL" value={syringeUnits} onChange={setSyringeUnits} testId="calc-syringe-units" />
            <div className="flex items-end">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#5C5C5C] leading-relaxed">
                Standard U-100 insulin syringe<br />
                100 units = 1 mL
              </div>
            </div>
          </div>
        </div>

        {/* ────────────── OUTPUT ────────────── */}
        <div className="lg:col-span-5 invert-panel p-8 lg:p-12 flex flex-col gap-8" data-testid="calc-output">
          <div>
            <div className="eyebrow text-[#A0A0A0]">Result</div>
            <div className="eyebrow text-[#7C7C7C] mt-6">Draw on syringe</div>
            <div
              className="text-6xl lg:text-7xl font-mono font-black tracking-tighter mt-2 text-white"
              data-testid="calc-draw-units"
            >
              {fmt(result.drawUnits, 1)}
              <span className="text-2xl text-[#FF2D87] ml-2">units</span>
            </div>
          </div>

          {/* Syringe visualization */}
          <SyringeVisual draw={result.drawUnits} capacity={Number(syringeUnits) || 100} />

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-6 border-t border-[#2A2A2A] pt-6">
            <Stat label="Volume" value={`${fmt(result.doseMl, 3)} mL`} testId="calc-vol-ml" />
            <Stat label="Concentration" value={`${fmt(result.concentration, 0)} mcg/mL`} testId="calc-conc" />
          </div>

          {/* Supply duration */}
          <div className="border border-[#FF2D87] p-5 bg-[#160812]">
            <div className="eyebrow text-[#FF6FB5]">Vial supply</div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <div className="text-4xl font-mono font-black text-white" data-testid="calc-weeks">
                  {fmt(result.weeks, 1)}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#A0A0A0] mt-1">
                  weeks of doses
                </div>
              </div>
              <div>
                <div className="text-4xl font-mono font-black text-white" data-testid="calc-doses">
                  {fmt(result.dosesPerVial, 0)}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#A0A0A0] mt-1">
                  total doses
                </div>
              </div>
            </div>
            <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.2em] text-[#7C7C7C]">
              ≈ {fmt(result.days, 0)} days at {dosesPerWeek}×/wk
            </div>
          </div>

          {result.error && (
            <div className="border border-[#FF2D87] p-4 font-mono text-xs uppercase tracking-wider text-[#FF6FB5]" data-testid="calc-error">
              ⚠ {result.error}
            </div>
          )}

          <p className="mt-auto text-[10px] font-mono uppercase tracking-[0.2em] text-[#7C7C7C] leading-relaxed">
            Always verify with vendor COA. Research use only.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───────────── helpers ───────────── */

function SectionLabel({ num, title }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="font-mono text-xs text-[#FF2D87] tracking-[0.25em]">{num}</span>
      <span className="font-mono text-xs uppercase tracking-[0.3em] text-[#0A0A0A] font-bold">
        {title}
      </span>
      <span className="flex-1 h-px bg-[#0A0A0A]" />
    </div>
  );
}

function Field({ label, suffix, value, onChange, testId }) {
  return (
    <div>
      <Label className="eyebrow text-[#5C5C5C]">{label}</Label>
      <div className="mt-2 flex items-stretch border border-[#0A0A0A] focus-within:border-[#FF2D87]">
        <Input
          type="number"
          min={0}
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
          className="rounded-none border-0 font-mono text-2xl h-14 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <span className="px-4 border-l border-[#0A0A0A] font-mono text-xs uppercase tracking-[0.2em] text-[#5C5C5C] self-stretch flex items-center bg-[#FAFAFA]">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value, testId }) {
  return (
    <div>
      <div className="eyebrow text-[#7C7C7C]">{label}</div>
      <div className="font-mono text-2xl font-bold mt-1 text-white" data-testid={testId}>
        {value}
      </div>
    </div>
  );
}

/* ───────────── Syringe SVG ───────────── */

function SyringeVisual({ draw, capacity }) {
  const cap = Math.max(capacity || 100, 1);
  const fillPct = Math.min(Math.max((draw || 0) / cap, 0), 1);

  // SVG geometry
  const barrelX = 70;
  const barrelW = 340;
  const barrelY = 40;
  const barrelH = 36;
  const fillW = barrelW * fillPct;

  // Number of major ticks (every 10 units up to capacity, max 10 segments)
  const segCount = 10;

  return (
    <div data-testid="syringe-visual">
      <div className="eyebrow text-[#7C7C7C] mb-3">Visual</div>
      <svg viewBox="0 0 500 110" className="w-full h-auto" aria-label="Insulin syringe">
        {/* Plunger handle */}
        <rect x="2" y="38" width="20" height="40" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="1.5" />
        <rect x="22" y="48" width="8" height="20" fill="#FFFFFF" />
        {/* Plunger rod */}
        <rect x="30" y="54" width={40} height="8" fill="#666" />
        {/* Plunger stopper that moves with fill (visual hint) */}
        <rect
          x={barrelX + fillW - 8}
          y={barrelY - 2}
          width="8"
          height={barrelH + 4}
          fill="#FF2D87"
        />
        {/* Fill liquid */}
        <rect
          x={barrelX}
          y={barrelY}
          width={fillW}
          height={barrelH}
          fill="url(#pinkfill)"
        />
        {/* Barrel outline */}
        <rect
          x={barrelX}
          y={barrelY}
          width={barrelW}
          height={barrelH}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
        />
        {/* Ticks */}
        {Array.from({ length: segCount + 1 }).map((_, i) => {
          const x = barrelX + (barrelW / segCount) * i;
          const isMajor = i % 2 === 0;
          return (
            <g key={i}>
              <line
                x1={x}
                y1={barrelY - 6}
                x2={x}
                y2={barrelY}
                stroke="#FFFFFF"
                strokeWidth={isMajor ? 1.5 : 1}
              />
              {isMajor && (
                <text
                  x={x}
                  y={barrelY - 10}
                  fill="#A0A0A0"
                  fontSize="9"
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {Math.round((cap / segCount) * i)}
                </text>
              )}
            </g>
          );
        })}
        {/* Needle hub + needle */}
        <rect x={barrelX + barrelW} y={barrelY + 8} width="14" height={barrelH - 16} fill="#FFFFFF" />
        <line
          x1={barrelX + barrelW + 14}
          y1={barrelY + barrelH / 2}
          x2={barrelX + barrelW + 80}
          y2={barrelY + barrelH / 2}
          stroke="#FFFFFF"
          strokeWidth="2"
        />
        {/* Draw indicator label */}
        <text
          x={barrelX + Math.max(fillW, 30) / 2 + (fillW < 60 ? 30 : 0)}
          y={barrelY + barrelH / 2 + 4}
          fill="#FFFFFF"
          fontSize="12"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="700"
          textAnchor="middle"
        >
          {fillW > 40 ? `${(draw || 0).toFixed(1)} u` : ""}
        </text>
        <defs>
          <linearGradient id="pinkfill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF2D87" />
            <stop offset="100%" stopColor="#FF6FB5" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-[#7C7C7C] mt-1 px-[14%]">
        <span>0 u</span>
        <span>{Math.round(cap / 2)} u</span>
        <span>{cap} u</span>
      </div>
    </div>
  );
}
