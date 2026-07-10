import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import TimesheetGrid from '../components/TimesheetGrid';
import { getClientEmployees } from '../services/clientEmployees';
import { getClients } from '../services/clients';
import { ChevronDown } from 'lucide-react';

interface EmployeeMyTimesheetProps {
  hideHeader?: boolean;
}

const EmployeeMyTimesheet: React.FC<EmployeeMyTimesheetProps> = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const empId = user?.employee_id;
  const isSuperuser = !!user?.is_superuser;

  // Fetch client assignments for normal employee
  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['my-clients', empId],
    queryFn: () => getClientEmployees({ employee: empId! }),
    enabled: !!empId && !isSuperuser,
  });

  // Fetch all clients if superuser
  const { data: allClients = [], isLoading: loadingAllClients } = useQuery({
    queryKey: ['all-clients'],
    queryFn: () => getClients(),
    enabled: isSuperuser,
  });

  const isLoading = isSuperuser ? loadingAllClients : loadingAssignments;

  const clientList = isSuperuser
    ? allClients.map(c => ({ client: c.id, client_name: c.name }))
    : assignments;

  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const clientId = selectedClientId ?? clientList[0]?.client ?? null;
  const clientName = clientList.find((a: any) => a.client === clientId)?.client_name ?? undefined;

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" /></div>;
  }

  if (clientList.length === 0 || !clientId || !empId) {
    return (
      <div>
        {!hideHeader && (
          <PageHeader
            title="My Timesheet"
            breadcrumb={isSuperuser ? ['Superuser', 'My Timesheet'] : ['Employee', 'My Timesheet']}
          />
        )}
        <div className="card card-padding">
          {isSuperuser ? (
            <p style={{ color: 'var(--text-secondary)' }}>There are no projects in the system. Please create a project first.</p>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>You are not assigned to any project yet. Contact your team lead or administrator.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {!hideHeader && (
        <PageHeader
          title="My Timesheet"
          subtitle={clientName ? `Project: ${clientName}` : undefined}
          breadcrumb={isSuperuser ? ['Superuser', 'My Timesheet'] : ['Employee', 'My Timesheet']}
          action={
            clientList.length > 1 ? (
              <div style={{ position: 'relative' }}>
                <select
                  className="input-field"
                  style={{ paddingRight: '2rem', appearance: 'none', minWidth: 160 }}
                  value={clientId}
                  onChange={e => setSelectedClientId(Number(e.target.value))}
                >
                  {clientList.map(a => (
                    <option key={a.client} value={a.client}>{a.client_name ?? `Project #${a.client}`}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              </div>
            ) : undefined
          }
        />
      )}

      {hideHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', marginTop: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>My Timesheet</h3>
            {clientName && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Project: {clientName}</p>}
          </div>
          {clientList.length > 1 && (
            <div style={{ position: 'relative' }}>
              <select
                className="input-field"
                style={{ paddingRight: '2rem', appearance: 'none', minWidth: 160 }}
                value={clientId}
                onChange={e => setSelectedClientId(Number(e.target.value))}
              >
                {clientList.map(a => (
                  <option key={a.client} value={a.client}>{a.client_name ?? `Project #${a.client}`}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>
          )}
        </div>
      )}

      <TimesheetGrid
        clientId={clientId}
        clientName={clientName}
        employeeId={empId}
        canEditPastMonths={isSuperuser}
      />
    </div>
  );
};

export default EmployeeMyTimesheet;

