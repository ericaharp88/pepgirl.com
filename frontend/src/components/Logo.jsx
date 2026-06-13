export function Sparkle({ size = 24, className = "" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="chrome-grad" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#C0C0C0" />
          <stop offset="55%" stopColor="#6B6B6B" />
          <stop offset="80%" stopColor="#E8E8E8" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <path
        d="M12 0 L13.5 9.2 L22 10.5 L13.5 13.4 L15.5 22.5 L12 16 L8.5 22.5 L10.5 13.4 L2 10.5 L10.5 9.2 Z"
        fill="url(#chrome-grad)"
        stroke="#0A0A0A"
        strokeWidth="0.5"
      />
    </svg>
  );
}

export function Logo({ className = "", dark = false }) {
  const subGradient = dark
    ? "linear-gradient(90deg,#C0C0C0,#FFFFFF,#888,#E8E8E8)"
    : "linear-gradient(90deg,#888888,#3D3D3D,#7A7A7A,#1F1F1F)";
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Sparkle size={28} />
      <div className="leading-none">
        <div
          className="font-black tracking-tight text-xl"
          style={{
            background: "linear-gradient(90deg, #FF2D87 0%, #FF6FB5 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          PEPGIRL
        </div>
        <div
          className="font-mono text-[9px] tracking-[0.35em] uppercase mt-0.5 font-bold"
          style={{
            background: subGradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          PRICE / CHECK
        </div>
      </div>
    </div>
  );
}
