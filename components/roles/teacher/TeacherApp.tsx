'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { TeacherNav } from './TeacherNav';
import { TeacherDashboard } from './TeacherDashboard';
import { TeacherMaterialsList } from './TeacherMaterialsList';
import { apiCall } from '../../common/api';

type Dept    = { id: string; code: string; name: string };
type Subject = { id: string; code: string; name: string; departmentId: string; credits?: number; semester?: number };
type User    = {
  id: string; email: string; firstName: string; lastName: string; role: string; status: string;
  profile?: {
    employeeNumber?: string; designation?: string; qualification?: string; departmentId?: string;
    department?: Dept; teachingDepartments?: Array<{ departmentId: string; department?: Dept }>;
    teacherSubjects?: Array<{ subjectId: string; type: string; subject?: Subject }>;
  } | null;
};

interface TeacherAppProps {
  me: User;
  token: string;
}

export function TeacherApp({ me, token }: TeacherAppProps) {
  const [activeTab,   setActiveTab]   = useState('dashboard');
  const [subjects,    setSubjects]    = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [allTeachers, setAllTeachers] = useState<User[]>([]);

  const api = useCallback(
    (path: string, opts: RequestInit = {}) => apiCall(path, opts, token),
    [token],
  );

  const loadData = useCallback(async () => {
    const profile = me.profile;
    const deptId  = profile?.departmentId || profile?.department?.id;
    const subsUrl = deptId ? `/subjects?departmentId=${deptId}` : '/subjects';

    const [subs, depts] = await Promise.all([
      api(subsUrl).catch(() => []),
      api('/departments').catch(() => []),
    ]);

    if (Array.isArray(subs))  setSubjects(subs);
    if (Array.isArray(depts)) setDepartments(depts);
  }, [api, me]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Handlers for teaching departments ── */
  const handleAddTeachingDepartment = async (_uid: string, deptId: string) => {
    await api('/auth/teaching-departments', { method: 'POST', body: JSON.stringify({ departmentId: deptId }) });
    await loadData();
  };

  const handleRemoveTeachingDepartment = async (_uid: string, deptId: string) => {
    await api(`/auth/teaching-departments/${deptId}`, { method: 'DELETE' });
    await loadData();
  };

  /* ── Compute own subjects from profile ── */
  const mySubjectIds = new Set((me.profile?.teacherSubjects || []).map(ts => ts.subjectId));
  const mySubjects   = subjects.filter(s => mySubjectIds.has(s.id));

  const profile = me.profile;

  return (
    <>
      <TeacherNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Dashboard overview */}
      {activeTab === 'dashboard' && (
        <TeacherDashboard
          currentUser={me}
          token={token}
          allTeachers={allTeachers}
          departments={departments}
          subjects={mySubjects}
          onAddTeachingDepartment={handleAddTeachingDepartment}
          onRemoveTeachingDepartment={handleRemoveTeachingDepartment}
          onAddTeacherSubject={async () => {}}
          onRemoveTeacherSubject={async () => {}}
          activeSubTab="dashboard"
        />
      )}

      {/* My Subjects */}
      {activeTab === 'subjects' && (
        <TeacherDashboard
          currentUser={me}
          token={token}
          allTeachers={allTeachers}
          departments={departments}
          subjects={mySubjects}
          onAddTeachingDepartment={handleAddTeachingDepartment}
          onRemoveTeachingDepartment={handleRemoveTeachingDepartment}
          onAddTeacherSubject={async () => {}}
          onRemoveTeacherSubject={async () => {}}
          activeSubTab="subjects"
        />
      )}

      {/* Departments */}
      {activeTab === 'departments' && (
        <TeacherDashboard
          currentUser={me}
          token={token}
          allTeachers={allTeachers}
          departments={departments}
          subjects={mySubjects}
          onAddTeachingDepartment={handleAddTeachingDepartment}
          onRemoveTeachingDepartment={handleRemoveTeachingDepartment}
          onAddTeacherSubject={async () => {}}
          onRemoveTeacherSubject={async () => {}}
          activeSubTab="departments"
        />
      )}

      {/* Upload — teacher's own materials list with upload form */}
      {(activeTab === 'upload' || activeTab === 'analytics') && (
        <TeacherMaterialsList
          token={token}
          currentUserId={me.id}
          userDepartmentId={profile?.departmentId}
          showAnalytics={activeTab === 'analytics'}
        />
      )}
    </>
  );
}
