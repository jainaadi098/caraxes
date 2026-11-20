import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, getOrgId, getRole, setOrgId, setRole } from "./lib/api";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isPublicRoute =
    pathname.startsWith("/gallery") ||
    pathname.startsWith("/s/") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("caraxes_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("caraxes_auth_token") || "");
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrg] = useState(getOrgId());
  const [role, setRoleState] = useState(getRole());
  const [error, setError] = useState("");

  const loadOrgs = useCallback(async () => {
    try {
      setOrgs(await api("/organisations"));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Validate session on boot if token exists
  useEffect(() => {
    async function checkAuth() {
      const savedToken = localStorage.getItem("caraxes_auth_token");
      if (savedToken) {
        try {
          const userProfile = await api("/auth/me");
          setCurrentUser(userProfile);
          localStorage.setItem("caraxes_user", JSON.stringify(userProfile));
          if (userProfile.org_id) {
            setOrgId(userProfile.org_id);
            setOrg(userProfile.org_id);
          }
          if (userProfile.role) {
            setRole(userProfile.role);
            setRoleState(userProfile.role);
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem("caraxes_auth_token");
          localStorage.removeItem("caraxes_user");
          setToken("");
          setCurrentUser(null);
        }
      }
      setLoadingAuth(false);
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isPublicRoute) loadOrgs();
  }, [isPublicRoute, loadOrgs]);

  const chooseOrg = (id) => {
    setOrgId(id);
    setOrg(id);
  };

  const chooseRole = (r) => {
    setRole(r);
    setRoleState(r);
  };

  const createOrg = async (name) => {
    const org = await api("/organisations", { method: "POST", body: JSON.stringify({ name }) });
    await loadOrgs();
    chooseOrg(org.id);
  };

  const login = async (email, password) => {
    setError("");
    const res = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("caraxes_auth_token", res.access_token);
    localStorage.setItem("caraxes_user", JSON.stringify(res.user));
    setToken(res.access_token);
    setCurrentUser(res.user);
    if (res.user.org_id) {
      setOrgId(res.user.org_id);
      setOrg(res.user.org_id);
    }
    if (res.user.role) {
      setRole(res.user.role);
      setRoleState(res.user.role);
    }
    await loadOrgs();
    return res.user;
  };

  const register = async (formData) => {
    setError("");
    const res = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify(formData),
    });
    localStorage.setItem("caraxes_auth_token", res.access_token);
    localStorage.setItem("caraxes_user", JSON.stringify(res.user));
    setToken(res.access_token);
    setCurrentUser(res.user);
    if (res.user.org_id) {
      setOrgId(res.user.org_id);
      setOrg(res.user.org_id);
    }
    if (res.user.role) {
      setRole(res.user.role);
      setRoleState(res.user.role);
    }
    await loadOrgs();
    return res.user;
  };

  const sendOtp = async (email) => {
    setError("");
    return await api("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  };

  const verifyOtp = async (email, otpToken) => {
    setError("");
    const res = await api("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, token: otpToken }),
    });
    localStorage.setItem("caraxes_auth_token", res.access_token);
    localStorage.setItem("caraxes_user", JSON.stringify(res.user));
    setToken(res.access_token);
    setCurrentUser(res.user);
    if (res.user.org_id) {
      setOrgId(res.user.org_id);
      setOrg(res.user.org_id);
    }
    if (res.user.role) {
      setRole(res.user.role);
      setRoleState(res.user.role);
    }
    await loadOrgs();
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem("caraxes_auth_token");
    localStorage.removeItem("caraxes_user");
    setToken("");
    setCurrentUser(null);
    navigate("/login");
  };

  return (
    <Ctx.Provider
      value={{
        currentUser,
        token,
        isAuthenticated: Boolean(token && currentUser),
        loadingAuth,
        orgs,
        orgId,
        role,
        error,
        chooseOrg,
        chooseRole,
        createOrg,
        login,
        register,
        sendOtp,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}