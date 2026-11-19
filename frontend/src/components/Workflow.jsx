import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Badge, fmt, label } from "../lib/ui";

const DECISION = {
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  changes_requested: "bg-orange-100 text-orange-800",
};

export function CorrectionPanel({ summary, originalText, onApply, busy }) {
  const correction = summary.correction;
  const [text, setText] = useState(correction?.corrected_text ?? "");
  const [viewMode, setViewMode] = useState("side-by-side");

  useEffect(() => {
    setText(correction?.corrected_text ?? "");
  }, [correction]);

  if (summary.correction_error) {
    return <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">A corrected version could not be generated: {summary.correction_error}</p>;
  }
  if (!correction) return null;

  const v = correction.verification || { unresolved_segments: [], introduced_numbers: [], dropped_numbers: [], rule_rechecks_failed: [] };
  const placeholders = text.match(/\[[^\]]+\]/g) ?? [];
  const problems = [
    ...(v.unresolved_segments || []).map((s) => `Problem text may still be present: “${s}”`),
    ...(v.introduced_numbers || []).map((n) => `A number that was not in the original appears: ${n}`),
    ...(v.dropped_numbers || []).map((n) => `A number from the original is missing: ${n}`),
    ...(v.rule_rechecks_failed || []).map((r) => `A counting rule still fails: ${label(r)}`),
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900">Suggested corrected version</h3>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
            {correction.method === "deterministic_vale" ? "⚡ Vale Fast-Path (0ms)" : "✨ Hybrid Vale + Gemini Auto-Fix"}
          </span>
        </div>
        {correction.unified_diff && (
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("side-by-side")}
              className={`rounded px-2.5 py-1 ${viewMode === "side-by-side" ? "bg-white font-medium text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              Side-by-side
            </button>
            <button
              type="button"
              onClick={() => setViewMode("diff")}
              className={`rounded px-2.5 py-1 ${viewMode === "diff" ? "bg-white font-medium text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              Unified Diff
            </button>
          </div>
        )}
      </div>

      {viewMode === "diff" && correction.unified_diff ? (
        <div className="overflow-x-auto rounded border border-gray-200 bg-slate-900 p-3 font-mono text-xs text-slate-100">
          {correction.unified_diff.split("\n").map((line, idx) => {
            const isAdd = line.startsWith("+") && !line.startsWith("+++");
            const isDel = line.startsWith("-") && !line.startsWith("---");
            const isHunk = line.startsWith("@@");
            return (
              <div
                key={idx}
                className={
                  isAdd
                    ? "bg-emerald-950/60 text-emerald-300"
                    : isDel
                    ? "bg-rose-950/60 text-rose-300"
                    : isHunk
                    ? "text-sky-400"
                    : "text-slate-300"
                }
              >
                {line || " "}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">Original</div>
            <pre className="whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">{originalText}</pre>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-gray-500">Corrected (you can edit)</div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={Math.min(14, Math.max(6, Math.ceil(text.length / 60)))}
              className="w-full rounded border border-gray-300 p-3 text-sm"
            />
          </div>
        </div>
      )}

      {v.ok ? (
        <p className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">
          Automatic checks passed: problem wording removed, no invented numbers, counting rules satisfied.
        </p>
      ) : (
        <div className="mt-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p className="font-medium">Please review before using this version:</p>
          <ul className="list-disc pl-5">
            {problems.map((p) => <li key={p}>{p}</li>)}
            {problems.length === 0 && <li>The length differs a lot from the original ({v.length_ratio}×).</li>}
          </ul>
        </div>
      )}
      {placeholders.length > 0 && (
        <p className="mt-2 rounded bg-sky-50 px-3 py-2 text-sm text-sky-900">
          Fill in {[...new Set(placeholders)].join(", ")} before submitting. The system does not invent information it was not given.
        </p>
      )}

      {correction.changes?.length > 0 && (
        <details className="mt-3 text-sm text-gray-700">
          <summary className="cursor-pointer">What changed ({correction.changes.length})</summary>
          <ul className="mt-2 space-y-1">
            {correction.changes.map((c, i) => (
              <li key={i}>
                <span className="text-red-700 line-through">{c.original}</span> → <span className="text-green-800">{c.replacement}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <button
        onClick={() => onApply(text)}
        disabled={busy || !text.trim() || text.trim() === originalText.trim()}
        className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? "Re-checking…" : "Use this text as a new version and re-check"}
      </button>
    </div>
  );
}

export function ReviewPanel({ onReview, busy }) {
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");

  async function decide(decision) {
    if (decision !== "approved" && !comment.trim()) {
      setMessage("Add a comment explaining your decision.");
      return;
    }
    setMessage("");
    await onReview(decision, comment.trim());
    setComment("");
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
      <h3 className="mb-2 font-medium text-gray-900">Reviewer decision</h3>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Comment (required unless approving)"
        className="w-full rounded border border-gray-300 bg-white p-2 text-sm"
      />
      {message && <p className="mt-1 text-sm text-red-600">{message}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <button disabled={busy} onClick={() => decide("approved")} className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50">Approve</button>
        <button disabled={busy} onClick={() => decide("changes_requested")} className="rounded bg-orange-500 px-4 py-2 text-white disabled:opacity-50">Request changes</button>
        <button disabled={busy} onClick={() => decide("rejected")} className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50">Reject</button>
      </div>
    </div>
  );
}

export function HistoryPanel({ id, refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/submissions/${id}/history`).then(setData).catch((e) => setError(e.message));
  }, [id, refreshKey]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return null;
  const totalFor = (v) => data.analyses.find((a) => a.version_no === v && a.status === "completed")?.total;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 font-medium text-gray-900">Review and revision history</h3>

      <div className="mb-4">
        <div className="mb-1 text-xs font-medium uppercase text-gray-500">Decisions</div>
        <ul className="space-y-2">
          {data.reviews.map((r) => (
            <li key={r.id} className="text-sm">
              <Badge className={DECISION[r.decision]}>{label(r.decision)}</Badge>{" "}
              <span className="text-gray-600">{r.reviewer_name} · {fmt(r.created_at)}</span>
              {r.comment && <p className="mt-1 text-gray-800">{r.comment}</p>}
            </li>
          ))}
          {data.reviews.length === 0 && <li className="text-sm text-gray-500">No decisions yet.</li>}
        </ul>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium uppercase text-gray-500">Versions</div>
        <ul className="space-y-2">
          {data.versions.map((v) => (
            <li key={v.version_no} className="text-sm">
              <span className="font-medium text-gray-900">v{v.version_no}</span>{" "}
              <span className="text-gray-600">
                {v.author_name} · {fmt(v.created_at)}
                {totalFor(v.version_no) != null && ` · ${totalFor(v.version_no)} findings`}
              </span>
              {v.text_content && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-indigo-700">Show text</summary>
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-gray-50 p-2 text-xs text-gray-800">{v.text_content}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}