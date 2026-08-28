"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

export interface VideoLesson {
  id: string;
  title: string;
  moduleName: string;
  moduleIndex: number;
  durationSeconds: number;
  fileUrl: string;
  lastPositionSeconds: number;
  completionPercent: number;
  isCompleted: boolean;
  chapters: { timeSec: number; title: string }[];
  transcript: { timeSec: number; text: string }[];
  notesText: string;
  resources: { name: string; type: string; url: string }[];
}

interface Props {
  lesson: VideoLesson;
  onClose: () => void;
  onUpdateProgress?: (positionSec: number, completed: boolean) => void;
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type RightTab = "notes" | "transcript" | "resources" | "doubt";

export const StudentVideoWorkspace: React.FC<Props> = ({ lesson, onClose, onUpdateProgress }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(lesson.lastPositionSeconds);
  const [duration, setDuration] = useState(lesson.durationSeconds);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [rightTab, setRightTab] = useState<RightTab>("notes");
  const [doubt, setDoubt] = useState("");
  const [doubtSent, setDoubtSent] = useState(false);

  // Seek to last position on mount
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => { v.currentTime = lesson.lastPositionSeconds; };
    v.addEventListener("loadedmetadata", onLoaded);
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [lesson.lastPositionSeconds]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const skip = (secs: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + secs));
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (onUpdateProgress) {
      const done = v.currentTime / v.duration > 0.95;
      onUpdateProgress(v.currentTime, done);
    }
  };

  const handleVolumeChange = (val: number) => {
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
  };

  const handleMute = () => {
    setMuted(!muted);
    if (videoRef.current) videoRef.current.muted = !muted;
  };

  const handleSpeed = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  const seekTo = (sec: number) => {
    if (videoRef.current) { videoRef.current.currentTime = sec; setCurrentTime(sec); }
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
        <div>
          <div className="text-xs text-gray-400">{lesson.moduleName}</div>
          <div className="text-sm font-semibold text-white mt-0.5">{lesson.title}</div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Video area */}
        <div className="flex-1 flex flex-col bg-black min-w-0">
          {/* Video */}
          <div className="relative flex-1 bg-black flex items-center justify-center cursor-pointer" onClick={togglePlay}>
            <video
              ref={videoRef}
              src={lesson.fileUrl}
              className="max-h-full max-w-full w-full"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            {!playing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-gray-900 px-4 py-3 space-y-2 shrink-0">
            {/* Progress bar */}
            <div
              className="h-1 bg-gray-700 rounded-full cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                seekTo(pct * duration);
              }}
            >
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progressPct}%` }} />
            </div>

            {/* Control row */}
            <div className="flex items-center gap-3">
              {/* Skip back */}
              <button onClick={() => skip(-10)} className="text-gray-400 hover:text-white transition" title="Back 10s">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
              </button>

              {/* Play/Pause */}
              <button onClick={togglePlay} className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white transition">
                {playing ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* Skip forward */}
              <button onClick={() => skip(10)} className="text-gray-400 hover:text-white transition" title="Forward 10s">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                </svg>
              </button>

              {/* Time */}
              <span className="text-xs text-gray-400 font-mono flex-1">
                {fmtTime(currentTime)} / {fmtTime(duration)}
              </span>

              {/* Volume */}
              <button onClick={handleMute} className="text-gray-400 hover:text-white transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {muted
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7.975 7.975 0 015.657 2.343M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  }
                </svg>
              </button>
              <input
                type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-16 accent-indigo-500"
              />

              {/* Speed */}
              <select
                value={speed}
                onChange={(e) => handleSpeed(Number(e.target.value))}
                className="bg-gray-800 text-gray-300 text-xs rounded px-1.5 py-0.5 border border-gray-700"
              >
                {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <option key={s} value={s}>{s}x</option>
                ))}
              </select>
            </div>
          </div>

          {/* Chapter list below video */}
          <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex gap-3 overflow-x-auto shrink-0">
            {lesson.chapters.map((ch, i) => (
              <button
                key={i}
                onClick={() => seekTo(ch.timeSec)}
                className={`text-xs whitespace-nowrap px-2.5 py-1 rounded-lg transition ${currentTime >= ch.timeSec && (i + 1 >= lesson.chapters.length || currentTime < lesson.chapters[i + 1].timeSec) ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"}`}
              >
                {fmtTime(ch.timeSec)} · {ch.title}
              </button>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="w-72 lg:w-80 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-800 shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            {(["notes", "transcript", "resources", "doubt"] as RightTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setRightTab(t)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize transition ${rightTab === t ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"}`}
              >
                {t === "doubt" ? "Ask" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {rightTab === "notes" && (
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {lesson.notesText || "No notes available for this lesson."}
              </pre>
            )}

            {rightTab === "transcript" && (
              <div className="space-y-2">
                {lesson.transcript.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => seekTo(t.timeSec)}
                    className="w-full text-left flex gap-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1.5 transition"
                  >
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono shrink-0">{fmtTime(t.timeSec)}</span>
                    <span className="text-gray-700 dark:text-gray-300">{t.text}</span>
                  </button>
                ))}
              </div>
            )}

            {rightTab === "resources" && (
              <div className="space-y-2">
                {lesson.resources.map((r, i) => (
                  <a
                    key={i}
                    href={r.url}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                  >
                    <div>
                      <div className="text-xs font-medium text-gray-900 dark:text-white">{r.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{r.type}</div>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                ))}
              </div>
            )}

            {rightTab === "doubt" && (
              <div className="space-y-3">
                {doubtSent ? (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Question sent!</div>
                    <div className="text-xs text-gray-500 mt-1">Your teacher will respond soon.</div>
                    <button onClick={() => { setDoubt(""); setDoubtSent(false); }} className="mt-3 text-xs text-indigo-600 hover:underline">Ask another</button>
                  </div>
                ) : (
                  <>
                    <div className="text-xs text-gray-500">Ask your teacher a question about this lesson:</div>
                    <textarea
                      value={doubt}
                      onChange={(e) => setDoubt(e.target.value)}
                      placeholder="Type your question..."
                      rows={4}
                      className="w-full text-sm p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
                    />
                    <button
                      disabled={!doubt.trim()}
                      onClick={() => setDoubtSent(true)}
                      className="w-full py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg transition"
                    >
                      Send Question
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
