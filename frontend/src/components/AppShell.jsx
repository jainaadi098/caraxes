import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useApp } from "../context";
import { api, publicUrl } from "../lib/api";
import { Icon } from "../lib/ui";

const MAIN = [
  { to: "/", end: true, label: "Dashboard", icon: "dashboard" },
  { to: "/submit", label: "Submit & Check", icon: "plus" },
  { to: "/queue", label: "Review Queue", icon: "queue", badge: true },
  { to: "/submissions", label: "All Submissions", icon: "doc" },
];
const LOOP = [
  { to: "/knowledge", label: "Brand Knowledge", icon: "book" },
  { to: "/gallery", label: "Public Gallery", icon: "globe" },
];

const navClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:bg-white/5 hover:text-white"
  }`;

function titleFor(pathname) {
  if (pathname === "/") return "Governance Dashboard";
  if (pathname.startsWith("/submit")) return "Submit & Pre-Publication Check";
  if (pathname.startsWith("/queue")) return "Review Queue";
  if (pathname.startsWith("/submissions/")) return "Content Inspector";
  if (pathname.startsWith("/submissions")) return "All Submissions";
  if (pathname.startsWith("/knowledge")) return "Brand Knowledge";
  return "Caraxes";
}

export default function AppShell({ children }) {
  const { orgs, orgId, error, chooseOrg, createOrg, currentUser, logout } = useApp();
  const { pathname } = useLocation();
  const [stats, setStats] = useState(null);
  const [engine, setEngine] = useState("checking");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [orgError, setOrgError] = useState("");

  useEffect(() => {
    fetch(publicUrl("/health"))
      .then((r) => setEngine(r.ok ? "ready" : "offline"))
      .catch(() => setEngine("offline"));
  }, []);

  // Refresh the queue badge and workspace summary whenever the page changes
  useEffect(() => {
    if (!orgId) return;
    api("/dashboard/stats").then(setStats).catch(() => {});
  }, [orgId, pathname]);

  async function addOrg(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setOrgError("");
    try {
      await createOrg(newName.trim());
      setNewName("");
      setAdding(false);
    } catch (err) {
      setOrgError(err.message);
    }
  }

  const orgName = orgs.find((o) => o.id === orgId)?.name ?? "No workspace";
  const queueCount = stats?.submissions?.in_review ?? 0;
  const loop = LOOP;

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-slate-950 p-4 md:flex">
        <div className="flex items-center gap-3 px-1 py-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Icon name="shield" className="h-5 w-5" />
          </span>
          <div>
            <div className="text-sm font-bold tracking-wide text-white">CARAXES</div>
            <div className="text-[11px] text-slate-400">Brand Governance OS</div>
          </div>
        </div>

        <div className="mt-6 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Active workspace</div>
        <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="truncate">{orgName}</span>
            </span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
              {import.meta.env.PROD ? "PROD" : "DEV"}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">{stats?.knowledge?.approved ?? 0} approved knowledge items</div>
          <select
            value={orgId}
            onChange={(e) => chooseOrg(e.target.value)}
            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200"
          >
            <option value="">Select workspace…</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          {adding ? (
            <form onSubmit={addOrg} className="mt-2 flex gap-1">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Workspace name"
                className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-white"
              />
              <button className="rounded-md bg-blue-600 px-2 text-xs text-white">Add</button>
            </form>
          ) : (
            <button onClick={() => setAdding(true)} className="mt-2 text-[11px] text-blue-300 hover:underline">
              + New workspace
            </button>
          )}
        </div>

        <nav className="mt-6 space-y-1">
          {MAIN.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              <span className="flex-1">{item.label}</span>
              {item.badge && queueCount > 0 && (
                <span className="rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-slate-900">{queueCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Governance loop</div>
        <nav className="mt-2 space-y-1">
          {loop.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {currentUser && (
          <div className="mt-auto mb-2 rounded-lg border border-slate-800 bg-slate-900/90 p-3">
            <div className="flex items-center justify-between">
              <span className="truncate text-xs font-semibold text-white">
                {currentUser.full_name || currentUser.email}
              </span>
              <span className="rounded bg-blue-900/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-300">
                {currentUser.role || "admin"}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[11px] text-slate-400">
              {currentUser.email || "Active Member"}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-slate-800 p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
            Hybrid Engine
            <span className={engine === "ready" ? "text-emerald-400" : engine === "offline" ? "text-red-400" : "text-slate-400"}>
              ● {engine === "ready" ? "Ready" : engine === "offline" ? "Offline" : "Checking"}
            </span>
          </div>
          <div className="mt-1 text-[11px] leading-4 text-slate-500">
            Deterministic checks + Gemini RAG. Humans decide.
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-slate-900">{titleFor(pathname)}</h1>
              <span className="hidden rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 sm:inline">{pathname}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 xl:inline-flex">
                <Icon name="info" className="h-3.5 w-3.5" />
                AI-assisted governance • Citation-grounded • Human sign-off required
              </span>

              {/* User Profile & Sign Out Button */}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 shadow-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white uppercase shadow-sm">
                  {(currentUser?.full_name || currentUser?.email || "U")[0]}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {currentUser?.full_name || "Company User"}
                  </div>
                  <div className="text-[10px] text-slate-500 capitalize">
                    {currentUser?.role || "admin"}
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Sign out of workspace"
                  className="ml-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
            {[...MAIN, ...loop].map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                <span className="whitespace-nowrap">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          {(error || orgError) && <p className="mb-3 text-sm text-red-600">{error || orgError}</p>}
          {!orgId ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
              Select or create a workspace to begin.
            </div>
          ) : (
            children
          )}
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-6 py-3 text-[11px] text-slate-500">
          <span>Caraxes v1.0 • Workspace: <span className="font-semibold text-slate-700">{orgName}</span></span>
          <span>
            Disclosure: deterministic checks run in code; wording and visual findings use AI. Findings without a valid
            guideline reference are discarded, and every change needs human approval.
          </span>
        </footer>
      </div>
    </div>
  );
}