/**
 * hooks/useLerngruppen.js
 *
 * Lädt die Lerngruppen der Lehrkraft und führt beim ersten Öffnen die
 * Auto-Migration aus: Für jede Fach+Jahrgang-Kombination mit bestehenden
 * Inhalten (Unterrichtseinheiten, Stunden, Übungen, alte Kacheln) ohne
 * Lerngruppe wird eine angelegt; Name und Reihenfolge alter Kacheln bleiben
 * erhalten. Unterrichtseinheiten ohne lerngruppe_id werden ihr zugeordnet.
 */
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const key = (f, j) => `${f}::${j}`;

export function useLerngruppen(besitzerEmail, { stunden = [], bloecke = [] } = {}) {
  const queryClient = useQueryClient();
  const laeuft = useRef(false);
  const aktiv = !!besitzerEmail;

  const lgQuery = useQuery({
    queryKey: ['lerngruppen', besitzerEmail],
    queryFn: () => base44.entities.Lerngruppe.filter({ besitzer_email: besitzerEmail }, 'reihenfolge', 200),
    enabled: aktiv,
  });
  const ueQuery = useQuery({
    queryKey: ['unterrichtseinheiten', besitzerEmail, 'alle'],
    queryFn: () => base44.entities.Unterrichtseinheit.filter({ besitzer_email: besitzerEmail }, 'reihenfolge', 500),
    enabled: aktiv,
  });
  const kachelQuery = useQuery({
    queryKey: ['unterrichtskacheln', besitzerEmail],
    queryFn: () => base44.entities.UnterrichtsKachel.filter({ besitzer_email: besitzerEmail }),
    enabled: aktiv,
  });

  const bereit = lgQuery.isSuccess && ueQuery.isSuccess && kachelQuery.isSuccess;

  useEffect(() => {
    if (!bereit || laeuft.current) return;
    const lerngruppen = lgQuery.data || [];
    const ues = ueQuery.data || [];
    const kacheln = kachelQuery.data || [];

    const kombis = new Map();
    const merke = (f, j) => { if (f && j) kombis.set(key(f, String(j)), { fach: f, jahrgangsstufe: String(j) }); };
    ues.filter((u) => !u.lerngruppe_id).forEach((u) => merke(u.fach, u.jahrgangsstufe));
    stunden.forEach((s) => merke(s.fach, s.jahrgangsstufe));
    bloecke.forEach((b) => merke(b.fach, b.jahrgangsstufe));
    kacheln.forEach((k) => merke(k.fach, k.jahrgangsstufe));

    const vorhanden = new Set(lerngruppen.map((l) => key(l.fach, String(l.jahrgangsstufe))));
    const neu = [...kombis.entries()].filter(([k]) => !vorhanden.has(k));
    const ohneZuordnung = ues.filter((u) => !u.lerngruppe_id);
    if (neu.length === 0 && ohneZuordnung.length === 0) return;

    laeuft.current = true;
    (async () => {
      const kachelBy = new Map(kacheln.map((k) => [key(k.fach, String(k.jahrgangsstufe)), k]));
      const angelegt = neu.length
        ? await base44.entities.Lerngruppe.bulkCreate(neu.map(([k, v]) => ({
            ...v,
            besitzer_email: besitzerEmail,
            name: kachelBy.get(k)?.anzeigename || '',
            reihenfolge: kachelBy.get(k)?.reihenfolge ?? 100,
          })))
        : [];
      const alle = [...lerngruppen, ...(angelegt || [])];
      const ziel = new Map();
      alle.forEach((l) => { const k = key(l.fach, String(l.jahrgangsstufe)); if (!ziel.has(k)) ziel.set(k, l.id); });
      const updates = ohneZuordnung
        .map((u) => ({ id: u.id, lerngruppe_id: ziel.get(key(u.fach, String(u.jahrgangsstufe))) }))
        .filter((u) => u.lerngruppe_id);
      if (updates.length) await base44.entities.Unterrichtseinheit.bulkUpdate(updates);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['lerngruppen'] }),
        queryClient.invalidateQueries({ queryKey: ['unterrichtseinheiten'] }),
      ]);
      laeuft.current = false;
    })();
  }, [bereit, lgQuery.data, ueQuery.data, kachelQuery.data, stunden, bloecke, besitzerEmail, queryClient]);

  return {
    lerngruppen: lgQuery.data || [],
    unterrichtseinheiten: ueQuery.data || [],
    isLoading: lgQuery.isLoading || ueQuery.isLoading,
  };
}

export function lerngruppeTitel(lg) {
  if (!lg) return '';
  return lg.name ? `${lg.name} · ${lg.fach}` : `${lg.fach} · Jg. ${lg.jahrgangsstufe}`;
}