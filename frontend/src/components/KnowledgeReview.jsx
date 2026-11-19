import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

const CATEGORIES = [
  "tone", "terminology", "messaging", "visual_consistency",
  "accessibility", "promotional_claims", "fact", "tagline",
];
const label = (c) => c.replace(/_/g, " ");

export default function KnowledgeReview({ docId, refreshKey }) {
  const [status, setStatus] = useState("pending");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ status });
      if (category) params.set("category", category);
      if (docId) params.set("document_id", docId);
      setItems(await api(`/knowledge-items?${params}`));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [status, category, docId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function act(id, action) {
    setError("");
    try {
      await api(`/knowledge-items/${id}/${action}`, { method: "POST" });
      setItems((prev) => prev.filter((i) => i.id !== id)); // it moves to another tab
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this rule permanently?")) return;
    setError("");
    try {
      await api(`/knowledge-items/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function bulkApprove() {
    if (!items.length) return;
    if (!window.confirm(`Approve all ${items.length} items shown?`)) return;
    setError("");
    try {
      await api("/knowledge-items/bulk-review", {
        method: "POST",
        body: JSON.stringify({ ids: items.map((i) => i.id), action: "approve" }),
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setDraft({
      title: item.title ?? "",
      content: item.content,
      category: item.category,
      is_global: item.is_global,
    });
  }

  async function saveEdit(id) {
    setError("");
    try {
      const updated = await api(`/knowledge-items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      setEditingId(null);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-800">Review extracted knowledge</h2>
        {status === "pending" && items.length > 0 && (
          <button
            onClick={bulkApprove}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
          >
            Approve all shown ({items.length})
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-sm capitalize ${
              status === s ? "bg-indigo-600 text-white" : "bg-white text-gray-700 border border-gray-300"
            }`}
          >
            {s}
          </button>
        ))}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{label(c)}</option>
          ))}
        </select>
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-gray-500">
          No {status} items{docId ? " for this document" : ""}. Upload a PDF or change the filters.
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-800">{label(item.category)}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{item.item_type}</span>
              {item.is_global && (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-800">global rule</span>
              )}
              {item.source_page && <span className="text-gray-500">page {item.source_page}</span>}
            </div>

            {editingId === item.id ? (
              <div className="space-y-2">
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  placeholder="Title"
                />
                <textarea
                  value={draft.content}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  rows={3}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    className="rounded border border-gray-300 px-2 py-1"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{label(c)}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={draft.is_global}
                      onChange={(e) => setDraft({ ...draft, is_global: e.target.checked })}
                    />
                    Global rule
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(item.id)} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="rounded border border-gray-300 px-3 py-1 text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {item.title && <div className="font-medium text-gray-900">{item.title}</div>}
                <p className="mt-1 text-sm text-gray-800">{item.content}</p>
                {item.source_excerpt && (
                  <p className="mt-2 border-l-2 border-gray-300 pl-2 text-xs italic text-gray-500">
                    “{item.source_excerpt}”
                  </p>
                )}
                {item.metadata?.excerpt_verified === false && (
                  <p className="mt-1 text-xs text-amber-700">
                    Excerpt not found on the cited page. Check this item against the PDF.
                  </p>
                )}
                <div className="mt-3 flex gap-2 text-sm">
                  {status !== "approved" && (
                    <button onClick={() => act(item.id, "approve")} className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700">
                      Approve
                    </button>
                  )}
                  {status !== "rejected" && (
                    <button onClick={() => act(item.id, "reject")} className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700">
                      Reject
                    </button>
                  )}
                  <button onClick={() => startEdit(item)} className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50">
                    Edit
                  </button>
                  <button
                    onClick={() => remove(item.id)}
                    className="rounded border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}