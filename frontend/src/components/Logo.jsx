const LOGO_URL = "https://customer-assets.emergentagent.com/job_peptide-dosing-1/artifacts/o609daus_0ec56542-729c-47f1-bada-5083de458339.png";

export function Logo({ className = "", size = 56 }) {
  return (
    <img
      src={LOGO_URL}
      alt="The Optimized Society by Erica"
      className={`block ${className}`}
      style={{ height: size, width: size, objectFit: "contain", borderRadius: "50%" }}
      data-testid="logo-img"
    />
  );
}

/* Compact wordmark for dark backgrounds (footer) */
export function LogoText({ className = "" }) {
  return (
    <div className={`flex flex-col leading-none ${className}`}>
      <div className="font-serif-glam text-3xl tracking-tight text-white">
        The{" "}
        <span
          style={{
            background: "linear-gradient(90deg, #B87A6A 0%, #C99786 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Optimized Society
        </span>
      </div>
      <div className="font-mono text-[10px] tracking-[0.35em] uppercase mt-2 font-bold text-[#C99786]">
        By Erica · Optimize · Elevate
      </div>
    </div>
  );
}
