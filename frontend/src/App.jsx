import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import PublicLayout from "./components/PublicLayout";
import { useApp } from "./context";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import Gallery from "./pages/Gallery";
import Knowledge from "./pages/Knowledge";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import PublicSession from "./pages/PublicSession";
import Register from "./pages/Register";
import SubmissionDetail from "./pages/SubmissionDetail";
import Submissions from "./pages/Submissions";
import Submit from "./pages/Submit";

function Workspace() {
  const { orgId, loadingAuth } = useApp();

  if (loadingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-slate-500">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#FF5533] border-t-transparent" />
          <span className="text-sm font-medium">Loading workspace…</span>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      {/* key={orgId}: switching workspace discards all on-screen state */}
      <div key={orgId}>
        <Routes>
          {/* Submission page is now right on the starting root route */}
          <Route path="/" element={<Submit />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/dashboard" element={<Dashboard />} />
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
      <Route path="/welcome" element={<Landing />} />
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