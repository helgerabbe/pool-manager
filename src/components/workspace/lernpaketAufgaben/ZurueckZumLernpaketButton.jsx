import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Rücksprung aus einem Element (z. B. Slideshow, Video, Test) zur Übersicht seines Lernpakets. */
export default function ZurueckZumLernpaketButton({ onClick }) {
  return (
    <Button variant="ghost" size="sm" className="gap-1.5 mb-3" onClick={onClick}>
      <ArrowLeft /> Zum Lernpaket
    </Button>
  );
}