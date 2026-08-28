"use client";

import React, { useState, useRef, useEffect } from "react";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "STUDENT" | "TEACHER" | "HOD" | "ADMIN";
  department?: { name: string; code: string } | null;
  profileImageUrl?: string | null;
  profile?: any;
}

type HeaderProps = {
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenLogin: () => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  notificationsCount?: number;
};

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Student",
  TEACHER: "Faculty",
  HOD: "Head of Dept",
  ADMIN: "Administrator",
};

const ROLE_BADGE_CLS: Record<string, string> = {
  STUDENT: "badge badge-student",
  TEACHER: "badge badge-teacher",
  HOD: "badge badge-hod",
  ADMIN: "badge badge-admin",
};

const AVATAR_COLORS: Record<string, string> = {
  STUDENT: "linear-gradient(135deg,#6366f1,#8b5cf6)",
  TEACHER: "linear-gradient(135deg,#059669,#10b981)",
  HOD:     "linear-gradient(135deg,#7c3aed,#a855f7)",
  ADMIN:   "linear-gradient(135deg,#ea580c,#f97316)",
};

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onOpenLogin,
  searchQuery = "",
  setSearchQuery,
  darkMode = false,
  onToggleDarkMode,
  notificationsCount = 0,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dept = currentUser?.profile?.department || currentUser?.department;
  const initials = currentUser ? (currentUser.firstName?.[0] ?? "") + (currentUser.lastName?.[0] ?? "") : "?";

  return (
    <header className="sticky top-0 z-40 glass border-b border-[var(--surface-muted)]" style={{ borderColor: "rgba(0,0,0,.08)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">

        {/* ── Brand ── */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-[0_2px_8px_rgba(99,102,241,.4)]">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <span className="font-bold text-[var(--text-primary)] text-base tracking-tight">
            Learn<span className="gradient-brand-text">Track</span>
          </span>
        </div>

        {/* ── Search ── */}
        {currentUser && (
          <div className="flex-1 max-w-xs hidden md:block">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery?.(e.target.value)}
                placeholder="Search..."
                className="field w-full pl-9 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* ── Right side ── */}
        {currentUser ? (
          <div className="flex items-center gap-1">

            {/* Dept chip */}
            {dept && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] text-[11px] font-semibold text-[var(--text-secondary)] mr-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                {dept.code || dept.name}
              </span>
            )}

            {/* Dark mode */}
            <button
              onClick={onToggleDarkMode}
              className="btn btn-ghost btn-icon focus-ring"
              title={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? (
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn btn-ghost btn-icon relative focus-ring"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 card animate-scale-in z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--surface-muted)] flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">Notifications</h3>
                    {notificationsCount > 0 && (
                      <span className="badge badge-pending">{notificationsCount} pending</span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[var(--surface-subtle)]">
                    {notificationsCount === 0 ? (
                      <div className="empty-state py-8">
                        <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
                        </svg>
                        <p className="text-xs text-[var(--text-muted)]">No notifications</p>
                      </div>
                    ) : (
                      <div className="px-4 py-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{notificationsCount} approval request{notificationsCount !== 1 ? "s" : ""} waiting</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Go to the Approvals tab to review them.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile menu */}
            <div className="relative ml-1" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl hover:bg-[var(--surface-subtle)] transition-colors focus-ring"
              >
                <div
                  className="avatar avatar-sm"
                  style={{ background: AVATAR_COLORS[currentUser.role] ?? "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                >
                  {initials.toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
                    {currentUser.firstName} {currentUser.lastName}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">
                    {ROLE_LABELS[currentUser.role]}
                  </div>
                </div>
                <svg className="w-3 h-3 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 card animate-scale-in z-50 overflow-hidden">
                  <div className="p-3 border-b border-[var(--surface-subtle)]">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="avatar avatar-md"
                        style={{ background: AVATAR_COLORS[currentUser.role] ?? "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                      >
                        {initials.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {currentUser.firstName} {currentUser.lastName}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">{currentUser.email}</p>
                        <span className={`mt-1 ${ROLE_BADGE_CLS[currentUser.role] ?? "badge"}`}>
                          {ROLE_LABELS[currentUser.role]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => { setShowProfileMenu(false); onLogout(); }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button onClick={onOpenLogin} className="btn btn-primary">
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
