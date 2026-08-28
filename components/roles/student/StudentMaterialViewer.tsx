'use client';
/**
 * StudentMaterialViewer
 * Moved from components/materials/MaterialViewer.tsx — student-owned.
 * Key changes:
 *  - Fixed 4-checkpoint bar (25%/50%/75%/100%) replacing the old variable-count bar
 *  - Checkpoint state updated from server response (backend is source of truth)
 *  - No lag during playback: checkpoints only update on API responses, not timeupdate
 */

import React, { useEffect, useRef, useState } from 'react';

interface Checkpoint {
  index: number;
  percent: number;
  reached: boolean;
  watchTimeRequired?: number;
}

interface StudentMaterialViewerProps {
  material: {
    id: string;
    title: string;
    description?: string | null;
    type: 'VIDEO' | 'PDF' | 'NOTES' | 'IMAGE' | 'AUDIO';
    fileUrl: string;
    durationSeconds?: number | null;
    subject?: { name: string } | null;
    department?: { name: string } | null;
    teacher?: { firstName: string; lastName: string } | null;
    userProgress?: {
      lastPositionSeconds: number;
      completionPercent: number;
      isCompleted: boolean;
      metadata?: { reachedCheckpoints?: number[] } | null;
    } | null;
  };
  token: string;
  onClose: () => void;
}

const INITIAL_CHECKPOINTS: Checkpoint[] = [1, 2, 3, 4].map(k => ({
  index: k,
  percent: k * 25,
  reached: false,
}));

function initCheckpoints(material: StudentMaterialViewerProps['material']): Checkpoint[] {
  const reached = material.userProgress?.metadata?.reachedCheckpoints ?? [];
  return [1, 2, 3, 4].map(k => ({ index: k, percent: k * 25, reached: reached.includes(k) }));
}

export function StudentMaterialViewer({ material, token, onClose }: StudentMaterialViewerProps) {
  const videoRef       = useRef<HTMLVideoElement | null>(null);
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const seekTimerRef   = useRef<NodeJS.Timeout | null>(null);
  const hasPlayedRef   = useRef<boolean>(false);

  const [hasResumed,       setHasResumed]       = useState(false);
  const [isPlaying,        setIsPlaying]         = useState(false);
  const [lastPosition,     setLastPosition]      = useState(material.userProgress?.lastPositionSeconds || 0);
  const [completionPercent, setCompletionPercent] = useState(material.userProgress?.completionPercent || 0);
  const [isCompleted,      setIsCompleted]       = useState(material.userProgress?.isCompleted || false);
  const [checkpoints,      setCheckpoints]       = useState<Checkpoint[]>(() => initCheckpoints(material));
  const [pauseSkipWarning, setPauseSkipWarning]  = useState(false);

  /* ── Post an event to the backend ─────────────────────────────────────── */
  const sendVideoEvent = async (
    eventType: 'PLAY' | 'PAUSE' | 'RESUME' | 'SEEK' | 'HEARTBEAT' | 'COMPLETE' | 'SESSION_END',
    positionSeconds: number,
    metadata?: any,
  ) => {
    try {
      const clientTs = new Date().toISOString();
      const payload  = JSON.stringify({ eventType, positionSeconds, clientTs, metadata });

      if (eventType === 'SESSION_END' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(`http://localhost:4000/materials/${material.id}/events`, blob);
        return;
      }

      const res = await fetch(`http://localhost:4000/materials/${material.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: payload,
      });

      if (res.ok) {
        const data = await res.json();
        if (typeof data.completionPercent  === 'number') setCompletionPercent(data.completionPercent);
        if (typeof data.isCompleted        === 'boolean') setIsCompleted(data.isCompleted);
        if (typeof data.lastPositionSeconds === 'number') setLastPosition(data.lastPositionSeconds);
        // ─── Update 4 checkpoints from server response ───────────────────
        if (Array.isArray(data.checkpoints)) {
          setCheckpoints(data.checkpoints);
        }
        // ─── Pause-skip warning ──────────────────────────────────────────
        if (data.pauseSkipDetected) {
          setPauseSkipWarning(true);
          setTimeout(() => setPauseSkipWarning(false), 4000);
        }
      }
    } catch (err) {
      console.error('Failed to log video event:', err);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && !hasResumed) {
      const initialPos = material.userProgress?.lastPositionSeconds || 0;
      if (initialPos > 0 && initialPos < videoRef.current.duration - 2) {
        videoRef.current.currentTime = initialPos;
      }
      setHasResumed(true);
    }
  };

  const handlePlay = () => {
    if (!videoRef.current) return;
    const eventType = hasPlayedRef.current ? 'RESUME' : 'PLAY';
    hasPlayedRef.current = true;
    setIsPlaying(true);
    sendVideoEvent(eventType, videoRef.current.currentTime);
  };

  const handlePause = () => {
    if (!videoRef.current) return;
    setIsPlaying(false);
    sendVideoEvent('PAUSE', videoRef.current.currentTime);
  };

  const handleSeeked = () => {
    if (!videoRef.current) return;
    const pos = videoRef.current.currentTime;
    if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
    seekTimerRef.current = setTimeout(() => {
      sendVideoEvent('SEEK', pos, { seekToSec: pos });
    }, 300);
  };

  const handleEnded = () => {
    if (!videoRef.current) return;
    setIsPlaying(false);
    sendVideoEvent('COMPLETE', videoRef.current.duration || videoRef.current.currentTime);
  };

  /* ── 15-second heartbeat while playing (no UI re-render — server-gated) ─ */
  useEffect(() => {
    let hb: NodeJS.Timeout;
    if (isPlaying && material.type === 'VIDEO') {
      hb = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused) {
          setLastPosition(videoRef.current.currentTime);
          sendVideoEvent('HEARTBEAT', videoRef.current.currentTime);
        }
      }, 15000);
    }
    return () => { if (hb) clearInterval(hb); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, material.type]);

  /* ── Tab-close / visibility ─────────────────────────────────────────── */
  useEffect(() => {
    if (material.type !== 'VIDEO') return;
    const onUnload = () => {
      if (videoRef.current) sendVideoEvent('SESSION_END', videoRef.current.currentTime);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && videoRef.current && isPlaying) {
        sendVideoEvent('PAUSE', videoRef.current.currentTime);
      }
    };
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, material.type]);

  const fmt = (secs: number) => `${Math.floor(secs / 60)}m ${Math.floor(secs % 60)}s`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-800">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              material.type === 'VIDEO'  ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              material.type === 'PDF'   ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
              material.type === 'IMAGE' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
              material.type === 'AUDIO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                         'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {material.type}
            </span>
            <h2 className="text-lg font-bold truncate max-w-xl">{material.title}</h2>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {material.type === 'VIDEO' && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400 text-xs">Progress</span>
                <span className={`text-xs font-bold font-mono ${isCompleted ? 'text-emerald-400' : 'text-indigo-400'}`}>
                  {completionPercent}%
                </span>
                {isCompleted && (
                  <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 border border-emerald-500/30 font-semibold">
                    ✓ Completed
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => {
                if (videoRef.current && isPlaying) sendVideoEvent('PAUSE', videoRef.current.currentTime);
                onClose();
              }}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Main Layout ─────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Media area */}
          <div className="flex flex-1 flex-col bg-black items-center justify-center relative overflow-hidden">

            {/* VIDEO */}
            {material.type === 'VIDEO' && (
              <div className="relative w-full h-full flex flex-col items-center justify-between bg-black overflow-hidden">

                {/* Pause-skip warning banner */}
                {pauseSkipWarning && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-amber-500/90 text-amber-950 text-xs font-bold px-4 py-2 rounded-full shadow-lg animate-fade-slide">
                    ⚠️ Skip detected — checkpoint progress is based on actual watch time
                  </div>
                )}

                <div className="flex-1 w-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src={material.fileUrl}
                    controls
                    className="w-full h-full object-contain max-h-[70vh]"
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onSeeked={handleSeeked}
                    onEnded={handleEnded}
                  />
                </div>

                {/* ── Fixed 4-Checkpoint Bar ───────────────────────────────── */}
                <div className="w-full bg-slate-950/95 border-t border-slate-800/80 px-6 py-3 shrink-0">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      🎯 Watch Progress Checkpoints
                      <span className="text-slate-500 font-normal">
                        ({checkpoints.filter(c => c.reached).length}/4 reached)
                      </span>
                    </span>
                    {isCompleted && (
                      <span className="text-emerald-400 font-semibold text-[11px]">✓ All checkpoints reached</span>
                    )}
                  </div>

                  {/* 4 segments */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {checkpoints.map(cp => (
                      <div
                        key={cp.index}
                        title={`${cp.percent}% — ${cp.reached ? '✓ reached' : `needs ${cp.watchTimeRequired ? Math.round(cp.watchTimeRequired / 60) + 'm' : cp.percent + '% of video'} watched`}`}
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          cp.reached
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/30'
                            : 'bg-slate-800 border border-slate-700/50'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Labels */}
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {checkpoints.map(cp => (
                      <span key={cp.index} className={`text-[9px] font-mono text-center font-semibold ${cp.reached ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {cp.percent}%
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {material.type === 'PDF' && (
              <iframe src={material.fileUrl} className="w-full h-full border-none bg-slate-950" title={material.title} />
            )}

            {material.type === 'IMAGE' && (
              <div className="flex items-center justify-center w-full h-full p-4">
                <img src={material.fileUrl} alt={material.title} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
              </div>
            )}

            {material.type === 'AUDIO' && (
              <div className="flex flex-col items-center justify-center p-8 gap-6 w-full max-w-md bg-slate-900/80 rounded-2xl border border-slate-800">
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-4xl">🎵</div>
                <h3 className="text-lg font-semibold text-center">{material.title}</h3>
                <audio ref={audioRef} src={material.fileUrl} controls className="w-full" />
              </div>
            )}

            {material.type === 'NOTES' && (
              <div className="w-full h-full p-8 overflow-y-auto bg-slate-950 text-slate-200 leading-relaxed">
                <div className="max-w-3xl mx-auto space-y-4">
                  <h3 className="text-2xl font-bold text-white border-b border-slate-800 pb-3">{material.title}</h3>
                  <div className="whitespace-pre-wrap text-slate-300">{material.description || 'No detailed content.'}</div>
                  {material.fileUrl && (
                    <div className="pt-4 border-t border-slate-800">
                      <a href={material.fileUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors">
                        📄 Download / Open Attachment
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Side Drawer ───────────────────────────────────────────────── */}
          <div className="w-72 border-l border-slate-800 bg-slate-950 flex flex-col p-5 overflow-y-auto">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Material Details
            </h3>

            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <span className="text-xs text-slate-500 block">Title</span>
                <p className="font-semibold text-white mt-0.5">{material.title}</p>
              </div>
              {material.description && (
                <div>
                  <span className="text-xs text-slate-500 block">Description</span>
                  <p className="mt-0.5 text-slate-300 text-xs leading-relaxed">{material.description}</p>
                </div>
              )}
              {material.teacher && (
                <div>
                  <span className="text-xs text-slate-500 block">Uploaded By</span>
                  <p className="font-medium text-slate-200 mt-0.5">Prof. {material.teacher.firstName} {material.teacher.lastName}</p>
                </div>
              )}
              {material.subject && (
                <div>
                  <span className="text-xs text-slate-500 block">Subject</span>
                  <p className="font-medium text-slate-200 mt-0.5">{material.subject.name}</p>
                </div>
              )}

              {/* Video progress in side drawer */}
              {material.type === 'VIDEO' && (
                <div className="pt-4 border-t border-slate-800">
                  <span className="text-xs text-slate-500 block mb-3">Your Progress</span>
                  <div className="rounded-xl bg-slate-900 p-3 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-3">
                      {/* Progress ring */}
                      <div className="relative w-12 h-12 shrink-0">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="20" fill="none" stroke="#1e293b" strokeWidth="4" />
                          <circle
                            cx="24" cy="24" r="20" fill="none"
                            stroke={isCompleted ? '#10b981' : '#6366f1'}
                            strokeWidth="4" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 20}`}
                            strokeDashoffset={`${2 * Math.PI * 20 * (1 - completionPercent / 100)}`}
                            className="transition-all duration-700"
                          />
                        </svg>
                        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${isCompleted ? 'text-emerald-400' : 'text-indigo-400'}`}>
                          {completionPercent}%
                        </span>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isCompleted ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {isCompleted ? 'Completed ✓' : 'In Progress'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Last at {fmt(lastPosition)}</p>
                      </div>
                    </div>

                    {/* Mini 4-checkpoint bar in drawer */}
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">Checkpoints</p>
                      <div className="grid grid-cols-4 gap-1">
                        {checkpoints.map(cp => (
                          <div key={cp.index} title={`${cp.percent}%`}
                            className={`h-2 rounded-full transition-all duration-500 ${cp.reached ? 'bg-emerald-500' : 'bg-slate-700'}`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between">
                        {checkpoints.map(cp => (
                          <span key={cp.index} className={`text-[8px] font-mono ${cp.reached ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {cp.percent}%
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto pt-6">
              <a href={material.fileUrl} target="_blank" download rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 py-2.5 px-4 text-xs font-semibold text-white transition-colors">
                📥 Open File Link
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
