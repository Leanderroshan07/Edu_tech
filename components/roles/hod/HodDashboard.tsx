"use client";

import React, { useState } from "react";

type Dept    = { id: string; code: string; name: string };
type User    = { id: string; email: string; firstName: string; lastName: string; role: string; status: string; profile?: any };
type Subject = { id: string; code: string; name: string; departmentId: string; credits?: number; semester?: number; teacherSubjects?: any[] };
type Request = { id: string; type: string; status: string; note?: string; createdAt: string; requester?: User; targetDept?: Dept; subject?: Subject };

type Props = {
  currentUser: User;
  token?: string | null;
  allFaculty: User[];
  allStudents: User[];
  departments: Dept[];
  subjects: Subject[];
  pendingRequests: Request[];
  onCreateSubject: (dto: { name: string; code: string; credits: number; semester: number; departmentId: string }) => Promise<void>;
  onAssignTeacher: (teacherUserId: string, subjectId: string, deptId: string, type: "PRIMARY" | "SECONDARY") => Promise<void>;
  onApproveRequest: (id: string) => Promise<void>;
  onRejectRequest: (id: string) => Promise<void>;
  activeSubTab?: string;
};

// ── Shared helpers ─────────────────────────────────────────
function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon text-2xl">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">{desc}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="section-title">{title}</h2>
        {desc && <p className="section-subtitle">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export const HodDashboard: React.FC<Props> = ({
  currentUser, allFaculty, allStudents, departments, subjects, pendingRequests,
  onCreateSubject, onAssignTeacher, onApproveRequest, onRejectRequest,
  activeSubTab = "overview",
}) => {
  const dept = currentUser.profile?.department || departments.find(d => d.id === currentUser.profile?.departmentId);

  // ── SUBJECTS TAB ──────────────────────────────────────────
  if (activeSubTab === "subjects") {
    return <SubjectsTab
      dept={dept}
      departments={departments}
      subjects={subjects}
      allFaculty={allFaculty}
      currentUser={currentUser}
      onCreateSubject={onCreateSubject}
      onAssignTeacher={onAssignTeacher}
    />;
  }

  // ── FACULTY TAB ───────────────────────────────────────────
  if (activeSubTab === "faculty") {
    return <FacultyTab allFaculty={allFaculty} dept={dept} subjects={subjects} />;
  }

  // ── APPROVALS TAB ─────────────────────────────────────────
  if (activeSubTab === "approvals") {
    return <ApprovalsTab pendingRequests={pendingRequests} onApprove={onApproveRequest} onReject={onRejectRequest} />;
  }

  // ── REPORTS TAB ───────────────────────────────────────────
  if (activeSubTab === "reports") {
    return <ReportsTab subjects={subjects} allStudents={allStudents} />;
  }

  // ── OVERVIEW (default) ────────────────────────────────────
  return <OverviewTab currentUser={currentUser} dept={dept} allFaculty={allFaculty} allStudents={allStudents} subjects={subjects} pendingRequests={pendingRequests} />;
};

// ═══ Overview Tab ═══════════════════════════════════════════
function OverviewTab({ currentUser, dept, allFaculty, allStudents, subjects, pendingRequests }: any) {
  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="avatar avatar-lg" style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
          {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
        </div>
        <div>
          <h1 className="section-title">
            Welcome, {currentUser.firstName} {currentUser.lastName}
          </h1>
          <p className="section-subtitle">
            Head of Department — {dept?.name || "Department"}
          </p>
          {dept && <span className="code-chip mt-1">{dept.code}</span>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Students",          value: allStudents.length, accent: "accent-indigo",  icon: "🎓" },
          { label: "Faculty",           value: allFaculty.length,  accent: "accent-emerald", icon: "👩‍🏫" },
          { label: "Subjects",          value: subjects.length,    accent: "accent-sky",     icon: "📚" },
          { label: "Pending Approvals", value: pendingRequests.length, accent: pendingRequests.length > 0 ? "accent-rose" : "accent-amber", icon: "⏳" },
        ].map((s, i) => (
          <div key={s.label} className={`stat-card ${s.accent} animate-fade-slide stagger-${i + 1}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-number">{s.value}</div>
            <div className="text-2xl mt-2 opacity-80">{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faculty list */}
        <div className="card p-5">
          <div className="text-sm font-semibold text-[var(--text-primary)] mb-4">Faculty Members</div>
          {allFaculty.length === 0 ? (
            <EmptyState icon="👥" title="No faculty yet" desc="Faculty members will appear here once assigned." />
          ) : (
            <div className="space-y-3">
              {allFaculty.slice(0, 5).map((f: User) => (
                <div key={f.id} className="flex items-center gap-3">
                  <div className="avatar avatar-sm" style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
                    {f.firstName?.[0]}{f.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)] truncate">{f.firstName} {f.lastName}</div>
                    <div className="text-xs text-[var(--text-muted)]">{f.profile?.designation || "Faculty"}</div>
                  </div>
                  <span className={`badge ${f.status === "ACTIVE" ? "badge-active" : "badge-inactive"}`}>{f.status}</span>
                </div>
              ))}
              {allFaculty.length > 5 && (
                <p className="text-xs text-[var(--text-muted)] pt-1">+{allFaculty.length - 5} more faculty</p>
              )}
            </div>
          )}
        </div>

        {/* Recent subjects */}
        <div className="card p-5">
          <div className="text-sm font-semibold text-[var(--text-primary)] mb-4">Subjects</div>
          {subjects.length === 0 ? (
            <EmptyState icon="📖" title="No subjects yet" desc="Create subjects in the Subjects tab." />
          ) : (
            <div className="space-y-2">
              {subjects.slice(0, 5).map((s: Subject) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-[var(--surface-subtle)] last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className="code-chip">{s.code}</span>
                    <span className="text-sm text-[var(--text-primary)]">{s.name}</span>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">Sem {s.semester ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ Subjects Tab ════════════════════════════════════════════
function SubjectsTab({ dept, departments, subjects, allFaculty, currentUser, onCreateSubject, onAssignTeacher }: any) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", credits: 3, semester: 1, departmentId: dept?.id || "" });
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [assignModal, setAssignModal] = useState<{ subject: Subject; open: boolean } | null>(null);
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assignType, setAssignType] = useState<"PRIMARY" | "SECONDARY">("PRIMARY");
  const [assignLoading, setAssignLoading] = useState(false);
  const [search, setSearch] = useState("");

  const filteredSubjects = subjects.filter((s: Subject) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.departmentId) {
      setFormErr("Name, code, and department are required.");
      return;
    }
    setFormErr("");
    setSubmitting(true);
    try {
      await onCreateSubject({ ...form, credits: Number(form.credits), semester: Number(form.semester) });
      setForm({ name: "", code: "", credits: 3, semester: 1, departmentId: dept?.id || "" });
      setShowForm(false);
    } catch (e: any) {
      setFormErr(e.message || "Failed to create subject");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!assignModal || !assignTeacherId) return;
    setAssignLoading(true);
    try {
      await onAssignTeacher(assignTeacherId, assignModal.subject.id, assignModal.subject.departmentId, assignType);
      setAssignModal(null);
      setAssignTeacherId("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-slide">
      <SectionHeader
        title="Subjects"
        desc={`${dept?.name || "Department"} curriculum`}
        action={
          <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New Subject
          </button>
        }
      />

      {/* Create form */}
      {showForm && (
        <div className="card p-5 border-indigo-200 dark:border-indigo-800/40 animate-slide-right">
          <div className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg gradient-brand flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            </span>
            Create New Subject
          </div>
          {formErr && <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium">{formErr}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Subject Name *</label>
              <input className="field" placeholder="e.g. Data Structures" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="field-label">Subject Code *</label>
              <input className="field" placeholder="e.g. CS301" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required />
            </div>
            <div>
              <label className="field-label">Credits</label>
              <input className="field" type="number" min={1} max={6} value={form.credits} onChange={e => setForm(f => ({ ...f, credits: +e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Semester</label>
              <input className="field" type="number" min={1} max={8} value={form.semester} onChange={e => setForm(f => ({ ...f, semester: +e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">Department *</label>
              <select className="field" value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                <option value="">Select department…</option>
                {departments.map((d: Dept) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
                {submitting ? "Creating…" : "Create Subject"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-xs">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input className="field pl-9" placeholder="Search subjects…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Grid */}
      {filteredSubjects.length === 0 ? (
        <div className="card">
          <EmptyState icon="📚" title="No subjects found" desc={search ? "Try a different search term." : "Create your first subject using the button above."} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((s: Subject, i: number) => (
            <div key={s.id} className={`card card-hover p-5 animate-fade-slide stagger-${Math.min(i + 1, 4)}`}>
              <div className="flex items-start justify-between mb-3">
                <span className="code-chip">{s.code}</span>
                {s.semester != null && (
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded-full">
                    Sem {s.semester}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-snug mb-1">{s.name}</h3>
              {s.credits != null && (
                <p className="text-xs text-[var(--text-muted)]">{s.credits} credits</p>
              )}
              {/* Teachers */}
              {s.teacherSubjects && s.teacherSubjects.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.teacherSubjects.map((ts: any) => (
                    <span key={ts.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {ts.teacherProfile?.user?.firstName} {ts.teacherProfile?.user?.lastName}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <button
                  onClick={() => setAssignModal({ subject: s, open: true })}
                  className="btn btn-secondary btn-sm w-full"
                >
                  Assign Teacher
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Teacher Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--surface-muted)]">
              <h3 className="font-semibold text-[var(--text-primary)]">Assign Teacher</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                <span className="code-chip mr-1">{assignModal.subject.code}</span>
                {assignModal.subject.name}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="field-label">Select Faculty</label>
                <select className="field" value={assignTeacherId} onChange={e => setAssignTeacherId(e.target.value)}>
                  <option value="">Choose faculty member…</option>
                  {allFaculty.map((f: User) => (
                    <option key={f.id} value={f.id}>
                      {f.firstName} {f.lastName} ({f.profile?.employeeNumber || f.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Assignment Type</label>
                <select className="field" value={assignType} onChange={e => setAssignType(e.target.value as "PRIMARY" | "SECONDARY")}>
                  <option value="PRIMARY">Primary (Lead Teacher)</option>
                  <option value="SECONDARY">Secondary (Support)</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-[var(--surface-muted)] flex gap-3 justify-end">
              <button onClick={() => setAssignModal(null)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={handleAssign} disabled={!assignTeacherId || assignLoading} className="btn btn-primary btn-sm">
                {assignLoading ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ Faculty Tab ═════════════════════════════════════════════
function FacultyTab({ allFaculty, dept, subjects }: any) {
  const [search, setSearch] = useState("");
  const filtered = allFaculty.filter((f: User) =>
    !search || `${f.firstName} ${f.lastName} ${f.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-slide">
      <SectionHeader title="Faculty" desc={`${dept?.name || "Department"} teaching staff`} />

      <div className="relative max-w-xs">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input className="field pl-9" placeholder="Search faculty…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState icon="👩‍🏫" title="No faculty found" desc="Faculty members assigned to your department appear here." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                {["Faculty Member", "Employee ID", "Designation", "Status"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f: User, i: number) => (
                <tr key={f.id} className={`animate-fade-slide stagger-${Math.min(i + 1, 4)}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar avatar-sm" style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
                        {f.firstName?.[0]}{f.lastName?.[0]}
                      </div>
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">{f.firstName} {f.lastName}</div>
                        <div className="text-xs text-[var(--text-muted)]">{f.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="code-chip">{f.profile?.employeeNumber || "—"}</span></td>
                  <td className="text-[var(--text-secondary)]">{f.profile?.designation || "Faculty"}</td>
                  <td><span className={`badge ${f.status === "ACTIVE" ? "badge-active" : "badge-inactive"}`}>{f.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══ Approvals Tab ═══════════════════════════════════════════
function ApprovalsTab({ pendingRequests, onApprove, onReject }: any) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setLoadingId(id);
    try {
      if (action === "approve") await onApprove(id);
      else await onReject(id);
    } finally {
      setLoadingId(null);
    }
  };

  const REQUEST_TYPE_LABELS: Record<string, string> = {
    STUDENT_APPROVAL: "Student Registration",
    TEACHER_DEPT_REQUEST: "Secondary Dept Request",
    TEACHER_SUBJECT_REQUEST: "Subject Assignment",
  };

  return (
    <div className="space-y-5 animate-fade-slide">
      <SectionHeader
        title="Approval Requests"
        desc={pendingRequests.length > 0 ? `${pendingRequests.length} pending review` : "All caught up"}
      />

      {pendingRequests.length === 0 ? (
        <div className="card">
          <EmptyState icon="✅" title="No pending requests" desc="Faculty requests for subject or department assignments will appear here." />
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((r: Request, i: number) => (
            <div key={r.id} className={`card p-5 animate-fade-slide stagger-${Math.min(i + 1, 4)}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge badge-pending">{REQUEST_TYPE_LABELS[r.type] || r.type}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.requester && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="avatar avatar-sm" style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
                        {r.requester.firstName?.[0]}{r.requester.lastName?.[0]}
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {r.requester.firstName} {r.requester.lastName}
                      </span>
                    </div>
                  )}
                  {r.targetDept && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Department: <span className="code-chip ml-1">{r.targetDept.code}</span>
                    </p>
                  )}
                  {r.subject && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Subject: <span className="code-chip ml-1">{r.subject.code}</span> {r.subject.name}
                    </p>
                  )}
                  {r.note && <p className="text-xs text-[var(--text-muted)] mt-2 italic">"{r.note}"</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(r.id, "reject")}
                    disabled={loadingId === r.id}
                    className="btn btn-secondary btn-sm text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAction(r.id, "approve")}
                    disabled={loadingId === r.id}
                    className="btn btn-primary btn-sm"
                    style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}
                  >
                    {loadingId === r.id ? "…" : "Approve"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ Reports Tab ═════════════════════════════════════════════
function ReportsTab({ subjects, allStudents }: any) {
  return (
    <div className="space-y-5 animate-fade-slide">
      <SectionHeader title="Reports" desc="Department performance overview" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
        {[
          { label: "Total Students",  value: allStudents.length, accent: "accent-indigo" },
          { label: "Total Subjects",  value: subjects.length,    accent: "accent-sky" },
          { label: "Avg Completion",  value: "—",                accent: "accent-emerald" },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.accent}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-number">{s.value}</div>
          </div>
        ))}
      </div>

      {subjects.length === 0 ? (
        <div className="card">
          <EmptyState icon="📊" title="No data yet" desc="Reports generate once subjects are configured and students begin learning." />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                {["Subject", "Code", "Semester", "Credits", "Teachers"].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjects.map((s: Subject) => (
                <tr key={s.id}>
                  <td className="font-medium text-[var(--text-primary)]">{s.name}</td>
                  <td><span className="code-chip">{s.code}</span></td>
                  <td className="text-[var(--text-secondary)]">Sem {s.semester ?? "—"}</td>
                  <td className="text-[var(--text-secondary)]">{s.credits ?? "—"}</td>
                  <td className="text-[var(--text-secondary)]">{s.teacherSubjects?.length ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
