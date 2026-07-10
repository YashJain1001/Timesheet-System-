import api from './api';

export interface ClientEmployee {
  id: number;
  employee: number;
  employee_name?: string;
  employee_email?: string;
  client: number;
  client_name?: string;
  role: 'team_lead' | 'employee';
  inserted_on?: string;
  added_by_name?: string;
}

export const getClientEmployees = (params?: { client?: number; employee?: number; role?: string }) =>
  api.get<ClientEmployee[]>('/client-employees/', { params }).then(r => r.data);

export const assignClientEmployee = (data: { employee: number; client: number; role: string }) =>
  api.post<ClientEmployee>('/client-employees/', data).then(r => r.data);

export const removeClientEmployee = (id: number) => api.delete(`/client-employees/${id}/`);

export const updateClientEmployeeRole = (id: number, role: string) =>
  api.patch<ClientEmployee>(`/client-employees/${id}/`, { role }).then(r => r.data);
