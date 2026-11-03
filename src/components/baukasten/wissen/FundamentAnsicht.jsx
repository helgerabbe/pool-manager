import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import WertAnzeige from './WertAnzeige';

/** Übersicht des Stundenfundaments; bearbeitet wird im gewohnten Fenster. */
export default function FundamentAnsicht({ fundament, onBearbeiten }) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-5 text-sm">
      <WertAnzeige wert={{ ...fundament, materialien: (fundament.materialien || []).map((m) => m.name) }} />
      <Button onClick={onBearbeiten}><Pencil className="h-4 w-4" /> Fundament bearbeiten</Button>
    </div>
  );
}