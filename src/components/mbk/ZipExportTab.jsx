/**
 * ZipExportTab.jsx
 *
 * Tab 5 der MBK-Konsole — Generator 5 ("Packer / ZIP-Export").
 *
 * Zeigt alle bisher generierten Dateien dieser Einheit (egal von welchem
 * Generator) als Liste mit Checkboxen. Der Operator wählt die Dateien aus,
 * die ins Test-ZIP sollen, und lädt das Paket direkt als Download herunter.
 *
 * Damit kann man schon jetzt — auch wenn nur das Architekt-Gerüst da ist —
 * ein Test-SCORM-Paket bauen, in Moodle hochladen und schauen, wie es
 * tatsächlich aussieht. Wenn später die anderen Generatoren Dateien
 * erzeugen, tauchen sie hier automatisch auf.
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Download, FileArchive, Loader2, FileText, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

const KIND_LABELS = {
  manifest: 'Manifest',
  dashboard: 'Dashboard',
  lernpaket: 'Lernpaket',
  themenfeld_bundle: 'Themenfeld-Bündel',
  projekt_bundle: 'Projekt-Bündel',
  system_baustein: 'Systembaustein',
  fragment: 'KI-Fragment',
};

const GENERATOR_LABELS = {
  scaffold: 'Architekt',
  task: 'Aufgaben',
  system_baustein: 'Systembausteine',
  ki_fragment: 'KI-Aufgaben',
};

// Stabile Sortierung: Manifest zuerst, dann Dashboards, dann der Rest.
const KIND_ORDER = {
  manifest: 0,
  dashboard: 1,
  lernpaket: 2,
  themenfeld_bundle: 3,
  projekt_bundle: 4,
  system_baustein: 5,
  fragment: 6,
};

function slugifyForFilename(input) {
  return (input || 'einheit')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'einheit';
}

export default function ZipExportTab({ einheitId }) {
  const [building, setBuilding] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  const { data: einheit } = useQuery({
    queryKey: ['mbk-zip-einheit', einheitId],
    queryFn: async () => {
      const list = await base44.entities.Einheiten.filter({ id: einheitId });
      return list?.[0] || null;
    },
    enabled: !!einheitId,
    staleTime: 15_000,
  });

  const { data: files = [], isLoading, refetch } = useQuery({
    queryKey: ['mbk-generated-files', einheitId, 'all'],
    queryFn: () => base44.entities.MBKGeneratedFile.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  // Themenfelder + Lernpakete laden, damit wir pro Datei einen
  // menschen-lesbaren Sub-Titel ("Lernpaket · Themenfeld X · Paket Y")
  // anzeigen können — die source_id allein ist eine kryptische UUID.
  const { data: themenfelder = [] } = useQuery({
    queryKey: ['mbk-zip-tf', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
    staleTime: 30_000,
  });
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['mbk-zip-lp', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
    staleTime: 30_000,
  });

  const themenfeldById = useMemo(
    () => new Map((themenfelder || []).map((tf) => [tf.id, tf])),
    [themenfelder]
  );
  const lernpaketById = useMemo(
    () => new Map((lernpakete || []).map((lp) => [lp.id, lp])),
    [lernpakete]
  );

  // Liefert die Klartext-Beschreibung für die zweite Zeile in der Liste.
  // Beispiele:
  //   - Lernpaket · Themenfeld: Baumdiagramme · Paket: Zweistufige Bäume
  //   - Themenfeld-Bündel · Themenfeld: Stochastik
  //   - Dashboard · Pragmatiker
  const describeFile = (f) => {
    const kindLabel = KIND_LABELS[f.kind] || f.kind;
    if (f.kind === 'lernpaket') {
      const lp = lernpaketById.get(f.source_id);
      const tf = lp?.themenfeld_id ? themenfeldById.get(lp.themenfeld_id) : null;
      const tfPart = tf?.titel ? `Themenfeld: ${tf.titel}` : 'Ohne Themenfeld';
      const lpPart = lp?.titel_des_pakets ? `Paket: ${lp.titel_des_pakets}` : null;
      return [kindLabel, tfPart, lpPart].filter(Boolean);
    }
    if (f.kind === 'themenfeld_bundle') {
      if (f.source_id === 'orphan') {
        return [kindLabel, 'Aufgaben ohne Themenfeld'];
      }
      const tf = themenfeldById.get(f.source_id);
      return [kindLabel, tf?.titel ? `Themenfeld: ${tf.titel}` : 'Themenfeld'];
    }
    if (f.kind === 'projekt_bundle') {
      return [kindLabel, 'Projekte der Einheit'];
    }
    if (f.kind === 'dashboard') {
      return [kindLabel, f.source_id || ''];
    }
    return [kindLabel];
  };

  // Sortierte Liste + Default-Auswahl: alles ist initial ausgewählt.
  const sortedFiles = useMemo(() => {
    const arr = [...files];
    arr.sort((a, b) => {
      const ka = KIND_ORDER[a.kind] ?? 99;
      const kb = KIND_ORDER[b.kind] ?? 99;
      if (ka !== kb) return ka - kb;
      return (a.filename || '').localeCompare(b.filename || '');
    });
    return arr;
  }, [files]);

  // Initial-Selection: alle Dateien angehakt, sobald wir sie geladen haben.
  // Wir nutzen einen Effect, damit auch nach Refetch die "neuen" Dateien
  // automatisch ausgewählt sind, ohne bestehende Abwahl zu überschreiben.
  React.useEffect(() => {
    setSelected((prev) => {
      // Wenn der State noch leer ist (initial), alles anhaken.
      if (prev.size === 0) {
        return new Set(sortedFiles.map((f) => f.id));
      }
      // Sonst: neue Dateien automatisch dazunehmen, abgewählte respektieren.
      const next = new Set(prev);
      for (const f of sortedFiles) {
        if (!prev.has(f.id) && !prev.__seen?.has?.(f.id)) {
          next.add(f.id);
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedFiles.length]);

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(sortedFiles.map((f) => f.id)));
  const selectNone = () => setSelected(new Set());

  const hasManifest = sortedFiles.some(
    (f) => selected.has(f.id) && f.kind === 'manifest'
  );

  const handleBuildZip = async () => {
    if (selected.size === 0) {
      toast.error('Bitte mindestens eine Datei auswählen.');
      return;
    }
    setBuilding(true);
    try {
      const zip = new JSZip();
      const filesToInclude = sortedFiles.filter((f) => selected.has(f.id));
      for (const f of filesToInclude) {
        zip.file(f.filename, f.content || '');
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const slug = slugifyForFilename(einheit?.titel_der_einheit);
      const ts = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      const zipName = `mbk-scorm_${slug}_${ts}.zip`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`ZIP erstellt: ${filesToInclude.length} Dateien.`);
    } catch (err) {
      toast.error(err?.message || 'ZIP-Erstellung fehlgeschlagen.');
    } finally {
      setBuilding(false);
    }
  };

  if (!einheitId) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Bitte oben eine Einheit auswählen.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">Generator 5 – Packer (ZIP-Export)</h3>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Packt die unten ausgewählten generierten Dateien in eine SCORM-ZIP
              und lädt sie als Download herunter. Du kannst das ZIP direkt in
              Moodle als SCORM-Paket hochladen, um zu prüfen, wie es im Kurs
              aussieht — schon mit dem reinen Architekt-Gerüst.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-1.5"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
            <Button
              onClick={handleBuildZip}
              disabled={building || selected.size === 0}
              className="gap-1.5"
            >
              {building ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              ZIP herunterladen ({selected.size})
            </Button>
          </div>
        </div>

        {!hasManifest && selected.size > 0 && (
          <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>Achtung:</strong> Es ist kein <code>imsmanifest.xml</code> in
              der Auswahl. Moodle akzeptiert das ZIP dann nicht als SCORM-Paket.
              Generiere es im Tab <em>Architekt</em> und füge es zur Auswahl hinzu.
            </span>
          </div>
        )}
      </div>

      {/* ── Datei-Liste ── */}
      {isLoading ? (
        <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Lade generierte Dateien…
        </div>
      ) : sortedFiles.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-8 text-center space-y-2">
          <FileArchive className="w-8 h-8 mx-auto text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            Es sind noch keine Dateien für diese Einheit generiert.
          </p>
          <p className="text-xs text-muted-foreground">
            Starte mit Tab <em>Architekt</em> und erzeuge das SCORM-Gerüst.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/30">
            <div className="text-xs text-muted-foreground">
              {sortedFiles.length} Datei{sortedFiles.length === 1 ? '' : 'en'} verfügbar
              · {selected.size} ausgewählt
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={selectAll} className="h-7 text-xs">
                Alle
              </Button>
              <Button size="sm" variant="ghost" onClick={selectNone} className="h-7 text-xs">
                Keine
              </Button>
            </div>
          </div>
          <ul className="divide-y">
            {sortedFiles.map((f) => {
              const isSelected = selected.has(f.id);
              const sizeKb = ((f.content || '').length / 1024).toFixed(1);
              return (
                <li
                  key={f.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer"
                  onClick={() => toggleOne(f.id)}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleOne(f.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <code className="text-xs font-mono font-semibold truncate block">
                      {f.filename}
                    </code>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                      {describeFile(f).map((part, idx, arr) => (
                        <React.Fragment key={`d-${idx}`}>
                          <span className="truncate max-w-[260px]">{part}</span>
                          {idx < arr.length - 1 && <span>·</span>}
                        </React.Fragment>
                      ))}
                      <span>·</span>
                      <span>{GENERATOR_LABELS[f.generator] || f.generator}</span>
                      <span>·</span>
                      <span>{sizeKb} KB</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}