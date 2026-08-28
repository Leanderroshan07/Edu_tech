"use client";

import React from "react";

export type ActiveNavTab = string;

type TabItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
};

type NavigationProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: "ADMIN" | "HOD" | "TEACHER" | "STUDENT";
  pendingApprovalsCount?: number;
};

// ── Icon Components ────────────────────────────────────────
const Icon = ({ d, ...p }: { d: string } & React.SVGProps<SVGSVGElement>) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" {...p}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
  </svg>
);

const ICONS = {
  dashboard:   "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  subjects:    "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  assignments: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  progress:    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  upload:      "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  analytics:   "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  approvals:   "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  faculty:     "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  users:       "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  departments: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  audit:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  reports:     "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  departments2:"M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5",
};

function getTabsForRole(role: string, pendingCount: number): TabItem[] {
  switch (role) {
    case "STUDENT":
      return [
        { id: "dashboard",   label: "Dashboard",   icon: <Icon d={ICONS.dashboard} /> },
        { id: "subjects",    label: "My Subjects",  icon: <Icon d={ICONS.subjects} /> },
        { id: "assignments", label: "Assignments",  icon: <Icon d={ICONS.assignments} /> },
        { id: "progress",    label: "Progress",     icon: <Icon d={ICONS.progress} /> },
      ];
    case "TEACHER":
      return [
        { id: "dashboard",   label: "Dashboard",   icon: <Icon d={ICONS.dashboard} /> },
        { id: "subjects",    label: "My Subjects",  icon: <Icon d={ICONS.subjects} /> },
        { id: "departments", label: "Departments",  icon: <Icon d={ICONS.departments2} /> },
        { id: "upload",      label: "Upload",       icon: <Icon d={ICONS.upload} /> },
        { id: "analytics",   label: "Analytics",    icon: <Icon d={ICONS.analytics} /> },
      ];
    case "HOD":
      return [
        { id: "overview",    label: "Overview",     icon: <Icon d={ICONS.dashboard} /> },
        { id: "subjects",    label: "Subjects",     icon: <Icon d={ICONS.subjects} /> },
        { id: "faculty",     label: "Faculty",      icon: <Icon d={ICONS.faculty} /> },
        { id: "approvals",   label: "Approvals",    icon: <Icon d={ICONS.approvals} />, badge: pendingCount > 0 ? pendingCount : undefined },
        { id: "reports",     label: "Reports",      icon: <Icon d={ICONS.reports} /> },
      ];
    case "ADMIN":
      return [
        { id: "command",     label: "Overview",     icon: <Icon d={ICONS.dashboard} /> },
        { id: "users",       label: "Users",        icon: <Icon d={ICONS.users} /> },
        { id: "departments", label: "Departments",  icon: <Icon d={ICONS.departments} /> },
        { id: "audit",       label: "Audit Log",    icon: <Icon d={ICONS.audit} /> },
      ];
    default:
      return [{ id: "dashboard", label: "Dashboard", icon: <Icon d={ICONS.dashboard} /> }];
  }
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  userRole = "STUDENT",
  pendingApprovalsCount = 0,
}) => {
  const tabs = getTabsForRole(userRole, pendingApprovalsCount);

  return (
    <nav className="flex items-center gap-0 mb-6 overflow-x-auto scrollbar-none relative">
      {/* subtle bottom border behind tabs */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--surface-muted)]" />

      {tabs.map((tab, i) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap z-10",
              "animate-fade-slide",
              isActive
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
            ].join(" ")}
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            {/* Active indicator bar */}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full gradient-brand-text"
                    style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }} />
            )}

            <span className={isActive ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--text-muted)]"}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>

            {tab.badge != null && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

/* ── Mobile Bottom Nav for Students ── */
export const StudentMobileBottomNav: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
}> = ({ activeTab, setActiveTab }) => {
  const items = [
    { id: "dashboard",   label: "Home",     icon: ICONS.dashboard },
    { id: "subjects",    label: "Subjects", icon: ICONS.subjects },
    { id: "assignments", label: "Tasks",    icon: ICONS.assignments },
    { id: "progress",    label: "Progress", icon: ICONS.progress },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--surface-muted)] px-2 py-2 flex justify-around items-center">
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${
              isActive ? "text-indigo-600 dark:text-indigo-400" : "text-[var(--text-muted)]"
            }`}
          >
            <Icon d={item.icon} />
            <span className="text-[9px] font-semibold">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
