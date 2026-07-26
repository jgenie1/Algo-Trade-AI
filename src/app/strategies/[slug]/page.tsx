
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, BrainCircuit } from "lucide-react";

export default function StrategyDetailPage() {
  return (
    <div className="space-y-8 flex flex-col items-center justify-center text-center h-full">
      <div className="max-w-md">
        <Card className="shadow-xl bg-card border-border/70">
          <CardHeader>
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <BrainCircuit className="h-10 w-10 text-primary" />
              </div>
              <CardTitle className="text-2xl font-headline text-foreground">
                Exécution de Stratégie à Venir
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-body text-muted-foreground text-lg px-4">
             Cette page vous permettra de configurer et d'exécuter des stratégies de trading en direct. Cette fonctionnalité est en cours de développement.
            </CardDescription>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground font-body">
              <Wrench className="h-4 w-4" />
              <span>Bientôt disponible !</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
