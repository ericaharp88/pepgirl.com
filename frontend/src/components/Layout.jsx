import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "./ui/button";
import { Logo, LogoText } from "./Logo";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const navItems = [
    { to: "/vendors", label: "Vendors" },
    { to: "/calculator", label: "Calculator" },
    { to: "/resources", label: "Resources" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF5FA] text-[#0A0A0A]">
      <div className="glitter-strip h-2 w-full" aria-hidden />
      <header className="border-b-2 border-[#0A0A0A] sticky top-0 bg-[#FFF5FA]/95 backdrop-blur z-40">
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
                  `px-4 py-2 text-sm font-semibold border border-transparent hover:border-[#FF2D87] hover:text-[#FF2D87] ${
                    isActive ? "bg-[#FF2D87] text-white border-[#FF2D87]" : ""
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
                  className="rounded-none border-[#0A0A0A] hover:bg-[#FF2D87] hover:text-white hover:border-[#FF2D87]"
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
                className="rounded-none border-[#0A0A0A] hover:bg-[#FF2D87] hover:text-white hover:border-[#FF2D87]"
                onClick={() => nav("/login")}
                data-testid="login-btn"
              >
                Admin login
              </Button>
            )}
          </div>
        </div>
        <div className="md:hidden border-t border-[#F0CFE0] flex overflow-x-auto bg-white">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-4 py-3 text-xs font-mono uppercase tracking-widest border-r border-[#F0CFE0] flex-shrink-0 ${
                  isActive ? "bg-[#FF2D87] text-white" : ""
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
        className="bg-[#FFF0F7] border-b border-[#F0CFE0] text-[#0A0A0A]"
        role="note"
        aria-label="Site disclaimer"
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-2 text-[11px] sm:text-xs font-mono tracking-wide text-center">
          <span className="font-bold text-[#FF2D87] uppercase tracking-[0.18em] mr-2">Notice</span>
          For research and educational purposes only. Content on this site is{" "}
          <span className="font-semibold">not medical advice</span> and is not intended
          to diagnose, treat, cure, or prevent any disease. Always consult a qualified
          healthcare professional before making decisions about your health.
        </div>
      </div>

      <main className="flex-1">{children}</main>

      <footer className="border-t-2 border-[#0A0A0A] mt-24 bg-[#0A0A0A] text-white sparkle-bg">
        <div className="glitter-strip h-1 w-full" aria-hidden />
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 grid md:grid-cols-3 gap-8 relative z-10">
          <div>
            <LogoText />
            <p className="text-sm text-[#FFB8D8] mt-6 leading-relaxed">
              Peptides · Confidence · You. Built by the girls, for the girls.
            </p>
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.25em] chrome-text mb-3">Disclaimer</div>
            <p className="text-sm leading-relaxed text-[#E0E0E0]">
              The information provided on Pep Girl is for{" "}
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
            <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.3em] text-[#FF6FB5]">
              © PEPGIRL.COM {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
