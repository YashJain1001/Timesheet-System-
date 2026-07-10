import React from 'react';

type BadgeType = 'present' | 'leave' | 'holiday' | 'active' | 'inactive' | 'team_lead' | 'employee' | 'superuser' | 'neutral';

interface BadgeProps {
  type: BadgeType;
  label?: string;
}

const LABELS: Record<BadgeType, string> = {
  present:   'Present',
  leave:     'Leave',
  holiday:   'Holiday',
  active:    'Active',
  inactive:  'Inactive',
  team_lead: 'Team Lead',
  employee:  'Employee',
  superuser: 'Superuser',
  neutral:   '',
};

const Badge: React.FC<BadgeProps> = ({ type, label }) => (
  <span className={`badge badge-${type}`}>
    {label ?? LABELS[type]}
  </span>
);

export default Badge;
