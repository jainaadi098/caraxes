import { useCallback, useState } from "react";
import AssetsPanel from "../components/AssetsPanel";
import DocumentsPanel from "../components/DocumentsPanel";
import KnowledgeReview from "../components/KnowledgeReview";

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
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const onProcessed = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
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
  );
}