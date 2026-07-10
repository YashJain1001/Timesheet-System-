import React from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: 'accent' | 'success' | 'warning' | 'info';
}

const KPICard: React.FC<KPICardProps> = ({ label, value, icon, variant = 'accent' }) => (
  <div className={`kpi-card ${variant}`}>
    <div className={`kpi-icon ${variant}`}>{icon}</div>
    <div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  </div>
);

export default KPICard;
