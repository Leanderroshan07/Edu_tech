'use client';
import React from 'react';

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
  );
}
const TABS = [
  { id: 'command',     label: 'Overview',    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'users',       label: 'Users',       icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { id: 'departments', label: 'Departments', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'audit',       label: 'Audit Log',   icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
];
interface AdminNavProps { activeTab: string; setActiveTab: (t: string) => void; }
export function AdminNav({ activeTab, setActiveTab }: AdminNavProps) {
  return (
    <nav className="flex items-center gap-0 mb-6 overflow-x-auto scrollbar-none relative">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--surface-muted)]" />
      {TABS.map((tab, i) => {
        const active = activeTab === tab.id;
        return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={['relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap z-10 animate-fade-slide', active ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'].join(' ')}
            style={{ animationDelay: `${i * 0.04}s` }}>
            {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} />}
            <span className={active ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)]'}><NavIcon d={tab.icon} /></span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
