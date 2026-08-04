import { Link, NavLink, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useSettings } from "../lib/settings";
import { Button } from "./ui/button";
import { Logo, LogoText } from "./Logo";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const nav = useNavigate();

  const navItems = [
    { to: "/vendors", label: "Vendors" },
    { to: "/calculator", label: "Calculator" },
    ...(settings?.price_tool_enabled !== false
      ? [{ to: "/compare", label: "Peptide Price Tool" }]
      : []),
    { to: "/resources", label: "Resources" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FDF8F3] text-[#0A0A0A]">
      <div className="glitter-strip h-2 w-full" aria-hidden />
      <header className="border-b-2 border-[#0A0A0A] sticky top-0 bg-[#FDF8F3]/95 backdrop-blur z-40">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 lg:px-12 h-28">
          <Link to="/" data-testid="logo-link">
            <Logo size={96} />
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={`nav-${n.to.slice(1)}`}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-semibold border border-transparent hover:border-[#B87A6A] hover:text-[#B87A6A] ${
                    isActive ? "bg-[#B87A6A] text-white border-[#B87A6A]" : ""
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {user && user.role === "admin" ? (
              <>
                <Button
                  variant="outline"
                  className="rounded-none border-[#0A0A0A] hover:bg-[#B87A6A] hover:text-white hover:border-[#B87A6A]"
                  onClick={() => nav("/admin")}
                  data-testid="admin-btn"
                >
                  Admin
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-none"
                  onClick={async () => { await logout(); nav("/"); }}
                  data-testid="logout-btn"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                className="rounded-none border-[#0A0A0A] hover:bg-[#B87A6A] hover:text-white hover:border-[#B87A6A]"
                onClick={() => nav("/login")}
                data-testid="login-btn"
              >
                Admin login
              </Button>
            )}
          </div>
        </div>
        <div className="md:hidden border-t border-[#E8CDBF] flex overflow-x-auto bg-white">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-4 py-3 text-xs font-mono uppercase tracking-widest border-r border-[#E8CDBF] flex-shrink-0 ${
                  isActive ? "bg-[#B87A6A] text-white" : ""
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </div>
      </header>

      {/* Persistent compliance banner — visible on every page */}
      <div
        data-testid="disclaimer-banner"
        className="bg-[#FBF3EC] border-b border-[#E8CDBF] text-[#0A0A0A]"
        role="note"
        aria-label="Site disclaimer"
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-2 text-[11px] sm:text-xs font-mono tracking-wide text-center">
          <span className="font-bold text-[#B87A6A] uppercase tracking-[0.18em] mr-2">Notice</span>
          For research and educational purposes only. Content on this site is{" "}
          <span className="font-semibold">not medical advice</span> and is not intended
          to diagnose, treat, cure, or prevent any disease. Always consult a qualified
          healthcare professional before making decisions about your health.
        </div>
      </div>

      {/* Global Community bar — visible on every page */}
      {settings?.community_bar_enabled !== false && (
        <a
          href={settings?.community_bar_url || "https://www.skool.com/ericas-elevated-life-9005"}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="community-bar"
          className="group block border-b-2 border-[#B87A6A] bg-gradient-to-r from-[#F5DED4] via-white to-[#F5DED4] hover:from-[#B87A6A] hover:to-[#B87A6A] hover:text-white transition-colors"
        >
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-6 lg:px-12 py-3 text-center">
            <Sparkles size={16} className="text-[#B87A6A] group-hover:text-white transition-colors flex-shrink-0" />
            <span
              className="text-xs sm:text-sm font-bold text-[#0A0A0A] group-hover:text-white transition-colors"
              data-testid="community-bar-message"
            >
              {settings?.community_bar_message || "Join The Optimized Society community"}
            </span>
            {(settings?.community_bar_price || "").trim() && (
              <>
                <span className="hidden sm:inline text-[#B87A6A] group-hover:text-white/60 transition-colors">·</span>
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#B87A6A] group-hover:bg-white group-hover:text-[#B87A6A] text-white text-[10px] font-mono font-bold uppercase tracking-widest rounded-full transition-colors"
                  data-testid="community-bar-price"
                >
                  {settings.community_bar_price}
                </span>
              </>
            )}
            <span
              className="text-[10px] font-mono uppercase tracking-widest text-[#B87A6A] group-hover:text-white transition-colors inline-flex items-center gap-1"
              data-testid="community-bar-cta"
            >
              {settings?.community_bar_cta || "Join now"} <ArrowRight size={12} />
            </span>
          </div>
        </a>
      )}

      <main className="flex-1">{children}</main>

      <footer className="border-t-2 border-[#0A0A0A] mt-24 bg-[#0A0A0A] text-white sparkle-bg">
        <div className="glitter-strip h-1 w-full" aria-hidden />
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 grid md:grid-cols-3 gap-8 relative z-10">
          <div>
            <LogoText />
            <p className="text-sm text-[#FFB8D8] mt-6 leading-relaxed">
              Optimize Your Health. Elevate Your Life. Curated by Erica.
            </p>
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.25em] chrome-text mb-3">Disclaimer</div>
            <p className="text-sm leading-relaxed text-[#E0E0E0]">
              The information provided on The Optimized Society is for{" "}
              <span className="font-semibold text-white">research and educational purposes only</span>{" "}
              and does not constitute medical advice. Statements have not been evaluated
              by the FDA. Products referenced are intended strictly for laboratory and
              research use, not for human consumption. Always consult a qualified
              healthcare professional before making any decisions about your health,
              and verify each vendor&apos;s Certificate of Analysis (COA).
            </p>
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.25em] chrome-text mb-3">Affiliate notice</div>
            <p className="text-sm leading-relaxed text-[#E0E0E0]">
              Links to vendors on this site may be affiliate links. We may earn a commission
              on qualifying purchases at no extra cost to you.
            </p>
            <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.3em] text-[#C99786]">
              © THE OPTIMIZED SOCIETY {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
