'use client';
import React, { useState } from 'react';
import { StudentMaterialCard } from './StudentMaterialCard';

interface Props {
  materials: any[];
  token: string;
  onMaterialsRefresh: () => void;
  loadingMaterials: boolean;
}

type Filter = 'ALL' | 'VIDEO' | 'COMPLETED' | 'IN_PROGRESS';

export function StudentProgressTab({ materials, token, onMaterialsRefresh, loadingMaterials }: Props) {
  const [filter, setFilter] = useState<Filter>('ALL');

  const completedCount   = materials.filter(m => m.userProgress?.isCompleted).length;
  const inProgressCount  = materials.filter(m => m.userProgress && !m.userProgress.isCompleted && m.userProgress.completionPercent > 0).length;
  const videoCount       = materials.filter(m => m.type === 'VIDEO').length;

  const filtered = materials.filter(m => {
    if (filter === 'VIDEO')       return m.type === 'VIDEO';
    if (filter === 'COMPLETED')   return m.userProgress?.isCompleted;
    if (filter === 'IN_PROGRESS') return m.userProgress && !m.userProgress.isCompleted && m.userProgress.completionPercent > 0;
    return true;
  });

  const pills: { k: Filter; l: string; n: number }[] = [
    { k: 'ALL',         l: 'All Materials', n: materials.length },
    { k: 'VIDEO',       l: 'Videos',        n: videoCount },
    { k: 'IN_PROGRESS', l: 'In Progress',   n: inProgressCount },
    { k: 'COMPLETED',   l: 'Completed',     n: completedCount },
  ];

  return (
    <div className="space-y-5 animate-fade-slide">
      <div>
        <h2 className="section-title">Progress & Learning Materials</h2>
        <p className="section-subtitle">Track your video watch progress with 4-point checkpoints</p>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {pills.map(({ k, l, n }) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              filter === k
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'text-[var(--text-muted)] border-[var(--surface-muted)] hover:border-indigo-400 hover:text-[var(--text-secondary)]'
            }`}
          >
            {l} <span className="opacity-70">({n})</span>
          </button>
        ))}
      </div>

      {loadingMaterials ? (
        <div className="flex items-center justify-center py-14">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-[var(--text-muted)] text-sm">
          No materials match this filter.
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
