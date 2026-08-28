'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MaterialViewerProps {
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
    } | null;
  };
  token: string;
  onClose: () => void;
}

export default function MaterialViewer({ material, token, onClose }: MaterialViewerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track whether the video has been played at least once (to distinguish PLAY vs RESUME)
  const hasPlayedRef = useRef<boolean>(false);

  const [hasResumed, setHasResumed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastPosition, setLastPosition] = useState<number>(
    material.userProgress?.lastPositionSeconds || 0,
  );
  const [completionPercent, setCompletionPercent] = useState<number>(
    material.userProgress?.completionPercent || 0,
  );
  const [isCompleted, setIsCompleted] = useState<boolean>(
    material.userProgress?.isCompleted || false,
  );

  // Post video tracking event to backend API
  const sendVideoEvent = async (
    eventType: 'PLAY' | 'PAUSE' | 'RESUME' | 'SEEK' | 'HEARTBEAT' | 'COMPLETE' | 'SESSION_END',
    positionSeconds: number,
    metadata?: any,
  ) => {
    try {
      const clientTs = new Date().toISOString();
      const payload = JSON.stringify({ eventType, positionSeconds, clientTs, metadata });

      // If SESSION_END on tab close, sendBeacon
      if (eventType === 'SESSION_END' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(`http://localhost:4000/materials/${material.id}/events`, blob);
        return;
      }

      const res = await fetch(`http://localhost:4000/materials/${material.id}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });

      if (res.ok) {
        const data = await res.json();
        // Update progress from server response (server is the source of truth)
        if (typeof data.completionPercent === 'number') {
          setCompletionPercent(data.completionPercent);
        }
        if (typeof data.isCompleted === 'boolean') {
          setIsCompleted(data.isCompleted);
        }
        if (typeof data.lastPositionSeconds === 'number') {
          setLastPosition(data.lastPositionSeconds);
        }
      }
    } catch (err) {
      console.error('Failed to log video event:', err);
    }
  };

  // Resume video from saved position when video loads
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
    const currentPos = videoRef.current.currentTime;
    // Use ref (not state) to avoid stale closure — PLAY on first ever play, RESUME thereafter
    const eventType = hasPlayedRef.current ? 'RESUME' : 'PLAY';
    hasPlayedRef.current = true;
    setIsPlaying(true);
    sendVideoEvent(eventType, currentPos);
  };

  const handlePause = () => {
    if (!videoRef.current) return;
    const currentPos = videoRef.current.currentTime;
    setIsPlaying(false);
    sendVideoEvent('PAUSE', currentPos);
  };

  const handleSeeked = () => {
    if (!videoRef.current) return;
    const currentPos = videoRef.current.currentTime;

    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    seekTimeoutRef.current = setTimeout(() => {
      sendVideoEvent('SEEK', currentPos, { seekToSec: currentPos });
    }, 300);
  };

  const handleEnded = () => {
    if (!videoRef.current) return;
    setIsPlaying(false);
    sendVideoEvent('COMPLETE', videoRef.current.duration || videoRef.current.currentTime);
  };

  // 5-second Heartbeat while playing for fast progress updates (5s)
  useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout;
    if (isPlaying && videoRef.current && material.type === 'VIDEO') {
      heartbeatInterval = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused) {
          const currentPos = videoRef.current.currentTime;
          setLastPosition(currentPos);
          sendVideoEvent('HEARTBEAT', currentPos);
        }
      }, 5000);
    }
    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [isPlaying, material.type]);

  // Tab unload / close event listener (SESSION_END via sendBeacon)
  useEffect(() => {
    if (material.type !== 'VIDEO') return;

    const handleUnload = () => {
      if (videoRef.current) {
        sendVideoEvent('SESSION_END', videoRef.current.currentTime);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && videoRef.current && isPlaying) {
        sendVideoEvent('PAUSE', videoRef.current.currentTime);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, material.type]);

  const formatPosition = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`shrink-0 rounded-lg px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                material.type === 'VIDEO'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : material.type === 'PDF'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : material.type === 'IMAGE'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : material.type === 'AUDIO'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {material.type}
            </span>
            <h2 className="text-xl font-bold truncate max-w-xl">{material.title}</h2>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {material.type === 'VIDEO' && (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400 text-xs">Progress</span>
                    <span className={`text-xs font-bold font-mono ${isCompleted ? 'text-emerald-400' : 'text-indigo-400'}`}>
                      {completionPercent}%
                    </span>
                    {isCompleted && (
                      <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 border border-emerald-500/30 font-semibold">
                        ✓ Done
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 w-32 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                          : 'bg-gradient-to-r from-indigo-600 to-violet-500'
                      }`}
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => {
                if (videoRef.current && isPlaying) {
                  sendVideoEvent('PAUSE', videoRef.current.currentTime);
                }
                onClose();
              }}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Content View (Video + PDF / Notes normal view split layout) */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Media Player area */}
          <div className="flex flex-1 flex-col bg-black items-center justify-center relative overflow-hidden">
            {material.type === 'VIDEO' && (
              <div className="relative w-full h-full flex flex-col items-center justify-between bg-black overflow-hidden">
                <div className="flex-1 w-full flex items-center justify-center relative">
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

                {/* Checkpoint Timeline Bar */}
                {(() => {
                  const duration = material.durationSeconds || 300;
                  let numCheckpoints = 5;
                  if (duration > 900) numCheckpoints = 20;
                  else if (duration >= 300) numCheckpoints = 10;
                  const reachedCheckpointsCount = Math.round((completionPercent / 100) * numCheckpoints);

                  return (
                    <div className="w-full bg-slate-950/95 border-t border-slate-800/80 p-3 px-6 shrink-0 backdrop-blur-md">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-slate-200 flex items-center gap-2">
                          🎯 Checkpoint Tracker ({reachedCheckpointsCount} / {numCheckpoints} Sections Reached)
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {numCheckpoints === 20 ? '20 Sections (5% each)' : numCheckpoints === 10 ? '10 Sections (10% each)' : '5 Sections (20% each)'}
                        </span>
                      </div>

                      {/* Checkpoint segment ticks */}
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${numCheckpoints}, minmax(0, 1fr))` }}>
                        {Array.from({ length: numCheckpoints }).map((_, idx) => {
                          const k = idx + 1;
                          const isReached = k <= reachedCheckpointsCount;
                          return (
                            <div
                              key={k}
                              className={`h-2.5 rounded-full transition-all duration-500 relative group ${
                                isReached
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-md shadow-emerald-500/30'
                                  : 'bg-slate-800 border border-slate-700/50'
                              }`}
                            >
                              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-[10px] font-semibold text-white px-2 py-0.5 rounded border border-slate-700 whitespace-nowrap z-30">
                                Section {k}/{numCheckpoints} ({Math.round((k / numCheckpoints) * 100)}%) {isReached ? '✓ Reached' : '⏳ Pending'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {material.type === 'PDF' && (
              <iframe
                src={material.fileUrl}
                className="w-full h-full border-none bg-slate-950"
                title={material.title}
              />
            )}

            {material.type === 'IMAGE' && (
              <div className="flex items-center justify-center w-full h-full p-4">
                <img
                  src={material.fileUrl}
                  alt={material.title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              </div>
            )}

            {material.type === 'AUDIO' && (
              <div className="flex flex-col items-center justify-center p-8 gap-6 w-full max-w-md bg-slate-900/80 rounded-2xl border border-slate-800">
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-4xl">
                  🎵
                </div>
                <h3 className="text-lg font-semibold text-center">{material.title}</h3>
                <audio
                  ref={audioRef}
                  src={material.fileUrl}
                  controls
                  className="w-full"
                />
              </div>
            )}

            {material.type === 'NOTES' && (
              <div className="w-full h-full p-8 overflow-y-auto bg-slate-950 text-slate-200 leading-relaxed text-base">
                <div className="max-w-3xl mx-auto space-y-4">
                  <h3 className="text-2xl font-bold text-white border-b border-slate-800 pb-3">
                    {material.title}
                  </h3>
                  <div className="whitespace-pre-wrap font-sans text-slate-300">
                    {material.description || 'No detailed content available for these notes.'}
                  </div>
                  {material.fileUrl && (
                    <div className="pt-4 border-t border-slate-800">
                      <a
                        href={material.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
                      >
                        📄 Download / Open Attachment
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Side Drawer for Details & Companion Content in normal size view */}
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
                  <p className="mt-0.5 text-slate-300 text-xs leading-relaxed">
                    {material.description}
                  </p>
                </div>
              )}

              {material.teacher && (
                <div>
                  <span className="text-xs text-slate-500 block">Uploaded By</span>
                  <p className="font-medium text-slate-200 mt-0.5">
                    Prof. {material.teacher.firstName} {material.teacher.lastName}
                  </p>
                </div>
              )}

              {material.subject && (
                <div>
                  <span className="text-xs text-slate-500 block">Subject</span>
                  <p className="font-medium text-slate-200 mt-0.5">{material.subject.name}</p>
                </div>
              )}

              {material.department && (
                <div>
                  <span className="text-xs text-slate-500 block">Department</span>
                  <p className="font-medium text-slate-200 mt-0.5">{material.department.name}</p>
                </div>
              )}

              {material.type === 'VIDEO' && (
                <div className="pt-4 border-t border-slate-800">
                  <span className="text-xs text-slate-500 block mb-3">Your Progress</span>
                  <div className="rounded-xl bg-slate-900 p-3 border border-slate-800 space-y-3">
                    {/* Progress Ring Visual */}
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 shrink-0">
                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                          <circle cx="24" cy="24" r="20" fill="none" stroke="#1e293b" strokeWidth="4" />
                          <circle
                            cx="24" cy="24" r="20" fill="none"
                            stroke={isCompleted ? '#10b981' : '#6366f1'}
                            strokeWidth="4"
                            strokeLinecap="round"
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
                        <p className="text-xs text-slate-400 mt-0.5">
                          Last at {formatPosition(lastPosition)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto pt-6">
              <a
                href={material.fileUrl}
                target="_blank"
                download
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 py-2.5 px-4 text-xs font-semibold text-white transition-colors"
              >
                📥 Open File Link
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
