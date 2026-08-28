'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { StudentNav, StudentMobileNav } from './StudentNav';
import { StudentDashboard } from './StudentDashboard';
import { StudentProgressTab } from './StudentProgressTab';
import { StudentSubjectsTab } from './StudentSubjectsTab';
import { apiCall } from '../../common/api';

type User = {
  id: string; firstName: string; lastName: string; email: string; role: string;
  profile?: {
    registerNumber?: string; semester?: number; departmentId?: string;
    department?: { id?: string; name: string; code: string };
  } | null;
};

interface StudentAppProps {
  me: User;
  token: string;
}

export function StudentApp({ me, token }: StudentAppProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  const api = useCallback(
    (path: string, opts: RequestInit = {}) => apiCall(path, opts, token),
    [token],
  );

  /* ── Fetch subjects for this student's department ── */
  useEffect(() => {
    const deptId = me.profile?.departmentId || me.profile?.department?.id;
    const url = deptId ? `/subjects?departmentId=${deptId}` : '/subjects';
    api(url).then(setSubjects).catch(() => setSubjects([]));
  }, [api, me]);

  /* ── Fetch materials (student sees only their dept's) ── */
  const fetchMaterials = useCallback(async () => {
    setLoadingMaterials(true);
    try {
      const data = await api('/materials');
      setMaterials(Array.isArray(data) ? data : []);
    } catch {
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  }, [api]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const completedCount = materials.filter(m => m.userProgress?.isCompleted).length;

  return (
    <div className="pb-16 md:pb-0">
      <StudentNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === 'dashboard' && (
        <StudentDashboard
          me={me}
          subjects={subjects}
          materials={materials}
          completedCount={completedCount}
          token={token}
          onMaterialsRefresh={fetchMaterials}
          loadingMaterials={loadingMaterials}
        />
      )}

      {activeTab === 'subjects' && (
        <StudentSubjectsTab
          me={me}
          subjects={subjects}
          materials={materials}
          token={token}
          onMaterialsRefresh={fetchMaterials}
          loadingMaterials={loadingMaterials}
        />
      )}

      {activeTab === 'assignments' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Assignments</h2>
            <p className="text-sm text-gray-500 mt-0.5">Upcoming tasks and deadlines</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-14 text-center text-gray-400 text-sm">
            No assignments yet. Tasks from your teachers will appear here.
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <StudentProgressTab
          materials={materials}
          token={token}
          onMaterialsRefresh={fetchMaterials}
          loadingMaterials={loadingMaterials}
        />
      )}

      <StudentMobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
