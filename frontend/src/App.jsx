import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import PublicLayout from "./components/PublicLayout";
import { useApp } from "./context";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import Gallery from "./pages/Gallery";
import Knowledge from "./pages/Knowledge";
import Login from "./pages/Login";
import PublicSession from "./pages/PublicSession";
import Register from "./pages/Register";
import SubmissionDetail from "./pages/SubmissionDetail";
import Submissions from "./pages/Submissions";
import Submit from "./pages/Submit";

function Workspace() {
  const { orgId, isAuthenticated, loadingAuth } = useApp();

  if (loadingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm font-medium">Loading workspace…</span>
        </div>
      </div>
    );
  }

  const hasToken = Boolean(
    localStorage.getItem("caraxes_auth_token") ||
    localStorage.getItem("caraxes_org_id") ||
    isAuthenticated
  );

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      {/* key={orgId}: switching workspace discards all on-screen state */}
      <div key={orgId}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/queue" element={<Submissions mode="queue" />} />
          <Route path="/submissions" element={<Submissions mode="all" />} />
          <Route path="/submissions/:id" element={<SubmissionDetail />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route element={<PublicLayout />}>
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/gallery/:id" element={<PublicSession />} />
        <Route path="/s/:token" element={<PublicSession />} />
      </Route>
      <Route path="/*" element={<Workspace />} />
    </Routes>
  );
}