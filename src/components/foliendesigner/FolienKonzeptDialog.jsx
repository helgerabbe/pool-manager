import React from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import FolienKonzept from '@/components/aktivitaetengalerie/FolienKonzept';

/** Öffnet das Folienkonzept direkt aus dem Folien-Designer. */
export default function FolienKonzeptDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" size="sm"><BookOpen />Folienkonzept</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto p-0"><FolienKonzept /></DialogContent>
    </Dialog>
  );
}