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
  { id: 'overview',  label: 'Overview',  icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'subjects',  label: 'Subjects',  icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { id: 'faculty',   label: 'Faculty',   icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'approvals', label: 'Approvals', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'reports',   label: 'Reports',   icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
];
interface HodNavProps { activeTab: string; setActiveTab: (t: string) => void; pendingCount?: number; }
export function HodNav({ activeTab, setActiveTab, pendingCount = 0 }: HodNavProps) {
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
            {tab.id === 'approvals' && pendingCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
