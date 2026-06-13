import { useMemo, useState } from "react";
import {
  Calculator as CalculatorIcon,
  Droplet,
  Syringe,
  Sparkles,
  ShieldCheck,
  FlaskConical,
  Beaker,
  CircleHelp,
} from "lucide-react";

/* ---------- Reusable card ---------- */
const Card = ({ children, className = "", ...rest }) => (
  <div
    className={
      "bg-white rounded-3xl shadow-[0_8px_30px_rgb(244,114,182,0.08)] " +
      "border border-pink-100 p-6 sm:p-8 " +
      className
    }
    {...rest}
  >
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, eyebrow, title }) => (
  <div className="mb-6">
    {eyebrow && (
      <div className="inline-flex items-center gap-2 text-pink-600 text-xs font-semibold tracking-[0.18em] uppercase mb-2">
        <span className="h-px w-6 bg-pink-400" />
        {eyebrow}
      </div>
    )}
    <div className="flex items-center gap-3">
      {Icon && (
        <span
          className="inline-flex items-center justify-center h-10 w-10 rounded-2xl bg-pink-50 text-pink-600"
          aria-hidden="true"
        >
          <Icon size={20} />
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">
        {title}
      </h2>
    </div>
  </div>
);

/* ---------- Reconstitution Calculator ---------- */
const ReconstitutionCalculator = () => {
  const [vialMg, setVialMg] = useState(5);
  const [bacMl, setBacMl] = useState(2);
  const [dose, setDose] = useState(250);
  const [doseUnit, setDoseUnit] = useState("mcg"); // "mcg" | "mg"
  const [syringeSize, setSyringeSize] = useState(100); // units per mL (1mL = 100u insulin)

  const result = useMemo(() => {
    const vial = parseFloat(vialMg);
    const water = parseFloat(bacMl);
    const d = parseFloat(dose);
    if (!vial || !water || !d || vial <= 0 || water <= 0 || d <= 0) return null;

    const doseInMg = doseUnit === "mcg" ? d / 1000 : d;
    const concentrationMgPerMl = vial / water; // mg/mL
    const volumeMl = doseInMg / concentrationMgPerMl;
    const units = volumeMl * syringeSize; // syringe units

    return {
      units: units,
      volumeMl: volumeMl,
      concentration: concentrationMgPerMl,
    };
  }, [vialMg, bacMl, dose, doseUnit, syringeSize]);

  const inputBase =
    "w-full rounded-2xl border border-pink-100 bg-pink-50/40 px-4 py-3 " +
    "text-neutral-900 placeholder:text-neutral-400 " +
    "focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-pink-300 " +
    "transition";

  const labelBase = "block text-sm font-medium text-neutral-700 mb-2";

  return (
    <Card data-testid="reconstitution-calculator">
      <SectionTitle
        icon={CalculatorIcon}
        eyebrow="Reconstitution"
        title="Peptide Reconstitution Calculator"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelBase} htmlFor="vial-mg">
            Vial size (mg)
          </label>
          <input
            id="vial-mg"
            data-testid="input-vial-mg"
            type="number"
            min="0"
            step="0.1"
            value={vialMg}
            onChange={(e) => setVialMg(e.target.value)}
            className={inputBase}
            placeholder="e.g. 5"
          />
        </div>

        <div>
          <label className={labelBase} htmlFor="bac-ml">
            BAC water added (mL)
          </label>
          <input
            id="bac-ml"
            data-testid="input-bac-ml"
            type="number"
            min="0"
            step="0.1"
            value={bacMl}
            onChange={(e) => setBacMl(e.target.value)}
            className={inputBase}
            placeholder="e.g. 2"
          />
        </div>

        <div>
          <label className={labelBase} htmlFor="dose">
            Desired dose
          </label>
          <div className="flex gap-2">
            <input
              id="dose"
              data-testid="input-dose"
              type="number"
              min="0"
              step="0.1"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              className={inputBase}
              placeholder="e.g. 250"
            />
            <select
              data-testid="select-dose-unit"
              value={doseUnit}
              onChange={(e) => setDoseUnit(e.target.value)}
              className={inputBase + " max-w-[7rem]"}
              aria-label="Dose unit"
            >
              <option value="mcg">mcg</option>
              <option value="mg">mg</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelBase} htmlFor="syringe-size">
            Syringe (units per mL)
          </label>
          <select
            id="syringe-size"
            data-testid="select-syringe-size"
            value={syringeSize}
            onChange={(e) => setSyringeSize(parseInt(e.target.value, 10))}
            className={inputBase}
          >
            <option value={100}>100 u / 1 mL (insulin syringe)</option>
            <option value={50}>50 u / 0.5 mL</option>
            <option value={30}>30 u / 0.3 mL</option>
          </select>
        </div>
      </div>

      {/* Result */}
      <div
        data-testid="reconstitution-result"
        className="mt-7 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 text-white p-6 sm:p-7 shadow-[0_10px_30px_rgb(244,114,182,0.35)]"
      >
        <div className="flex items-center gap-2 text-pink-50/90 text-xs font-semibold tracking-[0.18em] uppercase">
          <Syringe size={14} />
          Draw to
        </div>
        {result ? (
          <>
            <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span
                data-testid="result-units"
                className="text-5xl sm:text-6xl font-semibold tracking-tight"
              >
                {result.units.toFixed(1)}
              </span>
              <span className="text-xl font-medium text-pink-50">syringe units</span>
            </div>
            <div className="mt-3 text-pink-50/90 text-sm">
              ≈ <span data-testid="result-volume">{result.volumeMl.toFixed(3)} mL</span>{" "}
              · concentration{" "}
              <span data-testid="result-concentration">
                {result.concentration.toFixed(2)} mg/mL
              </span>
            </div>
          </>
        ) : (
          <div className="mt-2 text-pink-50/90">
            Enter vial size, BAC water and desired dose to see your syringe units.
          </div>
        )}
      </div>
    </Card>
  );
};

/* ---------- How to Use a Peptide Calculator (educational) ---------- */
const HowToUseSection = () => {
  const steps = [
    {
      title: "Sanitize the vials",
      body:
        "Wipe the rubber stopper of both the peptide vial and the BAC water vial with a fresh alcohol swab. Let them air-dry for a few seconds before piercing.",
    },
    {
      title: "Draw the diluent",
      body:
        "Using a sterile syringe, draw your planned amount of bacteriostatic water (typically 1–3 mL) from the BAC vial.",
    },
    {
      title: "Add water to the peptide",
      body:
        "Insert the needle at a slight angle and let the water run slowly down the inside wall of the vial. Don\u2019t blast it directly onto the powder \u2014 it can damage delicate peptides.",
    },
    {
      title: "Mix carefully",
      body:
        "Let the vial sit for ~30 seconds, then gently swirl (or roll between your palms) until fully dissolved. Never shake — it can denature the peptide.",
    },
  ];

  return (
    <Card data-testid="how-to-use-section" className="mt-8">
      <SectionTitle
        icon={Sparkles}
        eyebrow="Learn"
        title="How to Use a Peptide Calculator"
      />

      {/* What is a peptide calculator */}
      <div data-testid="subsection-what-is" className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <CircleHelp size={18} className="text-pink-600" />
          <h3 className="text-lg font-semibold text-neutral-900">
            What is a peptide calculator?
          </h3>
        </div>
        <p className="text-neutral-700 leading-relaxed">
          A peptide calculator does the math for you. You plug in your{" "}
          <span className="font-medium text-neutral-900">vial size</span>, the amount
          of <span className="font-medium text-neutral-900">BAC water</span> you added,
          and your <span className="font-medium text-neutral-900">desired dose</span>{" "}
          — and it tells you exactly how many{" "}
          <span className="font-medium text-pink-600">syringe units</span> to draw. No
          mental math, no guessing.
        </p>
      </div>

      {/* How much BAC water */}
      <div data-testid="subsection-bac-water" className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Droplet size={18} className="text-pink-600" />
          <h3 className="text-lg font-semibold text-neutral-900">
            How much BAC water should I use?
          </h3>
        </div>
        <p className="text-neutral-700 leading-relaxed mb-4">
          It depends on the{" "}
          <span className="font-medium text-neutral-900">concentration</span> you want.
          More water = more dilute solution (easier to draw small doses accurately).
          Less water = more concentrated (each unit packs more peptide).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
            <div className="text-xs font-semibold tracking-wide uppercase text-pink-600">
              More dilute
            </div>
            <div className="mt-1 text-neutral-900 font-medium">3 mL BAC water</div>
            <p className="text-sm text-neutral-600 mt-1">
              Best for very small doses & fine-tuning.
            </p>
          </div>
          <div className="rounded-2xl border border-pink-200 bg-white p-4 ring-1 ring-pink-200">
            <div className="text-xs font-semibold tracking-wide uppercase text-pink-600">
              Common
            </div>
            <div className="mt-1 text-neutral-900 font-medium">2 mL BAC water</div>
            <p className="text-sm text-neutral-600 mt-1">
              The everyday sweet spot — most peptides land here.
            </p>
          </div>
          <div className="rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
            <div className="text-xs font-semibold tracking-wide uppercase text-pink-600">
              More concentrated
            </div>
            <div className="mt-1 text-neutral-900 font-medium">1 mL BAC water</div>
            <p className="text-sm text-neutral-600 mt-1">
              Fewer units per dose — better for larger amounts.
            </p>
          </div>
        </div>
        <p className="text-sm text-neutral-500 mt-4">
          Most peptides reconstitute well with{" "}
          <span className="font-medium text-neutral-700">1–3 mL</span>. When in doubt,
          start with 2 mL.
        </p>
      </div>

      {/* Reconstitution Instructions */}
      <div data-testid="subsection-instructions">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical size={18} className="text-pink-600" />
          <h3 className="text-lg font-semibold text-neutral-900">
            Reconstitution Instructions
          </h3>
        </div>
        <ol className="space-y-4">
          {steps.map((step, i) => (
            <li
              key={step.title}
              data-testid={`recon-step-${i + 1}`}
              className="flex gap-4 rounded-2xl border border-pink-100 bg-white p-4 hover:bg-pink-50/40 transition-colors"
            >
              <span
                className="flex-shrink-0 h-9 w-9 rounded-full bg-pink-500 text-white font-semibold inline-flex items-center justify-center shadow-[0_4px_12px_rgb(244,114,182,0.35)]"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div>
                <div className="text-neutral-900 font-medium">{step.title}</div>
                <p className="text-neutral-600 mt-1 leading-relaxed text-sm sm:text-base">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-pink-50 border border-pink-100 p-4">
          <ShieldCheck size={18} className="text-pink-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-neutral-700 leading-relaxed">
            <span className="font-semibold text-neutral-900">Tip:</span> Once
            reconstituted, store your peptide vial in the refrigerator and use within
            the manufacturer&apos;s recommended window. Keep the rubber stopper clean
            between draws.
          </p>
        </div>
      </div>
    </Card>
  );
};

/* ---------- Page ---------- */
const CalculatorPage = () => {
  return (
    <div
      data-testid="calculator-page"
      className="min-h-screen bg-gradient-to-b from-pink-50/60 via-white to-white"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <header className="mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 text-pink-600 text-xs font-semibold tracking-[0.18em] uppercase mb-3">
            <Beaker size={14} />
            Pepgirl · Calculator
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight">
            Peptide Reconstitution Calculator
          </h1>
          <p className="mt-3 text-neutral-600 leading-relaxed">
            Dial in your dose with confidence. Enter your vial size, BAC water and
            desired dose &mdash; we&apos;ll do the syringe math for you.
          </p>
        </header>

        <ReconstitutionCalculator />
        <HowToUseSection />

        <footer className="mt-10 text-center text-xs text-neutral-400">
          For educational purposes only. Not medical advice.
        </footer>
      </div>
    </div>
  );
};

export default CalculatorPage;
