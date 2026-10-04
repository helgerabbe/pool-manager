import React from 'react';
import { Construction, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

/** Platzhalter-Startseite für per IServ angemeldete Schüler. */
export default function SchuelerBaustelle({ name }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <Construction className="h-12 w-12 text-accent" />
      <h1 className="font-display text-2xl font-bold">Under Construction</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {name ? `Hallo ${name}! ` : ''}Dein Schülerbereich im Pool-Manager wird gerade gebaut.
      </p>
      <Button variant="outline" className="gap-2" onClick={() => base44.auth.logout()}>
        <LogOut className="h-4 w-4" /> Abmelden
      </Button>
    </div>
  );
}