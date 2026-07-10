// @ts-ignore
import XLSX from 'xlsx-js-style';
import api from './api';
import { TimesheetEntry } from './timesheets';

export interface ExportFilters {
  client: number;
  month?: number;
  year: number;
  week_number?: number;
}

export const getExportData = (params: ExportFilters) => {
  const queryParams: any = { client: params.client, year: params.year };
  if (params.month !== undefined && params.month !== null && params.month !== '') {
    queryParams.month_number = params.month;
  }
  if (params.week_number !== undefined && params.week_number !== null && params.week_number !== '') {
    queryParams.week_number = params.week_number;
  }
  return api.get<TimesheetEntry[]>('/timesheet-entries/', {
    params: queryParams,
  }).then(r => r.data);
};

const applyStylesToSheet = (ws: any) => {
  if (!ws || !ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  const rowHeights = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    rowHeights.push({ hpt: r === 0 ? 26 : 20 });
    
    let isTotalRow = false;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellRef];
      if (cell && cell.v && typeof cell.v === 'string' && cell.v.toLowerCase().includes('total')) {
        isTotalRow = true;
        break;
      }
    }

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) {
        ws[cellRef] = { t: 's', v: '' };
      }
      const cell = ws[cellRef];
      const isNumeric = cell.t === 'n' || (cell.v !== '' && !isNaN(Number(cell.v)) && typeof cell.v !== 'string');

      if (isNumeric && cell.v !== '') {
        cell.t = 'n';
        cell.v = Number(cell.v);
        
        // Get header cell value to determine column type
        const headerRef = XLSX.utils.encode_cell({ r: 0, c });
        const headerCell = ws[headerRef];
        const headerText = headerCell && headerCell.v ? String(headerCell.v).toLowerCase().trim() : '';

        if (
          headerText.includes('year') ||
          headerText.includes('week') ||
          headerText.includes('month')
        ) {
          cell.z = '0';
        } else {
          cell.z = '0.00';
        }
      }

      if (r === 0) {
        cell.s = {
          fill: { fgColor: { rgb: "3B5998" } }, 
          font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
          alignment: { vertical: "center", horizontal: "center", wrapText: true },
          border: {
            top: { style: "thin", color: { rgb: "2B4988" } },
            bottom: { style: "medium", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "2B4988" } },
            right: { style: "thin", color: { rgb: "2B4988" } }
          }
        };
      } else if (isTotalRow) {
        cell.s = {
          fill: { fgColor: { rgb: "E6ECF5" } },
          font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "1A2B4C" } },
          alignment: {
            vertical: "center",
            horizontal: isNumeric ? "right" : "left"
          },
          border: {
            top: { style: "thin", color: { rgb: "999999" } },
            bottom: { style: "double", color: { rgb: "111111" } },
            left: { style: "thin", color: { rgb: "CCCCCC" } },
            right: { style: "thin", color: { rgb: "CCCCCC" } }
          }
        };
      } else {
        cell.s = {
          font: { name: "Segoe UI", sz: 10, color: { rgb: "333333" } },
          alignment: {
            vertical: "center",
            horizontal: isNumeric ? "right" : "left"
          },
          border: {
            top: { style: "thin", color: { rgb: "E1E1E1" } },
            bottom: { style: "thin", color: { rgb: "E1E1E1" } },
            left: { style: "thin", color: { rgb: "E1E1E1" } },
            right: { style: "thin", color: { rgb: "E1E1E1" } }
          }
        };
      }
    }
  }
  ws['!rows'] = rowHeights;
};

/**
 * Generate an Excel file matching the BMK sheet format.
 * Columns: Date | Year | Week No | Month No | Employee | Description | Total | Proj1 | Proj2...
 */
export const generateExcel = (
  entries: TimesheetEntry[],
  clientName: string,
  year: number,
  month?: number,
  weekNumber?: number
) => {
  // Collect all unique project codes and sort them alphabetically
  const projectMap = new Map<number, string>();
  entries.forEach(e => {
    e.project_hours.forEach(ph => {
      projectMap.set(ph.project, ph.project_code ?? `Proj${ph.project}`);
    });
  });
  const projects = Array.from(projectMap.entries()); // [id, code][]
  projects.sort((a, b) => a[1].localeCompare(b[1]));

  // Get all unique calendar week numbers present in the entries and sort them
  const calendarWeeks = Array.from(new Set(entries.map(e => e.week_number)));
  calendarWeeks.sort((a, b) => a - b);

  // Map calendar week_number to relative week index (1-based)
  const weekMap = new Map<number, number>();
  calendarWeeks.forEach((cw, idx) => {
    weekMap.set(cw, idx + 1);
  });

  // Get all unique employees and sort alphabetically
  const employeeNames = Array.from(new Set(entries.map(e => e.employee_name ?? `Employee #${e.employee}`)));
  employeeNames.sort();

  const displayMonth = month ?? (entries.length > 0 ? entries[0].month_number : new Date().getMonth() + 1);

  // ============================================================
  // ── Sheet 1: Detailed (with Descriptions) ──
  // ============================================================
  const detailedHeaders = [
    'Date', 'Year', 'Week No', 'Month No', 'Employee',
    'Description', 'Total Hours',
    ...projects.map(([, code]) => code),
  ];

  const detailedRows: any[][] = [];
  const detailedTotalsByProject: Record<number, number> = {};
  projects.forEach(([id]) => { detailedTotalsByProject[id] = 0; });
  let detailedGrandTotal = 0;

  entries.forEach(entry => {
    const projectHoursMap: Record<number, number> = {};
    entry.project_hours.forEach(ph => {
      const hoursNum = Number(ph.hours || 0);
      projectHoursMap[ph.project] = hoursNum;
      detailedTotalsByProject[ph.project] = (detailedTotalsByProject[ph.project] ?? 0) + hoursNum;
    });
    detailedGrandTotal += Number(entry.total_hours || 0);

    detailedRows.push([
      entry.date,
      entry.year,
      entry.week_number,
      entry.month_number,
      entry.employee_name ?? entry.employee,
      entry.description ?? '',
      Number(entry.total_hours || 0),
      ...projects.map(([id]) => projectHoursMap[id] ?? 0),
    ]);
  });

  detailedRows.push([
    'TOTAL', year, '', displayMonth, '', '', detailedGrandTotal,
    ...projects.map(([id]) => detailedTotalsByProject[id]),
  ]);

  // ============================================================
  // ── Sheet 2: Weekly Summary ──
  // ============================================================
  const weeklyHeaders = [
    'Year', 'Month Num', 'Weekly Num', 'Team Member',
    ...projects.map(([, code]) => code),
    'Total',
  ];

  const weeklyDetailRows: any[][] = [];
  const weeklyTotalRows: any[][] = [];
  const monthlyTotalsByProject: Record<number, number> = {};
  const yearlyTotalsByProject: Record<number, number> = {};
  projects.forEach(([id]) => {
    monthlyTotalsByProject[id] = 0;
    yearlyTotalsByProject[id] = 0;
  });

  calendarWeeks.forEach(cw => {
    const relativeWeekNum = weekMap.get(cw)!;
    const weeklyTotalsByProject: Record<number, number> = {};
    projects.forEach(([id]) => { weeklyTotalsByProject[id] = 0; });
    let weeklyGrandTotal = 0;

    let isFirstRowForWeek = true;

    employeeNames.forEach(empName => {
      const empWeekEntries = entries.filter(e => 
        (e.employee_name ?? `Employee #${e.employee}`) === empName && e.week_number === cw
      );

      if (empWeekEntries.length === 0) return;

      const empProjectHours: Record<number, number> = {};
      let empWeeklyTotal = 0;
      let hasHours = false;

      empWeekEntries.forEach(entry => {
        entry.project_hours.forEach(ph => {
          const hoursNum = Number(ph.hours || 0);
          if (hoursNum > 0) {
            empProjectHours[ph.project] = (empProjectHours[ph.project] ?? 0) + hoursNum;
            weeklyTotalsByProject[ph.project] = (weeklyTotalsByProject[ph.project] ?? 0) + hoursNum;
            monthlyTotalsByProject[ph.project] = (monthlyTotalsByProject[ph.project] ?? 0) + hoursNum;
            yearlyTotalsByProject[ph.project] = (yearlyTotalsByProject[ph.project] ?? 0) + hoursNum;
            empWeeklyTotal += hoursNum;
            weeklyGrandTotal += hoursNum;
            hasHours = true;
          }
        });
      });

      if (hasHours) {
        weeklyDetailRows.push([
          isFirstRowForWeek ? year : '',
          isFirstRowForWeek ? displayMonth : '',
          isFirstRowForWeek ? relativeWeekNum : '',
          empName,
          ...projects.map(([id]) => empProjectHours[id] ?? 0),
          empWeeklyTotal,
        ]);
        isFirstRowForWeek = false;
      }
    });

    if (weeklyGrandTotal > 0) {
      weeklyTotalRows.push([
        '',
        '',
        `${relativeWeekNum} Total`,
        '',
        ...projects.map(([id]) => weeklyTotalsByProject[id] ?? 0),
        weeklyGrandTotal,
      ]);
    }
  });

  const monthlyGrandTotal = Object.values(monthlyTotalsByProject).reduce((s, v) => s + v, 0);
  const yearlyGrandTotal = Object.values(yearlyTotalsByProject).reduce((s, v) => s + v, 0);

  const weeklyRows = [
    ...weeklyDetailRows,
    ...weeklyTotalRows,
    [
      '',
      `${displayMonth} Total`,
      '',
      '',
      ...projects.map(([id]) => monthlyTotalsByProject[id] ?? 0),
      monthlyGrandTotal,
    ],
    [
      `${year} Total`,
      '',
      '',
      '',
      ...projects.map(([id]) => yearlyTotalsByProject[id] ?? 0),
      yearlyGrandTotal,
    ]
  ];

  // ============================================================
  // ── Sheet 3: Monthly Summary ──
  // ============================================================
  const monthlyHeaders = [
    'Month Num', 'Team Member',
    ...projects.map(([, code]) => code),
    'Total',
  ];

  const monthlySummaryRows: any[][] = [];
  const monthlySummaryTotalsByProject: Record<number, number> = {};
  projects.forEach(([id]) => { monthlySummaryTotalsByProject[id] = 0; });
  let monthlySummaryGrandTotal = 0;

  let isFirstRowForMonthlySummary = true;

  employeeNames.forEach(empName => {
    const empEntries = entries.filter(e => (e.employee_name ?? `Employee #${e.employee}`) === empName);

    if (empEntries.length === 0) return;

    const empProjectHours: Record<number, number> = {};
    let empTotalHours = 0;

    empEntries.forEach(entry => {
      entry.project_hours.forEach(ph => {
        const hoursNum = Number(ph.hours || 0);
        if (hoursNum > 0) {
          empProjectHours[ph.project] = (empProjectHours[ph.project] ?? 0) + hoursNum;
          monthlySummaryTotalsByProject[ph.project] = (monthlySummaryTotalsByProject[ph.project] ?? 0) + hoursNum;
          empTotalHours += hoursNum;
          monthlySummaryGrandTotal += hoursNum;
        }
      });
    });

    if (empTotalHours > 0) {
      monthlySummaryRows.push([
        isFirstRowForMonthlySummary ? displayMonth : '',
        empName,
        ...projects.map(([id]) => empProjectHours[id] ?? 0),
        empTotalHours,
      ]);
      isFirstRowForMonthlySummary = false;
    }
  });

  monthlySummaryRows.push([
    `${displayMonth} Total`,
    '',
    ...projects.map(([id]) => monthlySummaryTotalsByProject[id] ?? 0),
    monthlySummaryGrandTotal,
  ]);

  // ============================================================
  // ── Excel Workbook Assembly ──
  // ============================================================
  const wb = XLSX.utils.book_new();

  // Tab 1: Detailed
  const ws1 = XLSX.utils.aoa_to_sheet([detailedHeaders, ...detailedRows]);
  ws1['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 20 },
    { wch: 30 }, { wch: 12 },
    ...projects.map(() => ({ wch: 10 })),
  ];
  applyStylesToSheet(ws1);
  XLSX.utils.book_append_sheet(wb, ws1, 'Detailed');

  // Tab 2: Weekly Summary
  const ws2 = XLSX.utils.aoa_to_sheet([weeklyHeaders, ...weeklyRows]);
  ws2['!cols'] = [
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
    ...projects.map(() => ({ wch: 10 })),
    { wch: 12 },
  ];
  applyStylesToSheet(ws2);
  XLSX.utils.book_append_sheet(wb, ws2, 'Weekly Summary');

  // Tab 3: Monthly Summary
  const ws3 = XLSX.utils.aoa_to_sheet([monthlyHeaders, ...monthlySummaryRows]);
  ws3['!cols'] = [
    { wch: 12 }, { wch: 20 },
    ...projects.map(() => ({ wch: 10 })),
    { wch: 12 },
  ];
  applyStylesToSheet(ws3);
  XLSX.utils.book_append_sheet(wb, ws3, 'Monthly Summary');

  if (weekNumber !== undefined && weekNumber !== null && weekNumber !== 0) {
    XLSX.writeFile(wb, `Timesheet_${clientName}_Week_${weekNumber}_${year}.xlsx`);
  } else {
    const monthStr = String(displayMonth).padStart(2, '0');
    XLSX.writeFile(wb, `Timesheet_${clientName}_Month_${monthStr}_${year}.xlsx`);
  }
};
