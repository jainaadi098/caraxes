import { useState } from "react";
import { api } from "../lib/api";

const CATEGORIES = [
  "terminology", "tone", "messaging", "promotional_claims",
  "visual_consistency", "accessibility", "fact", "tagline",
];

const label = (c) => c.replace(/_/g, " ");

export default function RuleStudio({ onRuleCreated }) {
  // Sandbox State
  const [testContent, setTestContent] = useState("Use 'sign in' instead of 'login'");
  const [testCategory, setTestCategory] = useState("terminology");
  const [testSample, setTestSample] = useState("Please login to your account to continue.");
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState("");

  // Create Rule State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("terminology");
  const [itemType, setItemType] = useState("rule");
  const [isGlobal, setIsGlobal] = useState(false);
  const [autoApprove, setAutoApprove] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createError, setCreateError] = useState("");

  async function handleTest(e) {
    e?.preventDefault();
    if (!testContent.trim() || !testSample.trim()) return;
    setTesting(true);
    setTestError("");
    setTestResult(null);

    try {
      const res = await api("/knowledge-items/test", {
        method: "POST",
        body: JSON.stringify({
          rule_content: testContent.trim(),
          rule_category: testCategory,
          sample_text: testSample.trim(),
        }),
      });
      setTestResult(res);
    } catch (err) {
      setTestError(err.message || "Failed to test rule.");
    } finally {
      setTesting(false);
    }
  }

  async function handleCreate(e) {
    e?.preventDefault();
    if (!content.trim()) return;
    setCreating(true);
    setCreateMsg("");
    setCreateError("");

    try {
      const created = await api("/knowledge-items", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || undefined,
          content: content.trim(),
          category,
          item_type: itemType,
          is_global: isGlobal,
          auto_approve: autoApprove,
        }),
      });
      setCreateMsg(`Rule successfully created${autoApprove ? " and embedded for active governance" : ""}!`);
      setTitle("");
      setContent("");
      if (onRuleCreated) onRuleCreated(created);
    } catch (err) {
      setCreateError(err.message || "Failed to create rule.");
    } finally {
      setCreating(false);
    }
  }

  function adoptSandboxRule() {
    setContent(testContent);
    setCategory(testCategory);
    setTitle(testContent.slice(0, 36));
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  return (
    <div className="space-y-8">
      {/* Sandbox Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              🧪
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Live Rule Sandbox</h3>
              <p className="text-xs text-slate-500">
                Draft brand rules and test them against sample copy in real-time before publishing.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
            Deterministic Engine
          </span>
        </div>

        <form onSubmit={handleTest} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">Draft Brand Rule</label>
              <input
                type="text"
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                placeholder="e.g. Use 'sign in' instead of 'login' or Never use 'unbeatable'"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Category</label>
              <select
                value={testCategory}
                onChange={(e) => setTestCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm capitalize focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {label(c)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Test Copy / Sample Text</label>
            <textarea
              rows={2}
              value={testSample}
              onChange={(e) => setTestSample(e.target.value)}
              placeholder="Enter sentence to test..."
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600"
            />
          </div>

          {testError && <p className="text-xs text-red-600">{testError}</p>}

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={testing || !testContent.trim() || !testSample.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
            >
              {testing ? "Testing Rule..." : "▶ Run Sandbox Test"}
            </button>
            <span className="text-[11px] text-slate-400">0ms offline test execution</span>
          </div>
        </form>

        {/* Sandbox Results */}
        {testResult && (
          <div
            className={`mt-5 rounded-xl border p-4 ${
              testResult.matches
                ? "border-amber-200 bg-amber-50/70"
                : "border-emerald-200 bg-emerald-50/70"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{testResult.matches ? "⚠️" : "✅"}</span>
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    testResult.matches ? "text-amber-800" : "text-emerald-800"
                  }`}
                >
                  {testResult.matches ? "Violation Detected" : "Rule Compliant"}
                </span>
              </div>
              {testResult.matches && (
                <button
                  type="button"
                  onClick={adoptSandboxRule}
                  className="rounded-lg bg-amber-200/80 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-300"
                >
                  Load into Rule Creator ↓
                </button>
              )}
            </div>

            <p className="mt-2 text-xs text-slate-700">{testResult.explanation}</p>

            {testResult.detected_segment && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded bg-red-100 px-2 py-0.5 font-mono text-red-700">
                  Flagged: "{testResult.detected_segment}"
                </span>
                {testResult.suggested_correction && (
                  <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-emerald-800">
                    Suggestion: "{testResult.suggested_correction}"
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Direct Rule Builder Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            ✍️
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">Custom Brand Rule Creator</h3>
            <p className="text-xs text-slate-500">
              Directly author custom rules, prohibited vocabulary, or brand taglines into your vector database.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Rule Type</label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                <option value="rule">Rule (Enforceable)</option>
                <option value="fact">Fact (Knowledge)</option>
                <option value="tagline">Tagline (Messaging)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm capitalize focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {label(c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Title (Optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Official Terminology"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Rule Instruction / Content *</label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Define guideline: e.g. 'Use sign in instead of login across all user-facing copy and documentation.'"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold">Auto-Approve & Vectorize</span>
              <span className="text-slate-400">(Immediately active in checks)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isGlobal}
                onChange={(e) => setIsGlobal(e.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold">Global Rule</span>
              <span className="text-slate-400">(Applies across all org projects)</span>
            </label>
          </div>

          {createError && <p className="text-xs text-red-600">{createError}</p>}
          {createMsg && <p className="text-xs font-medium text-emerald-700">{createMsg}</p>}

          <div className="pt-2">
            <button
              type="submit"
              disabled={creating || !content.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? "Deploying Rule..." : "➕ Create & Deploy Brand Rule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
