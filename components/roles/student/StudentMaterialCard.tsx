'use client';
import React, { useState } from 'react';
import { StudentMaterialViewer } from './StudentMaterialViewer';

/* ── Type colour strips per material type ── */
const TYPE_STRIP: Record<string, string> = {
  VIDEO: 'bg-red-500', PDF: 'bg-blue-500', NOTES: 'bg-amber-500',
  IMAGE: 'bg-purple-500', AUDIO: 'bg-emerald-500',
};
const TYPE_BADGE: Record<string, string> = {
  VIDEO: 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25',
  PDF:   'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25',
  NOTES: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25',
  IMAGE: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25',
  AUDIO: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
};

interface Props {
  material: any;
  token: string;
  onProgressUpdate: () => void;
}

export function StudentMaterialCard({ material, token, onProgressUpdate }: Props) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const progress  = material.userProgress;
  const reached: number[] = progress?.metadata?.reachedCheckpoints ?? [];

  const handleClose = () => {
    setViewerOpen(false);
    onProgressUpdate(); // refresh parent list to pick up new checkpoint state
  };

  return (
    <>
      <div
        onClick={() => setViewerOpen(true)}
        className="card card-hover overflow-hidden cursor-pointer group"
      >
        {/* coloured type strip */}
        <div className={`h-1 ${TYPE_STRIP[material.type] ?? 'bg-gray-400'}`} />

        <div className="p-4 space-y-3">
          {/* badges row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${TYPE_BADGE[material.type] ?? 'bg-gray-100 text-gray-500'}`}>
              {material.type}
            </span>
            {progress?.isCompleted && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                ✓ Completed
              </span>
            )}
          </div>

          {/* title */}
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {material.title}
            </h3>
            {material.teacher && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {material.teacher.firstName} {material.teacher.lastName}
              </p>
            )}
            {material.subject && (
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5 font-medium">
                {material.subject.name}
              </p>
            )}
          </div>

          {/* ── 4-Checkpoint bar (VIDEO only) ─────────────────────── */}
          {material.type === 'VIDEO' && (
            <div className="space-y-1.5 pt-1">
              {/* bar segments */}
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(k => {
                  const hit = reached.includes(k);
                  return (
                    <div
                      key={k}
                      title={`${k * 25}% — ${hit ? '✓ reached' : 'not yet'}`}
                      className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                        hit
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/30'
                          : 'bg-[var(--surface-muted)]'
                      }`}
                    />
                  );
                })}
              </div>
              {/* labels */}
              <div className="flex justify-between px-0.5">
                {[25, 50, 75, 100].map(p => (
                  <span key={p} className={`text-[9px] font-mono font-semibold ${reached.includes(p / 25) ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`}>
                    {p}%
                  </span>
                ))}
              </div>
              {/* summary line */}
              {progress ? (
                <p className="text-[10px] text-[var(--text-muted)]">
                  {reached.length}/4 checkpoints · {progress.completionPercent ?? 0}% complete
                  {progress.totalWatchTimeSeconds > 0 && ` · ${Math.floor(progress.totalWatchTimeSeconds / 60)}m watched`}
                </p>
              ) : (
                <p className="text-[10px] text-[var(--text-muted)]">Not started</p>
              )}
            </div>
          )}
        </div>
      </div>

      {viewerOpen && (
        <StudentMaterialViewer material={material} token={token} onClose={handleClose} />
      )}
    </>
  );
}
