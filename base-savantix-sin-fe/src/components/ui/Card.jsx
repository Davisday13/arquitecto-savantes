import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ children, className = '', ...props }) {
  return (
    <div className={cn('bg-white rounded-lg shadow-sm border border-gray-200', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={cn('px-6 py-4 border-b border-gray-200', className)}>{children}</div>;
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={cn('text-lg font-semibold text-gray-900', className)}>{children}</h3>;
}

export function CardContent({ children, className = '' }) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

export function Badge({ children, className = '', variant = 'default' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700 border-gray-300',
    primary: 'bg-brand-100 text-brand-700 border-brand-300',
    success: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    warning: 'bg-amber-100 text-amber-700 border-amber-300',
    danger:  'bg-red-100 text-red-700 border-red-300',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      variants[variant] || className,
      className
    )}>
      {children}
    </span>
  );
}
