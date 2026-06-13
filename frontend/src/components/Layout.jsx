import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button } from "./ui/button";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const navItems = [
    { to: "/vendors", label: "Vendors" },
    { to: "/calculator", label: "Calculator" },
    { to: "/compare", label: "Price Compare" },
    { to: "/resources", label: "Resources" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#0A0A0A]">
      <header className="border-b border-[#E5E5E5] sticky top-0 bg-white z-40">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 lg:px-12 h-16">
          <Link to="/" className="flex items-center gap-3" data-testid="logo-link">
            <span className="w-6 h-6 bg-[#002FA7]" aria-hidden />
            <span className="font-mono text-sm tracking-[0.25em] uppercase font-bold">
              PEPTIDE/HUB
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={`nav-${n.to.slice(1)}`}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-medium border border-transparent hover:border-[#0A0A0A] ${
                    isActive ? "bg-[#0A0A0A] text-white border-[#0A0A0A]" : ""
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
                  className="rounded-none border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white"
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
                className="rounded-none border-[#0A0A0A] hover:bg-[#0A0A0A] hover:text-white"
                onClick={() => nav("/login")}
                data-testid="login-btn"
              >
                Admin login
              </Button>
            )}
          </div>
        </div>
        {/* mobile nav */}
        <div className="md:hidden border-t border-[#E5E5E5] flex overflow-x-auto">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-4 py-3 text-xs font-mono uppercase tracking-widest border-r border-[#E5E5E5] flex-shrink-0 ${
                  isActive ? "bg-[#0A0A0A] text-white" : ""
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[#E5E5E5] mt-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 grid md:grid-cols-3 gap-8">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#5C5C5C] mb-3">
              Disclaimer
            </div>
            <p className="text-sm leading-relaxed">
              All peptides referenced on this site are intended strictly for research
              and laboratory use. Not for human consumption. Verify vendor COAs.
            </p>
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#5C5C5C] mb-3">
              Affiliate notice
            </div>
            <p className="text-sm leading-relaxed">
              Links to vendors on this site may be affiliate links. We may earn a
              commission on qualifying purchases at no extra cost to you.
            </p>
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#5C5C5C] mb-3">
              © PEPTIDE/HUB {new Date().getFullYear()}
            </div>
            <p className="text-sm">Built for serious researchers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
