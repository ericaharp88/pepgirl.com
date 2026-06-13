import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { toast } from "sonner";

function formatErr(detail) {
  if (!detail) return "Login failed";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back, admin.");
      nav(loc.state?.from || "/admin");
    } catch (e2) {
      toast.error(formatErr(e2.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-24">
      <div className="border-b border-[#0A0A0A] pb-4 mb-8">
        <div className="eyebrow text-[#002FA7] mb-3">Restricted</div>
        <h1 className="text-4xl font-black tracking-tighter">Admin login</h1>
      </div>
      <form onSubmit={submit} className="space-y-6" data-testid="login-form">
        <div>
          <Label className="eyebrow text-[#5C5C5C]">Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="login-email"
            className="rounded-none border-[#0A0A0A] font-mono mt-2 h-12"
            placeholder="admin@peptidehub.com"
          />
        </div>
        <div>
          <Label className="eyebrow text-[#5C5C5C]">Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            data-testid="login-password"
            className="rounded-none border-[#0A0A0A] font-mono mt-2 h-12"
          />
        </div>
        <Button
          type="submit"
          disabled={busy}
          data-testid="login-submit"
          className="w-full rounded-none bg-[#002FA7] hover:bg-[#0A0A0A] text-white h-12 font-mono uppercase tracking-[0.25em] text-xs"
        >
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
