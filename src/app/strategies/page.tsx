
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, BrainCircuit } from "lucide-react";

export default function StrategiesPage() {
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
                Centre de Stratégies à Venir
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="font-body text-muted-foreground text-lg px-4">
              Nous construisons un puissant générateur de stratégies IA et une bibliothèque de stratégies pré-configurées. Vous pourrez bientôt concevoir, tester et déployer vos propres algorithmes de trading.
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
