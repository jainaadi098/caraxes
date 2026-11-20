import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { SAMPLES } from "../lib/sample";
import { Icon } from "../lib/ui";

const MODES = [
  ["text", "Text"],
  ["image", "Image"],
  ["pdf", "PDF"],
];
const MAX_CHARS = 2500;

export default function Submit() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      let created;
      if (mode === "text") {
        created = await api("/submissions", {
          method: "POST",
          body: JSON.stringify({ title: title.trim() || null, text_content: text }),
        });
      } else {
        if (!file) throw new Error("Choose a file first.");
        const form = new FormData();
        form.append("file", file);
        if (title.trim()) form.append("title", title.trim());
        created = await api(mode === "image" ? "/submissions/image" : "/submissions/pdf", {
          method: "POST",
          body: form,
        });
      }
      navigate(`/submissions/${created.id}?auto=1`); // the inspector starts the analysis
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      {mode === "text" && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Load test scenarios</h3>
            <p className="text-xs text-slate-500">One-click sample inputs. The checks that run on them are real.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SAMPLES.map((s) => (
              <button
                type="button"
                key={s.tag}
                onClick={() => { setTitle(s.title); setText(s.text); setError(""); }}
                className="rounded-lg border border-slate-200 p-3 text-left transition hover:border-[#FF5533]/40 hover:bg-orange-50/40"
              >
                <div className={`text-[10px] font-bold tracking-wider ${s.tagClass}`}>{s.tag}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{s.title}</div>
                <div className="mt-0.5 text-xs text-slate-500">{s.blurb}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex gap-2">
          {MODES.map(([key, name]) => (
            <button
              type="button"
              key={key}
              onClick={() => { setMode(key); setFile(null); setError(""); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${mode === key ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {name}
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Content title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Q4 Product Launch Newsletter"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#FF5533] focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {mode === "text" ? (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Draft body</label>
              <span className="text-xs text-slate-400">{text.length} / {MAX_CHARS}</span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              rows={10}
              placeholder="Paste your marketing copy, press release or AI-generated draft here to check it against your brand guidelines…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#FF5533] focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </div>
        ) : (
          <label className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 px-4 py-12 text-center text-sm text-slate-600 hover:border-[#FF5533]">
            {file ? file.name : mode === "image" ? "Click to choose a PNG, JPG or WebP image" : "Click to choose a PDF (up to 10 pages)"}
            <input
              type="file"
              accept={mode === "image" ? "image/png,image/jpeg,image/webp" : "application/pdf"}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name="lock" className="h-3.5 w-3.5" /> Content is never silently overwritten. Every suggestion requires human approval.
          </p>
          <button
            disabled={busy || (mode === "text" ? !text.trim() : !file)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5533] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-[#E64424] disabled:opacity-50"
          >
            <Icon name="shield" /> {busy ? "Submitting…" : "Run Pre-Publication Check"}
          </button>
        </div>
      </section>
    </form>
  );
}