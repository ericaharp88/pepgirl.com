import { useMemo, useState } from "react";
import useSeo from "../hooks/useSeo";

const TdeePill = ({ active, onClick, children, testId }) => (
  <button onClick={onClick} data-testid={testId}
    className={`px-3 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition ${
      active
        ? "bg-[#FF2D87] text-white shadow-[0_2px_8px_rgba(255,45,135,0.35)]"
        : "bg-[#FFF0F7] text-[#5C5C5C] hover:bg-[#FFE4F1]"
    }`}>{children}</button>
);

/* ───────────────── TDEE CALCULATOR ───────────────── */
function TdeeCalc() {
  const [sex, setSex] = useState("female");
  const [age, setAge] = useState("");
  const [units, setUnits] = useState("imperial"); // "imperial" | "metric"
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState({ label: "Light", mult: 1.375, sub: "1-3 days/wk" });
  const [goal, setGoal] = useState({ label: "Maintain", delta: 0 });

  const activities = [
    { label: "Sedentary",   mult: 1.2,    sub: "Little / no exercise" },
    { label: "Light",       mult: 1.375,  sub: "1–3 days/wk" },
    { label: "Moderate",    mult: 1.55,   sub: "3–5 days/wk" },
    { label: "Active",      mult: 1.725,  sub: "6–7 days/wk" },
    { label: "Very Active", mult: 1.9,    sub: "Athlete / 2x daily" },
  ];

  const goals = [
    { label: "Lose",     delta: -500 },
    { label: "Maintain", delta: 0 },
    { label: "Gain",     delta: 500 },
  ];

  const result = useMemo(() => {
    const a = Number(age) || 0;
    let kg = 0, cm = 0;
    if (units === "metric") {
      kg = Number(weight) || 0;
      cm = Number(heightCm) || 0;
    } else {
      kg = (Number(weight) || 0) * 0.45359237;
      cm = ((Number(heightFt) || 0) * 12 + (Number(heightIn) || 0)) * 2.54;
    }
    if (!a || !kg || !cm) return null;
    // Mifflin-St Jeor
    const bmr = sex === "male"
      ? 10 * kg + 6.25 * cm - 5 * a + 5
      : 10 * kg + 6.25 * cm - 5 * a - 161;
    const tdee = bmr * activity.mult;
    const target = tdee + goal.delta;
    return { bmr, tdee, target };
  }, [sex, age, units, heightFt, heightIn, heightCm, weight, activity, goal]);

  const Pill = TdeePill;

  return (
    <div data-testid="tdee-calculator"
      className="mt-10 bg-white rounded-[28px] shadow-[0_2px_20px_rgba(255,45,135,0.08)] border border-[#F0CFE0] p-8 lg:p-12">
      <div className="inline-flex p-1.5 bg-[#FFF0F7] rounded-full border border-[#F0CFE0] mb-5">
        <span className="px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#0A0A0A] text-white shadow">
          Energy
        </span>
      </div>
      <h2 className="text-3xl lg:text-4xl font-black tracking-tight font-serif-glam">
        TDEE Calculator
      </h2>
      <p className="text-sm text-[#5C5C5C] mt-2">
        Estimate your daily calorie burn (BMR + activity) and target intake.
      </p>

      <div className="mt-8 space-y-6">
        {/* Sex + Units */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#5C5C5C] w-20">Sex</div>
          <Pill active={sex === "female"} onClick={() => setSex("female")} testId="tdee-female">Female</Pill>
          <Pill active={sex === "male"} onClick={() => setSex("male")} testId="tdee-male">Male</Pill>
          <div className="ml-auto inline-flex bg-[#FFF0F7] rounded-full p-1">
            <button onClick={() => setUnits("imperial")} data-testid="tdee-imperial"
              className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider ${units === "imperial" ? "bg-[#0A0A0A] text-white" : "text-[#5C5C5C]"}`}>Imperial</button>
            <button onClick={() => setUnits("metric")} data-testid="tdee-metric"
              className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider ${units === "metric" ? "bg-[#0A0A0A] text-white" : "text-[#5C5C5C]"}`}>Metric</button>
          </div>
        </div>

        {/* Age + Height + Weight */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#5C5C5C]">Age (years)</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
              data-testid="tdee-age"
              className="mt-1 w-full rounded-xl border border-[#F0CFE0] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#FF2D87]" />
          </div>
          {units === "imperial" ? (
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#5C5C5C]">Height</label>
              <div className="mt-1 flex gap-2">
                <input type="number" placeholder="ft" value={heightFt} onChange={(e) => setHeightFt(e.target.value)}
                  data-testid="tdee-height-ft"
                  className="w-1/2 rounded-xl border border-[#F0CFE0] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#FF2D87]" />
                <input type="number" placeholder="in" value={heightIn} onChange={(e) => setHeightIn(e.target.value)}
                  data-testid="tdee-height-in"
                  className="w-1/2 rounded-xl border border-[#F0CFE0] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#FF2D87]" />
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#5C5C5C]">Height (cm)</label>
              <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)}
                data-testid="tdee-height-cm"
                className="mt-1 w-full rounded-xl border border-[#F0CFE0] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#FF2D87]" />
            </div>
          )}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#5C5C5C]">
              Weight ({units === "imperial" ? "lbs" : "kg"})
            </label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
              data-testid="tdee-weight"
              className="mt-1 w-full rounded-xl border border-[#F0CFE0] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#FF2D87]" />
          </div>
        </div>

        {/* Activity */}
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#5C5C5C] mb-2">Activity level</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {activities.map((a) => (
              <button key={a.label} onClick={() => setActivity(a)}
                data-testid={`tdee-act-${a.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`p-2 rounded-xl text-left transition ${
                  activity.label === a.label
                    ? "bg-[#FF2D87] text-white shadow-[0_2px_8px_rgba(255,45,135,0.35)]"
                    : "bg-[#FFF0F7] hover:bg-[#FFE4F1] text-[#0A0A0A]"
                }`}>
                <div className="text-xs font-bold uppercase">{a.label}</div>
                <div className="text-[9px] font-mono opacity-80">{a.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#5C5C5C] mb-2">Goal</div>
          <div className="flex flex-wrap gap-2">
            {goals.map((g) => (
              <Pill key={g.label} active={goal.label === g.label} onClick={() => setGoal(g)}
                testId={`tdee-goal-${g.label.toLowerCase()}`}>
                {g.label} {g.delta !== 0 && (g.delta > 0 ? `+${g.delta}` : g.delta)}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="mt-8 grid sm:grid-cols-3 gap-3" data-testid="tdee-result">
        <div className="bg-[#FFF0F7] rounded-2xl p-4 border border-[#F0CFE0] text-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#5C5C5C]">BMR</div>
          <div className="text-2xl font-black font-mono mt-1 text-[#0A0A0A]">
            {result ? Math.round(result.bmr) : "—"}
          </div>
          <div className="text-[10px] text-[#5C5C5C] mt-1">kcal at rest</div>
        </div>
        <div className="bg-[#FFF0F7] rounded-2xl p-4 border border-[#F0CFE0] text-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#5C5C5C]">TDEE</div>
          <div className="text-2xl font-black font-mono mt-1 text-[#0A0A0A]">
            {result ? Math.round(result.tdee) : "—"}
          </div>
          <div className="text-[10px] text-[#5C5C5C] mt-1">maintenance kcal</div>
        </div>
        <div className="bg-[#FF2D87] rounded-2xl p-4 text-center text-white shadow-[0_2px_20px_rgba(255,45,135,0.18)]">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/85">Target</div>
          <div className="text-2xl font-black font-mono mt-1">
            {result ? Math.round(result.target) : "—"}
          </div>
          <div className="text-[10px] text-white/85 mt-1">kcal · {goal.label.toLowerCase()}</div>
        </div>
      </div>
      <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.2em] text-[#A0A0A0] text-center">
        Mifflin-St Jeor formula · Estimate only · Not medical advice
      </p>
    </div>
  );
}

/* ───────────────── BMI CALCULATOR ───────────────── */
function BmiCalc() {
  const [units, setUnits] = useState("imperial");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weight, setWeight] = useState("");

  const { bmi, category, color } = useMemo(() => {
    let kg = 0, m = 0;
    if (units === "metric") {
      kg = Number(weight) || 0;
      m = (Number(heightCm) || 0) / 100;
    } else {
      kg = (Number(weight) || 0) * 0.45359237;
      m = ((Number(heightFt) || 0) * 12 + (Number(heightIn) || 0)) * 0.0254;
    }
    if (!kg || !m) return { bmi: null, category: "—", color: "#5C5C5C" };
    const b = kg / (m * m);
    let cat = "Normal weight", c = "#22c55e";
    if (b < 18.5)        { cat = "Underweight";        c = "#3b82f6"; }
    else if (b < 25)     { cat = "Normal weight";      c = "#22c55e"; }
    else if (b < 30)     { cat = "Overweight";         c = "#f59e0b"; }
    else if (b < 35)     { cat = "Obese (Class I)";    c = "#ef4444"; }
    else if (b < 40)     { cat = "Obese (Class II)";   c = "#dc2626"; }
    else                 { cat = "Obese (Class III)";  c = "#b91c1c"; }
    return { bmi: b, category: cat, color: c };
  }, [units, heightFt, heightIn, heightCm, weight]);

  return (
    <div data-testid="bmi-calculator"
      className="mt-10 bg-white rounded-[28px] shadow-[0_2px_20px_rgba(255,45,135,0.08)] border border-[#F0CFE0] p-8 lg:p-12">
      <div className="inline-flex p-1.5 bg-[#FFF0F7] rounded-full border border-[#F0CFE0] mb-5">
        <span className="px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#0A0A0A] text-white shadow">
          Body Mass
        </span>
      </div>
      <h2 className="text-3xl lg:text-4xl font-black tracking-tight font-serif-glam">
        BMI Calculator
      </h2>
      <p className="text-sm text-[#5C5C5C] mt-2">
        Body Mass Index &mdash; a quick screening number based on height and weight.
      </p>

      <div className="mt-8 flex justify-end">
        <div className="inline-flex bg-[#FFF0F7] rounded-full p-1">
          <button onClick={() => setUnits("imperial")} data-testid="bmi-imperial"
            className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider ${units === "imperial" ? "bg-[#0A0A0A] text-white" : "text-[#5C5C5C]"}`}>Imperial</button>
          <button onClick={() => setUnits("metric")} data-testid="bmi-metric"
            className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider ${units === "metric" ? "bg-[#0A0A0A] text-white" : "text-[#5C5C5C]"}`}>Metric</button>
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        {units === "imperial" ? (
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#5C5C5C]">Height</label>
            <div className="mt-1 flex gap-2">
              <input type="number" placeholder="ft" value={heightFt} onChange={(e) => setHeightFt(e.target.value)}
                data-testid="bmi-height-ft"
                className="w-1/2 rounded-xl border border-[#F0CFE0] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#FF2D87]" />
              <input type="number" placeholder="in" value={heightIn} onChange={(e) => setHeightIn(e.target.value)}
                data-testid="bmi-height-in"
                className="w-1/2 rounded-xl border border-[#F0CFE0] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#FF2D87]" />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-[#5C5C5C]">Height (cm)</label>
            <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)}
              data-testid="bmi-height-cm"
              className="mt-1 w-full rounded-xl border border-[#F0CFE0] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#FF2D87]" />
          </div>
        )}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#5C5C5C]">
            Weight ({units === "imperial" ? "lbs" : "kg"})
          </label>
          <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
            data-testid="bmi-weight"
            className="mt-1 w-full rounded-xl border border-[#F0CFE0] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#FF2D87]" />
        </div>
      </div>

      {/* Result */}
      <div className="mt-8 bg-[#FFF0F7] rounded-2xl p-6 border border-[#F0CFE0] text-center" data-testid="bmi-result">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#5C5C5C]">Your BMI</div>
        <div className="text-5xl font-black font-mono mt-2 text-[#0A0A0A]">
          {bmi ? bmi.toFixed(1) : "—"}
        </div>
        <div
          className="inline-block mt-3 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider text-white"
          style={{ backgroundColor: color }}
          data-testid="bmi-category"
        >
          {category}
        </div>
      </div>

      {/* Reference */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
        <div className="rounded-xl border border-[#F0CFE0] p-2 text-center">
          <div className="font-bold text-[#3b82f6]">&lt; 18.5</div>
          <div className="text-[#5C5C5C]">Underweight</div>
        </div>
        <div className="rounded-xl border border-[#F0CFE0] p-2 text-center">
          <div className="font-bold text-[#22c55e]">18.5 &ndash; 24.9</div>
          <div className="text-[#5C5C5C]">Normal</div>
        </div>
        <div className="rounded-xl border border-[#F0CFE0] p-2 text-center">
          <div className="font-bold text-[#f59e0b]">25 &ndash; 29.9</div>
          <div className="text-[#5C5C5C]">Overweight</div>
        </div>
        <div className="rounded-xl border border-[#F0CFE0] p-2 text-center">
          <div className="font-bold text-[#ef4444]">&ge; 30</div>
          <div className="text-[#5C5C5C]">Obese</div>
        </div>
      </div>
      <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.2em] text-[#A0A0A0] text-center">
        Screening tool only · Doesn&rsquo;t distinguish muscle / fat · Not medical advice
      </p>
    </div>
  );
}

export default function Calculator() {
  useSeo({
    title: "Peptide Calculator Suite",
    description: "Free peptide reconstitution calculator, TDEE energy needs, and BMI — all in one place on Pep Girl.",
    path: "/calculator",
  });
  const [peptideMg, setPeptideMg] = useState("");
  const [bacWaterMl, setBacWaterMl] = useState("");
  const [vialSize, setVialSize] = useState(null);
  const [doseValue, setDoseValue] = useState("");
  const [doseUnit, setDoseUnit] = useState("mcg"); // mg | mcg | IU
  const [frequency, setFrequency] = useState({ label: "Daily", perWeek: 7, sub: "1x/day" });
  const syringeUnits = 100; // U-100 standard

  // Convert dose to mcg for math
  const doseMcg = useMemo(() => {
    const v = Number(doseValue) || 0;
    if (doseUnit === "mg") return v * 1000;
    if (doseUnit === "IU") return v * 1000; // simplified: 1 IU = 1 mcg-equivalent (peptide-specific in reality)
    return v;
  }, [doseValue, doseUnit]);

  const result = useMemo(() => {
    const mg = Number(peptideMg) || 0;
    const ml = Number(bacWaterMl) || 0;
    if (!mg || !ml || !doseMcg) {
      return { concentration: 0, doseMl: 0, drawUnits: 0, dosesPerVial: 0, weeks: 0, days: 0, error: null };
    }
    const conc = (mg * 1000) / ml;
    const dMl = doseMcg / conc;
    const draw = dMl * syringeUnits;
    const dosesPerVial = (mg * 1000) / doseMcg;
    const weeks = frequency.perWeek > 0 ? dosesPerVial / frequency.perWeek : 0;
    const days = weeks * 7;
    let err = null;
    if (draw > syringeUnits) err = `Dose exceeds full syringe. Add more BAC water or split doses.`;
    return { concentration: conc, doseMl: dMl, drawUnits: draw, dosesPerVial, weeks, days, error: err };
  }, [peptideMg, bacWaterMl, doseMcg, frequency]);

  const [tab, setTab] = useState("reconstitute"); // "reconstitute" | "tdee" | "bmi"

  const fmt = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");

  const vialPills = [2, 3, 5, 10];
  const freqOptions = [
    { label: "Daily",   perWeek: 7,   sub: "1x/day" },
    { label: "Twice",   perWeek: 2,   sub: "2x/week" },
    { label: "3×/wk",   perWeek: 3,   sub: "3x/week" },
    { label: "Weekly",  perWeek: 1,   sub: "1x/week" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {/* Tab switcher (visible on every calculator tab) */}
      <div className="flex flex-wrap gap-2 mb-6" data-testid="calc-tabs">
        {[
          { id: "reconstitute", label: "Reconstitution" },
          { id: "tdee",         label: "TDEE" },
          { id: "bmi",          label: "BMI" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-testid={`calc-tab-${t.id}`}
            className={`px-5 py-2.5 rounded-full text-xs font-mono uppercase tracking-[0.18em] transition border ${
              tab === t.id
                ? "bg-[#FF2D87] text-white border-[#FF2D87] shadow-[0_4px_14px_rgba(255,45,135,0.35)]"
                : "bg-white text-[#0A0A0A] border-[#F0CFE0] hover:bg-[#FFF0F7]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "tdee" && <TdeeCalc />}
      {tab === "bmi" && <BmiCalc />}

      {tab === "reconstitute" && (
      <>
      {/* Title card */}
      <div className="bg-white rounded-[28px] shadow-[0_2px_20px_rgba(255,45,135,0.08)] border border-[#F0CFE0] p-8 lg:p-12">
        <h1 className="text-4xl lg:text-5xl font-black tracking-tight font-serif-glam">
          Calculator
        </h1>
        <p className="text-sm text-[#5C5C5C] mt-2">
          For powder peptides. Calculates diluent and injection volume.
        </p>

        {/* Single tab label */}
        <div className="mt-6 inline-flex p-1.5 bg-[#FFF0F7] rounded-full border border-[#F0CFE0]">
          <span className="px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#0A0A0A] text-white shadow">
            Reconstitution Calculator
          </span>
        </div>

        {/* Step 1 */}
        <Step n="1" title="What's in your vial?">
          <div className="grid sm:grid-cols-2 gap-6">
            <PillInput
              label="Peptide amount"
              suffix="mg"
              value={peptideMg}
              onChange={setPeptideMg}
              testId="calc-peptide-mg"
            />
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C5C]">
                Vial size (volume)
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {vialPills.map((ml) => (
                  <button
                    key={ml}
                    onClick={() => setVialSize(ml)}
                    data-testid={`vial-${ml}`}
                    className={`py-3 rounded-full border text-sm font-semibold transition ${
                      Number(vialSize) === ml
                        ? "bg-[#FF2D87] text-white border-[#FF2D87] shadow-[0_4px_14px_rgba(255,45,135,0.35)]"
                        : "bg-white border-[#E5C8DC] text-[#0A0A0A] hover:border-[#FF2D87]"
                    }`}
                  >
                    {ml} mL
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Step>

        {/* Step 2 */}
        <Step n="2" title="How much diluent?">
          <PillInput
            label="BAC water to add"
            suffix="mL"
            value={bacWaterMl}
            onChange={setBacWaterMl}
            testId="calc-bac-ml"
          />
        </Step>

        {/* Step 3 */}
        <Step n="3" title="What's your dose per injection?">
          <div className="relative">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C5C]">
              Your dose
            </label>
            <div className="mt-3 flex items-center gap-3 border border-[#E5C8DC] rounded-full pl-6 pr-2 py-1.5 focus-within:border-[#FF2D87]">
              <input
                type="number"
                min={0}
                step="any"
                value={doseValue}
                onChange={(e) => setDoseValue(e.target.value)}
                data-testid="calc-dose-value"
                className="flex-1 outline-none bg-transparent text-2xl font-bold font-mono py-2"
              />
              <div className="flex gap-1 bg-[#FFF0F7] rounded-full p-1">
                {["mg", "mcg"].map((u) => (
                  <button
                    key={u}
                    onClick={() => setDoseUnit(u)}
                    data-testid={`unit-${u}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition ${
                      doseUnit === u
                        ? "bg-[#FF2D87] text-white shadow"
                        : "text-[#5C5C5C] hover:text-[#FF2D87]"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Step>

        {/* Step 4 */}
        <Step n="4" title="How often will you inject?">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {freqOptions.map((f) => {
              const active = frequency.label === f.label;
              return (
                <button
                  key={f.label}
                  onClick={() => setFrequency(f)}
                  data-testid={`freq-${f.label.toLowerCase()}`}
                  className={`py-4 rounded-2xl border text-center transition ${
                    active
                      ? "bg-[#FF2D87] text-white border-[#FF2D87] shadow-[0_4px_14px_rgba(255,45,135,0.35)]"
                      : "bg-white border-[#E5C8DC] hover:border-[#FF2D87]"
                  }`}
                >
                  <div className="text-base font-bold">{f.label}</div>
                  <div className={`text-[10px] uppercase tracking-wider mt-1 ${active ? "text-white/80" : "text-[#A0A0A0]"}`}>
                    {f.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </Step>

        {/* ── YOUR RECIPE ── */}
        <div className="mt-12 pt-10 border-t border-[#F0CFE0]">
          <h2 className="text-2xl font-bold font-serif-glam italic text-[#FF2D87]">Your Recipe</h2>

          <div className="mt-6 space-y-4">
            <RecipeStep n="1">
              Add <strong className="text-[#FF2D87] font-mono">{fmt(bacWaterMl, 1)} mL</strong> of BAC water
              to your <strong className="font-mono">{fmt(peptideMg, 1)} mg</strong> vial.
            </RecipeStep>
            <RecipeStep n="2">
              Draw <strong className="text-[#FF2D87] font-mono text-xl" data-testid="calc-draw-units">{fmt(result.drawUnits, 1)} units</strong>
              {" "}({fmt(result.doseMl, 3)} mL) on a U-100 insulin syringe per injection.
            </RecipeStep>
            <RecipeStep n="3">
              Inject <strong className="font-mono">{doseValue} {doseUnit}</strong> · {frequency.label.toLowerCase()} ({frequency.sub}).
            </RecipeStep>
          </div>

          {/* Syringe visual */}
          <div className="mt-8 bg-[#0A0A0A] rounded-3xl p-6">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#A0A0A0] mb-3">Visual draw</div>
            <SyringeVisual draw={result.drawUnits} capacity={syringeUnits} />
          </div>

          {/* Vial supply */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <SupplyStat value={fmt(result.weeks, 1)} label="weeks of doses" testId="calc-weeks" />
            <SupplyStat value={fmt(result.dosesPerVial, 0)} label="total doses" testId="calc-doses" />
            <SupplyStat value={`${fmt(result.concentration, 0)}`} label="mcg / mL" testId="calc-conc" />
          </div>

          {result.error && (
            <div className="mt-6 bg-[#FFE3F0] border-2 border-[#FF2D87] rounded-2xl p-4 text-sm text-[#FF2D87] font-semibold" data-testid="calc-error">
              ⚠ {result.error}
            </div>
          )}

          <p className="mt-8 text-[10px] font-mono uppercase tracking-[0.2em] text-[#A0A0A0] text-center">
            Always verify with vendor COA · Research use only
          </p>
        </div>
      </div>

      {/* TDEE + BMI calculators */}

      {/* ───── HOW TO USE A PEPTIDE CALCULATOR (educational) ───── */}
      <div
        data-testid="how-to-use-section"
        className="mt-10 bg-white rounded-[28px] shadow-[0_2px_20px_rgba(255,45,135,0.08)] border border-[#F0CFE0] p-8 lg:p-12"
      >
        <div className="inline-flex p-1.5 bg-[#FFF0F7] rounded-full border border-[#F0CFE0] mb-5">
          <span className="px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-[#0A0A0A] text-white shadow">
            Learn
          </span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-black tracking-tight font-serif-glam">
          How to Use a Peptide Calculator
        </h2>
        <p className="text-sm text-[#5C5C5C] mt-2">
          A quick primer on reconstitution, dilution, and dosing math.
        </p>

        {/* What is a peptide calculator */}
        <div data-testid="howto-what-is" className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-[#FF2D87] text-white flex items-center justify-center text-sm font-bold shadow-[0_4px_14px_rgba(255,45,135,0.35)]">
              ?
            </div>
            <h3 className="text-xl font-bold">What is a peptide calculator?</h3>
          </div>
          <div className="pl-12">
            <p className="text-sm leading-relaxed text-[#0A0A0A]">
              A peptide calculator does the math for you. Plug in your{" "}
              <strong>vial size</strong>, the amount of <strong>BAC water</strong> you
              added, and your <strong>desired dose</strong> &mdash; and it tells you
              exactly how many{" "}
              <strong className="text-[#FF2D87]">syringe units</strong> to draw on a
              U-100 insulin syringe. No mental math, no guessing.
            </p>
          </div>
        </div>

        {/* How much BAC water */}
        <div data-testid="howto-bac-water" className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-[#FF2D87] text-white flex items-center justify-center text-sm font-bold shadow-[0_4px_14px_rgba(255,45,135,0.35)]">
              ~
            </div>
            <h3 className="text-xl font-bold">How much BAC water should I use?</h3>
          </div>
          <div className="pl-12">
            <p className="text-sm leading-relaxed text-[#0A0A0A]">
              It depends on the <strong>concentration</strong> you want.{" "}
              <strong>More water = more dilute</strong> (easier to draw small doses
              accurately). <strong>Less water = more concentrated</strong> (each unit
              packs more peptide).
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#FFF0F7] rounded-2xl p-4 border border-[#F0CFE0] text-center">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#5C5C5C]">
                  More dilute
                </div>
                <div className="text-2xl font-black font-mono mt-1 text-[#0A0A0A]">3 mL</div>
                <div className="text-xs text-[#5C5C5C] mt-2 leading-relaxed">
                  Best for very small doses &amp; fine-tuning.
                </div>
              </div>
              <div className="bg-white rounded-2xl p-4 border-2 border-[#FF2D87] text-center shadow-[0_4px_14px_rgba(255,45,135,0.18)]">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#FF2D87]">
                  Common
                </div>
                <div className="text-2xl font-black font-mono mt-1 text-[#0A0A0A]">2 mL</div>
                <div className="text-xs text-[#5C5C5C] mt-2 leading-relaxed">
                  The everyday sweet spot for most peptides.
                </div>
              </div>
              <div className="bg-[#FFF0F7] rounded-2xl p-4 border border-[#F0CFE0] text-center">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#5C5C5C]">
                  More concentrated
                </div>
                <div className="text-2xl font-black font-mono mt-1 text-[#0A0A0A]">1 mL</div>
                <div className="text-xs text-[#5C5C5C] mt-2 leading-relaxed">
                  Fewer units per dose &mdash; better for larger amounts.
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-[#5C5C5C]">
              Most peptides reconstitute well with <strong>1&ndash;3 mL</strong>. When
              in doubt, start with 2 mL.
            </p>
          </div>
        </div>

        {/* Reconstitution Instructions */}
        <div data-testid="howto-instructions" className="mt-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-full bg-[#FF2D87] text-white flex items-center justify-center text-sm font-bold shadow-[0_4px_14px_rgba(255,45,135,0.35)]">
              ★
            </div>
            <h3 className="text-xl font-bold">Reconstitution Instructions</h3>
          </div>
          <div className="space-y-4">
            <RecipeStep n="1" testId="howto-step-1">
              <strong>Sanitize the vials.</strong> Wipe the rubber stopper of both the
              peptide vial and the BAC water vial with a fresh alcohol swab. Let them
              air-dry for a few seconds before piercing.
            </RecipeStep>
            <RecipeStep n="2" testId="howto-step-2">
              <strong>Draw the diluent.</strong> Using a sterile syringe, draw your
              planned amount of bacteriostatic water (typically 1&ndash;3 mL) from the
              BAC vial.
            </RecipeStep>
            <RecipeStep n="3" testId="howto-step-3">
              <strong>Add water to the peptide.</strong> Insert the needle at a slight
              angle and let the water <em>run slowly down the inside wall</em> of the
              vial. Don&rsquo;t blast it directly onto the powder &mdash; it can damage
              delicate peptides.
            </RecipeStep>
            <RecipeStep n="4" testId="howto-step-4">
              <strong>Mix carefully.</strong> Let the vial sit for ~30 seconds, then
              gently swirl (or roll between your palms) until fully dissolved.{" "}
              <em>Never shake</em> &mdash; it can denature the peptide.
            </RecipeStep>
          </div>

          <p className="mt-8 text-[10px] font-mono uppercase tracking-[0.2em] text-[#A0A0A0] text-center">
            Store reconstituted vials refrigerated · Use within vendor window
          </p>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

/* ───── helpers ───── */

function Step({ n, title, children }) {
  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-full bg-[#FF2D87] text-white flex items-center justify-center text-sm font-bold shadow-[0_4px_14px_rgba(255,45,135,0.35)]">
          {n}
        </div>
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      <div className="pl-12">{children}</div>
    </div>
  );
}

function PillInput({ label, suffix, value, onChange, testId }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-[#5C5C5C]">
        {label}
      </label>
      <div className="mt-3 flex items-center border border-[#E5C8DC] rounded-full pl-6 pr-6 py-1.5 focus-within:border-[#FF2D87] focus-within:shadow-[0_4px_14px_rgba(255,45,135,0.12)] transition">
        <input
          type="number"
          min={0}
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          data-testid={testId}
          className="flex-1 outline-none bg-transparent text-2xl font-bold font-mono py-2 w-full"
        />
        <span className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0] ml-2">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function RecipeStep({ n, children, testId }) {
  return (
    <div className="flex items-start gap-4" data-testid={testId}>
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6FB5] to-[#FF2D87] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-[0_4px_14px_rgba(255,45,135,0.35)]">
        {n}
      </div>
      <div className="flex-1 bg-[#FFF0F7] rounded-2xl px-5 py-3 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function SupplyStat({ value, label, testId }) {
  return (
    <div className="bg-[#FFF0F7] rounded-2xl p-4 text-center border border-[#F0CFE0]">
      <div className="text-2xl font-black font-mono text-[#0A0A0A]" data-testid={testId}>{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#5C5C5C] mt-1">{label}</div>
    </div>
  );
}

function SyringeVisual({ draw, capacity }) {
  const cap = Math.max(capacity || 100, 1);
  const fillPct = Math.min(Math.max((draw || 0) / cap, 0), 1);
  const barrelX = 70, barrelW = 340, barrelY = 40, barrelH = 36;
  const fillW = barrelW * fillPct;
  const segCount = 10;

  return (
    <div data-testid="syringe-visual">
      <svg viewBox="0 0 500 110" className="w-full h-auto">
        <defs>
          <linearGradient id="pinkfill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF2D87" />
            <stop offset="100%" stopColor="#FF6FB5" />
          </linearGradient>
        </defs>
        {/* plunger handle */}
        <rect x="2" y="38" width="20" height="40" rx="3" fill="#FFFFFF" />
        <rect x="22" y="48" width="8" height="20" fill="#FFFFFF" />
        <rect x="30" y="54" width={40} height="8" fill="#666" />
        {/* stopper */}
        <rect x={barrelX + fillW - 8} y={barrelY - 2} width="8" height={barrelH + 4} fill="#FF2D87" />
        {/* fill */}
        <rect x={barrelX} y={barrelY} width={fillW} height={barrelH} fill="url(#pinkfill)" />
        {/* barrel */}
        <rect x={barrelX} y={barrelY} width={barrelW} height={barrelH} fill="none" stroke="#FFFFFF" strokeWidth="2" rx="4" />
        {/* ticks */}
        {Array.from({ length: segCount + 1 }).map((_, i) => {
          const x = barrelX + (barrelW / segCount) * i;
          const isMajor = i % 2 === 0;
          return (
            <g key={i}>
              <line x1={x} y1={barrelY - 6} x2={x} y2={barrelY} stroke="#FFFFFF" strokeWidth={isMajor ? 1.5 : 1} />
              {isMajor && (
                <text x={x} y={barrelY - 10} fill="#A0A0A0" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                  {Math.round((cap / segCount) * i)}
                </text>
              )}
            </g>
          );
        })}
        {/* needle hub */}
        <rect x={barrelX + barrelW} y={barrelY + 8} width="14" height={barrelH - 16} fill="#FFFFFF" />
        <line x1={barrelX + barrelW + 14} y1={barrelY + barrelH / 2} x2={barrelX + barrelW + 80} y2={barrelY + barrelH / 2} stroke="#FFFFFF" strokeWidth="2" />
        {fillW > 40 && (
          <text x={barrelX + fillW / 2} y={barrelY + barrelH / 2 + 4} fill="#FFFFFF" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="700" textAnchor="middle">
            {(draw || 0).toFixed(1)} u
          </text>
        )}
      </svg>
    </div>
  );
}
