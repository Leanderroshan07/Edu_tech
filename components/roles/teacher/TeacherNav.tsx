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
  { id: 'dashboard',   label: 'Dashboard',  icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'subjects',    label: 'My Subjects', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { id: 'departments', label: 'Departments', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' },
  { id: 'upload',      label: 'Upload',      icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
  { id: 'analytics',  label: 'Analytics',   icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
];

interface TeacherNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function TeacherNav({ activeTab, setActiveTab }: TeacherNavProps) {
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
