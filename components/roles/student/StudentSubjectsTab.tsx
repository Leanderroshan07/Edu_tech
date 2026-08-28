'use client';
import React, { useState } from 'react';
import { StudentMaterialCard } from './StudentMaterialCard';

interface Props {
  me: any;
  subjects: any[];
  materials: any[];
  token: string;
  onMaterialsRefresh: () => void;
  loadingMaterials: boolean;
}

export function StudentSubjectsTab({ me, subjects, materials, token, onMaterialsRefresh, loadingMaterials }: Props) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  const profile = me.profile;

  const filtered = selectedSubjectId === 'ALL'
    ? materials
    : materials.filter(m => m.subjectId === selectedSubjectId);

  return (
    <div className="space-y-5 animate-fade-slide">
      <div>
        <h2 className="section-title">My Subjects & Learning Materials</h2>
        <p className="section-subtitle">
          {profile?.department?.name || '—'} · Semester {profile?.semester || '—'}
        </p>
      </div>

      {/* Subject pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedSubjectId('ALL')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            selectedSubjectId === 'ALL'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : 'text-[var(--text-muted)] border-[var(--surface-muted)] hover:border-indigo-400'
          }`}
        >
          All Materials ({materials.length})
        </button>
        {subjects.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSubjectId(s.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              selectedSubjectId === s.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'text-[var(--text-muted)] border-[var(--surface-muted)] hover:border-indigo-400'
            }`}
          >
            {s.code} — {s.name}
          </button>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="card p-5 flex items-center gap-3 text-sm text-[var(--text-muted)]">
          <span className="text-xl">📚</span>
          No subjects assigned yet. Your HOD will assign subjects to your department.
        </div>
      )}

      {loadingMaterials ? (
        <div className="flex items-center justify-center py-14">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-[var(--text-muted)] text-sm">
          No materials for this subject yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => (
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
  );
}
