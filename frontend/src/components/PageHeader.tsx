import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  action?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, breadcrumb, action }) => (
  <div className="page-header">
    <div className="page-header-text">
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="breadcrumb">
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="breadcrumb-sep">/</span>}
              <span>{crumb}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {action && <div className="page-header-action">{action}</div>}
  </div>
);

export default PageHeader;
