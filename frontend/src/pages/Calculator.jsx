import { useMemo, useState } from "react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Calculator() {
  const [peptideMg, setPeptideMg] = useState(5);
  const [bacWaterMl, setBacWaterMl] = useState(2);
  const [doseMcg, setDoseMcg] = useState(250);
  const [syringeUnits, setSyringeUnits] = useState(100); // U-100 = 100 units / 1 mL

  const { concentrationMcgPerMl, doseMl, drawUnits, doseError } = useMemo(() => {
    const mg = Number(peptideMg) || 0;
    const ml = Number(bacWaterMl) || 0;
    const dose = Number(doseMcg) || 0;
    const sUnits = Number(syringeUnits) || 0;
    if (!mg || !ml || !dose || !sUnits) return { concentrationMcgPerMl: 0, doseMl: 0, drawUnits: 0, doseError: null };
    const conc = (mg * 1000) / ml; // mcg per mL
    const dml = dose / conc; // mL
    // syringeUnits represents the syringe capacity in units that equals 1mL? No -
    // For U-100, 100 units = 1mL; for U-50, 50 units = 0.5mL — but ratio still 100 units/mL
    // The "syringeUnits" input is the syringe's TOTAL units for 1mL? We treat it as units-per-mL marking (standard U-100 = 100)
    const draw = dml * sUnits;
    let err = null;
    if (draw > sUnits) err = `Dose exceeds full syringe (${sUnits} units). Increase BAC water or split doses.`;
    return { concentrationMcgPerMl: conc, doseMl: dml, drawUnits: draw, doseError: err };
  }, [peptideMg, bacWaterMl, doseMcg, syringeUnits]);

  const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16">
      <div className="border-b border-[#0A0A0A] pb-6 mb-12">
        <div className="eyebrow text-[#FF2D87] mb-3">Tool · 02</div>
        <h1 className="text-5xl lg:text-7xl font-black tracking-tighter">Reconstitution Calculator</h1>
        <p className="text-base text-[#5C5C5C] mt-4 max-w-2xl">
          Convert a peptide vial + BAC water volume into an exact draw on a U-100 insulin syringe.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-0 border border-[#0A0A0A]">
        {/* INPUTS */}
        <div className="lg:col-span-7 p-8 lg:p-12 border-r border-[#0A0A0A]">
          <div className="eyebrow text-[#5C5C5C] mb-8">Inputs</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field
              label="Peptide in vial"
              suffix="mg"
              value={peptideMg}
              onChange={setPeptideMg}
              testId="calc-peptide-mg"
            />
            <Field
              label="BAC water added"
              suffix="mL"
              value={bacWaterMl}
              onChange={setBacWaterMl}
              testId="calc-bac-ml"
            />
            <Field
              label="Desired dose"
              suffix="mcg"
              value={doseMcg}
              onChange={setDoseMcg}
              testId="calc-dose-mcg"
            />
            <Field
              label="Syringe (units / mL)"
              suffix="U"
              value={syringeUnits}
              onChange={setSyringeUnits}
              testId="calc-syringe-units"
            />
          </div>
          <div className="mt-10 grid grid-cols-2 gap-px bg-[#E5E5E5] border border-[#E5E5E5]">
            <Preset onClick={() => { setPeptideMg(5); setBacWaterMl(2); setDoseMcg(250); }} label="BPC-157 · 5mg" />
            <Preset onClick={() => { setPeptideMg(10); setBacWaterMl(2); setDoseMcg(2500); }} label="Tirzepatide · 10mg" />
            <Preset onClick={() => { setPeptideMg(5); setBacWaterMl(2); setDoseMcg(2000); }} label="TB-500 · 5mg" />
            <Preset onClick={() => { setPeptideMg(5); setBacWaterMl(2); setDoseMcg(250); }} label="Semaglutide · 5mg" />
          </div>
        </div>

        {/* OUTPUTS */}
        <div className="lg:col-span-5 invert-panel p-8 lg:p-12 flex flex-col" data-testid="calc-output">
          <div className="eyebrow text-[#A0A0A0] mb-8">Result</div>
          <div>
            <div className="eyebrow text-[#7C7C7C]">Draw on syringe</div>
            <div className="text-6xl lg:text-7xl font-mono font-black tracking-tighter mt-2 text-[#FFFFFF]" data-testid="calc-draw-units">
              {fmt(drawUnits, 1)}
              <span className="text-2xl text-[#FF2D87] ml-2">units</span>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-8 border-t border-[#2A2A2A] pt-8">
            <Stat label="Volume" value={`${fmt(doseMl, 3)} mL`} testId="calc-vol-ml" />
            <Stat label="Concentration" value={`${fmt(concentrationMcgPerMl, 0)} mcg/mL`} testId="calc-conc" />
          </div>
          {doseError && (
            <div className="mt-8 border border-[#E60000] p-4 font-mono text-xs uppercase tracking-wider text-[#FF6464]" data-testid="calc-error">
              {doseError}
            </div>
          )}
          <p className="mt-auto pt-12 text-xs font-mono text-[#7C7C7C] leading-relaxed">
            Reference: U-100 syringe → 100 units = 1 mL.
            Always verify with vendor COA. Research use only.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, suffix, value, onChange, testId }) {
  return (
    <div>
      <Label className="eyebrow text-[#5C5C5C]">{label}</Label>
      <div className="mt-3 flex items-center border border-[#0A0A0A]">
        <Input
          type="number"
          min={0}
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
          className="rounded-none border-0 font-mono text-2xl h-14 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <span className="px-4 border-l border-[#0A0A0A] font-mono text-xs uppercase tracking-widest text-[#5C5C5C] self-stretch flex items-center">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function Preset({ onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="bg-white p-3 font-mono text-[11px] uppercase tracking-[0.2em] text-left hover:bg-[#0A0A0A] hover:text-white"
    >
      → {label}
    </button>
  );
}

function Stat({ label, value, testId }) {
  return (
    <div>
      <div className="eyebrow text-[#7C7C7C]">{label}</div>
      <div className="font-mono text-2xl font-bold mt-1" data-testid={testId}>{value}</div>
    </div>
  );
}
