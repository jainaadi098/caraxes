import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context";
import { Icon } from "../lib/ui";

export default function Register() {
  const { register } = useApp();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e) {
    e.preventDefault();
    if (!companyName.trim() || !fullName.trim() || !email.trim() || !password) return;
    setLoading(true);
    setError("");

    try {
      await register({
        company_name: companyName.trim(),
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
      });
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to create company account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Left Hero Column */}
      <div className="relative hidden w-1/2 flex-col justify-between border-r border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <Icon name="shield" className="h-6 w-6" />
          </span>
          <div>
            <div className="text-base font-bold tracking-wider text-white">CARAXES</div>
            <div className="text-xs text-blue-300">Brand Governance & Compliance OS</div>
          </div>
        </div>

        <div className="max-w-md space-y-4">
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Automated Onboarding
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Set up your organization's brand intelligence in minutes.
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">
            Create your company workspace, extract brand rules from PDFs, and protect copy across your entire team.
          </p>
        </div>

        <div className="text-xs text-slate-600">
          © {new Date().getFullYear()} Caraxes Governance Platform • All rights reserved.
        </div>
      </div>

      {/* Right Registration Form */}
      <div className="flex w-full items-center justify-center p-6 sm:p-12 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div>
            <div className="flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Icon name="shield" className="h-4 w-4" />
              </span>
              <span className="font-bold tracking-wider text-white">CARAXES</span>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Create your company account</h1>
            <p className="mt-1 text-xs text-slate-400">
              Initialize a new brand governance workspace for your team.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-950/40 p-3.5 text-xs text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300">Company / Organization Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corporation or NovaBrew"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Your Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Elena Park"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Registered Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="elena@company.com"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Password (min 6 characters) *</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="admin">Admin (Full brand governance & rules management)</option>
                <option value="reviewer">Reviewer (Audit & sign-off submissions)</option>
                <option value="creator">Creator (Submit & check copy/assets)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Creating Company Workspace..." : "Create Account & Sign In"}
            </button>
          </form>

          <div className="border-t border-slate-800/80 pt-6 text-center text-xs text-slate-400">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300 hover:underline">
              Sign In to your company →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
