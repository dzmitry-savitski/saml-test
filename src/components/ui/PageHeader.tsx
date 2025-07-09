import React from 'react';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode; // For buttons or extra content on the right
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, children, className = '' }) => (
  <div className={`flex justify-between items-center ${className}`}>
    <h1 className="text-2xl font-bold">{title}</h1>
    <div className="flex gap-2">{children}</div>
  </div>
); 