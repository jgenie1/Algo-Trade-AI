
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, Wrench } from 'lucide-react';


export default function AIStrategyGeneratorForm() {

  return (
      <Card className="shadow-xl bg-card border-border/70">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Wand2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-headline text-foreground">Forge de Stratégies IA</CardTitle>
              <CardDescription className="font-body text-muted-foreground">
                Cette fonctionnalité est en cours de développement.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                <Wrench className="h-8 w-8 mb-4"/>
                <p className="font-semibold">Bientôt Disponible</p>
                <p className="text-sm">Le générateur de stratégies IA sera bientôt disponible ici.</p>
            </div>
        </CardContent>
      </Card>
  );
}
