import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context";
import { Icon } from "../lib/ui";

export default function Login() {
  const { login, verifyOtp, sendOtp } = useApp();
  const navigate = useNavigate();

  const [mode, setMode] = useState("password"); // "password" | "otp"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handlePasswordLogin(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");
    setInfo("");

    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(e) {
    e?.preventDefault();
    if (!email.trim()) {
      setError("Please enter your registered email.");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const res = await sendOtp(email.trim());
      setOtpSent(true);
      setInfo(res.message || "Authentication code sent to your registered email.");
    } catch (err) {
      setError(err.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpLogin(e) {
    e.preventDefault();
    if (!email.trim() || !otpToken.trim()) return;
    setLoading(true);
    setError("");

    try {
      await verifyOtp(email.trim(), otpToken.trim());
      navigate("/");
    } catch (err) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Left Hero Column */}
      <div className="relative hidden w-1/2 flex-col justify-between border-r border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/40 p-12 lg:flex">
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
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-400">
            Enterprise Security & RBAC
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Ensure every brand asset, claim & copy conforms to your guidelines.
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">
            AI-assisted governance paired with deterministic Vale rules and automated pre-publication checks.
          </p>
        </div>

        <div className="text-xs text-slate-600">
          © {new Date().getFullYear()} Caraxes Governance Platform • All rights reserved.
        </div>
      </div>

      {/* Right Login Form Column */}
      <div className="flex w-full items-center justify-center p-6 sm:p-12 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div>
            <div className="flex items-center gap-2 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Icon name="shield" className="h-4 w-4" />
              </span>
              <span className="font-bold tracking-wider text-white">CARAXES</span>
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Sign in to your company</h1>
            <p className="mt-1 text-xs text-slate-400">
              Access your brand knowledge, automated checks, and compliance queue.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-900 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setError("");
                setInfo("");
              }}
              className={`flex-1 rounded-lg py-2 transition ${
                mode === "password"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("otp");
                setError("");
                setInfo("");
              }}
              className={`flex-1 rounded-lg py-2 transition ${
                mode === "otp"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Registered Email OTP
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-950/40 p-3.5 text-xs text-red-300">
              {error}
            </div>
          )}

          {info && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/40 p-3.5 text-xs text-emerald-300">
              {info}
            </div>
          )}

          {mode === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Registered Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Sign In to Workspace"}
              </button>
            </form>
          ) : (
            <form onSubmit={otpSent ? handleOtpLogin : handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">Registered Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {otpSent && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Authentication OTP Code</label>
                  <input
                    type="text"
                    required
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-center font-mono text-base tracking-widest text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="mt-1 text-right">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      Resend code
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-50"
              >
                {loading
                  ? "Processing..."
                  : otpSent
                  ? "Verify Code & Sign In"
                  : "Send Authentication Code"}
              </button>
            </form>
          )}

          <div className="border-t border-slate-800/80 pt-6 text-center text-xs text-slate-400">
            Don't have a company account yet?{" "}
            <Link to="/register" className="font-semibold text-blue-400 hover:text-blue-300 hover:underline">
              Create Company Account →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
