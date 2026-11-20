import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { publicApi, publicUrl } from "../lib/api";
import { Badge, Icon, fmtDate } from "../lib/ui";

const TYPES = [["", "All"], ["text", "Text"], ["image", "Images"], ["pdf", "PDFs"]];
const TYPE_LABEL = { text: "Text", image: "Image", pdf: "PDF" };
const PAGE_SIZE = 12;

function Thumb({ s }) {
  if (s.content_type === "image") {
    return (
      <img
        src={publicUrl(`/public/sessions/${s.id}/file?thumb=1`)}
        alt=""
        loading="lazy"
        className="h-44 w-full bg-gray-100 object-cover"
      />
    );
  }
  if (s.content_type === "pdf") {
    return (
      <div className="flex h-44 items-center justify-center bg-gray-100 text-gray-400">
        <Icon name="doc" className="h-10 w-10" />
      </div>
    );
  }
  return (
    <div className="h-44 overflow-hidden bg-gradient-to-br from-indigo-50 to-white p-4 text-sm leading-6 text-gray-600">
      {s.excerpt}
    </div>
  );
}

function Card({ s }) {
  return (
    <Link
      to={`/gallery/${s.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <Thumb s={s} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-indigo-700">{s.org_name}</span>
          <Badge className="bg-gray-100 text-gray-700">{TYPE_LABEL[s.content_type]}</Badge>
        </div>
        <h3 className="line-clamp-2 font-semibold text-gray-900 group-hover:text-indigo-700">{s.title}</h3>
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-gray-500">
          <span>{fmtDate(s.published_at)}</span>
          <span className="inline-flex items-center gap-1 text-green-700">
            <Icon name="check" className="h-3.5 w-3.5" /> Reviewed &amp; approved
          </span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="h-44 bg-gray-100" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 rounded bg-gray-100" />
        <div className="h-4 w-4/5 rounded bg-gray-100" />
        <div className="h-3 w-1/2 rounded bg-gray-100" />
      </div>
    </div>
  );
}

export default function Gallery() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);

  // Wait until the visitor stops typing before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(input.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const ticket = ++latest.current; // ignore answers to outdated requests
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
    if (q) params.set("q", q);
    if (type) params.set("content_type", type);
    publicApi(`/public/sessions?${params}`)
      .then((d) => ticket === latest.current && setData(d))
      .catch((e) => ticket === latest.current && setError(e.message))
      .finally(() => ticket === latest.current && setLoading(false));
  }, [q, type, page, attempt]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900">Public gallery</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-600">
          Brand-reviewed content that companies have chosen to publish. Every session here was checked
          against its company's brand guidelines and approved by a reviewer.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Icon name="search" />
            </span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search titles and text…"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5">
            {TYPES.map(([value, name]) => (
              <button
                key={value}
                onClick={() => { setType(value); setPage(1); }}
                className={`rounded-full px-3 py-1.5 text-sm ${type === value ? "bg-[#FF5533] text-white shadow-sm shadow-orange-500/20" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setAttempt((n) => n + 1)} className="rounded border border-red-300 px-3 py-1 hover:bg-red-100">Retry</button>
        </div>
      )}

      {loading && !data ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {!error && (
            <p className="text-sm text-gray-500">
              {data?.total ?? 0} session{data?.total === 1 ? "" : "s"}{q && ` matching “${q}”`}
            </p>
          )}
          {items.length === 0 && !loading && !error ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
              {q || type ? "No published sessions match your search." : "Nothing has been published yet."}
            </div>
          ) : (
            <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
              {items.map((s) => <Card key={s.id} s={s} />)}
            </div>
          )}

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4 text-sm">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 disabled:opacity-40"
              >
                ← Previous
              </button>
              <span className="text-gray-600">Page {data.page} of {data.pages}</span>
              <button
                disabled={page >= data.pages || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}