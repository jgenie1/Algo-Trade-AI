
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrategyCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  className?: string;
}

export default function StrategyCard({ title, description, icon: Icon, href, className }: StrategyCardProps) {
  return (
    <Card className={cn("shadow-lg bg-card border-border/70 hover:border-primary/50 transition-all duration-300 flex flex-col", className)}>
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
        <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-lg font-headline text-foreground">{title}</CardTitle>
          <CardDescription className="text-sm font-body text-muted-foreground mt-1 line-clamp-2">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-end">
        <Button asChild variant="outline" className="w-full font-body text-primary border-primary/50 hover:bg-primary/10">
          <Link href={href}>
            Configurer la Stratégie
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
