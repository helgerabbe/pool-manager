import React from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ZuteilungBereich from './ZuteilungBereich';
import SteuerungBereich from './SteuerungBereich';

/** Organisationsebene des Foliensatzes: Zuteilung und Steuerung. */
export default function OrganisationDialog({ o, setO }) {
  const setze = (p) => setO({ ...o, ...p });
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Users />Organisation</Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Organisation des Foliensatzes</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Gilt für die ganze Stunde, nicht für eine einzelne Folie.</p>
        <ZuteilungBereich o={o} setze={setze} />
        <div className="border-t border-border" />
        <SteuerungBereich o={o} setze={setze} />
      </DialogContent>
    </Dialog>
  );
}