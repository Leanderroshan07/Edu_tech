'use client';
import React from 'react';
import { StudentMaterialCard } from './StudentMaterialCard';

type User = {
  id: string; firstName: string; lastName: string;
  profile?: { registerNumber?: string; semester?: number; department?: { name: string } } | null;
};

interface Props {
  me: User;
  subjects: any[];
  materials: any[];
  completedCount: number;
  token: string;
  onMaterialsRefresh: () => void;
  loadingMaterials: boolean;
}

export function StudentDashboard({ me, subjects, materials, completedCount, token, onMaterialsRefresh, loadingMaterials }: Props) {
  const videoMaterials = materials.filter(m => m.type === 'VIDEO');
  const profile = me.profile;

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Welcome header */}
      <div className="flex items-start gap-4">
        <div
          className="avatar avatar-lg"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
        >
          {me.firstName?.[0]}{me.lastName?.[0]}
        </div>
        <div>
          <h1 className="section-title">Welcome, {me.firstName} {me.lastName}</h1>
          <p className="section-subtitle">
            {profile?.department?.name || '—'} · Semester {profile?.semester || '—'} · {profile?.registerNumber || '—'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Enrolled Subjects', value: subjects.length,      accent: 'accent-indigo',  icon: '📚' },
          { label: 'Videos Completed',  value: completedCount,       accent: 'accent-emerald', icon: '✅' },
          { label: 'Total Videos',      value: videoMaterials.length, accent: 'accent-sky',    icon: '🎬' },
          { label: 'Status',            value: 'Active',             accent: 'accent-amber',   icon: '⭐' },
        ].map((s, i) => (
          <div key={s.label} className={`stat-card ${s.accent} animate-fade-slide stagger-${i + 1}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-number text-2xl">{s.value}</div>
            <div className="text-2xl mt-2 opacity-70">{s.icon}</div>
          </div>
        ))}
      </div>

      {/* All materials grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">All Learning Materials</h2>
          {!loadingMaterials && <span className="text-xs text-[var(--text-muted)]">{materials.length} items</span>}
        </div>

        {loadingMaterials ? (
          <div className="flex items-center justify-center py-14">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : materials.length === 0 ? (
          <div className="card p-12 text-center text-[var(--text-muted)] text-sm">
            No materials uploaded yet. Your teachers will add resources here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map(m => (
              <StudentMaterialCard
                key={m.id}
                material={m}
                token={token}
                onProgressUpdate={onMaterialsRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
