import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import TimesheetGrid from '../../components/TimesheetGrid';
import { getClientEmployees } from '../../services/clientEmployees';
import { ChevronDown } from 'lucide-react';

const TeamLeadMyTimesheet: React.FC = () => {
  const { user } = useAuth();
  const empId = user?.employee_id;

  // Fetch all client assignments for this employee (including where they are lead or employee)
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['my-clients', empId],
    queryFn: () => getClientEmployees({ employee: empId! }),
    enabled: !!empId,
  });

  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const clientId = selectedClientId ?? assignments[0]?.client ?? null;
  const clientName = assignments.find((a: any) => a.client === clientId)?.client_name ?? undefined;

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><span className="spinner" /></div>;
  }

  if (assignments.length === 0 || !clientId || !empId) {
    return (
      <div>
        <PageHeader title="My Timesheet" breadcrumb={['Team Lead', 'My Timesheet']} />
        <div className="card card-padding">
          <p style={{ color: 'var(--text-secondary)' }}>You are not assigned to any project. Contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="My Timesheet"
        subtitle={clientName ? `Project: ${clientName} — Fill your own timesheet` : 'Fill your own timesheet'}
        breadcrumb={['Team Lead', 'My Timesheet']}
        action={
          assignments.length > 1 ? (
            <div style={{ position: 'relative' }}>
              <select
                className="input-field"
                style={{ paddingRight: '2rem', appearance: 'none', minWidth: 160 }}
                value={clientId}
                onChange={e => setSelectedClientId(Number(e.target.value))}
              >
                {assignments.map(a => (
                  <option key={a.client} value={a.client}>{a.client_name ?? `Project #${a.client}`}</option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>
          ) : undefined
        }
      />
      <TimesheetGrid
        clientId={clientId}
        clientName={clientName}
        employeeId={empId}
        canEditPastMonths={true}
      />
    </div>
  );
};

export default TeamLeadMyTimesheet;
