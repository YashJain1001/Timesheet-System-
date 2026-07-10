import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from './Modal';
import Badge from './Badge';
import { getEntries, createEntry, updateEntry, TimesheetEntry } from '../services/timesheets';
import { getProjects } from '../services/projects';
import { useToast } from '../context/ToastContext';
import { ChevronLeft, ChevronRight, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface TimesheetGridProps {
  clientId: number;
  clientName?: string;
  employeeId: number;
  canEditPastMonths?: boolean; // team lead can, employee cannot
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export const toLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const TimesheetGrid: React.FC<TimesheetGridProps> = ({ clientId, employeeId, canEditPastMonths = false }) => {
  const qc = useQueryClient();
  const toast = useToast();
  const now = new Date();
  const todayStr = toLocalDateString(now);

  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));
  const [dayModalDate, setDayModalDate] = useState<string | null>(null);
  const [savingDates, setSavingDates] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

  const startOfWeek = currentWeekStart;
  const endOfWeek = new Date(currentWeekStart);
  endOfWeek.setDate(currentWeekStart.getDate() + 6);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', clientId],
    queryFn: () => getProjects(clientId),
  });

  const activeProjects = projects.filter(p => p.is_active);

  // Find unique months spanned by this week to fetch entries
  const monthsToFetch = Array.from(new Set([
    `${startOfWeek.getFullYear()}-${startOfWeek.getMonth() + 1}`,
    `${endOfWeek.getFullYear()}-${endOfWeek.getMonth() + 1}`
  ]));

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['my-entries-weekly', clientId, employeeId, monthsToFetch.join(',')],
    queryFn: async () => {
      const results = await Promise.all(
        monthsToFetch.map(m => {
          const [yr, mo] = m.split('-').map(Number);
          return getEntries({ client: clientId, employee: employeeId, month: mo, year: yr });
        })
      );
      return results.flat();
    },
    enabled: !!clientId && !!employeeId,
  });

  // Build map: date → entry
  const entryMap: Record<string, TimesheetEntry> = {};
  entries.forEach(e => { entryMap[e.date] = e; });

  // Compute the 7 days of the current week (Monday to Sunday)
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    days.push(d);
  }

  type RowState = { status: string; description: string; projectHours: Record<number, number> };

  // Local edits state: date → { status, description, projectHours: { projectId → hours } }
  const [localEdits, setLocalEdits] = useState<Record<string, RowState>>({});

  const getLocalState = (dateStr: string, entry?: TimesheetEntry): RowState => {
    if (localEdits[dateStr]) return localEdits[dateStr];
    if (entry) {
      const ph: Record<number, number> = {};
      entry.project_hours.forEach((p) => { ph[p.project] = Number(p.hours || 0); });
      return { status: entry.status, description: entry.description ?? '', projectHours: ph };
    }
    return { status: 'present', description: '', projectHours: {} };
  };

  const setLocalState = (dateStr: string, partial: Partial<RowState>) => {
    setLocalEdits(prev => {
      const curr = prev[dateStr] ?? getLocalState(dateStr, entryMap[dateStr]);
      return { ...prev, [dateStr]: { ...curr, ...partial } };
    });
  };

  const setProjectHour = (dateStr: string, projectId: number, hours: number) => {
    const curr = localEdits[dateStr] ?? getLocalState(dateStr, entryMap[dateStr]);
    setLocalEdits(prev => ({
      ...prev,
      [dateStr]: { ...curr, projectHours: { ...curr.projectHours, [projectId]: hours } },
    }));
  };

  const computeTotal = (ph: Record<number, number>) => Object.values(ph).reduce((s, h) => s + (isNaN(Number(h)) ? 0 : Number(h)), 0);

  const validateRowState = useCallback((dateStr: string, state: RowState): boolean => {
    if (state.status === 'present') {
      const total = computeTotal(state.projectHours);
      if (total === 0) {
        toast.error(`Cannot save: At least one project hour must be entered for ${dateStr}.`);
        return false;
      }
      if (total > 24) {
        toast.error(`Cannot save: Total logged hours for ${dateStr} cannot exceed 24 hours (entered: ${total}h).`);
        return false;
      }
      
      let hasNegative = false;
      let hasInvalidMax = false;
      Object.entries(state.projectHours).forEach(([_, hrs]) => {
        if (hrs < 0) hasNegative = true;
        if (hrs > 24) hasInvalidMax = true;
      });
      
      if (hasNegative) {
        toast.error(`Cannot save: Project hours cannot be negative.`);
        return false;
      }
      if (hasInvalidMax) {
        toast.error(`Cannot save: No single project can exceed 24 hours.`);
        return false;
      }
      
      if (!state.description.trim()) {
        toast.error(`Cannot save: Description is required for 'Present' status on ${dateStr}.`);
        return false;
      }
    }
    return true;
  }, [toast]);

  const saveRow = useMutation({
    mutationFn: async ({ dateStr, updatedState }: { dateStr: string; updatedState?: RowState }) => {
      const state = updatedState || getLocalState(dateStr, entryMap[dateStr]);
      const date = new Date(dateStr);
      const projectHoursArr: { project: number; hours: number }[] = [];
      if (state.status === 'present') {
        activeProjects.forEach((p) => {
          const h = state.projectHours[p.id] ?? 0;
          if (h > 0) projectHoursArr.push({ project: p.id, hours: h });
        });
      }
      const total = state.status === 'present' ? computeTotal(state.projectHours) : 0;
      const payload = {
        employee: employeeId,
        client: clientId,
        date: dateStr,
        year: date.getFullYear(),
        week_number: getWeekNumber(date),
        month_number: date.getMonth() + 1,
        status: state.status as 'present' | 'leave' | 'holiday',
        description: state.description,
        total_hours: total,
        project_hours: projectHoursArr,
      };
      if (entryMap[dateStr]) {
        return updateEntry(entryMap[dateStr].id, payload);
      }
      return createEntry(payload);
    },
    onSuccess: (_data: unknown, { dateStr }) => {
      qc.invalidateQueries({ queryKey: ['my-entries-weekly'] });
      setLocalEdits(prev => { const n = { ...prev }; delete n[dateStr]; return n; });
      setSavingDates(prev => ({ ...prev, [dateStr]: 'saved' }));
      setTimeout(() => {
        setSavingDates(prev => {
          const next = { ...prev };
          if (next[dateStr] === 'saved') delete next[dateStr];
          return next;
        });
      }, 2000);
    },
    onError: (_err: unknown, { dateStr }) => {
      setSavingDates(prev => ({ ...prev, [dateStr]: 'error' }));
      toast.error(`Failed to save entry for ${dateStr}`);
    },
  });

  const prevWeek = () => {
    setCurrentWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - 7);
      return next;
    });
    setLocalEdits({});
  };

  const nextWeek = () => {
    setCurrentWeekStart(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + 7);
      return next;
    });
    setLocalEdits({});
  };

  const isRowEditable = (dateStr: string) => {
    if (canEditPastMonths) return true;
    if (dateStr > todayStr) return false;
    
    // Lock edits for days belonging to past months
    const date = new Date(dateStr);
    const dateYear = date.getFullYear();
    const dateMonth = date.getMonth() + 1;
    const isPastMonth = dateYear < now.getFullYear() || (dateYear === now.getFullYear() && dateMonth < now.getMonth() + 1);
    
    if (isPastMonth) return false;
    return true;
  };

  const getRowClass = (dateStr: string, status: string, entry?: TimesheetEntry) => {
    if (status === 'leave') return 'row-leave';
    if (status === 'holiday') return 'row-holiday';
    if (!entry && dateStr < todayStr) return 'row-unfilled';
    return 'row-present';
  };

  // Day Modal
  const dayModalEntry = dayModalDate ? entryMap[dayModalDate] : undefined;
  const dayModalState = dayModalDate ? getLocalState(dayModalDate, dayModalEntry) : null;

  return (
    <div>
      {/* Week navigation */}
      <div className="week-navigation">
        <button className="btn btn-secondary btn-sm" onClick={prevWeek}><ChevronLeft size={16} /></button>
        <h2>
          Week {getWeekNumber(currentWeekStart)} ({startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
        </h2>
        <button className="btn btn-secondary btn-sm" onClick={nextWeek}><ChevronRight size={16} /></button>
      </div>

      <div className="card">
        <div className="table-container" style={{ overflowX: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>
          ) : (
            <table style={{ minWidth: 700 + activeProjects.length * 90 }}>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Date</th>
                  <th style={{ width: 60 }}>Day</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ minWidth: 180 }}>Description</th>
                  {activeProjects.map((p) => <th key={p.id} style={{ width: 90 }}>{p.code}</th>)}
                  <th style={{ width: 80 }}>Total</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Sync</th>
                </tr>
              </thead>
              <tbody>
                {days.map(day => {
                  const dateStr = toLocalDateString(day);
                  const entry = entryMap[dateStr];
                  const state = getLocalState(dateStr, entry);
                  const editable = isRowEditable(dateStr);
                  const isToday = dateStr === todayStr;
                  const total = state.status === 'present' ? computeTotal(state.projectHours) : 0;
                  const rowClass = getRowClass(dateStr, state.status, entry);
                  const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <tr
                      key={dateStr}
                      className={rowClass}
                      style={{ opacity: isWeekend && !entry ? 0.5 : 1 }}
                    >
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent-color)' : 'var(--text-primary)' }}
                          onClick={() => setDayModalDate(dateStr)}
                        >
                          {dateStr}
                        </button>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: isWeekend ? 'var(--warning-color)' : 'var(--text-muted)', fontWeight: 500 }}>{dayName}</td>
                      <td>
                        {editable ? (
                          <select
                            className="ts-status-select"
                            value={state.status}
                            onChange={e => {
                              const nextStatus = e.target.value;
                              const curr = localEdits[dateStr] ?? getLocalState(dateStr, entryMap[dateStr]);
                              const newState = { ...curr, status: nextStatus };
                              setLocalState(dateStr, { status: nextStatus });
                              
                              if (nextStatus === 'present') {
                                const total = computeTotal(newState.projectHours);
                                if (total === 0) {
                                  // Don't auto-save present status with 0 hours, wait for user input.
                                  return;
                                }
                              }
                              
                              if (!validateRowState(dateStr, newState)) {
                                setSavingDates(prev => ({ ...prev, [dateStr]: 'error' }));
                                return;
                              }
                              
                              setSavingDates(prev => ({ ...prev, [dateStr]: 'saving' }));
                              saveRow.mutate({ dateStr, updatedState: newState });
                            }}
                            disabled={!editable}
                          >
                            <option value="present">Present</option>
                            <option value="leave">Leave</option>
                            <option value="holiday">Holiday</option>
                          </select>
                        ) : (
                          <Badge type={state.status as any} />
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="input-field"
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
                          value={state.description}
                          onChange={e => setLocalState(dateStr, { description: e.target.value })}
                          onBlur={() => {
                            const curr = localEdits[dateStr] ?? getLocalState(dateStr, entryMap[dateStr]);
                            const dbVal = entryMap[dateStr]?.description ?? '';
                            if (curr.description.trim() !== dbVal.trim()) {
                              if (!validateRowState(dateStr, curr)) {
                                setSavingDates(prev => ({ ...prev, [dateStr]: 'error' }));
                                return;
                              }
                              setSavingDates(prev => ({ ...prev, [dateStr]: 'saving' }));
                              saveRow.mutate({ dateStr, updatedState: curr });
                            }
                          }}
                          placeholder={editable ? 'Task description…' : ''}
                          disabled={!editable}
                        />
                      </td>
                      {activeProjects.map((p) => (
                        <td key={p.id}>
                          <input
                            type="number"
                            className="ts-cell-input"
                            value={state.status !== 'present' ? '' : (state.projectHours[p.id] ?? '')}
                            min={0}
                            max={24}
                            step={0.5}
                            onChange={e => setProjectHour(dateStr, p.id, parseFloat(e.target.value) || 0)}
                            onBlur={() => {
                              const curr = localEdits[dateStr] ?? getLocalState(dateStr, entryMap[dateStr]);
                              const dbPh: Record<number, number> = {};
                              entryMap[dateStr]?.project_hours.forEach(ph => { dbPh[ph.project] = Number(ph.hours || 0); });
                              
                              let hasChanged = false;
                              activeProjects.forEach(ap => {
                                const currH = curr.projectHours[ap.id] ?? 0;
                                const dbH = dbPh[ap.id] ?? 0;
                                if (currH !== dbH) {
                                  hasChanged = true;
                                }
                              });
                              
                              if (hasChanged) {
                                if (!validateRowState(dateStr, curr)) {
                                  setSavingDates(prev => ({ ...prev, [dateStr]: 'error' }));
                                  return;
                                }
                                setSavingDates(prev => ({ ...prev, [dateStr]: 'saving' }));
                                saveRow.mutate({ dateStr, updatedState: curr });
                              }
                            }}
                            disabled={!editable || state.status !== 'present'}
                            placeholder={state.status !== 'present' ? '—' : '0'}
                          />
                        </td>
                      ))}
                      <td className="ts-total-cell" style={{ textAlign: 'center' }}>
                        {state.status === 'present' ? `${total}h` : '—'}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        {savingDates[dateStr] === 'saving' && (
                          <span className="spinner" style={{ width: 16, height: 16, borderWidth: '2px', display: 'inline-block' }} />
                        )}
                        {savingDates[dateStr] === 'saved' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--success-color)' }} title="Saved to server">
                            <CheckCircle2 size={16} />
                          </span>
                        )}
                        {savingDates[dateStr] === 'error' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--danger-color)' }} title="Sync error">
                            <AlertCircle size={16} />
                          </span>
                        )}
                        {!savingDates[dateStr] && entry && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)', opacity: 0.5 }} title="Synced">
                            <CheckCircle2 size={16} />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Single Day Modal */}
      {dayModalDate && dayModalState && (
        <Modal
          open={!!dayModalDate}
          onClose={() => setDayModalDate(null)}
          title={`Entry for ${dayModalDate}`}
          maxWidth="480px"
          footer={
            isRowEditable(dayModalDate) ? (
              <>
                <button className="btn btn-secondary" onClick={() => setDayModalDate(null)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const curr = localEdits[dayModalDate] ?? getLocalState(dayModalDate, entryMap[dayModalDate]);
                    if (!validateRowState(dayModalDate, curr)) {
                      return;
                    }
                    setSavingDates(prev => ({ ...prev, [dayModalDate]: 'saving' }));
                    saveRow.mutate({ dateStr: dayModalDate, updatedState: curr });
                    setDayModalDate(null);
                  }}
                  disabled={saveRow.isPending}
                >
                  {saveRow.isPending ? <span className="spinner" /> : null}Save Entry
                </button>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={() => setDayModalDate(null)}>Close</button>
            )
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="input-field"
                value={dayModalState.status}
                onChange={e => setLocalState(dayModalDate, { status: e.target.value })}
                disabled={!isRowEditable(dayModalDate)}
              >
                <option value="present">Present</option>
                <option value="leave">Leave</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="input-field"
                rows={3}
                value={dayModalState.description}
                onChange={e => setLocalState(dayModalDate, { description: e.target.value })}
                disabled={!isRowEditable(dayModalDate)}
                placeholder="What did you work on?"
              />
            </div>
            {dayModalState.status === 'present' && (
              <div>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Project Hours</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {activeProjects.map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>{p.name} <span className="text-muted">({p.code})</span></span>
                      <input
                        type="number"
                        className="ts-cell-input"
                        value={dayModalState.projectHours[p.id] ?? ''}
                        min={0} max={24} step={0.5}
                        onChange={e => setProjectHour(dayModalDate, p.id, parseFloat(e.target.value) || 0)}
                        disabled={!isRowEditable(dayModalDate)}
                      />
                      <span className="text-muted" style={{ fontSize: '0.8rem' }}>hrs</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>
                  <strong>Total: </strong>
                  <span className="ts-total-cell">{computeTotal(dayModalState.projectHours)}h</span>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TimesheetGrid;
