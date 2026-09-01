'use client';

import React, { useEffect, useState } from 'react';
import { API_BASE } from '../common/api';
import MaterialViewer from './MaterialViewer';
import VideoAnalyticsModal from './VideoAnalyticsModal';

interface Material {
  id: string;
  title: string;
  description?: string | null;
  type: 'VIDEO' | 'PDF' | 'NOTES' | 'IMAGE' | 'AUDIO';
  fileUrl: string;
  durationSeconds?: number | null;
  teacherId: string;
  departmentId: string;
  subjectId?: string | null;
  createdAt: string;
  department?: { id: string; name: string } | null;
  subject?: { id: string; name: string } | null;
  teacher?: { firstName: string; lastName: string } | null;
  userProgress?: {
    lastPositionSeconds: number;
    completionPercent: number;
    isCompleted: boolean;
  } | null;
}

interface MaterialsListProps {
  token: string;
  currentUserRole: 'STUDENT' | 'TEACHER' | 'HOD' | 'ADMIN';
  currentUserId: string;
  userDepartmentId?: string;
}

export default function MaterialsList({
  token,
  currentUserRole,
  currentUserId,
  userDepartmentId,
}: MaterialsListProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const [activeViewerMaterial, setActiveViewerMaterial] = useState<Material | null>(null);
  const [activeAnalyticsMaterialId, setActiveAnalyticsMaterialId] = useState<string | null>(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadType, setUploadType] = useState<'VIDEO' | 'PDF' | 'NOTES' | 'IMAGE' | 'AUDIO'>('VIDEO');
  const [uploadMethod, setUploadMethod] = useState<'FILE' | 'URL'>('FILE');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadUrl, setUploadUrl] = useState('');
  const [uploadDuration, setUploadDuration] = useState<string>('');
  const [uploadDeptId, setUploadDeptId] = useState(userDepartmentId || '');
  const [uploadSubjId, setUploadSubjId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetchMaterials();
    fetchDepartments();
    fetchSubjects();
  }, [token]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/materials`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE}/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
        if (!uploadDeptId && data.length > 0) {
          setUploadDeptId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_BASE}/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!uploadTitle.trim()) {
      setUploadError('Title is required');
      return;
    }

    if (!uploadDeptId) {
      setUploadError('Department is required');
      return;
    }

    setIsUploading(true);

    try {
      let finalFileUrl = uploadUrl.trim();

      if (uploadMethod === 'FILE') {
        if (!uploadFile) {
          throw new Error('Please select a file to upload');
        }

        const formData = new FormData();
        formData.append('file', uploadFile);

        const uploadRes = await fetch(`${API_BASE}/materials/upload-file`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!uploadRes.ok) {
          const errJson = await uploadRes.json();
          throw new Error(errJson.message || 'File upload failed');
        }

        const uploadData = await uploadRes.json();
        finalFileUrl = uploadData.url;
      }

      if (!finalFileUrl) {
        throw new Error('File URL is missing');
      }

      // Create Material Record
      const createRes = await fetch(`${API_BASE}/materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          description: uploadDescription.trim() || undefined,
          type: uploadType,
          fileUrl: finalFileUrl,
          durationSeconds: uploadDuration && Number(uploadDuration) > 0 ? Number(uploadDuration) : undefined,
          departmentId: uploadDeptId,
          subjectId: uploadSubjId || undefined,
        }),
      });

      if (!createRes.ok) {
        const errJson = await createRes.json();
        throw new Error(errJson.message || 'Failed to create material record');
      }

      // Reset and close modal
      setShowUploadModal(false);
      setUploadTitle('');
      setUploadDescription('');
      setUploadFile(null);
      setUploadUrl('');
      setUploadDuration('');
      fetchMaterials();
    } catch (err: any) {
      setUploadError(err.message || 'Error creating material');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      const res = await fetch(`${API_BASE}/materials/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
      } else {
        const errJson = await res.json();
        alert(errJson.message || 'Failed to delete material');
      }
    } catch (err) {
      console.error('Error deleting material:', err);
    }
  };

  const filteredMaterials = materials.filter((m) => {
    if (filterType !== 'ALL' && m.type !== filterType) return false;
    if (selectedSubjectId && m.subjectId !== selectedSubjectId) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Action Header & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900/80 p-5 border border-slate-800 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white">Learning Materials & Media</h2>
          <p className="text-xs text-slate-400 mt-1">
            Access subject materials, watch lecture videos, preview documents, and track learning progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Material Types</option>
            <option value="VIDEO">Videos ??</option>
            <option value="PDF">PDF Documents ??</option>
            <option value="NOTES">Notes & Text ??</option>
            <option value="IMAGE">Images & Diagrams ???</option>
            <option value="AUDIO">Audio Lectures ??</option>
          </select>

          {/* Subject Filter */}
          {subjects.length > 0 && (
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} - {sub.name}
                </option>
              ))}
            </select>
          )}

          {/* Teacher or Admin Upload Button */}
          {(currentUserRole === 'TEACHER' || currentUserRole === 'ADMIN') && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs px-4 py-2.5 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
            >
              ? Upload Material
            </button>
          )}
        </div>
      </div>

      {/* Material Grid / List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-12 text-center text-slate-400">
          <p className="text-lg font-medium">No materials available</p>
          <p className="text-xs text-slate-500 mt-1">
            {currentUserRole === 'TEACHER'
              ? 'Click "+ Upload Material" above to share videos, PDFs, notes, images, or audio.'
              : 'Your teachers have not uploaded materials for this subject/department yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl transition-all hover:border-slate-700 hover:shadow-2xl"
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      item.type === 'VIDEO'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : item.type === 'PDF'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : item.type === 'IMAGE'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : item.type === 'AUDIO'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {item.type}
                  </span>

                  {item.subject && (
                    <span className="text-xs text-slate-400 truncate font-medium">
                      {item.subject.name}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-white line-clamp-2">{item.title}</h3>
                {item.description && (
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{item.description}</p>
                )}

                {/* Teacher / Meta info */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  {item.teacher && (
                    <p>
                      Prof: <span className="text-slate-300 font-medium">{item.teacher.firstName} {item.teacher.lastName}</span>
                    </p>
                  )}
                  <p>
                    Uploaded: <span className="text-slate-300 font-medium">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </p>
                </div>

                {/* Student Progress Display on Card */}
                {currentUserRole === 'STUDENT' && item.type === 'VIDEO' && (
                  <div className="mt-3 pt-3 border-t border-slate-800/60">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-400 font-medium text-[11px]">Watch Progress</span>
                      <span className={`font-bold font-mono text-[11px] ${item.userProgress?.isCompleted ? 'text-emerald-400' : 'text-indigo-400'}`}>
                        {item.userProgress?.completionPercent || 0}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.userProgress?.isCompleted
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                            : 'bg-gradient-to-r from-indigo-600 to-violet-500'
                        }`}
                        style={{ width: `${item.userProgress?.completionPercent || 0}%` }}
                      />
                    </div>
                    {item.userProgress?.isCompleted && (
                      <span className="inline-block mt-2 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 border border-emerald-500/25 font-semibold">
                        ? Completed
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={() => setActiveViewerMaterial(item)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs py-2.5 shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
                >
                  ??? View {item.type.toLowerCase()}
                </button>

                {/* Video Analytics Button for Teacher / HOD / Admin */}
                {item.type === 'VIDEO' && currentUserRole !== 'STUDENT' && (
                  <button
                    onClick={() => setActiveAnalyticsMaterialId(item.id)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 font-semibold text-xs py-2 transition-all hover:border-indigo-500/60"
                  >
                    ?? Video Analytics & Tracking
                  </button>
                )}

                {/* Delete button */}
                {(currentUserRole === 'ADMIN' ||
                  (currentUserRole === 'TEACHER' && item.teacherId === currentUserId) ||
                  currentUserRole === 'HOD') && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-right text-[11px] text-red-400 hover:text-red-300 hover:underline pt-1 transition-colors"
                  >
                    Delete material
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Material Viewer Modal */}
      {activeViewerMaterial && (
        <MaterialViewer
          material={activeViewerMaterial}
          token={token}
          onClose={() => setActiveViewerMaterial(null)}
        />
      )}

      {/* Video Analytics Modal */}
      {activeAnalyticsMaterialId && (
        <VideoAnalyticsModal
          materialId={activeAnalyticsMaterialId}
          token={token}
          onClose={() => setActiveAnalyticsMaterialId(null)}
        />
      )}

      {/* Teacher / Admin Upload Material Modal (Stitch Design) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl">
          <div
            className="w-full max-w-xl rounded-2xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #051424 100%)',
              border: '1px solid rgba(99,102,241,0.25)',
              boxShadow: '0 0 60px rgba(99,102,241,0.1), 0 25px 50px rgba(0,0,0,0.7)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b shrink-0"
              style={{ borderColor: 'rgba(99,102,241,0.15)', background: 'rgba(5,20,36,0.8)' }}
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-lg">
                  ??
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Upload Learning Material</h3>
                  <p className="text-[11px] text-slate-400">Share video lectures, notes, PDFs, or media with students</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors border border-slate-800"
              >
                ?
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {uploadError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-red-400 text-xs flex items-center gap-2">
                  <span>?</span>
                  <span>{uploadError}</span>
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
                {/* Material Type Icon Tile Selector */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-2">Select Material Type *</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { type: 'VIDEO', icon: '??', label: 'Video' },
                      { type: 'PDF', icon: '??', label: 'PDF' },
                      { type: 'NOTES', icon: '??', label: 'Notes' },
                      { type: 'IMAGE', icon: '???', label: 'Image' },
                      { type: 'AUDIO', icon: '??', label: 'Audio' },
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setUploadType(item.type as any)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                          uploadType === item.type
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <span className="text-xl mb-1">{item.icon}</span>
                        <span className="font-semibold text-[11px]">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Material Title *</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Chapter 3: Advanced Data Structures & Trees"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Description (Optional)</label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Brief summary of what this material covers..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  />
                </div>

                {/* Department & Subject side-by-side */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Department *</label>
                    <select
                      value={uploadDeptId}
                      onChange={(e) => setUploadDeptId(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-indigo-500 transition-all"
                    >
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">Subject (Optional)</label>
                    <select
                      value={uploadSubjId}
                      onChange={(e) => setUploadSubjId(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white outline-none focus:border-indigo-500 transition-all"
                    >
                      <option value="">General Subject</option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.code} - {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Video Duration (if Video) */}
                {uploadType === 'VIDEO' && (
                  <div>
                    <label className="block text-slate-300 font-medium mb-1.5">
                      Video Duration (in seconds)
                    </label>
                    <input
                      type="number"
                      value={uploadDuration}
                      onChange={(e) => setUploadDuration(e.target.value)}
                      placeholder="e.g. 1800 for 30 minutes"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                )}

                {/* Source Method Switcher */}
                <div>
                  <label className="block text-slate-300 font-medium mb-1.5">Source Method *</label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setUploadMethod('FILE')}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        uploadMethod === 'FILE'
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      ?? Direct File Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMethod('URL')}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        uploadMethod === 'URL'
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      ?? Media URL / Link
                    </button>
                  </div>

                  {uploadMethod === 'FILE' ? (
                    <div className="rounded-xl border-2 border-dashed border-indigo-500/30 bg-indigo-500/5 p-5 text-center hover:border-indigo-500/60 transition-all">
                      <input
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="w-full text-slate-300 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                        required
                      />
                      {uploadFile && (
                        <p className="text-emerald-400 text-[11px] font-semibold mt-2">
                          Selected: {uploadFile.name} ({(uploadFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                  ) : (
                    <input
                      type="url"
                      value={uploadUrl}
                      onChange={(e) => setUploadUrl(e.target.value)}
                      placeholder="https://example.com/lecture-video.mp4"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                      required
                    />
                  )}
                </div>

                {/* Upload Progress Bar if active */}
                {isUploading && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs text-indigo-400 font-semibold">
                      <span>Uploading material...</span>
                      <span className="animate-pulse">Processing...</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden border border-indigo-500/30">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse w-full" />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 border-t border-slate-800/80 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="rounded-xl border border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 hover:scale-105"
                  >
                    {isUploading ? 'Uploading...' : 'Publish Material'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
