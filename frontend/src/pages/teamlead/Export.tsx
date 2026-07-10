import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import { getExportData, generateExcel } from '../../services/export';
import { useToast } from '../../context/ToastContext';
import { Eye, Download, FileSpreadsheet } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const TeamLeadExport: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const clientId = user?.client_id!;
  const now = new Date();

  const [exportType, setExportType] = useState<'monthly' | 'weekly'>('monthly');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [week, setWeek] = useState<number>(1);
  const [year, setYear] = useState(now.getFullYear());
  const [previewing, setPreviewing] = useState(false);

  const { data: previewData = [], isFetching, refetch } = useQuery({
    queryKey: ['tl-export', clientId, exportType, month, week, year],
    queryFn: () => getExportData({
      client: clientId,
      year,
      ...(exportType === 'monthly' ? { month } : { week_number: week })
    }),
    enabled: false,
  });

  const handlePreview = async () => { setPreviewing(true); await refetch(); };
  const handleDownload = () => {
    if (!previewing || previewData.length === 0) { toast.warning('Click Preview first'); return; }
    if (exportType === 'monthly') {
      generateExcel(previewData, user?.client_name ?? 'Export', year, month);
    } else {
      generateExcel(previewData, user?.client_name ?? 'Export', year, undefined, week);
    }
    toast.success('Excel downloaded!');
  };

  const summary: Record<string, Record<string, number>> = {};
  const allProjects = new Set<string>();
  previewData.forEach(entry => {
    const emp = entry.employee_name ?? `Employee #${entry.employee}`;
    if (!summary[emp]) summary[emp] = {};
    entry.project_hours.forEach(ph => {
      const code = ph.project_code ?? `P${ph.project}`;
      allProjects.add(code);
      summary[emp][code] = (summary[emp][code] ?? 0) + Number(ph.hours || 0);
    });
  });
  const projectCols = Array.from(allProjects);
  const summaryRows = Object.entries(summary);

  return (
    <div>
      <PageHeader title="Export" subtitle={`Export timesheets for ${user?.client_name ?? 'your client'}`} breadcrumb={['Team Lead', 'Export']} />

      <div className="card card-padding" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group">
            <label className="form-label">Client</label>
            <input type="text" className="input-field" value={user?.client_name ?? ''} disabled style={{ maxWidth: 200 }} />
          </div>
          <div className="form-group" style={{ minWidth: 120 }}>
            <label className="form-label">Export Scope</label>
            <select className="input-field" value={exportType} onChange={e => { setExportType(e.target.value as any); setPreviewing(false); }}>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          {exportType === 'monthly' ? (
            <div className="form-group">
              <label className="form-label">Month</label>
              <select className="input-field" value={month} onChange={e => { setMonth(Number(e.target.value)); setPreviewing(false); }}>
                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Week Number</label>
              <input type="number" className="input-field" style={{ width: 100 }} value={week} min={1} max={53} onChange={e => { setWeek(Number(e.target.value)); setPreviewing(false); }} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Year</label>
            <input type="number" className="input-field" style={{ width: 100 }} value={year} min={2020} max={2100} onChange={e => { setYear(Number(e.target.value)); setPreviewing(false); }} />
          </div>
          <button className="btn btn-secondary" onClick={handlePreview} disabled={isFetching}>
            {isFetching ? <span className="spinner" /> : <Eye size={16} />}{isFetching ? 'Loading…' : 'Preview'}
          </button>
          <button className="btn btn-primary" onClick={handleDownload} disabled={!previewing || previewData.length === 0}>
            <Download size={16} /> Download Excel
          </button>
        </div>
      </div>

      {previewing && (
        <div className="card">
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>
              {user?.client_name} · {exportType === 'monthly' ? `${MONTHS[month-1]} ${year}` : `Week ${week}, ${year}`}
            </h3>
          </div>
          <div className="table-container">
            {summaryRows.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon"><FileSpreadsheet size={40} /></div><div className="empty-state-title">No data for this period</div></div>
            ) : (
              <table>
                <thead><tr><th>Employee</th>{projectCols.map(pc => <th key={pc}>{pc}</th>)}<th>Total</th></tr></thead>
                <tbody>
                  {summaryRows.map(([emp, projects]) => {
                    const total = Object.values(projects).reduce((s, h) => s + h, 0);
                    return (
                      <tr key={emp}>
                        <td style={{ fontWeight: 600 }}>{emp}</td>
                        {projectCols.map(pc => (
                          <td key={pc}>
                            {projects[pc] !== undefined ? projects[pc].toFixed(2) : '—'}
                          </td>
                        ))}
                        <td className="ts-total-cell">{total.toFixed(2)}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeadExport;
