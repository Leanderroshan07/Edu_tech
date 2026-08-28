'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { AdminNav } from './AdminNav';
import { AdminDashboard } from './AdminDashboard';
import { apiCall } from '../../common/api';

interface AdminAppProps {
  me: any;
  token: string;
}

export function AdminApp({ me, token }: AdminAppProps) {
  const [activeTab,   setActiveTab]   = useState('command');
  const [users,       setUsers]       = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects,    setSubjects]    = useState<any[]>([]);

  const api = useCallback(
    (path: string, opts: RequestInit = {}) => apiCall(path, opts, token),
    [token],
  );

  const loadData = useCallback(async () => {
    const [usersData, depts, subs] = await Promise.all([
      api('/users?limit=500').catch(() => ({})),
      api('/departments').catch(() => []),
      api('/subjects').catch(() => []),
    ]);
    const users: any[] = usersData?.data ?? (Array.isArray(usersData) ? usersData : []);
    setUsers(users);
    if (Array.isArray(depts)) setDepartments(depts);
    if (Array.isArray(subs))  setSubjects(subs);
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateUser = async (dto: any) => {
    await api('/users', { method: 'POST', body: JSON.stringify(dto) });
    await loadData();
  };

  const handleCreateDept = async (dto: { name: string; code: string; description?: string }) => {
    await api('/departments', { method: 'POST', body: JSON.stringify(dto) });
    await loadData();
  };

  return (
    <>
      <AdminNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <AdminDashboard
        currentUser={me}
        users={users}
        departments={departments}
        subjects={subjects}
        onCreateUser={handleCreateUser}
        onCreateDept={handleCreateDept}
        activeSubTab={activeTab}
      />
    </>
  );
}
