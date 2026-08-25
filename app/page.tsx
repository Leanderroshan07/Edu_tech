"use client";

import { FormEvent, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type Department = { id: string; code: string; name: string; description?: string | null; isActive: boolean };

type TeachingDepartment = {
    id: string;
    teacherProfileId: string;
    departmentId: string;
    department: Department;
};

type Profile = {
    id?: string;
    departmentId?: string;
    department?: Department;
    registerNumber?: string;
    admissionYear?: number;
    academicYear?: string;
    semester?: number;
    section?: string;
    employeeNumber?: string;
    designation?: string;
    qualification?: string;
    teachingDepartments?: TeachingDepartment[];
};

type User = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    role: "STUDENT" | "TEACHER" | "HOD" | "ADMIN";
    status: string;
    gender?: string | null;
    dateOfBirth?: string | null;
    profileImageUrl?: string | null;
    profile?: Profile | null;
};

async function readResponse(response: Response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(Array.isArray(data.message) ? data.message.join(", ") : data.message ?? "Request failed");
    }
    return data;
}

export default function Home() {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [view, setView] = useState<"overview" | "profile" | "departments" | "users">("overview");
    const [feedback, setFeedback] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [deptLoading, setDeptLoading] = useState(false);

    async function api(path: string, options: RequestInit = {}) {
        return readResponse(
            await fetch(`${API_URL}${path}`, {
                ...options,
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    ...options.headers,
                },
            })
        );
    }

    async function loadPublicDepartments() {
        setDeptLoading(true);
        try {
            const data = await readResponse(await fetch(`${API_URL}/departments`));
            if (Array.isArray(data)) {
                setDepartments(data);
            }
        } catch {
            // Error handling
        } finally {
            setDeptLoading(false);
        }
    }

    async function loadUserData() {
        if (!token) return;
        try {
            const departmentData = await api("/departments");
            if (Array.isArray(departmentData)) {
                setDepartments(departmentData);
            }
            const userData = await api("/users?limit=200");
            if (userData && Array.isArray(userData.data)) {
                setUsers(userData.data);
            }
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to load data");
        }
    }

    useEffect(() => {
        loadPublicDepartments();
    }, []);

    useEffect(() => {
        if (token) {
            loadUserData();
        }
    }, [token, user?.id, user?.role]);

    async function login(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError("");
        const form = new FormData(event.currentTarget);

        try {
            const data = await readResponse(
                await fetch(`${API_URL}/auth/login`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: form.get("email"),
                        password: form.get("password"),
                    }),
                })
            );
            setToken(data.accessToken);
            setUser(data.user);
            setFeedback("Welcome back. Signed in successfully.");
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to sign in");
        } finally {
            setBusy(false);
        }
    }

    async function register(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError("");
        const form = new FormData(event.currentTarget);
        const role = String(form.get("role"));
        const departmentId = String(form.get("departmentId"));

        if (!departmentId) {
            setError("Please select your academic department.");
            setBusy(false);
            return;
        }

        const body: Record<string, unknown> = {
            email: form.get("email"),
            password: form.get("password"),
            firstName: form.get("firstName"),
            lastName: form.get("lastName"),
            phone: form.get("phone") || undefined,
            role,
            departmentId,
        };

        if (role === "STUDENT") {
            Object.assign(body, {
                registerNumber: form.get("registerNumber"),
                admissionYear: Number(form.get("admissionYear")),
                academicYear: form.get("academicYear"),
                semester: Number(form.get("semester")),
                section: form.get("section") || undefined,
            });
        } else if (role === "TEACHER" || role === "HOD") {
            Object.assign(body, {
                employeeNumber: form.get("employeeNumber"),
                designation: form.get("designation") || undefined,
                qualification: form.get("qualification") || undefined,
            });
        }

        try {
            const data = await readResponse(
                await fetch(`${API_URL}/auth/register`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                })
            );
            setToken(data.accessToken);
            setUser(data.user);
            setFeedback(`Account created! Welcome to the workspace as ${role}.`);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to register account");
        } finally {
            setBusy(false);
        }
    }

    async function updateProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError("");
        const form = new FormData(event.currentTarget);

        const body: Record<string, unknown> = {
            firstName: form.get("firstName"),
            lastName: form.get("lastName"),
            phone: form.get("phone") || undefined,
            gender: form.get("gender") || undefined,
            dateOfBirth: form.get("dateOfBirth") || undefined,
        };

        if (user?.role === "STUDENT") {
            body.section = form.get("section") || undefined;
        } else if (user?.role === "TEACHER") {
            body.designation = form.get("designation") || undefined;
            body.qualification = form.get("qualification") || undefined;
        }

        try {
            const updatedUser = await api("/auth/profile", {
                method: "PATCH",
                body: JSON.stringify(body),
            });
            setUser(updatedUser);
            setFeedback("Profile updated successfully!");
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to update profile");
        } finally {
            setBusy(false);
        }
    }

    async function addTeachingDepartment(departmentId: string) {
        setBusy(true);
        setError("");
        try {
            const updatedUser = await api("/auth/teaching-departments", {
                method: "POST",
                body: JSON.stringify({ departmentId }),
            });
            setUser(updatedUser);
            setFeedback("Teaching department added!");
            await loadUserData();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to add teaching department");
        } finally {
            setBusy(false);
        }
    }

    async function removeTeachingDepartment(departmentId: string) {
        setBusy(true);
        setError("");
        try {
            const updatedUser = await api(`/auth/teaching-departments/${departmentId}`, {
                method: "DELETE",
            });
            setUser(updatedUser);
            setFeedback("Teaching department removed.");
            await loadUserData();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to remove teaching department");
        } finally {
            setBusy(false);
        }
    }

    async function refresh() {
        setBusy(true);
        setError("");
        try {
            const data = await api("/auth/refresh", { method: "POST" });
            setToken(data.accessToken);
            setUser(data.user);
            setFeedback("Session refreshed.");
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Session expired");
            setToken(null);
            setUser(null);
        } finally {
            setBusy(false);
        }
    }

    async function logout() {
        await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
        setToken(null);
        setUser(null);
        setDepartments([]);
        setUsers([]);
        setView("overview");
    }

    async function createDepartment(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError("");
        const form = new FormData(event.currentTarget);
        try {
            await api("/departments", {
                method: "POST",
                body: JSON.stringify({
                    code: form.get("code"),
                    name: form.get("name"),
                    description: form.get("description"),
                }),
            });
            event.currentTarget.reset();
            await loadUserData();
            setFeedback("Department created successfully.");
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to create department");
        } finally {
            setBusy(false);
        }
    }

    async function updateStatus(id: string, status: string) {
        setError("");
        try {
            await api(`/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
            await loadUserData();
            setFeedback("User status updated.");
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to update status");
        }
    }

    if (!token || !user) {
        return (
            <AuthPage
                departments={departments}
                onRefreshDepartments={loadPublicDepartments}
                deptLoading={deptLoading}
                onLogin={login}
                onRegister={register}
                error={error}
                busy={busy}
            />
        );
    }

    const canSeeDepartmentsTab = user.role === "HOD" || user.role === "ADMIN";

    return (
        <main className="shell">
            <aside className="sidebar">
                <div className="brand">
                    <span className="brand-mark">E</span>
                    <span>EDU / PORTAL</span>
                </div>
                <div className="profile">
                    <div className="avatar">
                        {user.firstName[0]}
                        {user.lastName[0]}
                    </div>
                    <div>
                        <strong>
                            {user.firstName} {user.lastName}
                        </strong>
                        <small>{user.role} ACCOUNT</small>
                    </div>
                </div>
                <nav>
                    <button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}>
                        Dashboard <span>01</span>
                    </button>
                    <button className={view === "profile" ? "active" : ""} onClick={() => setView("profile")}>
                        My Profile <span>02</span>
                    </button>

                    {/* Department module visible ONLY for HOD and ADMIN */}
                    {canSeeDepartmentsTab && (
                        <button className={view === "departments" ? "active" : ""} onClick={() => setView("departments")}>
                            Departments <span>{String(departments.length).padStart(2, "0")}</span>
                        </button>
                    )}

                    <button className={view === "users" ? "active" : ""} onClick={() => setView("users")}>
                        {user.role === "ADMIN"
                            ? "People Directory"
                            : user.role === "HOD"
                            ? "Department Directory"
                            : user.role === "TEACHER"
                            ? "Faculty & Students"
                            : "Department Peers"} <span>{String(users.length).padStart(2, "0")}</span>
                    </button>
                </nav>
                <button className="logout" onClick={logout}>
                    Sign out <span>↗</span>
                </button>
            </aside>

            <section className="content">
                <header className="topbar">
                    <div>
                        <p className="eyebrow">Academic Operations</p>
                        <h1>
                            {view === "overview"
                                ? `Welcome, ${user.firstName}.`
                                : view === "profile"
                                ? "My Profile"
                                : view === "departments"
                                ? "Departments"
                                : user.role === "ADMIN"
                                ? "People Directory"
                                : user.role === "HOD"
                                ? `${user.profile?.department?.code || "Department"} Directory`
                                : user.role === "TEACHER"
                                ? "Faculty & Students"
                                : "Department Peers"}
                        </h1>
                    </div>
                    <div className="header-actions">
                        <span className="live">
                            <i /> API CONNECTED
                        </span>
                        <button className="icon-button" title="Refresh session" onClick={refresh} disabled={busy}>
                            ↻
                        </button>
                    </div>
                </header>

                {feedback && (
                    <div className="notice">
                        {feedback}
                        <button onClick={() => setFeedback("")}>×</button>
                    </div>
                )}
                {error && (
                    <div className="error-banner">
                        {error}
                        <button onClick={() => setError("")}>×</button>
                    </div>
                )}

                {view === "overview" && <Overview user={user} departments={departments} users={users} onNavigate={setView} />}
                {view === "profile" && (
                    <UserProfile
                        user={user}
                        departments={departments}
                        onUpdate={updateProfile}
                        onAddTeachingDept={addTeachingDepartment}
                        onRemoveTeachingDept={removeTeachingDepartment}
                        busy={busy}
                    />
                )}
                {view === "departments" && canSeeDepartmentsTab && (
                    <Departments departments={departments} isAdmin={user.role === "ADMIN"} onCreate={createDepartment} busy={busy} />
                )}
                {view === "users" && (
                    <Users
                        users={users}
                        departments={departments}
                        currentUser={user}
                        onStatus={updateStatus}
                        onRefresh={loadUserData}
                        api={api}
                    />
                )}
            </section>
        </main>
    );
}

/* ───────────────────────────────────────────────────────── */
/* Auth Page (Sign In & Sign Up tabs)                        */
/* ───────────────────────────────────────────────────────── */
function AuthPage({
    departments,
    onRefreshDepartments,
    deptLoading,
    onLogin,
    onRegister,
    error,
    busy,
}: {
    departments: Department[];
    onRefreshDepartments: () => void;
    deptLoading: boolean;
    onLogin: (e: FormEvent<HTMLFormElement>) => void;
    onRegister: (e: FormEvent<HTMLFormElement>) => void;
    error: string;
    busy: boolean;
}) {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [selectedRole, setSelectedRole] = useState<"STUDENT" | "TEACHER" | "HOD">("STUDENT");

    function handleSwitchTab(newMode: "login" | "register") {
        setMode(newMode);
        if (newMode === "register") {
            onRefreshDepartments();
        }
    }

    const activeDepartments = departments.filter((d) => d.isActive);

    return (
        <main className="login-page">
            <div className="login-art">
                <div className="brand">
                    <span className="brand-mark">E</span>
                    <span>EDU / LEARNING MANAGEMENT</span>
                </div>
                <div className="art-copy">
                    <p className="eyebrow">Institutional Portal</p>
                    <h1>
                        Empower your<br />
                        <em>education.</em>
                    </h1>
                    <p>Register your account, choose your academic department, and join your campus workspace.</p>
                </div>
                <span className="art-index">LMS PLATFORM / 2026</span>
            </div>

            <section className="login-panel">
                <div className="login-heading">
                    <p className="eyebrow">Academic Access</p>
                    <h2>{mode === "login" ? "Welcome Back" : "Join Your Campus"}</h2>
                    <p>{mode === "login" ? "Sign in to access your portal." : "Register your student, teacher, or HOD profile."}</p>
                </div>

                <div className="auth-tabs">
                    <button className={mode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => handleSwitchTab("login")}>
                        Sign In
                    </button>
                    <button className={mode === "register" ? "auth-tab active" : "auth-tab"} onClick={() => handleSwitchTab("register")}>
                        Register Account
                    </button>
                </div>

                {mode === "login" ? (
                    <form onSubmit={onLogin}>
                        <label>
                            Email address
                            <input name="email" type="email" placeholder="you@institution.edu" required />
                        </label>
                        <label>
                            Password
                            <input name="password" type="password" placeholder="Minimum 8 characters" minLength={8} required />
                        </label>
                        {error && <div className="field-error">{error}</div>}
                        <button className="primary-button" disabled={busy}>
                            {busy ? "Signing in..." : "Enter Workspace"}
                            <span>→</span>
                        </button>
                    </form>
                ) : (
                    <form onSubmit={onRegister}>
                        <div className="field-grid">
                            <label>
                                First Name
                                <input name="firstName" placeholder="First name" required />
                            </label>
                            <label>
                                Last Name
                                <input name="lastName" placeholder="Last name" required />
                            </label>
                        </div>

                        <label>
                            Email Address
                            <input name="email" type="email" placeholder="you@institution.edu" required />
                        </label>

                        <div className="field-grid">
                            <label>
                                Password
                                <input name="password" type="password" placeholder="Min 8 characters" minLength={8} required />
                            </label>
                            <label>
                                Phone (Optional)
                                <input name="phone" placeholder="+1234567890" />
                            </label>
                        </div>

                        <div className="field-grid">
                            <label>
                                Role
                                <select
                                    name="role"
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value as any)}
                                >
                                    <option value="STUDENT">Student</option>
                                    <option value="TEACHER">Teacher</option>
                                    <option value="HOD">Head of Department (HOD)</option>
                                </select>
                            </label>
                            <label>
                                Department
                                <div style={{ display: "flex", gap: "6px" }}>
                                    <select name="departmentId" required style={{ flex: 1 }}>
                                        <option value="">-- Select Department --</option>
                                        {activeDepartments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.code} - {d.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        title="Refresh departments list"
                                        onClick={onRefreshDepartments}
                                        disabled={deptLoading}
                                        style={{ padding: "0 10px", background: "#eee", border: "1px solid #ccc", borderRadius: "2px" }}
                                    >
                                        ↻
                                    </button>
                                </div>
                            </label>
                        </div>

                        {activeDepartments.length === 0 && (
                            <div className="notice" style={{ margin: "6px 0", fontSize: "11px" }}>
                                Loading departments... If none appear, click <b>↻</b> to refresh.
                            </div>
                        )}

                        {/* Role specific profile fields */}
                        {selectedRole === "STUDENT" && (
                            <div className="role-fields">
                                <div className="field-grid">
                                    <label>
                                        Register Number
                                        <input name="registerNumber" placeholder="e.g. REG2026001" required />
                                    </label>
                                    <label>
                                        Admission Year
                                        <input name="admissionYear" type="number" min="2000" defaultValue={new Date().getFullYear()} required />
                                    </label>
                                </div>
                                <div className="field-grid">
                                    <label>
                                        Academic Year
                                        <input name="academicYear" placeholder="2025-2026" defaultValue="2025-2026" required />
                                    </label>
                                    <label>
                                        Semester
                                        <input name="semester" type="number" min="1" max="8" defaultValue={1} required />
                                    </label>
                                </div>
                                <label>
                                    Section (Optional)
                                    <input name="section" placeholder="e.g. A" />
                                </label>
                            </div>
                        )}

                        {(selectedRole === "TEACHER" || selectedRole === "HOD") && (
                            <div className="role-fields">
                                <label>
                                    Employee Number
                                    <input name="employeeNumber" placeholder="e.g. EMP2026101" required />
                                </label>
                                {selectedRole === "TEACHER" && (
                                    <div className="field-grid">
                                        <label>
                                            Designation
                                            <input name="designation" placeholder="e.g. Assistant Professor" />
                                        </label>
                                        <label>
                                            Qualification
                                            <input name="qualification" placeholder="e.g. Ph.D. in Computer Science" />
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && <div className="field-error">{error}</div>}

                        <button className="primary-button" disabled={busy}>
                            {busy ? "Registering..." : `Register as ${selectedRole}`}
                            <span>→</span>
                        </button>
                    </form>
                )}

                <p className="login-foot">
                    Protected by JWT Authentication & Rotated Sessions.
                </p>
            </section>
        </main>
    );
}

/* ───────────────────────────────────────────────────────── */
/* Overview / Dashboard Component                            */
/* ───────────────────────────────────────────────────────── */
function Overview({
    user,
    departments,
    users,
    onNavigate,
}: {
    user: User;
    departments: Department[];
    users: User[];
    onNavigate: (view: "profile" | "departments" | "users") => void;
}) {
    const studentsCount = users.filter((u) => u.role === "STUDENT").length;
    const teachersCount = users.filter((u) => u.role === "TEACHER").length;
    const hodsCount = users.filter((u) => u.role === "HOD").length;
    const canSeeDepartments = user.role === "HOD" || user.role === "ADMIN";

    return (
        <div className="view">
            <div className="stats">
                <article>
                    <span>My Role</span>
                    <strong style={{ fontSize: "28px", marginTop: "10px" }}>{user.role}</strong>
                    <small>Status: <b style={{ textTransform: "capitalize" }}>{user.status.toLowerCase()}</b></small>
                </article>
                <article>
                    <span>Primary Department</span>
                    <strong style={{ fontSize: "28px", marginTop: "10px" }}>
                        {user.profile?.department?.code || "General"}
                    </strong>
                    <small>{user.profile?.department?.name || "Institution-wide"}</small>
                </article>
                {user.role === "STUDENT" && (
                    <>
                        <article>
                            <span>Register No.</span>
                            <strong style={{ fontSize: "24px", marginTop: "10px" }}>
                                {user.profile?.registerNumber || "N/A"}
                            </strong>
                            <small>Sem {user.profile?.semester || 1} • Sec {user.profile?.section || "A"}</small>
                        </article>
                        <article>
                            <span>Academic Year</span>
                            <strong style={{ fontSize: "24px", marginTop: "10px" }}>
                                {user.profile?.academicYear || "2025-2026"}
                            </strong>
                            <small>Admitted {user.profile?.admissionYear}</small>
                        </article>
                    </>
                )}
                {(user.role === "TEACHER" || user.role === "HOD") && (
                    <article>
                        <span>Employee ID</span>
                        <strong style={{ fontSize: "24px", marginTop: "10px" }}>
                            {user.profile?.employeeNumber || "N/A"}
                        </strong>
                        <small>{user.profile?.designation || user.role}</small>
                    </article>
                )}
                {user.role === "ADMIN" && (
                    <>
                        <article>
                            <span>Total Students</span>
                            <strong>{String(studentsCount).padStart(2, "0")}</strong>
                            <small>Enrolled in institution</small>
                        </article>
                        <article>
                            <span>Faculty & HODs</span>
                            <strong>{String(teachersCount + hodsCount).padStart(2, "0")}</strong>
                            <small>{teachersCount} Teachers • {hodsCount} HODs</small>
                        </article>
                    </>
                )}
            </div>

            <div className="section-heading">
                <div>
                    <p className="eyebrow">Quick Actions</p>
                    <h2>My Workspace</h2>
                </div>
                <span>Active Workspace</span>
            </div>

            <div className="overview-grid">
                <button className="action-card teal" onClick={() => onNavigate("profile")}>
                    <span className="card-icon">👤</span>
                    <strong>My Profile</strong>
                    <small>View & update profile & teaching departments</small>
                    <b>→</b>
                </button>
                {canSeeDepartments && (
                    <button className="action-card coral" onClick={() => onNavigate("departments")}>
                        <span className="card-icon">🏛️</span>
                        <strong>Departments</strong>
                        <small>Explore & manage academic departments</small>
                        <b>→</b>
                    </button>
                )}
                <button className="action-card cream" onClick={() => onNavigate("users")}>
                    <span className="card-icon">👥</span>
                    <strong>
                        {user.role === "ADMIN"
                            ? "People Directory"
                            : user.role === "HOD"
                            ? `${user.profile?.department?.code || "Department"} Members`
                            : user.role === "TEACHER"
                            ? "My Students & Faculty"
                            : "Department Peers"}
                    </strong>
                    <small>View students, teachers, and staff</small>
                    <b>→</b>
                </button>
            </div>
        </div>
    );
}

/* ───────────────────────────────────────────────────────── */
/* User Profile Component (View, Edit & Teaching Depts)      */
/* ───────────────────────────────────────────────────────── */
function UserProfile({
    user,
    departments,
    onUpdate,
    onAddTeachingDept,
    onRemoveTeachingDept,
    busy,
}: {
    user: User;
    departments: Department[];
    onUpdate: (e: FormEvent<HTMLFormElement>) => void;
    onAddTeachingDept: (departmentId: string) => Promise<void>;
    onRemoveTeachingDept: (departmentId: string) => Promise<void>;
    busy: boolean;
}) {
    const [selectedDeptId, setSelectedDeptId] = useState("");
    const teachingDepts = user.profile?.teachingDepartments || [];
    const primaryDeptId = user.profile?.departmentId || user.profile?.department?.id;

    // Filter available departments teacher doesn't already teach in
    const availableExtraDepartments = departments.filter(
        (d) => d.id !== primaryDeptId && !teachingDepts.some((td) => td.departmentId === d.id) && d.isActive
    );

    return (
        <div className="profile-view">
            <div className="profile-card">
                <div className="profile-header">
                    <div className="avatar avatar-lg">
                        {user.firstName[0]}
                        {user.lastName[0]}
                    </div>
                    <div className="profile-title">
                        <h2>
                            {user.firstName} {user.lastName}
                        </h2>
                        <p>{user.email}</p>
                        <span className={`role-badge role-${user.role}`}>{user.role}</span>
                    </div>
                </div>

                <div className="detail-grid">
                    <div className="detail-group">
                        <label>Account Status</label>
                        <p style={{ color: "var(--teal)", fontWeight: 700 }}>{user.status}</p>
                    </div>
                    <div className="detail-group">
                        <label>Phone</label>
                        <p>{user.phone || "Not set"}</p>
                    </div>
                    <div className="detail-group">
                        <label>Gender</label>
                        <p>{user.gender || "Not specified"}</p>
                    </div>
                    <div className="detail-group">
                        <label>Primary Department</label>
                        <p style={{ fontWeight: "bold" }}>{user.profile?.department?.name || "General"}</p>
                    </div>

                    {user.role === "STUDENT" && (
                        <>
                            <div className="detail-group">
                                <label>Register Number</label>
                                <p>{user.profile?.registerNumber}</p>
                            </div>
                            <div className="detail-group">
                                <label>Academic Year</label>
                                <p>{user.profile?.academicYear}</p>
                            </div>
                            <div className="detail-group">
                                <label>Semester / Section</label>
                                <p>Sem {user.profile?.semester} (Sec {user.profile?.section || "A"})</p>
                            </div>
                            <div className="detail-group">
                                <label>Admission Year</label>
                                <p>{user.profile?.admissionYear}</p>
                            </div>
                        </>
                    )}

                    {(user.role === "TEACHER" || user.role === "HOD") && (
                        <>
                            <div className="detail-group">
                                <label>Employee Number</label>
                                <p>{user.profile?.employeeNumber}</p>
                            </div>
                            {user.role === "TEACHER" && (
                                <>
                                    <div className="detail-group">
                                        <label>Designation</label>
                                        <p>{user.profile?.designation || "Faculty"}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label>Qualification</label>
                                        <p>{user.profile?.qualification || "Not specified"}</p>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Additional Teaching Departments for Teacher Role */}
                {user.role === "TEACHER" && (
                    <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid var(--line)" }}>
                        <p className="eyebrow">Multi-Department Teaching</p>
                        <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 400 }}>Secondary Teaching Departments</h3>
                        <p className="muted" style={{ marginBottom: "16px" }}>
                            Adding secondary departments allows you to access and teach students in other academic departments.
                        </p>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                            <span style={{ padding: "6px 12px", background: "#e0f2fe", color: "#0369a1", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                                Primary: {user.profile?.department?.code} ({user.profile?.department?.name})
                            </span>
                            {teachingDepts.map((td) => (
                                <span
                                    key={td.id}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "6px 12px",
                                        background: "#fef3c7",
                                        color: "#b45309",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                        fontWeight: "bold",
                                    }}
                                >
                                    Teaching: {td.department?.code} ({td.department?.name})
                                    <button
                                        type="button"
                                        onClick={() => onRemoveTeachingDept(td.departmentId)}
                                        style={{ border: 0, background: "none", color: "#991b1b", cursor: "pointer", fontWeight: "bold" }}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>

                        {availableExtraDepartments.length > 0 ? (
                            <div style={{ display: "flex", gap: "8px" }}>
                                <select
                                    value={selectedDeptId}
                                    onChange={(e) => setSelectedDeptId(e.target.value)}
                                    style={{ flex: 1 }}
                                >
                                    <option value="">-- Add Teaching Department --</option>
                                    {availableExtraDepartments.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.code} - {d.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="primary-button"
                                    style={{ padding: "8px 14px", fontSize: "12px", marginTop: 0 }}
                                    disabled={busy || !selectedDeptId}
                                    onClick={async () => {
                                        if (selectedDeptId) {
                                            await onAddTeachingDept(selectedDeptId);
                                            setSelectedDeptId("");
                                        }
                                    }}
                                >
                                    + Add Department
                                </button>
                            </div>
                        ) : (
                            <p style={{ fontSize: "12px", color: "var(--muted)", fontStyle: "italic" }}>
                                All active departments are already added to your teaching list.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Profile Form */}
            <form className="form-panel" onSubmit={onUpdate}>
                <p className="eyebrow">Personal Information</p>
                <h2>Edit Profile</h2>
                <p className="muted">Update your personal and contact details.</p>

                <div className="field-grid">
                    <label>
                        First Name
                        <input name="firstName" defaultValue={user.firstName} required />
                    </label>
                    <label>
                        Last Name
                        <input name="lastName" defaultValue={user.lastName} required />
                    </label>
                </div>

                <label>
                    Phone Number
                    <input name="phone" defaultValue={user.phone || ""} placeholder="+1234567890" />
                </label>

                <div className="field-grid">
                    <label>
                        Gender
                        <select name="gender" defaultValue={user.gender || ""}>
                            <option value="">Select Gender</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </label>
                    <label>
                        Date of Birth
                        <input
                            name="dateOfBirth"
                            type="date"
                            defaultValue={user.dateOfBirth ? user.dateOfBirth.split("T")[0] : ""}
                        />
                    </label>
                </div>

                {user.role === "STUDENT" && (
                    <div className="role-fields">
                        <label>
                            Section
                            <input name="section" defaultValue={user.profile?.section || ""} placeholder="e.g. A" />
                        </label>
                    </div>
                )}

                {user.role === "TEACHER" && (
                    <div className="role-fields">
                        <div className="field-grid">
                            <label>
                                Designation
                                <input name="designation" defaultValue={user.profile?.designation || ""} placeholder="e.g. Associate Professor" />
                            </label>
                            <label>
                                Qualification
                                <input name="qualification" defaultValue={user.profile?.qualification || ""} placeholder="e.g. Ph.D. in CS" />
                            </label>
                        </div>
                    </div>
                )}

                <button className="primary-button" disabled={busy}>
                    {busy ? "Saving Changes..." : "Save Profile Changes"}
                    <span>→</span>
                </button>
            </form>
        </div>
    );
}

/* ───────────────────────────────────────────────────────── */
/* Departments View                                          */
/* ───────────────────────────────────────────────────────── */
function Departments({
    departments,
    isAdmin,
    onCreate,
    busy,
}: {
    departments: Department[];
    isAdmin: boolean;
    onCreate: (e: FormEvent<HTMLFormElement>) => void;
    busy: boolean;
}) {
    return (
        <div className={`view ${isAdmin ? "split-view" : ""}`}>
            <div>
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Academic Structure</p>
                        <h2>All Departments</h2>
                    </div>
                    <span>{departments.length} records</span>
                </div>
                <div className="department-list">
                    {departments.map((item) => (
                        <div className="department-row" key={item.id}>
                            <span className="code">{item.code}</span>
                            <div>
                                <strong>{item.name}</strong>
                                <small>{item.description || "No description provided."}</small>
                            </div>
                            <span className={item.isActive ? "status active-status" : "status"}>
                                {item.isActive ? "Active" : "Inactive"}
                            </span>
                        </div>
                    ))}
                    {!departments.length && <div className="empty">No departments found.</div>}
                </div>
            </div>

            {isAdmin && (
                <form className="form-panel" onSubmit={onCreate}>
                    <p className="eyebrow">New Department</p>
                    <h2>Add Department</h2>
                    <p className="muted">Create an academic department for students & teachers.</p>

                    <label>
                        Department Code
                        <input name="code" placeholder="e.g. CSE" required />
                    </label>
                    <label>
                        Department Name
                        <input name="name" placeholder="Computer Science & Engineering" required />
                    </label>
                    <label>
                        Description
                        <textarea name="description" placeholder="Brief overview of department" rows={3} />
                    </label>

                    <button className="primary-button" disabled={busy}>
                        {busy ? "Creating..." : "Create Department"}
                        <span>→</span>
                    </button>
                </form>
            )}
        </div>
    );
}

/* ───────────────────────────────────────────────────────── */
/* Directory Component (With Role-Based Batch Creation)      */
/* ───────────────────────────────────────────────────────── */
function Users({
    users,
    departments,
    currentUser,
    onStatus,
    onRefresh,
    api,
}: {
    users: User[];
    departments: Department[];
    currentUser: User;
    onStatus: (id: string, status: string) => void;
    onRefresh: () => Promise<void>;
    api: (path: string, options?: RequestInit) => Promise<any>;
}) {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<string>("ALL");
    const [deptFilter, setDeptFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createBusy, setCreateBusy] = useState(false);
    const [createError, setCreateError] = useState("");
    const [createSuccess, setCreateSuccess] = useState("");

    // HOD adds Teachers, Teacher adds Students, Admin adds any
    const isHod = currentUser.role === "HOD";
    const isTeacher = currentUser.role === "TEACHER";
    const isAdmin = currentUser.role === "ADMIN";
    const canCreateBatch = isAdmin || isHod || isTeacher;

    const filteredUsers = users.filter((item) => {
        const query = search.toLowerCase().trim();
        const matchesQuery =
            !query ||
            item.firstName.toLowerCase().includes(query) ||
            item.lastName.toLowerCase().includes(query) ||
            item.email.toLowerCase().includes(query) ||
            (item.profile?.registerNumber && item.profile.registerNumber.toLowerCase().includes(query)) ||
            (item.profile?.employeeNumber && item.profile.employeeNumber.toLowerCase().includes(query)) ||
            (item.profile?.section && item.profile.section.toLowerCase().includes(query)) ||
            (item.profile?.department?.code && item.profile.department.code.toLowerCase().includes(query));

        const matchesRole = roleFilter === "ALL" || item.role === roleFilter;

        const itemDeptId = item.profile?.departmentId || item.profile?.department?.id;
        const matchesDept = deptFilter === "ALL" || itemDeptId === deptFilter;

        const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

        return matchesQuery && matchesRole && matchesDept && matchesStatus;
    });

    const studentCount = users.filter((u) => u.role === "STUDENT").length;
    const teacherCount = users.filter((u) => u.role === "TEACHER").length;
    const hodCount = users.filter((u) => u.role === "HOD").length;
    const adminCount = users.filter((u) => u.role === "ADMIN").length;

    async function handleAddBatch(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setCreateBusy(true);
        setCreateError("");
        setCreateSuccess("");
        const form = new FormData(e.currentTarget);
        const deptId = currentUser.profile?.departmentId || currentUser.profile?.department?.id;

        const targetRole = isHod ? "TEACHER" : isTeacher ? "STUDENT" : String(form.get("role") || "STUDENT");

        if (!deptId && currentUser.role !== "ADMIN") {
            setCreateError("Department assignment missing on your profile");
            setCreateBusy(false);
            return;
        }

        const body: Record<string, unknown> = {
            email: form.get("email"),
            password: form.get("password"),
            firstName: form.get("firstName"),
            lastName: form.get("lastName"),
            phone: form.get("phone") || undefined,
            role: targetRole,
            departmentId: deptId || form.get("departmentId"),
        };

        if (targetRole === "STUDENT") {
            Object.assign(body, {
                registerNumber: form.get("registerNumber"),
                admissionYear: Number(form.get("admissionYear")),
                academicYear: form.get("academicYear"),
                semester: Number(form.get("semester")),
                section: form.get("section") || undefined,
            });
        } else if (targetRole === "TEACHER" || targetRole === "HOD") {
            Object.assign(body, {
                employeeNumber: form.get("employeeNumber"),
                designation: form.get("designation") || undefined,
                qualification: form.get("qualification") || undefined,
            });
        }

        try {
            await api("/users", {
                method: "POST",
                body: JSON.stringify(body),
            });
            setCreateSuccess(`${targetRole} registered successfully into your department!`);
            e.currentTarget.reset();
            await onRefresh();
            setShowCreateForm(false);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Failed to register batch member");
        } finally {
            setCreateBusy(false);
        }
    }

    return (
        <div className="view">
            {/* Quick Stat Pill Cards */}
            <div className="stats" style={{ marginBottom: "24px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
                <article style={{ minHeight: "90px", padding: "16px" }}>
                    <span>Department Students</span>
                    <strong style={{ fontSize: "28px", margin: "6px 0 0" }}>{studentCount}</strong>
                </article>
                <article style={{ minHeight: "90px", padding: "16px" }}>
                    <span>Department Teachers</span>
                    <strong style={{ fontSize: "28px", margin: "6px 0 0" }}>{teacherCount}</strong>
                </article>
                <article style={{ minHeight: "90px", padding: "16px" }}>
                    <span>HODs</span>
                    <strong style={{ fontSize: "28px", margin: "6px 0 0" }}>{hodCount}</strong>
                </article>
                {isAdmin && (
                    <article style={{ minHeight: "90px", padding: "16px" }}>
                        <span>Admins</span>
                        <strong style={{ fontSize: "28px", margin: "6px 0 0" }}>{adminCount}</strong>
                    </article>
                )}
            </div>

            <div className="section-heading" style={{ flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <p className="eyebrow">
                        {isAdmin
                            ? "Global Directory"
                            : isHod
                            ? `${currentUser.profile?.department?.code || "Department"} Staff & Students`
                            : isTeacher
                            ? `${currentUser.profile?.department?.code || "Department"} Faculty & Students`
                            : "Department Peers"}
                    </p>
                    <h2>Directory</h2>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span>Showing {filteredUsers.length} of {users.length} members</span>
                    {canCreateBatch && (
                        <button
                            type="button"
                            className="primary-button"
                            style={{ padding: "8px 14px", fontSize: "13px" }}
                            onClick={() => setShowCreateForm(!showCreateForm)}
                        >
                            {showCreateForm
                                ? "Close Form"
                                : isHod
                                ? "+ Add Teacher Batch"
                                : isTeacher
                                ? "+ Add Student Batch"
                                : "+ Add Member"}
                        </button>
                    )}
                </div>
            </div>

            {/* Role-tailored Registration Form (HOD adds Teacher, Teacher adds Student) */}
            {showCreateForm && (
                <form className="form-panel" onSubmit={handleAddBatch} style={{ marginBottom: "24px" }}>
                    <p className="eyebrow">Department Enrollment</p>
                    <h3>
                        {isHod
                            ? "Add New Teacher to Department"
                            : isTeacher
                            ? "Add New Student to Class Batch"
                            : "Add New Member"}
                    </h3>
                    <p className="muted">
                        {isHod
                            ? `Register a new teacher for the ${currentUser.profile?.department?.name || "assigned"} department.`
                            : isTeacher
                            ? `Register a new student for the ${currentUser.profile?.department?.name || "assigned"} department.`
                            : "Register a new department member."}
                    </p>

                    <div className="field-grid">
                        <label>
                            First Name
                            <input name="firstName" placeholder="First Name" required />
                        </label>
                        <label>
                            Last Name
                            <input name="lastName" placeholder="Last Name" required />
                        </label>
                    </div>

                    <div className="field-grid">
                        <label>
                            Email Address
                            <input name="email" type="email" placeholder="user@institution.edu" required />
                        </label>
                        <label>
                            Password
                            <input name="password" type="password" placeholder="Min 8 chars" minLength={8} required />
                        </label>
                    </div>

                    {isAdmin && (
                        <div className="field-grid">
                            <label>
                                Role
                                <select name="role" defaultValue="STUDENT">
                                    <option value="STUDENT">Student</option>
                                    <option value="TEACHER">Teacher</option>
                                    <option value="HOD">HOD</option>
                                </select>
                            </label>
                            <label>
                                Department
                                <select name="departmentId" required>
                                    <option value="">Select Department</option>
                                    {departments.filter((d) => d.isActive).map((d) => (
                                        <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    )}

                    {/* HOD creates Teacher */}
                    {isHod && (
                        <div className="role-fields">
                            <label>
                                Employee Number
                                <input name="employeeNumber" placeholder="e.g. EMP2026201" required />
                            </label>
                            <div className="field-grid">
                                <label>
                                    Designation
                                    <input name="designation" placeholder="e.g. Assistant Professor" />
                                </label>
                                <label>
                                    Qualification
                                    <input name="qualification" placeholder="e.g. M.Tech / Ph.D." />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Teacher creates Student */}
                    {isTeacher && (
                        <div className="role-fields">
                            <div className="field-grid">
                                <label>
                                    Register Number
                                    <input name="registerNumber" placeholder="e.g. REG2026101" required />
                                </label>
                                <label>
                                    Class Section (e.g. A, B)
                                    <input name="section" placeholder="e.g. A" defaultValue="A" required />
                                </label>
                            </div>
                            <div className="field-grid">
                                <label>
                                    Academic Year
                                    <input name="academicYear" defaultValue="2025-2026" required />
                                </label>
                                <label>
                                    Semester
                                    <input name="semester" type="number" min="1" max="8" defaultValue={1} required />
                                </label>
                                <label>
                                    Admission Year
                                    <input name="admissionYear" type="number" defaultValue={new Date().getFullYear()} required />
                                </label>
                            </div>
                        </div>
                    )}

                    {createError && <div className="field-error">{createError}</div>}
                    {createSuccess && <div className="notice">{createSuccess}</div>}

                    <button className="primary-button" disabled={createBusy}>
                        {createBusy ? "Registering..." : isHod ? "Register Teacher" : "Register Student"} <span>→</span>
                    </button>
                </form>
            )}

            {/* Filter controls */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", background: "#fff", padding: "16px", border: "1px solid var(--line)" }}>
                <div style={{ flex: "1 1 240px" }}>
                    <label style={{ marginBottom: "4px" }}>Search Directory</label>
                    <input
                        type="text"
                        placeholder="Search name, email, Reg #, Emp ID, or Sec..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div style={{ minWidth: "150px" }}>
                    <label style={{ marginBottom: "4px" }}>Filter Role</label>
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                        <option value="ALL">All Roles</option>
                        <option value="STUDENT">Students</option>
                        <option value="TEACHER">Teachers</option>
                        <option value="HOD">HODs</option>
                        {isAdmin && <option value="ADMIN">Admins</option>}
                    </select>
                </div>

                {isAdmin && (
                    <div style={{ minWidth: "180px" }}>
                        <label style={{ marginBottom: "4px" }}>Filter Department</label>
                        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                            <option value="ALL">All Departments</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.code} - {d.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ minWidth: "140px" }}>
                    <label style={{ marginBottom: "4px" }}>Filter Status</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="ALL">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="SUSPENDED">Suspended</option>
                    </select>
                </div>
            </div>

            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Member</th>
                            <th>Role</th>
                            <th>Department & Section / Info</th>
                            <th>Status</th>
                            {isAdmin && <th>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((item) => (
                            <tr key={item.id}>
                                <td>
                                    <div className="person">
                                        <span>
                                            {item.firstName[0]}
                                            {item.lastName[0]}
                                        </span>
                                        <div>
                                            <strong>
                                                {item.firstName} {item.lastName}
                                            </strong>
                                            <small>{item.email}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={`role-badge role-${item.role}`}>{item.role}</span>
                                </td>
                                <td>
                                    <strong>{item.profile?.department?.code || "General"}</strong>
                                    {item.profile?.registerNumber && <div><small>Reg: {item.profile.registerNumber}</small></div>}
                                    {item.profile?.employeeNumber && <div><small>Emp ID: {item.profile.employeeNumber}</small></div>}
                                    {item.profile?.section && (
                                        <div style={{ marginTop: "2px" }}>
                                            <span style={{ background: "#eee", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
                                                Class Sec: {item.profile.section}
                                            </span>
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <span className={item.status === "ACTIVE" ? "status active-status" : "status"}>
                                        {item.status}
                                    </span>
                                </td>
                                {isAdmin && (
                                    <td>
                                        <select value={item.status} onChange={(e) => onStatus(item.id, e.target.value)}>
                                            <option value="ACTIVE">ACTIVE</option>
                                            <option value="INACTIVE">INACTIVE</option>
                                            <option value="SUSPENDED">SUSPENDED</option>
                                        </select>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!filteredUsers.length && <div className="empty">No matching members found in department directory.</div>}
            </div>
        </div>
    );
}
