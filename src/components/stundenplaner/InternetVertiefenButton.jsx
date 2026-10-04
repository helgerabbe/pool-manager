import React from 'react';
import { Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/** Vertiefende Internetsuche – in der Vorschau ohne Funktion. */
export default function InternetVertiefenButton({ text }) {
  return (
    <Button size="sm" variant="outline" className="gap-2" onClick={() => toast.info('In der Vorschau wird noch nicht gesucht.')}>
      <Globe className="h-4 w-4" /> {text}
    </Button>
  );
}