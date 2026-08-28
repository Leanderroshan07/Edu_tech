"use client";

import React, { useState } from "react";
import { SubjectBadge } from "../common/SubjectBadge";

export type Department = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

export type Subject = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  credits: number;
  semester?: number | null;
  departmentId: string;
  department?: Department;
  isActive: boolean;
};

type SubjectManagerProps = {
  subjects: Subject[];
  departments: Department[];
  userRole: "ADMIN" | "HOD" | "TEACHER" | "STUDENT";
  userDeptId?: string;
  onRefresh: () => void;
  onAssignTeacherSubject?: (subjectId: string, departmentId: string, type: "PRIMARY" | "SECONDARY") => Promise<void>;
  onCreateSubject?: (data: { code: string; name: string; departmentId: string; credits: number; semester: number }) => Promise<void>;
};

export const SubjectManager: React.FC<SubjectManagerProps> = ({
  subjects,
  departments,
  userRole,
  userDeptId,
  onRefresh,
  onCreateSubject,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [deptId, setDeptId] = useState(userDeptId || (departments[0]?.id ?? ""));
  const [credits, setCredits] = useState("3");
  const [semester, setSemester] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterDept, setFilterDept] = useState<string>("ALL");

  const filteredSubjects = subjects.filter((s) =>
    filterDept === "ALL" ? true : s.departmentId === filterDept
  );

  const canCreate = userRole === "ADMIN" || userRole === "HOD";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !deptId) {
      setError("Please fill in code, name, and department.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (onCreateSubject) {
        await onCreateSubject({ code, name, departmentId: deptId, credits: parseInt(credits) || 3, semester: parseInt(semester) || 1 });
      }
      setShowModal(false);
      setCode("");
      setName("");
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to create subject");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📚</span> Academic Subjects Directory
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View and manage course subjects across departments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow transition"
            >
              + Add Subject
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Create New Subject
            </h3>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 text-xs rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Code (e.g. CS101)
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="CS101"
                  required
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Data Structures & Algorithms"
                  required
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Offering Department
                </label>
                <select
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Semester
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow"
                >
                  {loading ? "Saving..." : "Create Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">
            No subjects found. Create subjects to assign primary & secondary teaching loads.
          </div>
        ) : (
          filteredSubjects.map((sub) => (
            <div
              key={sub.id}
              className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800">
                    {sub.code}
                  </span>
                  <span className="text-xs text-slate-500">Sem {sub.semester ?? 1} • {sub.credits} Credits</span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-base mb-1">
                  {sub.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Dept: {sub.department?.name ?? "Department"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
