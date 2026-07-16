import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: ReactNode;
  icon?: LucideIcon;
  description?: ReactNode;
  className?: string;
}

export default function StatCard({ title, value, icon: Icon, description, className }: StatCardProps) {
  return (
    <Card className={cn("shadow-lg bg-card border-border/70 hover:border-primary/50 transition-colors duration-200", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-body text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-5 w-5 text-primary" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-headline text-foreground">{value}</div>
        {description && <div className="text-xs text-muted-foreground font-body pt-1">{description}</div>}
      </CardContent>
    </Card>
  );
}
