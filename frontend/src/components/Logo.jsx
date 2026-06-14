const LOGO_URL = "https://customer-assets.emergentagent.com/job_peptide-dosing-1/artifacts/tbcplspn_7886a451-cc7a-4efd-bb03-768e2c2476b7.png";

export function Logo({ className = "", size = 56 }) {
  return (
    <img
      src={LOGO_URL}
      alt="Pepgirl.com"
      className={`block ${className}`}
      style={{ height: size, width: "auto", objectFit: "contain" }}
      data-testid="logo-img"
    />
  );
}

/* Compact wordmark for dark backgrounds (footer) */
export function LogoText({ className = "" }) {
  return (
    <div className={`flex flex-col leading-none ${className}`}>
      <div
        className="font-serif-glam text-4xl tracking-tight"
        style={{
          background: "linear-gradient(90deg, #FF2D87 0%, #FF6FB5 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Pepgirl<span className="text-base align-top">.com</span>
      </div>
      <div className="font-mono text-[10px] tracking-[0.35em] uppercase mt-2 font-bold text-[#FF6FB5]">
        Peptides · Confidence · You
      </div>
    </div>
  );
}
