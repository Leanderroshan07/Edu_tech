"use client";

import React, { useState } from "react";
import MaterialsList from "../../materials/MaterialsList";

type Dept    = { id: string; code: string; name: string };
type Subject = { id: string; code: string; name: string; departmentId: string; credits?: number; semester?: number };
export type User = {
  id: string; email: string; firstName: string; lastName: string; role: string; status: string;
  profile?: {
    employeeNumber?: string; designation?: string; qualification?: string;
    departmentId?: string; department?: Dept;
    teachingDepartments?: Array<{ departmentId: string; department?: Dept }>;
    teacherSubjects?: Array<{ subjectId: string; type: string; subject?: Subject }>;
  } | null;
};

type Props = {
  currentUser: User;
  token?: string | null;
  allTeachers: User[];
  departments: Dept[];
  subjects: Subject[];
  onAddTeachingDepartment: (uid: string, deptId: string) => Promise<void>;
  onRemoveTeachingDepartment: (uid: string, deptId: string) => Promise<void>;
  onAddTeacherSubject: (uid: string, subId: string, deptId: string, t: "PRIMARY" | "SECONDARY") => Promise<void>;
  onRemoveTeacherSubject: (uid: string, subId: string) => Promise<void>;
  activeSubTab?: string;
};

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

export const TeacherDashboard: React.FC<Props> = ({
  currentUser, token, subjects, departments, activeSubTab = "dashboard",
  onAddTeachingDepartment, onRemoveTeachingDepartment,
}) => {
  const profile = currentUser.profile;
  const primaryDept = profile?.department;
  const teachingDepts: Array<{ departmentId: string; department?: Dept }> = profile?.teachingDepartments || [];

  // ── UPLOAD / MATERIALS TAB ──────────────────────────────
  if (activeSubTab === "upload") {
    return (
      <div className="animate-fade-slide">
        <SectionHeader title="Upload Material" desc="Share learning resources with your students" />
        <MaterialsList
          token={token || ""}
          currentUserRole="TEACHER"
          currentUserId={currentUser.id}
          userDepartmentId={profile?.departmentId}
        />
      </div>
    );
  }

  // ── MY SUBJECTS TAB ─────────────────────────────────────
  if (activeSubTab === "subjects") {
    return (
      <div className="space-y-5 animate-fade-slide">
        <SectionHeader title="My Subjects" desc="Courses assigned to you by your HOD" />
        {subjects.length === 0 ? (
          <div className="card">
            <EmptyState icon="📚" title="No subjects assigned" desc="Your HOD will assign subjects to you. Once assigned, they appear here." />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((s, i) => (
              <div key={s.id} className={`card card-hover p-5 animate-fade-slide stagger-${Math.min(i + 1, 4)}`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="code-chip">{s.code}</span>
                  {s.semester != null && (
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded-full">Sem {s.semester}</span>
                  )}
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-snug mt-2">{s.name}</h3>
                {s.credits != null && <p className="text-xs text-[var(--text-muted)] mt-1">{s.credits} credits</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── DEPARTMENTS TAB ─────────────────────────────────────
  if (activeSubTab === "departments") {
    return <DepartmentsTab
      currentUser={currentUser}
      primaryDept={primaryDept}
      teachingDepts={teachingDepts}
      allDepts={departments}
      onAdd={onAddTeachingDepartment}
      onRemove={onRemoveTeachingDepartment}
    />;
  }

  // ── ANALYTICS TAB ───────────────────────────────────────
  if (activeSubTab === "analytics") {
    return (
      <div className="space-y-5 animate-fade-slide">
        <SectionHeader title="Student Analytics" desc="Track learning progress across your courses" />
        <MaterialsList
          token={token || ""}
          currentUserRole="TEACHER"
          currentUserId={currentUser.id}
          userDepartmentId={profile?.departmentId}
        />
      </div>
    );
  }

  // ── DASHBOARD (default) ─────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Welcome header */}
      <div className="flex items-start gap-4">
        <div className="avatar avatar-lg" style={{ background: "linear-gradient(135deg,#059669,#10b981)" }}>
          {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
        </div>
        <div>
          <h1 className="section-title">
            Welcome, {profile?.designation ? `${profile.designation} ` : ""}{currentUser.firstName} {currentUser.lastName}
          </h1>
          <p className="section-subtitle">
            {primaryDept?.name || "—"} · {profile?.employeeNumber || "—"}
          </p>
          {profile?.qualification && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{profile.qualification}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Assigned Subjects",    value: subjects.length,              accent: "accent-indigo",  icon: "📚" },
          { label: "Primary Dept",         value: primaryDept?.code || "—",    accent: "accent-emerald", icon: "🏛️" },
          { label: "Teaching Departments", value: teachingDepts.length + 1,    accent: "accent-sky",     icon: "🌐" },
          { label: "Status",               value: "Active",                     accent: "accent-amber",   icon: "✅" },
        ].map((s, i) => (
          <div key={s.label} className={`stat-card ${s.accent} animate-fade-slide stagger-${i + 1}`}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-number text-2xl">{s.value}</div>
            <div className="text-2xl mt-2 opacity-70">{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Subjects quick view */}
      {subjects.length > 0 && (
        <div className="card p-5">
          <div className="text-sm font-semibold text-[var(--text-primary)] mb-3">My Subjects</div>
          <div className="flex flex-wrap gap-2">
            {subjects.map(s => (
              <span key={s.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--surface-muted)] text-xs font-medium text-[var(--text-secondary)]">
                <span className="code-chip">{s.code}</span>
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Materials */}
      <MaterialsList
        token={token || ""}
        currentUserRole="TEACHER"
        currentUserId={currentUser.id}
        userDepartmentId={profile?.departmentId}
      />
    </div>
  );
};

// ═══ Departments Sub-tab ═════════════════════════════════════
function DepartmentsTab({ currentUser, primaryDept, teachingDepts, allDepts, onAdd, onRemove }: {
  currentUser: User; primaryDept?: Dept; teachingDepts: Array<{ departmentId: string; department?: Dept }>;
  allDepts: Dept[]; onAdd: (uid: string, deptId: string) => Promise<void>;
  onRemove: (uid: string, deptId: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [selectedDept, setSelectedDept] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // departments not already teaching in
  const alreadyIds = new Set([primaryDept?.id, ...teachingDepts.map(d => d.departmentId)]);
  const available = allDepts.filter(d => !alreadyIds.has(d.id));

  const handleAdd = async () => {
    if (!selectedDept) return;
    setLoadingId("add");
    try {
      await onAdd(currentUser.id, selectedDept);
      setSelectedDept("");
      setAdding(false);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = async (deptId: string) => {
    setLoadingId(deptId);
    try {
      await onRemove(currentUser.id, deptId);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-5 animate-fade-slide">
      <SectionHeader
        title="Teaching Departments"
        desc="Manage the departments you teach in"
        action={
          available.length > 0 ? (
            <button onClick={() => setAdding(!adding)} className="btn btn-primary btn-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Add Department
            </button>
          ) : null
        }
      />

      {/* Add form */}
      {adding && (
        <div className="card p-5 border-indigo-200 dark:border-indigo-800/40 animate-slide-right">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Request Secondary Teaching Department</p>
          <div className="flex gap-3">
            <select className="field flex-1" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
              <option value="">Select department…</option>
              {available.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
            <button onClick={handleAdd} disabled={!selectedDept || loadingId === "add"} className="btn btn-primary btn-sm">
              {loadingId === "add" ? "Adding…" : "Add"}
            </button>
            <button onClick={() => setAdding(false)} className="btn btn-secondary btn-sm">Cancel</button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">This sends a request to the target department's HOD for approval.</p>
        </div>
      )}

      {/* Primary dept card */}
      <div>
        <p className="field-label mb-2">Primary Department</p>
        {primaryDept ? (
          <div className="card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">{primaryDept.code}</span>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-[var(--text-primary)]">{primaryDept.name}</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">Your home department</div>
            </div>
            <span className="badge badge-active">Primary</span>
          </div>
        ) : (
          <div className="card p-4 text-sm text-[var(--text-muted)]">No primary department set.</div>
        )}
      </div>

      {/* Secondary depts */}
      <div>
        <p className="field-label mb-2">Secondary Departments ({teachingDepts.length})</p>
        {teachingDepts.length === 0 ? (
          <div className="card">
            <EmptyState icon="🌐" title="No secondary departments" desc="Add departments to expand your teaching scope and visibility." />
          </div>
        ) : (
          <div className="space-y-3">
            {teachingDepts.map((td) => {
              const d = td.department || allDepts.find(x => x.id === td.departmentId);
              return (
                <div key={td.departmentId} className="card p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center shrink-0 border border-[var(--surface-muted)]">
                    <span className="font-bold text-sm text-[var(--text-secondary)]">{d?.code || "?"}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[var(--text-primary)]">{d?.name || "Unknown Department"}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">Secondary teaching dept</div>
                  </div>
                  <button
                    onClick={() => handleRemove(td.departmentId)}
                    disabled={loadingId === td.departmentId}
                    className="btn btn-secondary btn-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    {loadingId === td.departmentId ? "…" : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
