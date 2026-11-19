import { useCallback, useState } from "react";
import AssetsPanel from "../components/AssetsPanel";
import DocumentsPanel from "../components/DocumentsPanel";
import KnowledgeReview from "../components/KnowledgeReview";
import RuleStudio from "../components/RuleStudio";

function ValeExportCard() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    setDownloading(true);
    setError("");
    try {
      const orgId = localStorage.getItem("caraxes_org_id") || "";
      const res = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}/vale/export`, {
        headers: { "X-Org-Id": orgId, "X-Role": "admin" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to download Vale pack");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "caraxes-vale-rules.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-indigo-600 p-1.5 text-white">⚙️</span>
        <h3 className="font-semibold text-slate-900">Developer CI & Vale Pack</h3>
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Export your approved brand rules as a portable Vale YAML style pack to lint copy locally in VS Code or GitHub Actions.
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {downloading ? "Generating Pack..." : "📦 Export Vale Style Pack (.zip)"}
      </button>
    </div>
  );
}

export default function Knowledge() {
  const [activeTab, setActiveTab] = useState("guidelines"); // "guidelines" | "studio"
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const onProcessed = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Brand Knowledge & Governance Studio</h2>
          <p className="text-xs text-slate-500">
            Upload guidelines documents, build custom rules, and test linting logic in real time.
          </p>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("guidelines")}
            className={`rounded-lg px-4 py-2 transition ${
              activeTab === "guidelines"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📚 Guidelines & Assets
          </button>
          <button
            onClick={() => setActiveTab("studio")}
            className={`rounded-lg px-4 py-2 transition ${
              activeTab === "studio"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🧪 Brand Rule Studio & Sandbox
          </button>
        </div>
      </div>

      {activeTab === "guidelines" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-1">
            <DocumentsPanel selectedId={selectedDoc} onSelect={setSelectedDoc} onProcessed={onProcessed} />
            <AssetsPanel />
            <ValeExportCard />
          </div>
          <div className="lg:col-span-2">
            <KnowledgeReview docId={selectedDoc} refreshKey={refreshKey} />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RuleStudio
              onRuleCreated={() => {
                setRefreshKey((k) => k + 1);
              }}
            />
          </div>
          <div className="space-y-6 lg:col-span-1">
            <ValeExportCard />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900">💡 Studio Authoring Tips</h4>
              <ul className="mt-3 space-y-2 text-xs text-slate-600">
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Use <strong>Terminology</strong> for word-level substitutions, e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Use 'sign in' instead of 'login'</code>.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Use <strong>Promotional Claims</strong> to prohibit unverified claims, e.g. <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">Never use 'unbeatable'</code>.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-600 font-bold">•</span>
                  <span>Rules with <strong>Auto-Approve</strong> are instantly embedded into vector search and enforced by the engine.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}