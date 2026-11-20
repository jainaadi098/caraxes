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
      // Logged in! Can either proceed directly to dashboard or reset password
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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <Icon name="shield" className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">
            {step === "reset" ? "Set New Password" : "Password Recovery & Email Auth"}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            {step === "email" && "Enter your registered email to receive an instant authentication code."}
            {step === "verify" && `Enter the 6-digit verification code sent to ${email}.`}
            {step === "reset" && "Choose a secure new password for your account."}
          </p>
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

        {step === "email" && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300">Registered Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Authentication Code"}
            </button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300">6-Digit Authentication Code</label>
              <input
                type="text"
                required
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value)}
                placeholder="123456"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-center font-mono text-lg tracking-widest text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Sign In Instantly"}
            </button>

            <div className="flex justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={handleSendCode}
                className="hover:text-blue-400 hover:underline"
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="hover:text-blue-400 hover:underline"
              >
                Change email
              </button>
            </div>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300">New Password (min 6 characters)</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Save Password & Proceed"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full text-center text-xs text-slate-400 hover:text-white hover:underline"
            >
              Skip and go directly to workspace →
            </button>
          </form>
        )}

        <div className="border-t border-slate-800/80 pt-4 text-center text-xs text-slate-400">
          Remembered your password?{" "}
          <Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300 hover:underline">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
