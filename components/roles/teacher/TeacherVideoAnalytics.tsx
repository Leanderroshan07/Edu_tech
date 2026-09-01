'use client';
/**
 * TeacherVideoAnalytics
 * Moved from components/materials/VideoAnalyticsModal.tsx — teacher-owned.
 * Key fixes:
 *  - Event log now always visible when events exist (no hidden overflow)
 *  - CHECKPOINT events get a distinct green "CHECKPOINT" badge (not "HEARTBEAT")
 *  - Pause-skip events show an amber "⚠ SKIP" warning badge in the log
 *  - Regular heartbeats filtered out of teacher log (too noisy)
 *  - Empty state clearly shown when no events logged yet
 */

import React, { useEffect, useState } from 'react';
import { API_BASE } from '../../common/api';

interface TimelineEvent {
  eventType: string;
  positionSeconds: number;
  positionFormatted: string;
  timestamp: string;
  timeFormatted: string;
  description: string;
  metadata?: any;
}

interface AnalyticsData {
  material: {
    id: string; title: string; type: string;
    durationSeconds: number; durationFormatted: string;
    departmentName: string; subjectName: string; teacherName: string;
  };
  summary: {
    totalEnrolledStudents: number;
    watchedCount: number;
    notWatchedCount: number;
    averageCompletionPercent: number;
  };
  students: Array<{
    student: { id: string; userId: string; name: string; email: string; registerNumber: string };
    hasWatched: boolean;
    metrics: {
      totalWatchTimeSeconds: number; totalWatchTimeFormatted: string;
      firstWatchedAt?: string | null; finishedAt?: string | null;
      sessionCount: number; pauseCount: number; resumeCount: number;
      completionPercent: number; isCompleted: boolean;
    };
    sessionGaps: string[];
    timeline: TimelineEvent[];
  }>;
}

interface Props {
  materialId: string;
  token: string;
  onClose: () => void;
}

/* ── Helper: badge for each event type ── */
function EventBadge({ event }: { event: TimelineEvent }) {
  const meta = event.metadata as any;

  // Checkpoint event (stored as HEARTBEAT with isCheckpoint metadata)
  if (event.eventType === 'HEARTBEAT' && meta?.isCheckpoint) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        ✓ {meta.checkpointPercent}% CHECKPOINT
      </span>
    );
  }

  // Pause-skip detected
  if (event.eventType === 'SEEK' && meta?.pauseSkipDetected) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
        ⚠ SKIP +{meta.jumpedSeconds}s
      </span>
    );
  }

  const BADGE: Record<string, string> = {
    PLAY:        'bg-blue-500/20 text-blue-400 border-blue-500/30',
    RESUME:      'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    PAUSE:       'bg-amber-500/20 text-amber-400 border-amber-500/30',
    SEEK:        'bg-purple-500/20 text-purple-400 border-purple-500/30',
    COMPLETE:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    SESSION_END: 'bg-red-500/20 text-red-400 border-red-500/30',
    HEARTBEAT:   'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${BADGE[event.eventType] ?? 'bg-gray-200 text-gray-600 border-gray-300'}`}>
      {event.eventType}
    </span>
  );
}

/* ── Filter timeline: hide raw HEARTBEATs (too noisy for teacher log) ── */
function filterTimeline(timeline: TimelineEvent[]): TimelineEvent[] {
  return timeline.filter(e => {
    if (e.eventType !== 'HEARTBEAT') return true;
    const meta = e.metadata as any;
    return meta?.isCheckpoint === true; // only show checkpoint HEARTBEATs
  });
}

export function TeacherVideoAnalytics({ materialId, token, onClose }: Props) {
  const [data,               setData]              = useState<AnalyticsData | null>(null);
  const [loading,            setLoading]           = useState(true);
  const [error,              setError]             = useState<string | null>(null);
  const [filter,             setFilter]            = useState<'ALL' | 'WATCHED' | 'UNWATCHED'>('ALL');
  const [expandedStudentId,  setExpandedStudentId] = useState<string | null>(null);
  const [lastUpdated,        setLastUpdated]       = useState('');

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/materials/${materialId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Failed');
      setData(await res.json());
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(false);
    const iv = setInterval(() => fetchAnalytics(true), 8000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId, token]);

  const filtered = (data?.students ?? []).filter(s =>
    filter === 'ALL' ? true : filter === 'WATCHED' ? s.hasWatched : !s.hasWatched,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-800 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white truncate">📊 Video Analytics</h2>
            {data && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{data.material.title}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {lastUpdated && (
              <span className="text-[10px] text-slate-500">Live · {lastUpdated}</span>
            )}
            <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">✕</button>
          </div>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center py-20 text-center text-red-400 text-sm px-8">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <div className="flex-1 overflow-y-auto">

            {/* Summary row */}
            <div className="grid grid-cols-4 gap-px bg-slate-800/60 border-b border-slate-800">
              {[
                { label: 'Total Students',  value: data.summary.totalEnrolledStudents },
                { label: 'Watched',         value: data.summary.watchedCount },
                { label: 'Not Watched',     value: data.summary.notWatchedCount },
                { label: 'Avg Completion',  value: `${Math.round(data.summary.averageCompletionPercent)}%` },
              ].map(s => (
                <div key={s.label} className="px-5 py-3 bg-slate-900/80 text-center">
                  <div className="text-xs text-slate-500">{s.label}</div>
                  <div className="text-xl font-bold text-white mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 px-6 py-3 border-b border-slate-800">
              {(['ALL', 'WATCHED', 'UNWATCHED'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                    filter === f
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'text-slate-400 border-slate-700 hover:border-indigo-500'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Student rows */}
            <div className="divide-y divide-slate-800/60">
              {filtered.length === 0 && (
                <div className="text-center py-14 text-slate-500 text-sm">No students match this filter.</div>
              )}

              {filtered.map(({ student, hasWatched, metrics, sessionGaps, timeline }) => {
                const isExpanded = expandedStudentId === student.id;
                const filteredTimeline = filterTimeline(timeline);
                const checkpointCount = filteredTimeline.filter(e => {
                  const meta = e.metadata as any;
                  return e.eventType === 'HEARTBEAT' && meta?.isCheckpoint;
                }).length;
                const skipCount = filteredTimeline.filter(e => {
                  const meta = e.metadata as any;
                  return e.eventType === 'SEEK' && meta?.pauseSkipDetected;
                }).length;

                return (
                  <div key={student.id} className="transition-all">
                    {/* Student summary row */}
                    <div
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/30 cursor-pointer"
                      onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {student.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{student.name}</p>
                        <p className="text-xs text-slate-400 truncate">{student.registerNumber} · {student.email}</p>
                      </div>

                      {/* Status */}
                      <div className="shrink-0 flex items-center gap-3">
                        {skipCount > 0 && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            ⚠ {skipCount} skip{skipCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {hasWatched ? (
                          <>
                            <div className="text-right">
                              <p className={`text-sm font-bold ${metrics.isCompleted ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                {metrics.completionPercent}%
                              </p>
                              <p className="text-[10px] text-slate-500">{metrics.totalWatchTimeFormatted}</p>
                            </div>
                            {/* Mini 4-checkpoint dots */}
                            <div className="flex gap-1 items-center">
                              {[25, 50, 75, 100].map(p => (
                                <div
                                  key={p}
                                  title={`${p}%`}
                                  className={`w-2.5 h-2.5 rounded-full ${metrics.completionPercent >= p ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                />
                              ))}
                            </div>
                            {metrics.isCompleted && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                ✓ Done
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
                            Not watched
                          </span>
                        )}
                        <span className={`text-slate-400 text-xs ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                      </div>
                    </div>

                    {/* ── Expanded event log ───────────────────────────────── */}
                    {isExpanded && (
                      <div className="bg-slate-950/60 border-t border-slate-800/40 px-6 py-4 space-y-4">

                        {/* Metrics grid */}
                        {hasWatched && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: 'Watch Time', value: metrics.totalWatchTimeFormatted },
                              { label: 'Sessions',   value: metrics.sessionCount },
                              { label: 'Pauses',     value: metrics.pauseCount },
                              { label: 'Checkpoints Reached', value: `${checkpointCount}/4` },
                            ].map(m => (
                              <div key={m.label} className="bg-slate-900 rounded-lg px-3 py-2 border border-slate-800">
                                <div className="text-[10px] text-slate-500">{m.label}</div>
                                <div className="font-bold text-white text-sm mt-0.5">{m.value}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Session gaps */}
                        {sessionGaps.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-400 mb-1">Session Gaps</p>
                            {sessionGaps.map((gap, i) => (
                              <p key={i} className="text-xs text-slate-500">{gap}</p>
                            ))}
                          </div>
                        )}

                        {/* ── Event Timeline ──────────────────────────────── */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-slate-300">
                              📜 Event Log
                              <span className="ml-2 text-slate-500 font-normal">
                                {filteredTimeline.length} events
                                {skipCount > 0 && ` · ${skipCount} skip${skipCount > 1 ? 's' : ''} detected`}
                              </span>
                            </p>
                          </div>

                          {filteredTimeline.length === 0 ? (
                            <div className="text-center py-6 text-slate-600 text-xs border border-dashed border-slate-800 rounded-lg">
                              No events logged yet.
                              {!hasWatched && ' Student has not opened this video.'}
                            </div>
                          ) : (
                            /* Scrollable timeline — always visible */
                            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                              {filteredTimeline.map((ev, i) => (
                                <div key={i} className="flex items-start gap-3 py-1.5 px-3 rounded-lg hover:bg-slate-800/40 transition-colors">
                                  <EventBadge event={ev} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-300 leading-snug">
                                      {ev.description}
                                    </p>
                                    {(ev.metadata as any)?.pauseSkipDetected && (
                                      <p className="text-[10px] text-amber-400/80 mt-0.5">
                                        From {(ev.metadata as any).seekFrom}s → {(ev.metadata as any).seekTo}s (jumped {(ev.metadata as any).jumpedSeconds}s / {(ev.metadata as any).jumpedPercent}%)
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-600 shrink-0 font-mono">{ev.positionFormatted}</span>
                                  <span className="text-[10px] text-slate-600 shrink-0 font-mono">{ev.timeFormatted}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
