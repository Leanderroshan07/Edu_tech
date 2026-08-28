"use client";

import React, { useState, useEffect } from "react";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, pass: string) => Promise<void>;
};

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError("Please fill in both fields."); return; }
    setError("");
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
      onClose();
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="w-full max-w-[820px] card overflow-hidden flex"
        style={{ minHeight: 480, maxHeight: "90vh", animation: "scaleIn .3s cubic-bezier(.16,1,.3,1)" }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Left hero panel ── */}
        <div
          className="hidden md:flex flex-col justify-between p-10 w-[44%] shrink-0"
          style={{ background: "linear-gradient(160deg,#312e81 0%,#4f46e5 50%,#7c3aed 100%)" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <span className="font-bold text-white text-base tracking-tight">LearnTrack</span>
          </div>

          {/* Copy */}
          <div className="text-white">
            <h2 className="text-3xl font-bold leading-tight mb-3">
              Your academic journey, <em className="not-italic" style={{ color: "#a5b4fc" }}>elevated.</em>
            </h2>
            <p className="text-indigo-200 text-sm leading-relaxed">
              Access your personalized dashboard for courses, analytics, faculty tools, and institutional management.
            </p>

            {/* Feature bullets */}
            <div className="mt-6 space-y-2.5">
              {[
                { icon: "🎓", text: "Students track progress and access materials" },
                { icon: "👩‍🏫", text: "Faculty upload content and view analytics" },
                { icon: "🏛️", text: "HODs manage subjects and approve requests" },
                { icon: "⚙️", text: "Admins oversee the entire institution" },
              ].map(f => (
                <div key={f.icon} className="flex items-center gap-2.5 text-sm text-indigo-100">
                  <span className="text-base">{f.icon}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="text-indigo-300 text-[11px]">
            © {new Date().getFullYear()} LearnTrack · Academic LMS
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex-1 flex flex-col justify-center p-8 overflow-y-auto">

          {/* Mobile brand */}
          <div className="flex md:hidden items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              </svg>
            </div>
            <span className="font-bold text-[var(--text-primary)]">LearnTrack</span>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 btn btn-ghost btn-icon text-[var(--text-muted)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="max-w-xs mx-auto w-full">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">Sign in</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6">Enter your institution credentials below.</p>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="field-label">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  className="field"
                  placeholder="you@institution.edu"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="field-label">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPw ? "text" : "password"}
                    className="field pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {showPw ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="login-submit"
                disabled={loading}
                className="btn btn-primary w-full justify-center mt-2"
                style={{ padding: "12px 20px" }}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                    Sign In
                  </>
                )}
              </button>
            </form>

            <p className="mt-5 text-[11px] text-center text-[var(--text-muted)] leading-relaxed">
              Contact your institution administrator if you need access or have forgotten your credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
