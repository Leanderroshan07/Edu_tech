"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "../components/common/Header";
import { StudentApp } from "../components/roles/student/StudentApp";
import { TeacherApp } from "../components/roles/teacher/TeacherApp";
import { HodApp } from "../components/roles/hod/HodApp";
import { AdminApp } from "../components/roles/admin/AdminApp";
import { LoginModal } from "../components/auth/LoginModal";
import { apiCall } from "../components/common/api";

/* ─────────────────────────────────────────────────────────
   page.tsx — Thin auth shell
   Only responsibilities:
     1. Manage auth token (login / logout)
     2. Fetch the `me` user record
     3. Mount the correct role App
   All sub-tab routing and data fetching lives inside each role App.
───────────────────────────────────────────────────────── */

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

function Toast({
  msg, type, onDismiss,
}: { msg: string; type: "success" | "error" | "info"; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4500); return () => clearTimeout(t); }, [onDismiss]);
  const cls = { success: "toast toast-success", error: "toast toast-error", info: "toast toast-info" };
  const ico  = { success: "✓", error: "✕", info: "i" };
  return (
    <div className={cls[type]}>
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 bg-current/20">{ico[type]}</span>
      <span>{msg}</span>
      <button onClick={onDismiss} className="ml-auto opacity-60 hover:opacity-100 text-sm leading-none">✕</button>
    </div>
  );
}

export default function Home() {
  const [token,     setToken]     = useState<string | null>(null);
  const [me,        setMe]        = useState<any | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [darkMode,  setDarkMode]  = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [toasts,    setToasts]    = useState<Array<{ id: number; msg: string; type: "success" | "error" | "info" }>>([]);

  const notify = useCallback((msg: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
  }, []);
  const dismiss = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), []);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      document.documentElement.classList.toggle("dark", !prev);
      return !prev;
    });
  };

  /* ── Fetch `me` whenever token changes ── */
  useEffect(() => {
    if (!token) { setMe(null); return; }
    setLoading(true);
    apiCall("/auth/me", {}, token)
      .then(setMe)
      .catch(() => { setToken(null); setMe(null); notify("Session expired — please sign in again", "error"); })
      .finally(() => setLoading(false));
  }, [token, notify]);

  /* ── Login ── */
  const handleLogin = async (email: string, password: string) => {
    const data = await fetch("http://localhost:4000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json());
    const jwt = data.access_token ?? data.token ?? data.accessToken;
    if (!jwt) throw new Error("No token in response");
    setToken(jwt);
    notify("Signed in successfully", "success");
  };

  /* ── Logout ── */
  const handleLogout = () => {
    setToken(null);
    setMe(null);
    notify("Signed out", "info");
  };

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)] flex flex-col transition-colors duration-200">

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} msg={t.msg} type={t.type} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>

      <Header
        currentUser={me}
        onLogout={handleLogout}
        onOpenLogin={() => setLoginOpen(true)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        notificationsCount={0}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">

        {loading && <Spinner />}

        {/* Not signed in */}
        {!loading && !me && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-slide">
            <div className="w-20 h-20 rounded-2xl gradient-brand flex items-center justify-center mb-6 shadow-[var(--shadow-brand)]">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold gradient-brand-text">LearnTrack</h1>
            <p className="text-[var(--text-muted)] mt-3 max-w-sm text-sm leading-relaxed">
              Academic learning management platform. Sign in with your institution credentials.
            </p>
            <button onClick={() => setLoginOpen(true)} className="btn btn-primary btn-lg mt-8">
              Sign In
            </button>
          </div>
        )}

        {/* Role Apps — each handles its own routing and data fetching */}
        {!loading && me && (
          <>
            {me.role === "STUDENT" && <StudentApp me={me} token={token!} />}
            {me.role === "TEACHER" && <TeacherApp me={me} token={token!} />}
            {me.role === "HOD"     && <HodApp     me={me} token={token!} />}
            {me.role === "ADMIN"   && <AdminApp   me={me} token={token!} />}
          </>
        )}
      </main>

      {loginOpen && (
        <LoginModal
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
}
