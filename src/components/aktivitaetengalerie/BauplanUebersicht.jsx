import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

/** Übersicht: Was gehört zur Methode, was nicht. */
export default function BauplanUebersicht({ dazu = [], nicht = [] }) {
  if (!dazu.length && !nicht.length) return null;
  const liste = (punkte, Icon, farbe) => (
    <ul className="space-y-1.5">
      {punkte.map((p, i) => <li key={i} className="flex gap-2 text-sm"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${farbe}`} />{p}</li>)}
    </ul>
  );
  return (
    <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
      <div className="space-y-2"><p className="text-sm font-semibold">Gehört dazu</p>{liste(dazu, CheckCircle2, 'text-green-600')}</div>
      <div className="space-y-2"><p className="text-sm font-semibold">Gehört nicht dazu</p>{liste(nicht, XCircle, 'text-destructive')}</div>
    </div>
  );
}