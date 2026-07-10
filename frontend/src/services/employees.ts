import api from './api';

export interface Employee {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  number?: string;
  is_active: boolean;
  is_superuser: boolean;
  is_staff?: boolean;
  inserted_on?: string;
}

export interface CreateEmployeeData {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  number?: string;
  password: string;
}

export const getEmployees = () => api.get<Employee[]>('/employees/').then(r => r.data);

export const createEmployee = (data: CreateEmployeeData) =>
  api.post<Employee>('/employees/', data).then(r => r.data);

export const updateEmployee = (id: number, data: Partial<Employee>) =>
  api.patch<Employee>(`/employees/${id}/`, data).then(r => r.data);

export const deleteEmployee = (id: number) => api.delete(`/employees/${id}/`);

export const toggleEmployeeStatus = (id: number, is_active: boolean) =>
  api.patch<Employee>(`/employees/${id}/`, { is_active }).then(r => r.data);
