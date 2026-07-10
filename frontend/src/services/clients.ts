import api from './api';

export interface Client {
  id: number;
  name: string;
  inserted_on: string;
  inserted_by_name?: string;
  is_deleted?: boolean;
}

export const getClients = () => api.get<Client[]>('/clients/').then(r => r.data);
export const createClient = (data: { name: string }) => api.post<Client>('/clients/', data).then(r => r.data);
export const updateClient = (id: number, data: { name: string }) => api.patch<Client>(`/clients/${id}/`, data).then(r => r.data);
export const deleteClient = (id: number) => api.delete(`/clients/${id}/`);
