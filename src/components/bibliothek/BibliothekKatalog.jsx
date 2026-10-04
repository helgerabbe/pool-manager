import React, { useState } from 'react';
import { useRBAC } from '@/hooks/useRBAC';
import { useBibliothekEintraege, useMerkungen, kiSuche } from '@/hooks/useBibliothek';
import { toast } from 'sonner';
import BibliothekSuchleiste from './BibliothekSuchleiste';
import BibliothekTabelle from './BibliothekTabelle';

/**
 * Katalog der Öffentlichen Bibliothek (Stunden + Übungen).
 * Mit `auswahl`/`onAuswahl` im Übernehmen-Modus: markierte Einträge stehen oben.
 */
export default function BibliothekKatalog({ auswahl, onAuswahl }) {
  const { authUser, faecher: meineFaecher = [] } = useRBAC();
  const { data: eintraege = [], isLoading } = useBibliothekEintraege();
  const { ids: merkIds, umschalten } = useMerkungen(authUser?.email);
  const [filter, setFilter] = useState({ text: '', faecher: meineFaecher.length ? 'meine' : 'alle' });
  const [kiIds, setKiIds] = useState(null);
  const [kiLaeuft, setKiLaeuft] = useState(false);

  const sucheStarten = async (frage) => {
    setKiLaeuft(true);
    const ids = await kiSuche(frage, eintraege).finally(() => setKiLaeuft(false));
    setKiIds(ids);
    if (!ids.length) toast.info('Dazu haben wir in der Bibliothek noch nichts gefunden.');
  };

  const t = filter.text.toLowerCase();
  let liste = eintraege.filter((e) =>
    (filter.faecher === 'alle' || meineFaecher.includes(e.fach)) &&
    (!t || [e.titel, e.beschreibung, e.fach, e.unterrichtseinheit_titel, e.veroeffentlicht_von_name, e.jahrgangsstufe]
      .some((v) => (v || '').toLowerCase().includes(t))));
  if (kiIds) liste = kiIds.map((id) => liste.find((e) => e.id === id)).filter(Boolean);
  if (auswahl) liste = [...liste].sort((a, b) => Number(merkIds.has(b.id)) - Number(merkIds.has(a.id)));

  return (
    <div className="space-y-3">
      <BibliothekSuchleiste
        filter={filter} onFilter={setFilter} onKiSuche={sucheStarten}
        kiLaeuft={kiLaeuft} kiAktiv={!!kiIds} onKiReset={() => setKiIds(null)}
      />
      {isLoading
        ? <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>
        : <BibliothekTabelle eintraege={liste} merkIds={merkIds} onMerken={(id) => umschalten.mutate(id)} auswahl={auswahl} onAuswahl={onAuswahl} />}
    </div>
  );
}