import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { publicApi, publicUrl } from "../lib/api";
import { Badge, Icon, VisibilityBadge, fmtDate } from "../lib/ui";

export default function PublicSession() {
  const { id, token } = useParams();
  const base = token ? `/public/shared/${token}` : `/public/sessions/${id}`;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setData(null);
    setError("");
    publicApi(base).then(setData).catch((e) => setError(e.message));
  }, [base]);

  // Unlisted links must stay out of search engines and must not leak through the Referer header
  useEffect(() => {
    if (!token) return;
    const tags = [["robots", "noindex,nofollow"], ["referrer", "no-referrer"]].map(([name, content]) => {
      const m = document.createElement("meta");
      m.name = name;
      m.content = content;
      document.head.appendChild(m);
      return m;
    });
    return () => tags.forEach((m) => m.remove());
  }, [token]);

  useEffect(() => {
    document.title = data ? `${data.title} · Caraxes` : "Caraxes";
  }, [data]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">This session isn't available</h2>
        <p className="mt-2 text-sm text-gray-600">
          It may have been unpublished by its owner, or the link may be incorrect.
        </p>
        <Link to="/gallery" className="mt-5 inline-block rounded-lg bg-[#FF5533] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-orange-500/20 hover:bg-[#E64424]">
          Browse the public gallery
        </Link>
      </div>
    );
  }
  if (!data) return <div className="mx-auto h-64 max-w-3xl animate-pulse rounded-xl bg-white" />;

  const fileUrl = publicUrl(`${base}/file`);

  return (
    <article className="mx-auto max-w-3xl space-y-5">
      <Link to="/gallery" className="text-xs font-medium text-[#FF5533] hover:underline">← Public gallery</Link>

      {data.visibility === "unlisted" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          <Icon name="link" /> This session is unlisted. Only people with this link can view it.
        </div>
      )}

      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span className="font-medium text-gray-900">{data.org_name}</span>
          <span>·</span>
          <span>Published {fmtDate(data.published_at)}</span>
          <VisibilityBadge value={data.visibility} />
          <Badge className="inline-flex items-center gap-1 bg-green-100 text-green-800">
            <Icon name="check" className="h-3 w-3" /> Reviewed &amp; approved
            {data.approved_at && ` ${fmtDate(data.approved_at)}`}
          </Badge>
          <Badge className="bg-gray-100 text-gray-700">Read-only</Badge>
        </div>
      </header>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {data.content_type === "text" && (
          <p className="whitespace-pre-wrap text-base leading-8 text-gray-900">{data.text}</p>
        )}
        {data.content_type === "image" && (
          <img src={fileUrl} alt={data.title} className="mx-auto max-h-[75vh] max-w-full rounded-lg" />
        )}
        {data.content_type === "pdf" && (
          <>
            <iframe src={fileUrl} title={data.title} className="h-[75vh] w-full rounded-lg border border-gray-200" />
            <a href={fileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-indigo-700 hover:underline">
              Open the PDF in a new tab
            </a>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
          <Icon name={copied ? "check" : "copy"} /> {copied ? "Link copied" : "Copy link"}
        </button>
      </div>
    </article>
  );
}