"use client";

import React, { useState } from "react";

type User    = { id: string; email: string; firstName: string; lastName: string; role: string; status: string; profile?: any };
type Dept    = { id: string; code: string; name: string; description?: string };
type Subject = { id: string; code: string; name: string; departmentId: string };

type Props = {
  currentUser: User;
  users: User[];
  departments: Dept[];
  subjects: Subject[];
  onCreateUser: (dto: any) => Promise<void>;
  onCreateDept: (dto: { name: string; code: string; description?: string }) => Promise<void>;
  activeSubTab?: string;
};

// ── Helpers ─────────────────────────────────────────────────
const ROLE_BADGE: Record<string, string> = {
  STUDENT: "badge badge-student",
  TEACHER: "badge badge-teacher",
  HOD:     "badge badge-hod",
  ADMIN:   "badge badge-admin",
};
const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    "badge badge-active",
  INACTIVE:  "badge badge-inactive",
  SUSPENDED: "badge badge-suspended",
};
const AVATAR_GRAD: Record<string, string> = {
  STUDENT: "linear-gradient(135deg,#6366f1,#8b5cf6)",
  TEACHER: "linear-gradient(135deg,#059669,#10b981)",
  HOD:     "linear-gradient(135deg,#7c3aed,#a855f7)",
  ADMIN:   "linear-gradient(135deg,#ea580c,#f97316)",
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

// ── Create User Modal ────────────────────────────────────────
function CreateUserModal({ departments, onSubmit, onClose }: {
  departments: Dept[]; onSubmit: (dto: any) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "",
    role: "STUDENT", departmentId: "",
    registerNumber: "", admissionYear: new Date().getFullYear(), academicYear: 1, semester: 1, section: "",
    employeeNumber: "", designation: "", qualification: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.departmentId) {
      setError("All required fields must be filled."); return;
    }
    setError("");
    setLoading(true);
    try {
      const dto: any = {
        firstName: form.firstName, lastName: form.lastName,
        email: form.email, password: form.password,
        role: form.role, departmentId: form.departmentId,
      };
      if (form.role === "STUDENT") {
        dto.registerNumber = form.registerNumber;
        dto.admissionYear = +form.admissionYear;
        dto.academicYear = +form.academicYear;
        dto.semester = +form.semester;
        dto.section = form.section || undefined;
      } else if (form.role === "TEACHER") {
        dto.employeeNumber = form.employeeNumber;
        dto.designation = form.designation || undefined;
        dto.qualification = form.qualification || undefined;
      } else if (form.role === "HOD") {
        dto.employeeNumber = form.employeeNumber;
      }
      await onSubmit(dto);
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[var(--surface-muted)] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">Create User</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Add a new member to the institution</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-900/40">{error}</div>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">First Name *</label>
                <input className="field" placeholder="John" value={form.firstName} onChange={e => set("firstName", e.target.value)} required />
              </div>
              <div>
                <label className="field-label">Last Name *</label>
                <input className="field" placeholder="Doe" value={form.lastName} onChange={e => set("lastName", e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="field-label">Email *</label>
              <input className="field" type="email" placeholder="john@institution.edu" value={form.email} onChange={e => set("email", e.target.value)} required />
            </div>

            <div>
              <label className="field-label">Password *</label>
              <input className="field" type="password" placeholder="Min 8 characters" value={form.password} onChange={e => set("password", e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Role *</label>
                <select className="field" value={form.role} onChange={e => set("role", e.target.value)}>
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="HOD">HOD</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="field-label">Department *</label>
                <select className="field" value={form.departmentId} onChange={e => set("departmentId", e.target.value)} required>
                  <option value="">Select…</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            {/* Role-specific fields */}
            {form.role === "STUDENT" && (
              <div className="space-y-3 pt-2 border-t border-[var(--surface-muted)]">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Student Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Register Number *</label>
                    <input className="field" placeholder="REG2024001" value={form.registerNumber} onChange={e => set("registerNumber", e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Admission Year</label>
                    <input className="field" type="number" value={form.admissionYear} onChange={e => set("admissionYear", +e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Academic Year</label>
                    <input className="field" type="number" min={1} max={4} value={form.academicYear} onChange={e => set("academicYear", +e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label">Semester</label>
                    <input className="field" type="number" min={1} max={8} value={form.semester} onChange={e => set("semester", +e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="field-label">Section</label>
                    <input className="field" placeholder="A" value={form.section} onChange={e => set("section", e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {(form.role === "TEACHER" || form.role === "HOD") && (
              <div className="space-y-3 pt-2 border-t border-[var(--surface-muted)]">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{form.role === "HOD" ? "HOD" : "Teacher"} Details</p>
                <div>
                  <label className="field-label">Employee Number *</label>
                  <input className="field" placeholder="EMP001" value={form.employeeNumber} onChange={e => set("employeeNumber", e.target.value)} />
                </div>
                {form.role === "TEACHER" && (
                  <>
                    <div>
                      <label className="field-label">Designation</label>
                      <input className="field" placeholder="Assistant Professor" value={form.designation} onChange={e => set("designation", e.target.value)} />
                    </div>
                    <div>
                      <label className="field-label">Qualification</label>
                      <input className="field" placeholder="M.Tech, Ph.D" value={form.qualification} onChange={e => set("qualification", e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-[var(--surface-muted)] flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating…</>
              ) : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Dept Modal ────────────────────────────────────────
function CreateDeptModal({ onSubmit, onClose }: {
  onSubmit: (dto: { name: string; code: string; description?: string }) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setError("Name and code are required."); return; }
    setError("");
    setLoading(true);
    try {
      await onSubmit({ name: form.name.trim(), code: form.code.trim().toUpperCase(), description: form.description.trim() || undefined });
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to create department");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-[var(--surface-muted)] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">Create Department</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Add a new academic department</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium border border-red-200 dark:border-red-900/40">{error}</div>}
            <div>
              <label className="field-label">Department Name *</label>
              <input className="field" placeholder="Computer Science Engineering" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label className="field-label">Department Code *</label>
              <input className="field" placeholder="CSE" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required />
            </div>
            <div>
              <label className="field-label">Description</label>
              <textarea className="field" rows={3} placeholder="Optional description…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="p-6 border-t border-[var(--surface-muted)] flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creating…</> : "Create Department"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export const AdminDashboard: React.FC<Props> = ({
  currentUser, users, departments, subjects, onCreateUser, onCreateDept, activeSubTab = "command",
}) => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateDept, setShowCreateDept] = useState(false);

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchSearch && matchRole;
  });
  const roleCount = (r: string) => users.filter(u => u.role === r).length;

  // ── USERS TAB ────────────────────────────────────────────
  if (activeSubTab === "users") {
    return (
      <div className="space-y-5 animate-fade-slide">
        {showCreateUser && (
          <CreateUserModal departments={departments} onSubmit={onCreateUser} onClose={() => setShowCreateUser(false)} />
        )}
        <SectionHeader
          title="Users"
          desc={`${users.length} total members`}
          action={
            <button onClick={() => setShowCreateUser(true)} className="btn btn-primary btn-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Add User
            </button>
          }
        />
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…" className="field pl-9" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="field w-auto">
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Student</option>
            <option value="TEACHER">Faculty</option>
            <option value="HOD">HOD</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        {filteredUsers.length === 0 ? (
          <div className="card"><EmptyState icon="👤" title={search || roleFilter !== "ALL" ? "No users match" : "No users yet"} desc="Create users with the Add User button." /></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>{["Member", "Email", "Role", "Status"].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => (
                  <tr key={u.id} className={`animate-fade-slide stagger-${Math.min(i + 1, 4)}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar avatar-sm" style={{ background: AVATAR_GRAD[u.role] ?? "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <span className="font-medium text-[var(--text-primary)]">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="text-[var(--text-muted)] text-xs">{u.email}</td>
                    <td><span className={ROLE_BADGE[u.role] ?? "badge"}>{u.role}</span></td>
                    <td><span className={STATUS_BADGE[u.status] ?? "badge"}>{u.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ── DEPARTMENTS TAB ──────────────────────────────────────
  if (activeSubTab === "departments") {
    return (
      <div className="space-y-5 animate-fade-slide">
        {showCreateDept && (
          <CreateDeptModal onSubmit={onCreateDept} onClose={() => setShowCreateDept(false)} />
        )}
        <SectionHeader
          title="Departments"
          desc={`${departments.length} departments configured`}
          action={
            <button onClick={() => setShowCreateDept(true)} className="btn btn-primary btn-sm">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Add Department
            </button>
          }
        />
        {departments.length === 0 ? (
          <div className="card"><EmptyState icon="🏛️" title="No departments yet" desc="Add your first department to start organizing the institution." /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((d, i) => (
              <div key={d.id} className={`card card-hover p-5 animate-fade-slide stagger-${Math.min(i + 1, 4)}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-sm">{d.code}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">{d.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {users.filter(u => u.profile?.departmentId === d.id).length} members
                    </div>
                  </div>
                </div>
                {d.description && <p className="text-xs text-[var(--text-muted)]">{d.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── AUDIT TAB ────────────────────────────────────────────
  if (activeSubTab === "audit") {
    return (
      <div className="space-y-5 animate-fade-slide">
        <SectionHeader title="Audit Log" desc="Recent platform activity" />
        <div className="card"><EmptyState icon="📋" title="No audit events yet" desc="User creation, approvals, and uploads will be logged here." /></div>
      </div>
    );
  }

  // ── OVERVIEW (default) ───────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-slide">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="avatar avatar-lg" style={{ background: "linear-gradient(135deg,#ea580c,#f97316)" }}>
          {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
        </div>
        <div>
          <h1 className="section-title">Platform Overview</h1>
          <p className="section-subtitle">Administrator · {currentUser.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users",    value: users.length,       accent: "accent-indigo",  icon: "👥" },
          { label: "Departments",    value: departments.length, accent: "accent-sky",     icon: "🏛️" },
          { label: "Subjects",       value: subjects.length,    accent: "accent-emerald", icon: "📚" },
          { label: "Active Members", value: users.filter(u => u.status === "ACTIVE").length, accent: "accent-amber", icon: "✅" },
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
        {/* Users by role */}
        <div className="card p-5">
          <div className="text-sm font-semibold text-[var(--text-primary)] mb-4">Users by Role</div>
          {users.length === 0 ? (
            <EmptyState icon="👤" title="No users yet" desc="Create users in the Users tab." />
          ) : (
            <div className="space-y-3">
              {[
                { role: "STUDENT", label: "Students",  color: "#6366f1" },
                { role: "TEACHER", label: "Faculty",   color: "#10b981" },
                { role: "HOD",     label: "HODs",      color: "#a855f7" },
                { role: "ADMIN",   label: "Admins",    color: "#f97316" },
              ].map(r => {
                const count = roleCount(r.role);
                const pct = users.length ? Math.round((count / users.length) * 100) : 0;
                return (
                  <div key={r.role}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[var(--text-secondary)]">{r.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{count}</span>
                        <span className={ROLE_BADGE[r.role]}>{r.role}</span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${r.color}99,${r.color})` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Departments overview */}
        <div className="card p-5">
          <div className="text-sm font-semibold text-[var(--text-primary)] mb-4">Departments</div>
          {departments.length === 0 ? (
            <EmptyState icon="🏛️" title="No departments" desc="Add departments in the Departments tab." />
          ) : (
            <div className="space-y-2">
              {departments.map(d => (
                <div key={d.id} className="flex items-center gap-3 py-2 border-b border-[var(--surface-subtle)] last:border-0">
                  <span className="code-chip">{d.code}</span>
                  <span className="text-sm text-[var(--text-primary)] flex-1">{d.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {users.filter(u => u.profile?.departmentId === d.id).length} members
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
