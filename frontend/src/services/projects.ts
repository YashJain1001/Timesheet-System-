import api from './api';

export interface Project {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  client: number;
  client_name?: string;
  inserted_on?: string;
  inserted_by_name?: string;
}

export const getProjects = (clientId?: number) =>
  api.get<Project[]>('/projects/', { params: clientId ? { client: clientId } : {} }).then(r => r.data);

export const createProject = (data: Partial<Project>) =>
  api.post<Project>('/projects/', data).then(r => r.data);

export const updateProject = (id: number, data: Partial<Project>) =>
  api.patch<Project>(`/projects/${id}/`, data).then(r => r.data);

export const deleteProject = (id: number) => api.delete(`/projects/${id}/`);

export const toggleProjectStatus = (id: number, is_active: boolean) =>
  api.patch<Project>(`/projects/${id}/`, { is_active }).then(r => r.data);
