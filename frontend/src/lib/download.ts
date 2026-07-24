import api from './api';

// Admin export endpoints require the JWT auth header, so a plain <a href> won't work —
// fetch the file through the authenticated axios instance and trigger a blob download instead.
export async function downloadAuthenticated(path: string, filename: string) {
  const res = await api.get(path, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
