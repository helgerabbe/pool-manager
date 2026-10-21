import React from 'react';
import { base44 } from '@/api/base44Client';

/** Speichert den Stundenplaner-Stand an einer Unterrichtsstunde. Legt sie beim ersten Speichern an. */
export default function usePlanerSpeichern(einheit) {
  const [stundeId, setStundeId] = React.useState(() => new URLSearchParams(window.location.search).get('stunde'));
  const [status, setStatus] = React.useState('');

  const laden = React.useCallback(async () => (stundeId ? (await base44.entities.Unterrichtsstunde.get(stundeId))?.planer_stand : null), []); // eslint-disable-line react-hooks/exhaustive-deps

  const speichern = async (stand, titel) => {
    setStatus('speichert');
    const daten = { planer_stand: { ...stand, gespeichert_am: new Date().toISOString() }, arbeitstitel: titel || 'Neue Stunde', status: stand.phase === 'fertig' ? 'bereit' : 'entwurf' };
    if (stundeId) {
      await base44.entities.Unterrichtsstunde.update(stundeId, daten);
    } else {
      const me = await base44.auth.me();
      const neu = await base44.entities.Unterrichtsstunde.create({ ...daten, unterrichtseinheit_id: einheit.id, fach: einheit.fach, jahrgangsstufe: einheit.jahrgangsstufe, besitzer_email: me.email });
      setStundeId(neu.id);
      const url = new URL(window.location.href);
      url.searchParams.set('stunde', neu.id);
      window.history.replaceState(null, '', url);
    }
    setStatus('gespeichert');
  };

  return { stundeId, status, laden, speichern };
}