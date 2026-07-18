import React, { useState } from 'react';
import { Library, BookOpen, User } from 'lucide-react';
import { kannStrukturBearbeiten } from '@/lib/rbac';
import EmptyState from '@/components/shared/EmptyState';
import AustauschEinheitRow from '@/components/einheiten/AustauschEinheitRow';

/**
 * Austausch-Bibliothek ("Freigegebene Einheiten"): Tauschbörse des Kollegiums.
 * Zeigt alle privaten Einheiten mit im_austausch=true — gruppiert wahlweise
 * nach Fach oder nach Kolleg:in. Kolleg:innen ziehen sich private Kopien;
 * Fachschaftsleitung/Admin können eine Einheit als Poolzeit-Einheit kopieren.
 */
export default function AustauschBibliothek({ einheiten, rolle, benutzerFaecher = [], currentUserEmail, istAdmin }) {
  const [gruppierung, setGruppierung] = useState('fach'); // 'fach' | 'kollege'

  if (einheiten.length === 0) {
    return (
      <EmptyState
        icon={Library}
        title="Noch keine freigegebenen Einheiten"
        description="Hier erscheinen private Einheiten, die Kolleg:innen für das Kollegium freigegeben haben. Geben Sie eine eigene private Einheit über das Bibliotheks-Symbol frei."
      />
    );
  }

  const key = gruppierung === 'fach' ? (e) => e.fach || 'Ohne Fach' : (e) => e.besitzer_email || 'Unbekannt';
  const gruppen = [...einheiten]
    .sort((a, b) => key(a).localeCompare(key(b), 'de') || (a.titel_der_einheit || '').localeCompare(b.titel_der_einheit || '', 'de'))
    .reduce((acc, e) => {
      const k = key(e);
      const letzte = acc[acc.length - 1];
      if (letzte && letzte.key === k) letzte.items.push(e);
      else acc.push({ key: k, items: [e] });
      return acc;
    }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {einheiten.length} freigegebene Einheit{einheiten.length !== 1 ? 'en' : ''} — schauen Sie sich um und ziehen Sie sich eine private Kopie.
        </p>
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1 gap-1">
          <button
            onClick={() => setGruppierung('fach')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${gruppierung === 'fach' ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Nach Fächern
          </button>
          <button
            onClick={() => setGruppierung('kollege')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${gruppierung === 'kollege' ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <User className="w-3.5 h-3.5" />
            Nach Kolleg:innen
          </button>
        </div>
      </div>

      {gruppen.map((gruppe) => (
        <div key={gruppe.key}>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold text-foreground">{gruppe.key}</h2>
            <span className="text-xs text-muted-foreground">
              {gruppe.items.length} Einheit{gruppe.items.length !== 1 ? 'en' : ''}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-2">
            {gruppe.items.map((einheit) => {
              const istEigene = einheit.besitzer_email === currentUserEmail;
              return (
                <AustauschEinheitRow
                  key={einheit.id}
                  einheit={einheit}
                  istEigene={istEigene}
                  darfPoolzeit={kannStrukturBearbeiten(rolle, benutzerFaecher, einheit.fach)}
                  darfZurueckziehen={istEigene || istAdmin}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}