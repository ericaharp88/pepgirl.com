const LOGO_URL = "https://customer-assets.emergentagent.com/job_peptide-hub-37/artifacts/4te4rtn2_28ee44a5-d2c8-454d-bfe4-e8dd7447bb85.png";

export function Logo({ className = "", size = 56 }) {
  return (
    <img
      src={LOGO_URL}
      alt="Pepgirl Price Check"
      className={`block ${className}`}
      style={{ height: size, width: "auto", objectFit: "contain" }}
      data-testid="logo-img"
    />
  );
}

/* Compact chrome text logo for dark backgrounds (e.g. footer) */
export function LogoText({ className = "" }) {
  return (
    <div className={`flex flex-col leading-none ${className}`}>
      <div
        className="font-serif-glam text-3xl tracking-tight"
        style={{
          background: "linear-gradient(90deg, #FF2D87 0%, #FF6FB5 50%, #69D7FF 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Pepgirl
      </div>
      <div
        className="font-mono text-[10px] tracking-[0.35em] uppercase mt-1 font-bold"
        style={{
          background: "linear-gradient(90deg,#C0C0C0,#FFFFFF,#888,#E8E8E8)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        PRICE / CHECK
      </div>
    </div>
  );
}
