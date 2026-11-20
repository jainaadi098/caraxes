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
    <div className="relative flex min-h-screen items-center justify-center bg-white p-6 selection:bg-orange-100 selection:text-[#FF5533]">
      {/* Background Ambient Peach/Coral Glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-orange-100/50 via-rose-50/30 to-transparent blur-3xl" />
        <div className="absolute -bottom-32 right-1/4 h-[400px] w-[500px] rounded-full bg-orange-100/30 blur-3xl" />
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
            Sign in to your company
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Access brand rules, pre-pub checks, and compliance queue
          </p>
        </div>

        {/* Floating Card Container */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-orange-500/5 sm:p-8">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-100/80 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setError("");
                setInfo("");
              }}
              className={`flex-1 rounded-lg py-2 transition ${
                mode === "password"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
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
                  ? "bg-white text-[#FF5533] shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Registered Email OTP
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {info && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              {info}
            </div>
          )}

          {mode === "password" ? (
            <form onSubmit={handlePasswordLogin} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Registered Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF5533] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[#FF5533] hover:underline"
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
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF5533] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#FF5533] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#E64424] disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In to Workspace"}
              </button>
            </form>
          ) : (
            <form onSubmit={otpSent ? handleOtpLogin : handleSendOtp} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Registered Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF5533] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {otpSent && (
                <div>
                  <label className="block text-xs font-bold text-slate-700">6-Digit Verification Code</label>
                  <input
                    type="text"
                    required
                    value={otpToken}
                    onChange={(e) => setOtpToken(e.target.value)}
                    placeholder="123456"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-center font-mono text-base tracking-widest text-slate-900 placeholder-slate-400 focus:border-[#FF5533] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                  <div className="mt-1 text-right">
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-xs text-[#FF5533] hover:underline"
                    >
                      Resend code
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#FF5533] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#E64424] disabled:opacity-50"
              >
                {loading
                  ? "Processing..."
                  : otpSent
                  ? "Verify Code & Sign In"
                  : "Send Verification Code"}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
            New to Caraxes?{" "}
            <Link to="/register" className="font-bold text-[#FF5533] hover:underline">
              Create Company Account →
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
