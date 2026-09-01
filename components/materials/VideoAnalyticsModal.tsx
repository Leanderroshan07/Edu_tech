'use client';

import React, { useEffect, useState } from 'react';
import { API_BASE } from '../common/api';

interface VideoAnalyticsModalProps {
  materialId: string;
  token: string;
  onClose: () => void;
}

interface AnalyticsData {
  material: {
    id: string;
    title: string;
    type: string;
    durationSeconds: number;
    durationFormatted: string;
    departmentName: string;
    subjectName: string;
    teacherName: string;
    createdAt: string;
  };
  summary: {
    totalEnrolledStudents: number;
    watchedCount: number;
    notWatchedCount: number;
    averageCompletionPercent: number;
  };
  students: Array<{
    student: {
      id: string;
      userId: string;
      name: string;
      email: string;
      registerNumber: string;
      profileImageUrl?: string | null;
    };
    hasWatched: boolean;
    metrics: {
      videoTitle: string;
      videoDurationSeconds: number;
      videoDurationFormatted: string;
      totalWatchTimeSeconds: number;
      totalWatchTimeFormatted: string;
      firstWatchedAt?: string | null;
      finishedAt?: string | null;
      totalElapsedTimeFormatted: string;
      sessionCount: number;
      pauseCount: number;
      resumeCount: number;
      completionPercent: number;
      isCompleted: boolean;
    };
    sessionGaps: string[];
    timeline: Array<{
      eventType: string;
      positionSeconds: number;
      positionFormatted: string;
      timestamp: string;
      timeFormatted: string;
      description: string;
    }>;
  }>;
}

export default function VideoAnalyticsModal({
  materialId,
  token,
  onClose,
}: VideoAnalyticsModalProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'WATCHED' | 'UNWATCHED'>('ALL');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchAnalytics(false);
    // Live auto-refresh every 5 seconds so teacher sees real-time student progress
    const interval = setInterval(() => {
      fetchAnalytics(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [materialId, token]);

  const fetchAnalytics = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/materials/${materialId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || 'Failed to load video analytics');
      }
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (err: any) {
      if (!isSilent) setError(err.message || 'Error fetching video analytics');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const filteredStudents = data?.students.filter((s) => {
    if (filter === 'WATCHED') return s.hasWatched;
    if (filter === 'UNWATCHED') return !s.hasWatched;
    return true;
  }) ?? [];

  const getEventBadgeStyle = (eventType: string) => {
    switch (eventType) {
      case 'PLAY': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'PAUSE': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'RESUME': return 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
      case 'SEEK': return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      case 'COMPLETE': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'HEARTBEAT': return 'bg-slate-600/30 text-slate-400 border border-slate-600/30';
      case 'SESSION_END': return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-xl">
      <div
        className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl text-white shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #051424 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          boxShadow: '0 0 60px rgba(99,102,241,0.08), 0 25px 50px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(99,102,241,0.15)', background: 'rgba(5,20,36,0.8)' }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold px-2.5 py-0.5 uppercase tracking-widest flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Video Analytics (5s Auto-Sync)
              </span>
              <h2 className="text-lg font-bold truncate text-white">{data?.material.title || 'Loading...'}</h2>
            </div>
            {data?.material && (
              <p className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                <span className="text-slate-400">Duration: {data.material.durationFormatted}</span>
                <span className="text-slate-700">|</span>
                <span className="text-slate-400">{data.material.departmentName}</span>
                <span className="text-slate-700">|</span>
                <span className="text-slate-400">{data.material.subjectName}</span>
                <span className="text-slate-700">|</span>
                <span className="text-slate-400">{data.material.teacherName}</span>
                {lastUpdated && (
                  <>
                    <span className="text-slate-700">|</span>
                    <span className="text-emerald-400 text-[10px]">Updated: {lastUpdated}</span>
                  </>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => fetchAnalytics(false)} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all">
              ↻ Refresh
            </button>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border border-slate-800">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex flex-1 items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                <p className="text-sm font-medium text-slate-400">Loading analytics...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl p-4 border" style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)' }}>
                  <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider mb-2">Enrolled</p>
                  <p className="text-3xl font-black text-white">{data.summary.totalEnrolledStudents}</p>
                </div>
                <div className="rounded-xl p-4 border" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
                  <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider mb-2">Watched</p>
                  <p className="text-3xl font-black text-emerald-300">{data.summary.watchedCount}</p>
                </div>
                <div className="rounded-xl p-4 border" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}>
                  <p className="text-[10px] text-amber-400 uppercase font-bold tracking-wider mb-2">Not Started</p>
                  <p className="text-3xl font-black text-amber-300">{data.summary.notWatchedCount}</p>
                </div>
                <div className="rounded-xl p-4 border" style={{ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.2)' }}>
                  <p className="text-[10px] text-violet-400 uppercase font-bold tracking-wider mb-2">Avg. Completion</p>
                  <p className="text-3xl font-black text-violet-300">{data.summary.averageCompletionPercent}%</p>
                  <div className="mt-2 h-1.5 rounded-full bg-violet-900/40 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${data.summary.averageCompletionPercent}%`, background: 'linear-gradient(90deg,#7c3aed,#6366f1)' }} />
                  </div>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.5)' }}>
                {[
                  { k: 'ALL' as const, l: 'All Students', n: data.students.length },
                  { k: 'WATCHED' as const, l: 'Watched', n: data.summary.watchedCount },
                  { k: 'UNWATCHED' as const, l: 'Not Watched', n: data.summary.notWatchedCount },
                ].map(({ k, l, n }) => (
                  <button key={k} onClick={() => setFilter(k)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${filter === k ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-300 border border-transparent'}`}>
                    {l} ({n})
                  </button>
                ))}
              </div>

              {/* Student List */}
              <div className="space-y-3">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">No students match this filter.</div>
                ) : (
                  filteredStudents.map((item) => {
                    const isExpanded = expandedStudentId === item.student.id;
                    const { student, hasWatched, metrics } = item;
                    // Safety: ALWAYS default to empty arrays — prevents TypeError on .length or .map
                    const sessionGaps: string[] = Array.isArray(item.sessionGaps) ? item.sessionGaps : [];
                    const timeline = Array.isArray(item.timeline) ? item.timeline : [];

                    return (
                      <div key={student.id} className="rounded-xl overflow-hidden transition-all" style={{ border: '1px solid rgba(51,65,85,0.6)', background: hasWatched ? 'rgba(15,23,42,0.7)' : 'rgba(15,23,42,0.3)', opacity: hasWatched ? 1 : 0.65 }}>
                        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}>
                            <div className="h-10 w-10 rounded-full flex items-center justify-center font-black text-sm shrink-0" style={{ background: hasWatched ? 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))' : 'rgba(30,41,59,0.8)', border: hasWatched ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(51,65,85,0.5)' }}>
                              <span className={hasWatched ? 'text-indigo-300' : 'text-slate-400'}>{student.name.charAt(0)}</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-sm">{student.name}</h4>
                                <span className="text-[10px] text-slate-500 font-mono">({student.registerNumber})</span>
                              </div>
                              <span className="text-[11px] text-slate-500">{student.email}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {hasWatched ? (
                              <>
                                <div className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.5)' }}>
                                  <p className="text-slate-400 text-[10px] uppercase font-medium mb-0.5">Completion</p>
                                  <p className={`font-bold ${metrics.isCompleted ? 'text-emerald-400' : 'text-amber-400'}`}>{metrics.completionPercent}%{metrics.isCompleted ? ' (Done)' : ''}</p>
                                </div>
                                <div className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.5)' }}>
                                  <p className="text-slate-400 text-[10px] uppercase font-medium mb-0.5">Watch Time</p>
                                  <p className="font-bold text-indigo-400">{metrics.totalWatchTimeFormatted}</p>
                                </div>
                                <div className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.5)' }}>
                                  <p className="text-slate-400 text-[10px] uppercase font-medium mb-0.5">Events Logged</p>
                                  <p className="font-bold text-purple-400">📜 {timeline.length} events</p>
                                </div>
                                <button onClick={() => setExpandedStudentId(isExpanded ? null : student.id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${isExpanded ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40' : 'text-slate-400 border-slate-700 hover:text-indigo-300 hover:border-indigo-500/40'}`}>
                                  {isExpanded ? '▲ Hide Timeline' : '▼ View Timeline'}
                                </button>
                              </>
                            ) : (
                              <span className="rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold px-3 py-1.5">Has Not Started</span>
                            )}
                          </div>
                        </div>

                        {/* Event Timeline Drawer */}
                        {hasWatched && isExpanded && (
                          <div className="border-t p-5 space-y-4" style={{ borderColor: 'rgba(99,102,241,0.15)', background: 'rgba(5,10,20,0.6)' }}>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl p-4" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.4)' }}>
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase mb-1">First Watched</p>
                                <p className="text-xs font-semibold text-white">{metrics.firstWatchedAt ? new Date(metrics.firstWatchedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase mb-1">Finished At</p>
                                <p className="text-xs font-semibold text-emerald-400">{metrics.finishedAt ? new Date(metrics.finishedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Not yet'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase mb-1">Actual Watch</p>
                                <p className="text-xs font-semibold text-indigo-400">{metrics.totalWatchTimeFormatted} / {metrics.videoDurationFormatted}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase mb-1">Total Elapsed</p>
                                <p className="text-xs font-semibold text-slate-200">{metrics.totalElapsedTimeFormatted || '-'}</p>
                              </div>
                            </div>

                            {sessionGaps.length > 0 && (
                              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                <h5 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Session Gaps</h5>
                                <ul className="space-y-1">
                                  {sessionGaps.map((gap, idx) => (
                                    <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                                      {gap}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Detailed Event Log List */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  📜 Detailed Event Timeline ({timeline.length} events recorded)
                                </h5>
                              </div>
                              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                {timeline.length === 0 ? (
                                  <p className="text-xs text-slate-600 text-center py-4">No events recorded yet</p>
                                ) : (
                                  timeline.map((evt, idx) => (
                                    <div key={idx} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(30,41,59,0.8)' }}>
                                      <div className="flex items-center gap-2.5">
                                        <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${getEventBadgeStyle(evt.eventType)}`}>
                                          {evt.eventType}
                                        </span>
                                        <span className="text-slate-200 font-medium">{evt.description}</span>
                                      </div>
                                      <span className="text-slate-400 font-mono text-[10px] shrink-0">{evt.timeFormatted}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
