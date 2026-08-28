'use client';
/**
 * TeacherMaterialsList
 * Teacher-owned materials view: upload form + material grid + analytics trigger.
 * No student progress display (that's for student cards).
 */

import React, { useEffect, useState } from 'react';
import { TeacherVideoAnalytics } from './TeacherVideoAnalytics';
import { API_BASE } from '../../common/api';

interface Material {
  id: string; title: string; description?: string | null;
  type: 'VIDEO' | 'PDF' | 'NOTES' | 'IMAGE' | 'AUDIO';
  fileUrl: string; durationSeconds?: number | null;
  teacherId: string; departmentId: string; subjectId?: string | null;
  createdAt: string;
  department?: { id: string; name: string } | null;
  subject?: { id: string; name: string } | null;
  teacher?: { firstName: string; lastName: string } | null;
}

interface Props {
  token: string;
  currentUserId: string;
  userDepartmentId?: string;
  showAnalytics?: boolean;
}

const TYPE_BADGE: Record<string, string> = {
  VIDEO: 'bg-red-500/20 text-red-400 border border-red-500/30',
  PDF:   'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  NOTES: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  IMAGE: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  AUDIO: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
};

export function TeacherMaterialsList({ token, currentUserId, userDepartmentId, showAnalytics = false }: Props) {
  const [materials,   setMaterials]   = useState<Material[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects,    setSubjects]    = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filterType,  setFilterType]  = useState('ALL');

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle,       setUploadTitle]       = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadType,        setUploadType]        = useState<'VIDEO' | 'PDF' | 'NOTES' | 'IMAGE' | 'AUDIO'>('VIDEO');
  const [uploadMethod,      setUploadMethod]      = useState<'FILE' | 'URL'>('URL');
  const [uploadFile,        setUploadFile]        = useState<File | null>(null);
  const [uploadUrl,         setUploadUrl]         = useState('');
  const [uploadDuration,    setUploadDuration]    = useState('');
  const [uploadDeptId,      setUploadDeptId]      = useState(userDepartmentId || '');
  const [uploadSubjId,      setUploadSubjId]      = useState('');
  const [isUploading,       setIsUploading]       = useState(false);
  const [uploadError,       setUploadError]       = useState<string | null>(null);

  // Analytics
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);

  const h = (p: string, o: RequestInit = {}) =>
    fetch(`${API_BASE}${p}`, { ...o, headers: { Authorization: `Bearer ${token}`, ...((o.headers as any) || {}) } });

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await h('/materials');
      if (res.ok) setMaterials(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchMaterials();
    h('/departments').then(r => r.json()).then(d => {
      setDepartments(Array.isArray(d) ? d : []);
      if (!uploadDeptId && Array.isArray(d) && d.length > 0) setUploadDeptId(d[0].id);
    }).catch(() => {});
    h('/subjects').then(r => r.json()).then(s => setSubjects(Array.isArray(s) ? s : [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    if (!uploadTitle.trim() || !uploadDeptId) { setUploadError('Title and department are required.'); return; }
    setIsUploading(true);
    try {
      let finalUrl = uploadUrl.trim();
      if (uploadMethod === 'FILE') {
        if (!uploadFile) throw new Error('Please select a file');
        const fd = new FormData();
        fd.append('file', uploadFile);
        const r = await fetch(`${API_BASE}/materials/upload-file`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
        });
        if (!r.ok) throw new Error('File upload failed');
        const d = await r.json();
        finalUrl = d.fileUrl ?? d.url ?? d.path ?? '';
      }
      if (!finalUrl) throw new Error('Please provide a URL or file');

      const body: any = {
        title: uploadTitle.trim(), description: uploadDescription.trim() || undefined,
        type: uploadType, fileUrl: finalUrl, departmentId: uploadDeptId,
        subjectId: uploadSubjId || undefined,
        durationSeconds: uploadType === 'VIDEO' && uploadDuration ? parseInt(uploadDuration) : undefined,
      };

      const r = await h('/materials', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } as any });
      if (!r.ok) { const d = await r.json(); throw new Error(d.message ?? 'Upload failed'); }

      setShowUploadModal(false);
      setUploadTitle(''); setUploadDescription(''); setUploadUrl(''); setUploadFile(null); setUploadDuration('');
      await fetchMaterials();
    } catch (e: any) { setUploadError(e.message); }
    finally { setIsUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this material?')) return;
    await h(`/materials/${id}`, { method: 'DELETE' });
    await fetchMaterials();
  };

  const filtered = filterType === 'ALL' ? materials : materials.filter(m => m.type === filterType);

  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-title">{showAnalytics ? 'Student Analytics' : 'Upload & Manage Materials'}</h2>
          <p className="section-subtitle">
            {showAnalytics ? 'Track how students engage with your content' : 'Share videos, PDFs, notes and media with your students'}
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload Material
        </button>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'VIDEO', 'PDF', 'NOTES', 'IMAGE', 'AUDIO'].map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              filterType === t
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'text-[var(--text-muted)] border-[var(--surface-muted)] hover:border-indigo-400'
            }`}
          >
            {t} {t === 'ALL' ? `(${materials.length})` : `(${materials.filter(m => m.type === t).length})`}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center text-[var(--text-muted)] text-sm">
          No materials yet. Click "Upload Material" to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(item => (
            <div key={item.id} className="card overflow-hidden flex flex-col">
              <div className={`h-1 ${item.type === 'VIDEO' ? 'bg-red-500' : item.type === 'PDF' ? 'bg-blue-500' : item.type === 'IMAGE' ? 'bg-purple-500' : item.type === 'AUDIO' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${TYPE_BADGE[item.type] ?? ''}`}>
                    {item.type}
                  </span>
                  {item.subject && <span className="text-xs text-[var(--text-muted)] truncate">{item.subject.name}</span>}
                </div>

                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm line-clamp-2">{item.title}</h3>
                  {item.description && <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{item.description}</p>}
                  <p className="text-[10px] text-[var(--text-muted)] mt-2">
                    Uploaded {new Date(item.createdAt).toLocaleDateString()}
                    {item.durationSeconds && ` · ${Math.round(item.durationSeconds / 60)}m`}
                  </p>
                </div>

                <div className="mt-auto flex flex-col gap-2 pt-2">
                  {item.type === 'VIDEO' && (
                    <button
                      onClick={() => setAnalyticsId(item.id)}
                      className="btn btn-secondary btn-sm flex items-center justify-center gap-1.5"
                    >
                      📊 View Student Analytics
                    </button>
                  )}
                  {item.teacherId === currentUserId && (
                    <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:text-red-300 text-right transition-colors">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl">
          <div className="w-full max-w-xl rounded-2xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            style={{ background: 'linear-gradient(135deg,#0f172a,#051424)', border: '1px solid rgba(99,102,241,.25)', boxShadow: '0 0 60px rgba(99,102,241,.1),0 25px 50px rgba(0,0,0,.7)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(99,102,241,.15)' }}>
              <div>
                <h3 className="text-base font-bold text-white">Upload Learning Material</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Share videos, notes, PDFs, or media</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border border-slate-800">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {uploadError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-red-400 text-xs">{uploadError}</div>
              )}
              <form onSubmit={handleUpload} className="space-y-4 text-xs">
                {/* Type selector */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">Type *</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[{ t: 'VIDEO', i: '🎬' }, { t: 'PDF', i: '📄' }, { t: 'NOTES', i: '📝' }, { t: 'IMAGE', i: '🖼️' }, { t: 'AUDIO', i: '🎵' }].map(({ t, i }) => (
                      <button key={t} type="button" onClick={() => setUploadType(t as any)}
                        className={`flex flex-col items-center p-3 rounded-xl border transition-all ${uploadType === t ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'}`}>
                        <span className="text-xl mb-1">{i}</span>
                        <span className="font-semibold text-[11px]">{t}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Title *</label>
                  <input type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} required placeholder="e.g. Chapter 3: Advanced Trees"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all" />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Description</label>
                  <textarea value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} rows={2} placeholder="Brief summary..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Department *</label>
                    <select value={uploadDeptId} onChange={e => setUploadDeptId(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-indigo-500 transition-all">
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Subject</label>
                    <select value={uploadSubjId} onChange={e => setUploadSubjId(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-indigo-500 transition-all">
                      <option value="">General</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                    </select>
                  </div>
                </div>

                {uploadType === 'VIDEO' && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Duration (seconds)</label>
                    <input type="number" value={uploadDuration} onChange={e => setUploadDuration(e.target.value)} placeholder="e.g. 1800 for 30 minutes"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all" />
                  </div>
                )}

                {/* Source method */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Source *</label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {(['FILE', 'URL'] as const).map(m => (
                      <button key={m} type="button" onClick={() => setUploadMethod(m)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${uploadMethod === m ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'}`}>
                        {m === 'FILE' ? '📁 File Upload' : '🔗 Media URL'}
                      </button>
                    ))}
                  </div>
                  {uploadMethod === 'FILE' ? (
                    <div className="rounded-xl border-2 border-dashed border-indigo-500/30 bg-indigo-500/5 p-5 text-center">
                      <input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} required
                        className="w-full text-slate-300 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white cursor-pointer" />
                      {uploadFile && <p className="text-emerald-400 text-[11px] mt-2">{uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)</p>}
                    </div>
                  ) : (
                    <input type="url" value={uploadUrl} onChange={e => setUploadUrl(e.target.value)} placeholder="https://example.com/video.mp4" required
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all" />
                  )}
                </div>

                {isUploading && (
                  <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden border border-indigo-500/30">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse w-full" />
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800/80 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all">Cancel</button>
                  <button type="submit" disabled={isUploading} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg transition-all disabled:opacity-50">
                    {isUploading ? 'Uploading...' : 'Publish Material'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Analytics modal */}
      {analyticsId && (
        <TeacherVideoAnalytics
          materialId={analyticsId}
          token={token}
          onClose={() => setAnalyticsId(null)}
        />
      )}
    </div>
  );
}
