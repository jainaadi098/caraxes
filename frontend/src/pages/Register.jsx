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
    <div className="relative flex min-h-screen items-center justify-center bg-white p-6 selection:bg-orange-100 selection:text-[#FF5533]">
      {/* Background Ambient Peach/Coral Glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-orange-100/50 via-rose-50/30 to-transparent blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 h-[400px] w-[500px] rounded-full bg-orange-100/30 blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Navigation back to main app */}
        <div className="flex items-center justify-between text-xs">
          <Link to="/" className="inline-flex items-center gap-1.5 font-semibold text-slate-500 hover:text-[#FF5533] transition">
            ← Back to Submit & Check
          </Link>
          <Link to="/welcome" className="text-slate-400 hover:text-slate-700 transition">
            Product Tour
          </Link>
        </div>

        {/* Top Branding */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5533] to-[#FF7A59] text-white shadow-lg shadow-orange-500/30">
              <Icon name="shield" className="h-6 w-6" />
            </span>
          </Link>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
            Create your company account
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Initialize your organization's brand intelligence workspace
          </p>
        </div>

        {/* Floating Card Container */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-orange-500/5 sm:p-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700">Company / Organization Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp or NovaBrew"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF5533] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Your Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Elena Park"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF5533] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Registered Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="elena@company.com"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF5533] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Password (min 6 characters) *</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF5533] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#FF5533] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="admin">Admin (Full brand rules & CI/CD management)</option>
                <option value="reviewer">Reviewer (Audit & sign-off submissions)</option>
                <option value="creator">Creator (Submit & check copy)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#FF5533] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#E64424] disabled:opacity-50"
            >
              {loading ? "Creating Company Workspace..." : "Create Account & Sign In"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
            Already registered?{" "}
            <Link to="/login" className="font-bold text-[#FF5533] hover:underline">
              Sign In to your company →
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400">
          <Link to="/" className="hover:text-slate-600">
            ← Back to Front Page Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
