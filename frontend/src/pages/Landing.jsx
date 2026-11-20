import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context";
import { Icon } from "../lib/ui";

const SIMULATOR_PRESETS = [
  {
    label: "Auth & Terminology Violation",
    text: "Please login to your account to grab unbeatable guaranteed discounts today!",
    detected: [
      {
        term: "login",
        type: "terminology",
        rule: "Brand.Terminology",
        fix: "sign in",
        reason: "Use approved terminology 'sign in' instead of 'login'.",
      },
      {
        term: "unbeatable",
        type: "claim",
        rule: "Brand.PromotionalClaims",
        fix: "verified",
        reason: "Prohibited unverified absolute claim 'unbeatable'.",
      },
      {
        term: "guaranteed",
        type: "claim",
        rule: "Brand.PromotionalClaims",
        fix: "exclusive",
        reason: "Prohibited unconditional promise 'guaranteed' without legal substantiation.",
      },
    ],
    corrected: "Please sign in to your account to grab verified exclusive discounts today!",
  },
  {
    label: "Harsh Tone & Slang",
    text: "You guys must checkout our cheap tool or else you'll miss out completely!",
    detected: [
      {
        term: "You guys",
        type: "tone",
        rule: "Brand.Tone",
        fix: "You",
        reason: "Avoid informal slang 'You guys' in customer-facing communication.",
      },
      {
        term: "cheap",
        type: "terminology",
        rule: "Brand.Terminology",
        fix: "affordable",
        reason: "Use value-grounded word 'affordable' instead of 'cheap'.",
      },
    ],
    corrected: "You can discover our affordable tool to maximize your brand reach!",
  },
  {
    label: "Clean & Compliant Copy",
    text: "Please sign in to your company dashboard to review your active brand guidelines.",
    detected: [],
    corrected: "Please sign in to your company dashboard to review your active brand guidelines.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useApp();

  // Interactive Simulator State
  const [inputText, setInputText] = useState(SIMULATOR_PRESETS[0].text);
  const [activePreset, setActivePreset] = useState(0);
  const [auditResult, setAuditResult] = useState(SIMULATOR_PRESETS[0]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  function handleSelectPreset(index) {
    setActivePreset(index);
    setInputText(SIMULATOR_PRESETS[index].text);
    setAuditResult(SIMULATOR_PRESETS[index]);
  }

  function handleAudit() {
    setIsAuditing(true);
    setTimeout(() => {
      // Find matching preset or generate instant heuristic
      const matched = SIMULATOR_PRESETS.find((p) => p.text === inputText);
      if (matched) {
        setAuditResult(matched);
      } else {
        const hasLogin = /\blogin\b/i.test(inputText);
        const hasUnbeatable = /\bunbeatable\b/i.test(inputText);
        const hasCheap = /\bcheap\b/i.test(inputText);

        const detected = [];
        let corrected = inputText;

        if (hasLogin) {
          detected.push({
            term: "login",
            type: "terminology",
            rule: "Brand.Terminology",
            fix: "sign in",
            reason: "Use approved terminology 'sign in' instead of 'login'.",
          });
          corrected = corrected.replace(/\blogin\b/gi, "sign in");
        }
        if (hasUnbeatable) {
          detected.push({
            term: "unbeatable",
            type: "claim",
            rule: "Brand.PromotionalClaims",
            fix: "exceptional",
            reason: "Prohibited absolute promotional claim.",
          });
          corrected = corrected.replace(/\bunbeatable\b/gi, "exceptional");
        }
        if (hasCheap) {
          detected.push({
            term: "cheap",
            type: "terminology",
            rule: "Brand.Terminology",
            fix: "accessible",
            reason: "Use 'accessible' or 'affordable' instead of 'cheap'.",
          });
          corrected = corrected.replace(/\bcheap\b/gi, "accessible");
        }

        setAuditResult({
          label: "Custom Input",
          text: inputText,
          detected,
          corrected,
        });
      }
      setIsAuditing(false);
    }, 300);
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-orange-100 selection:text-[#FF5533]">
      {/* Background Soft Peach/Coral Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-gradient-to-b from-orange-100/40 via-rose-50/25 to-transparent blur-3xl" />
        <div className="absolute top-[800px] -left-40 h-[500px] w-[500px] rounded-full bg-orange-100/30 blur-3xl" />
        <div className="absolute top-[1200px] -right-40 h-[600px] w-[600px] rounded-full bg-rose-100/25 blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-100/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF5533] to-[#FF7A59] text-white shadow-md shadow-orange-500/25">
              <Icon name="shield" className="h-5 w-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-slate-900">CARAXES</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#FF5533]">Brand Governance</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-xs font-semibold text-slate-600 md:flex">
            <a href="#how-it-works" className="transition hover:text-[#FF5533]">How It Works</a>
            <a href="#simulator" className="transition hover:text-[#FF5533]">Live Simulator</a>
            <a href="#features" className="transition hover:text-[#FF5533]">Features</a>
            <a href="#hybrid-engine" className="transition hover:text-[#FF5533]">Hybrid Engine</a>
            <Link to="/gallery" className="transition hover:text-[#FF5533]">Public Gallery</Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate("/")}
                className="rounded-xl bg-[#FF5533] px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition hover:bg-[#E64424]"
              >
                Go to Workspace →
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:text-slate-900"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-[#FF5533] px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/25 transition hover:bg-[#E64424]"
                >
                  Get started for free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-16 pb-12 text-center lg:pt-24 lg:pb-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/60 bg-gradient-to-r from-orange-50 via-rose-50/50 to-orange-50 px-4 py-1.5 text-xs font-bold text-[#FF5533] shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-[#FF5533] animate-pulse" />
            AI-POWERED BRAND GOVERNANCE OS
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
            Your AI-powered brand guardian <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
              for every workflow
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-base text-slate-600 sm:text-lg">
            Build faster, publish smarter, and automate brand compliance with intelligent Vale deterministic rules and Gemini RAG designed for modern teams.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-xl bg-[#FF5533] px-6 py-3 text-sm font-bold text-white shadow-xl shadow-orange-500/25 transition hover:bg-[#E64424] hover:shadow-orange-500/35"
            >
              Get started for free
            </Link>
            <a
              href="#simulator"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
            >
              Try live interactive demo ↓
            </a>
          </div>

          {/* Social Proof Tags */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-[#FF5533]">✓</span> 0ms deterministic Vale linting
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-[#FF5533]">✓</span> Automated GitHub PR reviews
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="text-[#FF5533]">✓</span> Citation-grounded AI auto-fix
            </span>
          </div>
        </div>

        {/* Hero Interactive Dashboard Preview (Reference Image Tribute) */}
        <div className="mx-auto mt-12 max-w-5xl">
          <div className="relative rounded-3xl border border-slate-200/80 bg-white p-3 shadow-2xl shadow-orange-500/10 sm:p-5">
            {/* Ambient inner card glow */}
            <div className="absolute -inset-1 -z-10 rounded-3xl bg-gradient-to-b from-orange-100/40 via-transparent to-transparent blur-xl" />

            {/* Mock Dashboard Frame */}
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 text-left">
              {/* Header inside mock */}
              <div className="flex items-center justify-between border-b border-slate-200/70 bg-white px-5 py-3.5">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF5533]" />
                    <span className="text-sm font-bold text-slate-900">Caraxes</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-600">
                    <span className="text-[#FF5533] border-b-2 border-[#FF5533] pb-1">Dashboard</span>
                    <span className="hover:text-slate-900 cursor-pointer">Rules Studio</span>
                    <span className="hover:text-slate-900 cursor-pointer">Review Queue</span>
                    <span className="hover:text-slate-900 cursor-pointer">Analytics</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                    <span>🔍</span> Search campaigns & rules...
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#FF5533] to-[#FF7A59] text-xs font-bold text-white">
                    EP
                  </div>
                </div>
              </div>

              {/* Main Content inside mock */}
              <div className="p-4 sm:p-6 space-y-6">
                {/* Morning Summary Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Morning Summary</h3>
                    <p className="text-xs text-slate-500">Good morning, Elena! Here is your brand governance overview for today.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                    <span>📅</span> Oct 1 - Oct 30, 2026
                  </div>
                </div>

                {/* KPI Metrics Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      Total ROI
                      <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">+18%</span>
                    </div>
                    <div className="mt-1 text-2xl font-black text-slate-900">4.2x</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      Violations Prevented
                      <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">+12%</span>
                    </div>
                    <div className="mt-1 text-2xl font-black text-slate-900">1,240</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      Auto-Fix Rate
                      <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">+5%</span>
                    </div>
                    <div className="mt-1 text-2xl font-black text-slate-900">85%</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      Active Rules
                      <span className="text-[#FF5533] font-bold text-[10px] bg-orange-50 px-1.5 py-0.5 rounded">Active</span>
                    </div>
                    <div className="mt-1 text-2xl font-black text-slate-900">48</div>
                  </div>
                </div>

                {/* Split Charts & Insights */}
                <div className="grid gap-4 lg:grid-cols-3">
                  {/* Visual Wave Chart (Matching the reference screenshot) */}
                  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Brand Compliance Performance</span>
                      <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#FF5533]" /> Marketing Copy</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-teal-400" /> UI Text</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Technical Docs</span>
                      </div>
                    </div>

                    {/* SVG Multi-curve Wave Chart */}
                    <div className="mt-4 h-48 w-full">
                      <svg viewBox="0 0 500 180" className="h-full w-full overflow-visible">
                        <defs>
                          <linearGradient id="coralGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF5533" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#FF5533" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="tealGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Background Grid Lines */}
                        <line x1="0" y1="40" x2="500" y2="40" stroke="#F1F5F9" strokeDasharray="4 4" />
                        <line x1="0" y1="90" x2="500" y2="90" stroke="#F1F5F9" strokeDasharray="4 4" />
                        <line x1="0" y1="140" x2="500" y2="140" stroke="#F1F5F9" strokeDasharray="4 4" />

                        {/* Wave 1: Coral Area & Line */}
                        <path
                          d="M0,130 C70,140 120,60 190,120 C260,170 320,30 380,100 C430,160 470,80 500,90 L500,180 L0,180 Z"
                          fill="url(#coralGlow)"
                        />
                        <path
                          d="M0,130 C70,140 120,60 190,120 C260,170 320,30 380,100 C430,160 470,80 500,90"
                          fill="none"
                          stroke="#FF5533"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />

                        {/* Wave 2: Teal Line */}
                        <path
                          d="M0,150 C80,110 130,160 210,90 C290,20 350,140 420,80 C460,40 480,70 500,60"
                          fill="none"
                          stroke="#2DD4BF"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {/* Wave 3: Amber Line */}
                        <path
                          d="M0,160 C100,160 180,130 250,110 C320,90 380,120 440,110 C470,105 490,95 500,100"
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeDasharray="3 3"
                        />

                        {/* Peak Highlight Circle */}
                        <circle cx="340" cy="55" r="5" fill="#FF5533" />
                        <circle cx="340" cy="55" r="9" fill="#FF5533" opacity="0.25" />
                      </svg>
                    </div>
                  </div>

                  {/* AI Insights & Recommendation Panel */}
                  <div className="space-y-3 lg:col-span-1">
                    <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/70 to-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#FF5533]">
                        <span>⚡</span>
                        <span>HIGH PRIORITY RECOMMENDATION</span>
                      </div>
                      <h4 className="mt-2 text-xs font-bold text-slate-900">Replace Outdated Terminology</h4>
                      <p className="mt-1 text-[11px] text-slate-600">
                        Detected 14 occurrences of <code className="bg-white px-1 py-0.5 rounded border border-orange-200 text-[#FF5533]">login</code>. Rule requires <code className="bg-white px-1 py-0.5 rounded border border-emerald-200 text-emerald-700">sign in</code>.
                      </p>
                      <button className="mt-3 w-full rounded-lg bg-[#FF5533] py-1.5 text-center text-xs font-bold text-white shadow-sm hover:bg-[#E64424]">
                        Apply Auto-Fix Everywhere (14)
                      </button>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>Tone Score</span>
                        <span className="text-emerald-600">92% Empathetic</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full w-[92%] rounded-full bg-emerald-500" />
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">
                        No harsh or dismissive language detected in Q4 release draft.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Simulator Section */}
      <section id="simulator" className="border-t border-slate-100 bg-gradient-to-b from-white via-orange-50/20 to-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center space-y-3">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-[#FF5533]">
              LIVE DEMO SIMULATOR
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Experience the 0ms Hybrid Engine
            </h2>
            <p className="mx-auto max-w-xl text-sm text-slate-600">
              Select a sample marketing draft or type your own copy to see Caraxes detect brand violations and apply context-aware fixes in real time.
            </p>
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-orange-500/5 sm:p-8">
            {/* Presets Selector */}
            <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-400">Sample Presets:</span>
              {SIMULATOR_PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => handleSelectPreset(i)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    activePreset === i
                      ? "bg-[#FF5533] text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input & Action */}
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Input Copy / Marketing Text
                </label>
                <div className="relative mt-2">
                  <textarea
                    rows={3}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 p-4 text-sm font-medium text-slate-900 focus:border-[#FF5533] focus:outline-none focus:ring-2 focus:ring-orange-100"
                    placeholder="Enter copy to audit against brand rules..."
                  />
                  <button
                    onClick={handleAudit}
                    disabled={isAuditing || !inputText.trim()}
                    className="mt-2 sm:mt-0 sm:absolute sm:right-3 sm:bottom-3 rounded-xl bg-[#FF5533] px-5 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition hover:bg-[#E64424] disabled:opacity-50"
                  >
                    {isAuditing ? "Auditing Copy..." : "▶ Run Brand Check"}
                  </button>
                </div>
              </div>

              {/* Live Findings Output */}
              <div className="pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Engine Diagnostic & Unified Diff
                </div>

                {auditResult.detected.length === 0 ? (
                  <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-800">
                    <span className="text-xl">✅</span>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider">100% Brand Compliant</div>
                      <div className="text-xs">No terminology, tone, or promotional claim violations detected.</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800">
                          ⚠️ {auditResult.detected.length} Violations Flagged by Deterministic & AI Rules
                        </span>
                        <span className="rounded bg-amber-200/60 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          0ms Latency
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {auditResult.detected.map((d, i) => (
                          <div key={i} className="rounded-xl border border-amber-200/80 bg-white p-3 text-xs shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-red-600 line-through">"{d.term}"</span>
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-emerald-800">
                                → "{d.fix}"
                              </span>
                            </div>
                            <p className="mt-1.5 text-[11px] text-slate-600">{d.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Unified Diff */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-200">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Unified Diff Remediation:
                      </div>
                      <div className="text-red-400">- {auditResult.text}</div>
                      <div className="text-emerald-400 mt-1">+ {auditResult.corrected}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="px-6 py-20 border-t border-slate-100">
        <div className="mx-auto max-w-5xl">
          <div className="text-center space-y-3">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-[#FF5533]">
              FOUR-STEP GOVERNANCE ARCHITECTURE
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              How Caraxes Protects Your Brand
            </h2>
            <p className="mx-auto max-w-xl text-sm text-slate-600">
              From PDF guidelines to continuous GitHub deployments, here is how Caraxes keeps every contributor in line with zero manual copy-pasting.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-orange-200 hover:shadow-md transition">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-lg font-black text-[#FF5533]">
                1
              </span>
              <h3 className="mt-4 text-base font-bold text-slate-900">Upload Guidelines</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Ingest brand PDFs, stylebooks, and tone guides. Caraxes parses text, extracts rules, and builds vector embeddings with exact page citations.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-orange-200 hover:shadow-md transition">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-lg font-black text-teal-600">
                2
              </span>
              <h3 className="mt-4 text-base font-bold text-slate-900">Deterministic Vale Checks</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Approved rules compile into Vale YAML regex packs. Fast-path terminology substitutions and banned token checks run locally in 0 milliseconds.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-orange-200 hover:shadow-md transition">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-lg font-black text-purple-600">
                3
              </span>
              <h3 className="mt-4 text-base font-bold text-slate-900">Gemini AI Semantic RAG</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Gemini 3.8 Flash audits nuance, empathy, visual consistency, and promotional claims—grounded strictly in your approved brand knowledge.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-orange-200 hover:shadow-md transition">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-lg font-black text-rose-600">
                4
              </span>
              <h3 className="mt-4 text-base font-bold text-slate-900">One-Click Fix & CI/CD</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Generates unified diffs and posts suggestions directly into GitHub Pull Requests, or empowers reviewers to sign off with audit trails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="border-t border-slate-100 bg-slate-50/50 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center space-y-3">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-[#FF5533]">
              COMPREHENSIVE GOVERNANCE SUITE
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Engineered for Enterprise Brand Trust
            </h2>
            <p className="mx-auto max-w-xl text-sm text-slate-600">
              Everything your team needs to enforce brand identity across every channel, document, and repository.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl">🤖</div>
              <h3 className="mt-3 text-sm font-bold text-slate-900">Automated GitHub PR Webhooks</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Connect repositories directly. Every PR automatically receives inline review suggestions with markdown diffs, blocking non-compliant merges.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl">⚡</div>
              <h3 className="mt-3 text-sm font-bold text-slate-900">Hybrid AI & Vale Exporter</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Export your database rules as a portable `.vale.ini` style pack (.zip) to lint copy inside VS Code or offline pipelines.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl">🧪</div>
              <h3 className="mt-3 text-sm font-bold text-slate-900">Brand Rule Studio & Sandbox</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Author custom rules on the fly across 8 categories. Test rules against sample sentences in real-time before pushing to live enforcement.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl">🔐</div>
              <h3 className="mt-3 text-sm font-bold text-slate-900">Multi-Tenant RBAC & Supabase Auth</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Isolated company workspaces with JWT authentication, role guards (Admin, Reviewer, Creator), and passwordless email OTP access.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl">📊</div>
              <h3 className="mt-3 text-sm font-bold text-slate-900">Live Compliance Analytics</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Track team compliance health scores, violation breakdowns by brand category, top infringed rules, and auto-fix adoption rates.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-2xl">🌐</div>
              <h3 className="mt-3 text-sm font-bold text-slate-900">Cryptographic Public Sharing</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Share audit results and verified findings with external stakeholders via unlisted, cryptographically tokenized public review links.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="px-6 py-20 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-4xl rounded-3xl border border-orange-200/80 bg-gradient-to-br from-orange-50 via-rose-50/40 to-white p-10 text-center shadow-xl shadow-orange-500/10">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Ready to automate your brand governance?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
            Set up your organization workspace, extract your style guidelines in seconds, and eliminate unapproved copy before publication.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="rounded-xl bg-[#FF5533] px-6 py-3 text-sm font-bold text-white shadow-xl shadow-orange-500/25 transition hover:bg-[#E64424]"
            >
              Create Company Account →
            </Link>
            <Link
              to="/login"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              Sign in to Existing Workspace
            </Link>
          </div>
        </div>
      </section>

      {/* Modern Clean Footer */}
      <footer className="border-t border-slate-100 bg-white px-6 py-10 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FF5533] text-white">
              <Icon name="shield" className="h-3.5 w-3.5" />
            </span>
            <span className="font-bold text-slate-900">CARAXES</span>
            <span>• Brand Governance OS</span>
          </div>
          <div className="flex gap-6">
            <Link to="/gallery" className="hover:text-[#FF5533]">Public Gallery</Link>
            <Link to="/login" className="hover:text-[#FF5533]">Company Login</Link>
            <Link to="/register" className="hover:text-[#FF5533]">Register Workspace</Link>
          </div>
          <div>
            © {new Date().getFullYear()} Caraxes • Autonomous Brand Governance. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
