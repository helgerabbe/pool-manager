/**
 * AirGapPayloadDownloadCard.jsx
 *
 * Ein-Klick-Download: Alle MBK-Air-Gap-Payloads einer Einheit als ZIP.
 * Erzeugt sämtliche Payloads (0–5) client-seitig aus den Base44-Entitäten
 * und bietet sie als strukturiertes ZIP-Archiv zum Download an.
 *
 * Output-Struktur im ZIP:
 *   payloads/
 *     0-ui-config.json
 *     1-system-context.json
 *     2-structure.json
 *     3-task-content.json
 *     4-micro-briefings.json
 *     5-systembausteine.json
 *
 * Wird im Export-Center unterhalb des MBKPromptGeneratorPanel eingeblendet.
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Download, FileArchive } from 'lucide-react';

import {
  buildUiConfigPayload,
  buildSystemContextPayload,
  buildStructurePayload,
  buildTaskContentBundle,
  buildMicroPayloadBundle,
  buildSystembausteinPayloadBundle,
  extractNavigationContextByRefId,
} from '@/lib/mbkAirGapPayloads';
import { computeSystemContextHash, computeUiConfigHash } from '@/lib/systemContextHash';
import { downloadZip, slugify } from '@/lib/airGapClipboard';
import { useSchulStammdaten } from '@/hooks/useSchulStammdaten';

export default function AirGapPayloadDownloadCard({ einheitId }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const { land, bundesland, schulform } = useSchulStammdaten();
  const stammdaten = { land, bundesland, schulform };

  // ── Einheit + Inhaltsdaten ──────────────────────────────────────────────
  const { data: einheit } = useQuery({
    queryKey: ['einheit', einheitId],
    queryFn: async () => {
      const list = await base44.entities.Einheiten.filter({ id: einheitId });
      return list?.[0] || null;
    },
    enabled: !!einheitId,
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const paketIds = useMemo(() => lernpakete.map((p) => p.id), [lernpakete]);

  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      const all = await base44.entities.Lernziele.list();
      return all.filter((z) => paketIds.includes(z.lernpaket_id));
    },
    enabled: paketIds.length > 0,
  });

  const { data: phaseAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      return base44.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: { $in: paketIds } });
    },
    enabled: paketIds.length > 0,
  });

  const { data: masterAufgaben = [] } = useQuery({
    queryKey: ['masterAufgaben-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      return base44.entities.MasterAufgabe.filter({ lernpaket_id: { $in: paketIds } });
    },
    enabled: paketIds.length > 0,
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const katalogById = useMemo(() => {
    const m = new Map();
    for (const k of aktivitaetenKatalog) m.set(k.id, k);
    return m;
  }, [aktivitaetenKatalog]);

  const { data: allgemeineAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  const allgemeineAufgabenEbene23 = useMemo(
    () => allgemeineAufgaben.filter(
      (a) => a.anforderungsebene === '2 - Transfer' || a.anforderungsebene === '3 - Projekt'
    ),
    [allgemeineAufgaben]
  );

  const { data: systemBausteine = [] } = useQuery({
    queryKey: ['systemBausteine'],
    queryFn: () => base44.entities.SystemBausteine.list('-created_date', 200),
    staleTime: 60_000,
  });

  const { data: schulNomenklatur = [] } = useQuery({
    queryKey: ['schulNomenklatur'],
    queryFn: () => base44.entities.SchulNomenklatur.list('-updated_date', 200),
    staleTime: 60_000,
  });

  const { data: globalPrompts = [] } = useQuery({
    queryKey: ['mbkGlobalPrompts'],
    queryFn: () => base44.entities.MBKGlobalPrompt.list('-created_date', 200),
    staleTime: 60_000,
  });

  const { data: aufgabenbausteine = [] } = useQuery({
    queryKey: ['aufgabenbausteine-by-pakete', paketIds.join(',')],
    queryFn: async () => {
      if (paketIds.length === 0) return [];
      const all = await base44.entities.Aufgabenbausteine.list();
      return all.filter((a) => paketIds.includes(a.lernpaket_id));
    },
    enabled: paketIds.length > 0,
  });

  // ── Hashes ─────────────────────────────────────────────────────────────
  const currentHash = useMemo(
    () => computeSystemContextHash({ stammdaten, schulNomenklatur, globalPrompts }),
    [stammdaten, schulNomenklatur, globalPrompts]
  );
  const currentUiHash = useMemo(
    () => computeUiConfigHash({ globalPrompts }),
    [globalPrompts]
  );

  // ── Payloads bauen (memoized, aber nur bei Download wirklich genutzt) ──
  const payloads = useMemo(() => {
    if (!einheit) return null;

    const uiConfig = buildUiConfigPayload({ globalPrompts, uiConfigHash: currentUiHash });
    const sysCtx = buildSystemContextPayload({
      stammdaten, schulNomenklatur, globalPrompts, systemContextHash: currentHash,
    });
    const structure = buildStructurePayload({
      einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten,
      katalogById, allgemeineAufgaben, systemBausteine,
      systemContextHash: currentHash, uiConfigHash: currentUiHash,
    });
    const navCtx = extractNavigationContextByRefId(structure?.scorm_file_mapping || []);

    const taskContent = buildTaskContentBundle({
      einheit, lernpakete, lernziele, phaseAktivitaeten, katalogById,
      masterAufgaben, allgemeineAufgabenEbene23,
      navigationContextByRefId: navCtx,
      systemContextHash: currentHash, uiConfigHash: currentUiHash,
    });

    const micro = buildMicroPayloadBundle({
      einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten,
      katalogById, masterAufgaben, allgemeineAufgaben,
      navigationContextByRefId: navCtx,
      systemContextHash: currentHash, uiConfigHash: currentUiHash,
    });

    const systembausteinePayload = buildSystembausteinPayloadBundle({
      einheit, themenfelder, lernpakete, lernziele, systemBausteine,
      navigationContextByRefId: navCtx,
      systemContextHash: currentHash, uiConfigHash: currentUiHash,
    });

    return [
      { name: 'payloads/0-ui-config.json',         content: uiConfig },
      { name: 'payloads/1-system-context.json',     content: sysCtx },
      { name: 'payloads/2-structure.json',          content: structure },
      { name: 'payloads/3-task-content.json',       content: taskContent },
      { name: 'payloads/4-micro-briefings.json',    content: micro },
      { name: 'payloads/5-systembausteine.json',    content: systembausteinePayload },
    ];
  }, [
    einheit, themenfelder, lernpakete, lernziele, phaseAktivitaeten,
    katalogById, masterAufgaben, allgemeineAufgabenEbene23, allgemeineAufgaben,
    systemBausteine, aufgabenbausteine,
    currentHash, currentUiHash, globalPrompts, stammdaten, schulNomenklatur,
  ]);

  const baseSlug = slugify(einheit?.titel_der_einheit, einheitId || 'einheit');

  const handleDownload = async () => {
    if (!payloads) return;
    setGenerating(true);
    setError(null);
    try {
      await downloadZip(payloads, `mbk-payloads_${baseSlug}.zip`);
    } catch (e) {
      setError(e?.message || 'Download fehlgeschlagen.');
    } finally {
      setGenerating(false);
    }
  };

  const ready = !!payloads;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10 text-violet-600 shrink-0">
          <FileArchive className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Air-Gap-Payloads herunterladen</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Erzeugt alle sechs Payloads (UI-Config, System-Kontext, Struktur,
            Aufgaben, Micro-Briefings, Systembausteine) als ZIP-Archiv.
            Zum Einchecken ins GitHub-Repo unter <code className="bg-muted px-1 rounded text-[11px]">kurse/&lt;slug&gt;/payloads/</code>.
          </p>

          {error && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              {error}
            </div>
          )}
        </div>
        <Button
          onClick={handleDownload}
          disabled={!ready || generating}
          className="gap-2 bg-violet-600 hover:bg-violet-700 shrink-0"
        >
          {generating
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Download className="w-4 h-4" />
          }
          {generating ? 'Erstelle ZIP …' : 'ZIP herunterladen'}
        </Button>
      </div>
    </div>
  );
}