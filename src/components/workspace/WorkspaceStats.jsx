import React from 'react';
import { getLernpaketStatus } from '@/lib/statusLogic';
import { Layers, CheckSquare, FolderOpen } from 'lucide-react';

export default function WorkspaceStats({ lernpakete, lernziele, aufgaben, mappings, userEmail, phaseAktivitaeten = [] }) {
  const paketIds = lernpakete.map(p => p.id);
  const aufgabenEinheit = aufgaben.filter(a => paketIds.includes(a.lernpaket_id));

  const fertigePakete = lernpakete.filter(
    p => getLernpaketStatus(p, lernziele, aufgaben, userEmail, mappings, phaseAktivitaeten) === 'green'
  ).length;

  const transferAufgaben = aufgabenEinheit.filter(a => a.anforderungsebene === '2 - Transfer');
  const projektAufgaben  = aufgabenEinheit.filter(a => a.anforderungsebene === '3 - Projekt');

  const gemappteTransfer = transferAufgaben.filter(
    a => mappings.some(m => m.aufgabe_id === a.id)
  ).length;

  const offeneProjekte = projektAufgaben.filter(
    a => !a.aufgabentext_inhalt?.trim() || !mappings.some(m => m.aufgabe_id === a.id)
  ).length;

  const stats = [
    {
      icon: Layers,
      value: `${fertigePakete} / ${lernpakete.length}`,
      label: 'Basis-Pakete fertig',
      color: 'text-green-700 bg-green-100',
    },
    {
      icon: CheckSquare,
      value: `${gemappteTransfer} / ${transferAufgaben.length}`,
      label: 'Übungen gemappt',
      color: 'text-blue-700 bg-blue-100',
    },
    {
      icon: FolderOpen,
      value: offeneProjekte,
      label: 'Projekte offen',
      color: offeneProjekte > 0 ? 'text-amber-700 bg-amber-100' : 'text-purple-700 bg-purple-100',
    },
  ];

  return (
    <div className="flex items-center gap-3">
      {stats.map(({ icon: Icon, value, label, color }) => (
        <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${color}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold">{value}</span>
            <span className="text-xs text-muted-foreground ml-1">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}