/**
 * LernlandkarteSeite.jsx
 *
 * Die Lernlandkarte für Schüler (System-Baustein sys_map_full): eine
 * explorative Karte der Einheit, die sich beim Hineinklicken aufdeckt.
 *
 * Aufbau der Karte (siehe lib/lernlandkarteGraph):
 *   Einheit → Themenfeld-Leitfrage → Lernziel-Leitfrage → Wissensspeicher,
 *   dazu ein Aufgaben-Sammelknoten AM THEMENFELD und ein Vorwissen-Ast.
 *
 * „Kann ich schon" wird als Selbsteinschätzung 'sicher' des Lernziels
 * gespeichert — dieselbe Quelle wie die Ampel im Lernpaket.
 */
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as SchuelerData from '@/services/schueler/SchuelerDataService';
import { ITEM_GATE } from '@/lib/schuelerPfadGating';
import LernlandkarteAnsicht from '@/components/lernlandkarte/LernlandkarteAnsicht';

export default function LernlandkarteSeite({
  einheitId,
  einheitTitel,
  lerntyp = 'pragmatiker',
  userEmail,
  flatItems,
  aufgabenById,
  erledigt,
  busy,
  onErledigt,
  onOpenLernpaket,
  onOpenAufgabe,
}) {
  const queryClient = useQueryClient();
  const [speichert, setSpeichert] = useState(false);

  // ── Daten ─────────────────────────────────────────────────────────────
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
  const aufgabenQ = useQuery({
    queryKey: ['lernlandkarte-aufgaben', einheitId],
    queryFn: () => SchuelerData.listAufgabenByEinheit(einheitId),
    enabled: !!einheitId,
  });
  const vorwissenQ = useQuery({
    queryKey: ['lernlandkarte-vorwissen', einheitId],
    queryFn: () => SchuelerData.listBasisVorwissenByEinheit(einheitId),
    enabled: !!einheitId,
  });

  const pakete = useMemo(
    () => (lernpaketeQ.data || []).filter((p) => p.sync_status !== 'to_delete'),
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

  const einschaetzungenKey = ['lernzielEinschaetzungen', userEmail, einheitId];
  const einschaetzungenQ = useQuery({
    queryKey: einschaetzungenKey,
    queryFn: () => SchuelerData.listLernzielEinschaetzungen(userEmail, einheitId),
    enabled: !!userEmail && !!einheitId,
  });

  const loading =
    themenfelderQ.isLoading ||
    lernpaketeQ.isLoading ||
    (pakete.length > 0 && lernzieleQ.isLoading) ||
    einschaetzungenQ.isLoading;

  // ── Abgeleitete Strukturen ────────────────────────────────────────────
  const einschaetzungByZiel = useMemo(() => {
    const map = {};
    for (const e of einschaetzungenQ.data || []) map[e.lernziel_id] = e.einschaetzung;
    return map;
  }, [einschaetzungenQ.data]);

  // Lernpaket-ID → Pfad-Item (Sprungziel), aus den sichtbaren Pfad-Items.
  const pfadZiele = useMemo(() => {
    const map = new Map();
    for (const it of flatItems || []) {
      if (it.type !== 'aufgabe') continue;
      map.set(it.ref_id, {
        instanceId: it.instance_id,
        gesperrt: !it.sektorFreigeschaltet || it.gate === ITEM_GATE.GESPERRT,
        erledigt: it.gate === ITEM_GATE.ERLEDIGT,
      });
    }
    return map;
  }, [flatItems]);

  const bearbeiteteAufgabenIds = useMemo(
    () =>
      (flatItems || [])
        .filter((it) => it.type === 'aufgabe' && it.gate === ITEM_GATE.ERLEDIGT)
        .map((it) => it.ref_id),
    [flatItems]
  );

  // ── Aktionen ──────────────────────────────────────────────────────────
  const handleOeffnen = (node) => {
    if (node.typ === 'aufgaben') {
      const erste = (node.refs.aufgabenIds || []).find((id) => pfadZiele.has(id));
      const ziel = erste ? pfadZiele.get(erste) : null;
      if (ziel && !ziel.gesperrt) onOpenAufgabe?.(ziel.instanceId, erste);
      return;
    }
    const ziel = pfadZiele.get(node.refs?.lernpaketId);
    if (ziel && !ziel.gesperrt) onOpenLernpaket?.(ziel.instanceId);
  };

  const handleMarkieren = async (node) => {
    const zielId = node.refs?.lernzielId;
    if (!zielId) return;
    setSpeichert(true);
    try {
      const vorhanden = (einschaetzungenQ.data || []).find((e) => e.lernziel_id === zielId);
      const neu = einschaetzungByZiel[zielId] === 'sicher' ? null : 'sicher';
      if (vorhanden) {
        if (neu === null) await SchuelerData.deleteLernzielEinschaetzung(vorhanden.id);
        else await SchuelerData.updateLernzielEinschaetzung(vorhanden.id, { einschaetzung: neu });
      } else if (neu) {
        await SchuelerData.createLernzielEinschaetzung({
          user_email: userEmail,
          einheit_id: einheitId,
          lernziel_id: zielId,
          lernpaket_id: node.refs.lernpaketId,
          einschaetzung: neu,
        });
      }
      await queryClient.invalidateQueries({ queryKey: einschaetzungenKey });
    } finally {
      setSpeichert(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0b132b] text-white/60">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <LernlandkarteAnsicht
          einheitTitel={einheitTitel}
          themenfelder={themenfelderQ.data || []}
          lernpakete={pakete}
          lernziele={lernzieleQ.data || []}
          aufgaben={aufgabenQ.data || []}
          vorwissenPakete={vorwissenQ.data || []}
          lerntyp={lerntyp}
          einschaetzungByZiel={einschaetzungByZiel}
          bearbeiteteAufgabenIds={bearbeiteteAufgabenIds}
          onOeffnen={handleOeffnen}
          onMarkieren={handleMarkieren}
          busy={speichert}
        />
      </div>

      <div className="shrink-0 border-t border-white/10 bg-[#0b132b] px-5 py-4">
        {erledigt ? (
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-[#06d6a0]">
            <CheckCircle2 className="h-5 w-5" /> Bereits erledigt
          </div>
        ) : (
          <Button
            className="h-12 w-full gap-2 bg-[#06d6a0] text-base font-semibold text-[#0b132b] hover:bg-[#06d6a0]/90"
            disabled={busy}
            onClick={onErledigt}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Habe ich mir angeschaut
          </Button>
        )}
      </div>
    </div>
  );
}