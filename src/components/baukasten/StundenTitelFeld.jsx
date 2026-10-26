import React from 'react';
import { base44 } from '@/api/base44Client';

/** Stundentitel direkt im Kopf umbenennen. */
export default function StundenTitelFeld({ stunde }) {
  const [titel, setTitel] = React.useState(stunde.arbeitstitel || '');
  const speichern = () => titel.trim() && titel !== stunde.arbeitstitel && base44.entities.Unterrichtsstunde.update(stunde.id, { arbeitstitel: titel.trim() });
  return (
    <input value={titel} onChange={(e) => setTitel(e.target.value)} onBlur={speichern} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      placeholder="Titel der Stunde" className="w-full truncate bg-transparent font-display text-xl font-bold outline-none" />
  );
}