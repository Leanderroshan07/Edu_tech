'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { HodNav } from './HodNav';
import { HodDashboard } from './HodDashboard';
import { apiCall } from '../../common/api';

interface HodAppProps {
  me: any;
  token: string;
}

export function HodApp({ me, token }: HodAppProps) {
  const [activeTab,       setActiveTab]      = useState('overview');
  const [allFaculty,      setAllFaculty]     = useState<any[]>([]);
  const [allStudents,     setAllStudents]    = useState<any[]>([]);
  const [departments,     setDepartments]   = useState<any[]>([]);
  const [subjects,        setSubjects]       = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const api = useCallback(
    (path: string, opts: RequestInit = {}) => apiCall(path, opts, token),
    [token],
  );

  const loadData = useCallback(async () => {
    const deptId   = me.profile?.departmentId || me.profile?.department?.id;
    const subsUrl  = deptId ? `/subjects?departmentId=${deptId}` : '/subjects';

    const [usersData, depts, subs, pending] = await Promise.all([
      api('/users?limit=500').catch(() => ({})),
      api('/departments').catch(() => []),
      api(subsUrl).catch(() => []),
      api('/requests/pending').catch(() => []),
    ]);

    const users: any[] = usersData?.data ?? (Array.isArray(usersData) ? usersData : []);
    setAllFaculty(users.filter((u: any) => u.role === 'TEACHER'));
    setAllStudents(users.filter((u: any) => u.role === 'STUDENT'));
    if (Array.isArray(depts))   setDepartments(depts);
    if (Array.isArray(subs))    setSubjects(subs);
    if (Array.isArray(pending)) setPendingRequests(pending);
  }, [api, me]);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── HOD handlers ── */
  const handleCreateSubject = async (dto: any) => {
    await api('/subjects', { method: 'POST', body: JSON.stringify(dto) });
    await loadData();
  };
  const handleAssignTeacher = async (teacherUserId: string, subjectId: string, _deptId: string, type: string) => {
    await api(`/subjects/${subjectId}/assign-teacher`, { method: 'POST', body: JSON.stringify({ teacherUserId, type }) });
    await loadData();
  };
  const handleApproveRequest = async (id: string) => {
    await api(`/requests/${id}/approve`, { method: 'PATCH' });
    await loadData();
  };
  const handleRejectRequest = async (id: string) => {
    await api(`/requests/${id}/reject`, { method: 'PATCH' });
    await loadData();
  };

  return (
    <>
      <HodNav activeTab={activeTab} setActiveTab={setActiveTab} pendingCount={pendingRequests.length} />
      <HodDashboard
        currentUser={me}
        token={token}
        allFaculty={allFaculty}
        allStudents={allStudents}
        departments={departments}
        subjects={subjects}
        pendingRequests={pendingRequests}
        onCreateSubject={handleCreateSubject}
        onAssignTeacher={handleAssignTeacher}
        onApproveRequest={handleApproveRequest}
        onRejectRequest={handleRejectRequest}
        activeSubTab={activeTab}
      />
    </>
  );
}
