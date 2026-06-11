import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Map as MapIcon, CheckCircle2, Loader2, Layers, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as SchuelerData from '@/services/schueler/SchuelerDataService';
import { ITEM_GATE } from '@/lib/schuelerPfadGating';
import LernzielAmpel from './LernzielAmpel';

/**
 * Interaktive Lernlandkarte (System-Baustein sys_map_full).
 *
 * Zeigt alle Lernziele der Einheit – gruppiert nach Themenfeld → Lernpaket –
 * in schülergerechter Formulierung (schueler_uebersetzung, sonst Fachsprache).
 *
 * Interaktiv:
 *  - Selbsteinschätzung pro Lernziel (💪 / 🤔 / 🆘), persistiert pro Schüler.
 *  - Lernpaket-Status aus dem eigenen Pfad-Fortschritt (Bearbeitet / Offen).
 *  - Sprung direkt ins Lernpaket, sofern es im Pfad freigeschaltet ist.
 *  - Fortschrittsbalken oben: Wie viele Ziele fühlst du dich schon sicher?
 */
export default function LernlandkarteSeite({
  einheitId,
  userEmail,
  flatItems,        // sichtbare Pfad-Items (für Lernpaket-Status + Navigation)
  aufgabenById,     // Map<id, Aufgabe/Lernpaket>
  erledigt,
  busy,
  onErledigt,
  onOpenLernpaket,  // (instanceId) => void
}) {
  const queryClient = useQueryClient();
  const [lokal, setLokal] = useState({}); // optimistische Overrides: lernziel_id → wert|null

  // ── Daten laden ───────────────────────────────────────────────────────
  const themenfelderQ = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => SchuelerData.listThemenfelderByEinheit(einheitId),
    enabled: !!einheitId,
  });
  const lernpaketeQ = useQuery({
    queryKey: ['lernpakete-by-einheit', einheitId],
    queryFn: () => SchuelerData.listLernpaketeByEinheit(einheitId),
    enabled: !!einheitId,
  });

  const pakete = useMemo(
    () =>
      (lernpaketeQ.data || [])
        .filter((p) => p.sync_status !== 'to_delete')
        .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0)),
    [lernpaketeQ.data]
  );
  const paketIdsKey = pakete.map((p) => p.id).join(',');

  const lernzieleQ = useQuery({
    queryKey: ['lernzieleByPakete', paketIdsKey],
    queryFn: async () => {
      const lists = await Promise.all(
        pakete.map((p) => SchuelerData.listLernzieleByLernpaket(p.id))
      );
      return lists.flat();
    },
    enabled: pakete.length > 0,
  });
  const lernziele = lernzieleQ.data || [];

  const einschaetzungenKey = ['lernzielEinschaetzungen', userEmail, einheitId];
  const einschaetzungenQ = useQuery({
    queryKey: einschaetzungenKey,
    queryFn: () => SchuelerData.listLernzielEinschaetzungen(userEmail, einheitId),
    enabled: !!userEmail && !!einheitId,
  });
  const einschaetzungen = einschaetzungenQ.data || [];

  const loading =
    themenfelderQ.isLoading || lernpaketeQ.isLoading ||
    (pakete.length > 0 && lernzieleQ.isLoading) || einschaetzungenQ.isLoading;

  // ── Abgeleitete Strukturen ────────────────────────────────────────────
  // Lernpaket-Status aus dem Pfad: bearbeitet / offen / gesperrt + Sprungziel.
  const paketStatus = useMemo(() => {
    const map = new Map();
    for (const it of flatItems || []) {
      if (it.type !== 'aufgabe') continue;
      const a = aufgabenById?.get?.(it.ref_id);
      if (!a?._isLernpaket) continue;
      map.set(it.ref_id, {
        instanceId: it.instance_id,
        erledigt: it.gate === ITEM_GATE.ERLEDIGT,
        gesperrt: !it.sektorFreigeschaltet || it.gate === ITEM_GATE.GESPERRT,
      });
    }
    return map;
  }, [flatItems, aufgabenById]);

  const zieleByPaket = useMemo(() => {
    const map = new Map();
    lernziele.forEach((z) => {
      if (!map.has(z.lernpaket_id)) map.set(z.lernpaket_id, []);
      map.get(z.lernpaket_id).push(z);
    });
    return map;
  }, [lernziele]);

  // Themenfeld-Gruppen: nur Pakete mit Lernzielen, leere Gruppen ausblenden.
  const gruppen = useMemo(() => {
    const felder = [...(themenfelderQ.data || [])].sort(
      (a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)
    );
    const result = [];
    for (const tf of felder) {
      const tfPakete = pakete.filter(
        (p) => p.themenfeld_id === tf.id && (zieleByPaket.get(p.id) || []).length > 0
      );
      if (tfPakete.length > 0) result.push({ id: tf.id, titel: tf.titel, pakete: tfPakete });
    }
    const ohneFeld = pakete.filter(
      (p) =>
        !felder.some((tf) => tf.id === p.themenfeld_id) &&
        (zieleByPaket.get(p.id) || []).length > 0
    );
    if (ohneFeld.length > 0) result.push({ id: '_rest', titel: 'Weitere Themen', pakete: ohneFeld });
    return result;
  }, [themenfelderQ.data, pakete, zieleByPaket]);

  // Aktuelle Einschätzung pro Lernziel (lokaler Override gewinnt).
  const wertFuer = (zielId) => {
    if (lokal[zielId] !== undefined) return lokal[zielId];
    return einschaetzungen.find((e) => e.lernziel_id === zielId)?.einschaetzung || null;
  };

  const handleEinschaetzung = async (ziel, neuerWert) => {
    const aktuell = wertFuer(ziel.id);
    const wert = aktuell === neuerWert ? null : neuerWert; // erneutes Tippen hebt auf
    setLokal((prev) => ({ ...prev, [ziel.id]: wert }));

    const existing = einschaetzungen.find((e) => e.lernziel_id === ziel.id);
    if (existing) {
      if (wert === null) await SchuelerData.deleteLernzielEinschaetzung(existing.id);
      else await SchuelerData.updateLernzielEinschaetzung(existing.id, { einschaetzung: wert });
    } else if (wert !== null) {
      await SchuelerData.createLernzielEinschaetzung({
        user_email: userEmail,
        einheit_id: einheitId,
        lernziel_id: ziel.id,
        lernpaket_id: ziel.lernpaket_id,
        einschaetzung: wert,
      });
    }
    await queryClient.invalidateQueries({ queryKey: einschaetzungenKey });
  };

  // Kopf-Statistik über alle sichtbaren Ziele.
  const sichtbareZiele = gruppen.flatMap((g) => g.pakete.flatMap((p) => zieleByPaket.get(p.id) || []));
  const stats = sichtbareZiele.reduce(
    (acc, z) => {
      const w = wertFuer(z.id);
      if (w) acc[w] += 1;
      return acc;
    },
    { sicher: 0, unsicher: 0, schwierig: 0 }
  );
  const sicherProzent = sichtbareZiele.length > 0
    ? Math.round((stats.sicher / sichtbareZiele.length) * 100)
    : 0;

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      {/* Kopf */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
          <MapIcon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Deine Übersicht</p>
          <h1 className="text-lg font-bold text-foreground tracking-tight truncate">Lernlandkarte</h1>
        </div>
      </div>

      {/* Inhalt */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : sichtbareZiele.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground p-6">
            Für diese Einheit sind noch keine Lernziele hinterlegt.
          </div>
        ) : (
          <div className="space-y-6 pb-2">
            {/* Selbstcheck-Kopf */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground mb-1">
                Wie sicher fühlst du dich schon? Schätze dich bei jedem Ziel ein.
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                💪 Kann ich · 🤔 Bin unsicher · 🆘 Brauche Hilfe — du kannst deine Einschätzung jederzeit ändern.
              </p>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${sicherProzent}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="font-medium text-emerald-600">
                  {stats.sicher} von {sichtbareZiele.length} Zielen sicher
                </span>
                <span className="text-muted-foreground">
                  🤔 {stats.unsicher} · 🆘 {stats.schwierig}
                </span>
              </div>
            </div>

            {/* Themenfelder */}
            {gruppen.map((gruppe, gi) => (
              <section key={gruppe.id} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {gi + 1}
                  </span>
                  <h2 className="text-sm font-bold uppercase tracking-wide text-foreground shrink-0">
                    {gruppe.titel}
                  </h2>
                  <span className="h-px flex-1 rounded-full bg-border" />
                </div>

                {gruppe.pakete.map((paket) => {
                  const status = paketStatus.get(paket.id);
                  const ziele = zieleByPaket.get(paket.id) || [];
                  return (
                    <div key={paket.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                      {/* Lernpaket-Kopf */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border">
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                          <Layers className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {paket.titel_des_pakets}
                          </p>
                          {status?.erledigt ? (
                            <p className="text-[11px] font-medium text-emerald-600 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Schon bearbeitet – das solltest du jetzt können
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">Noch nicht bearbeitet</p>
                          )}
                        </div>
                        {status && !status.gesperrt && (
                          <button
                            onClick={() => onOpenLernpaket?.(status.instanceId)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
                          >
                            Üben <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {status?.gesperrt && (
                          <span className="text-muted-foreground shrink-0" title="Noch gesperrt – arbeite erst die Schritte davor ab.">
                            <Lock className="w-4 h-4" />
                          </span>
                        )}
                      </div>

                      {/* Lernziele */}
                      <ul className="divide-y divide-border">
                        {ziele.map((ziel) => (
                          <li key={ziel.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                            <p className="text-sm text-foreground leading-snug flex-1 min-w-0">
                              {ziel.schueler_uebersetzung?.trim() || ziel.formulierung_fachsprache}
                            </p>
                            <LernzielAmpel
                              value={wertFuer(ziel.id)}
                              onSelect={(w) => handleEinschaetzung(ziel, w)}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Aktion */}
      <div className="pt-5 shrink-0">
        {erledigt ? (
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="w-5 h-5" /> Bereits erledigt
          </div>
        ) : (
          <Button
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={busy || loading}
            onClick={onErledigt}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Habe ich erledigt
          </Button>
        )}
      </div>
    </div>
  );
}