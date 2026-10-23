import React from 'react';
import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import GestaltungPlatzhalter from '@/components/aktivitaetengalerie/foliensatz/GestaltungPlatzhalter';

/** Öffnet die festgelegten Gestaltungsregeln (Layout-Konzept) direkt aus dem Folien-Designer. */
export default function LayoutKonzeptDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Palette />Layout-Konzept</Button></DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-y-auto"><GestaltungPlatzhalter /></DialogContent>
    </Dialog>
  );
}