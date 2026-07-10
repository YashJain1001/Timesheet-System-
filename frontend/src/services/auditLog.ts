import api from './api';

export interface AuditLog {
  id: number;
  employee?: number;
  employee_name?: string;
  table_name: string;
  record_id?: number;
  action_type: string;
  old_data?: any;
  new_data?: any;
  change_reason?: string;
  inserted_on: string;
}

export interface AuditFilters {
  table_name?: string;
  action_type?: string;
  employee?: number;
}

export const getAuditLogs = (params?: AuditFilters) =>
  api.get<AuditLog[]>('/audit-logs/', { params }).then(r => r.data);
