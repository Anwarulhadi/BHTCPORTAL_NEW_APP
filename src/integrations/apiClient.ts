const API_BASE = (import.meta.env.VITE_BACKEND_URL as string) || 'http://localhost:5000';

async function call(path: string, opts: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, opts);
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json?.data ?? json;
}

export async function getStudents(params?: { search?: string; course?: string }) {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.course) qs.set('course', params.course);
  return call(`/api/students?${qs.toString()}`);
}

export async function getStudent(id: string) {
  return call(`/api/students/${encodeURIComponent(id)}`);
}

export async function upsertStudent(payload: any) {
  return call('/api/students', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}

export async function getGrades(studentId: string, course?: string) {
  const qs = course ? `?course=${encodeURIComponent(course)}` : '';
  return call(`/api/students/${encodeURIComponent(studentId)}/grades${qs}`);
}

export async function upsertGrades(studentId: string, items: any[]) {
  return call(`/api/students/${encodeURIComponent(studentId)}/grades`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(items) });
}

export async function listNews() {
  return call('/api/news');
}

export async function postNews(payload: any) {
  return call('/api/news', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}

export async function deleteNews(id: string) {
  return call(`/api/news/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getTeachers() {
  return call('/api/teachers');
}

export async function upsertTeacher(payload: any) {
  return call('/api/teachers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}

export async function deleteTeacher(id: string) {
  return call(`/api/teachers/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function registerDeviceToken(payload: { token: string; platform?: string; userId?: string }) {
  return call('/api/device-tokens', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
}

export async function uploadFile(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/api/uploads`, { method: 'POST', body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Upload failed ${res.status}`);
  return json?.data;
}

export default {
  getStudents,
  getStudent,
  upsertStudent,
  getGrades,
  upsertGrades,
  listNews,
  postNews,
  registerDeviceToken,
  uploadFile,
};
