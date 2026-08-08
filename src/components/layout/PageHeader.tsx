import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 md:flex md:items-center md:justify-between pb-4 border-b border-border">
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl font-headline">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-base text-muted-foreground font-body">{description}</p>
        )}
      </div>
      {actions && <div className="mt-4 flex flex-shrink-0 md:ml-4 md:mt-0">{actions}</div>}
    </div>
  );
}
