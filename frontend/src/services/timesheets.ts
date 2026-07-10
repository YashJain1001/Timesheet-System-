import api from './api';

export interface ProjectHour {
  id?: number;
  project: number;
  project_name?: string;
  project_code?: string;
  hours: number;
}

export interface TimesheetEntry {
  id: number;
  employee: number;
  employee_name?: string;
  client: number;
  client_name?: string;
  date: string;
  year: number;
  week_number: number;
  month_number: number;
  status: 'present' | 'leave' | 'holiday';
  description?: string;
  total_hours: number;
  project_hours: ProjectHour[];
  inserted_on?: string;
}

export interface EntryFilters {
  employee?: number;
  client?: number;
  month?: number;
  year?: number;
  status?: string;
}

export const getEntries = (params?: EntryFilters) =>
  api.get<TimesheetEntry[]>('/timesheet-entries/', { params }).then(r => r.data);

export const getEntry = (id: number) =>
  api.get<TimesheetEntry>(`/timesheet-entries/${id}/`).then(r => r.data);

export const createEntry = (data: Partial<TimesheetEntry>) =>
  api.post<TimesheetEntry>('/timesheet-entries/', data).then(r => r.data);

export const updateEntry = (id: number, data: Partial<TimesheetEntry>) =>
  api.patch<TimesheetEntry>(`/timesheet-entries/${id}/`, data).then(r => r.data);

export const deleteEntry = (id: number) => api.delete(`/timesheet-entries/${id}/`);
