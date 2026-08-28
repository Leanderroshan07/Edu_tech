'use client';
import React from 'react';

/* ── Icon helper ─────────────────────────────────────────── */
function NavIcon({ d }: { d: string }) {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
  );
}

const D = {
  dashboard:   'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  subjects:    'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  assignments: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  progress:    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
};

const TABS = [
  { id: 'dashboard',   label: 'Dashboard',  icon: D.dashboard },
  { id: 'subjects',    label: 'My Subjects', icon: D.subjects },
  { id: 'assignments', label: 'Assignments', icon: D.assignments },
  { id: 'progress',   label: 'Progress',    icon: D.progress },
];

interface StudentNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function StudentNav({ activeTab, setActiveTab }: StudentNavProps) {
  return (
    <nav className="flex items-center gap-0 mb-6 overflow-x-auto scrollbar-none relative">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--surface-muted)]" />
      {TABS.map((tab, i) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap z-10 animate-fade-slide',
              active
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]',
            ].join(' ')}
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            {active && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}
              />
            )}
            <span className={active ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)]'}>
              <NavIcon d={tab.icon} />
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function StudentMobileNav({ activeTab, setActiveTab }: StudentNavProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--surface-muted)] px-2 py-2 flex justify-around items-center">
      {TABS.map(tab => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)]'}`}
          >
            <NavIcon d={tab.icon} />
            <span className="text-[9px] font-semibold capitalize">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
