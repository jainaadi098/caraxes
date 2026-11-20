import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context";
import { api } from "../lib/api";
import { Icon } from "../lib/ui";

export default function ForgotPassword() {
  const { sendOtp, verifyOtp } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState("email"); // "email" | "verify" | "reset"
  const [email, setEmail] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleSendCode(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const res = await sendOtp(email.trim());
      setStep("verify");
      setInfo(res.message || "Authentication code and recovery link sent to your registered email.");
    } catch (err) {
      setError(err.message || "Failed to send recovery code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    if (!otpToken.trim()) return;
    setLoading(true);
    setError("");

    try {
      await verifyOtp(email.trim(), otpToken.trim());
      setStep("reset");
      setInfo("Authentication verified! You can optionally update your password now or jump into your workspace.");
    } catch (err) {
      setError(err.message || "Invalid or expired authentication code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ new_password: newPassword }),
      });
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to update password.");
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

        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#FF5533] to-[#FF7A59] text-white shadow-lg shadow-orange-500/30">
              <Icon name="shield" className="h-6 w-6" />
            </span>
          </Link>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
            {step === "reset" ? "Set New Password" : "Password Recovery & Email Auth"}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {step === "email" && "Enter your registered email to receive an instant authentication code."}
            {step === "verify" && `Enter the 6-digit verification code sent to ${email}.`}
            {step === "reset" && "Choose a secure new password for your account."}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-orange-500/5 sm:p-8">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {info && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              {info}
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleSendCode} className="space-y-4">
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

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#FF5533] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#E64424] disabled:opacity-50"
              >
                {loading ? "Sending Code..." : "Send Authentication Code"}
              </button>
            </form>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">6-Digit Authentication Code</label>
                <input
                  type="text"
                  required
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  placeholder="123456"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-center font-mono text-base tracking-widest text-slate-900 placeholder-slate-400 focus:border-[#FF5533] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#FF5533] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#E64424] disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & Sign In Instantly"}
              </button>

              <div className="flex justify-between text-xs text-slate-500 pt-1">
                <button
                  type="button"
                  onClick={handleSendCode}
                  className="text-[#FF5533] hover:underline font-semibold"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="hover:text-slate-800 hover:underline"
                >
                  Change email
                </button>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">New Password (min 6 characters)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF5533] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#FF5533] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition hover:bg-[#E64424] disabled:opacity-50"
              >
                {loading ? "Updating..." : "Save Password & Proceed"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 hover:underline pt-1"
              >
                Skip and go directly to workspace →
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
            Remembered password?{" "}
            <Link to="/login" className="font-bold text-[#FF5533] hover:underline">
              Back to Sign In
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
