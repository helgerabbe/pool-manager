import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Target, BookOpen, Zap, FolderOpen, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Stern-Schwierigkeit ──
function SternBadge({ value }) {
  if (!value) return null;
  return (
    <span className="inline-flex gap-0.5 ml-2">
      {[1, 2, 3].map(i => (
        <span key={i} className={i <= value ? 'text-amber-400' : 'text-gray-200'}>
          ★
        </span>
      ))}
    </span>
  );
}

// ── Schüler-Checkbox (inaktiv, nur visuell) ──
function StudentCheckbox({ checked = false }) {
  return (
    <div className={cn(
      'w-4 h-4 rounded border-2 flex items-center justify-center',
      checked
        ? 'bg-green-100 border-green-500'
        : 'bg-white border-muted-foreground/30'
    )}>
      {checked && <CheckCircle2 className="w-3 h-3 text-green-600" />}
    </div>
  );
}

// ── Lernziel-Item mit verbundenen Aufgaben ──
function LernzielItem({ lernziel, allgemeineAufgabenFuerLernziel, mappings }) {
  const angezeigterText = lernziel.schueler_uebersetzung || lernziel.formulierung_fachsprache;

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 p-2 rounded-lg bg-white/50 border border-green-200">
        <StudentCheckbox checked={false} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{angezeigterText}</p>
          {lernziel.kategorie && (
            <Badge 
              variant="secondary" 
              className="text-[10px] mt-1"
            >
              {lernziel.kategorie}
            </Badge>
          )}
        </div>
      </div>

      {/* Verknüpfte Allgemeine Aufgaben */}
      {allgemeineAufgabenFuerLernziel.length > 0 && (
        <div className="ml-7 pl-3 border-l-2 border-amber-200 space-y-2">
          {allgemeineAufgabenFuerLernziel.map(aufgabe => (
            <div key={aufgabe.id} className="p-2 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-amber-900 line-clamp-2">
                    {aufgabe.titel || aufgabe.aufgabenstellung}
                  </p>
                  {aufgabe.schwierigkeitsgrad && (
                    <SternBadge value={aufgabe.schwierigkeitsgrad} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lernpaket-Box ──
function LernpaketBox({ lernpaket, lernziele, allgemeineAufgaben, mappings }) {
  const paketZiele = lernziele.filter(lz => lz.lernpaket_id === lernpaket.id);

  if (paketZiele.length === 0) return null;

  return (
    <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-800">
          {lernpaket.reihenfolge_nummer || ''}
        </div>
        <h4 className="font-semibold text-blue-900">{lernpaket.titel_des_pakets}</h4>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          {paketZiele.length} Ziel{paketZiele.length > 1 ? 'e' : ''}
        </Badge>
      </div>

      <div className="space-y-3">
        {paketZiele.map(ziel => (
          <LernzielItem
            key={ziel.id}
            lernziel={ziel}
            allgemeineAufgabenFuerLernziel={allgemeineAufgaben.filter(a => 
              mappings.some(m => m.aufgabe_id === a.id && m.lernziel_id === ziel.id)
            )}
            mappings={mappings}
          />
        ))}
      </div>
    </div>
  );
}

// ── Themenfeld-Box ──
function ThemenfeldBox({ themenfeld, lernpakete, lernziele, allgemeineAufgaben, mappings }) {
  const paketeFuerThemenfeld = lernpakete.filter(p => p.themenfeld_id === themenfeld.id);

  if (paketeFuerThemenfeld.length === 0) return null;

  return (
    <div className="p-5 rounded-xl border-2 border-amber-300 bg-amber-50 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-amber-700" />
        <h3 className="font-bold text-amber-900">{themenfeld.titel}</h3>
      </div>

      <div className="space-y-4">
        {paketeFuerThemenfeld
          .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
          .map(paket => (
            <LernpaketBox
              key={paket.id}
              lernpaket={paket}
              lernziele={lernziele}
              allgemeineAufgaben={allgemeineAufgaben}
              mappings={mappings}
            />
          ))}
      </div>
    </div>
  );
}

// ── Haupt-Komponente: Lernlandkarte ──
export default function LernlandkartePreview({
  einheit,
  lernpakete,
  lernziele,
  aufgaben,
  themenfelder,
  allgemeineAufgaben,
  projektaufgaben,
}) {
  // Fetch Mappings zwischen Aufgaben und Lernzielen
  const { data: mappings = [] } = useQuery({
    queryKey: ['allgemeineAufgabeMappings'],
    queryFn: () => base44.entities.AllgemeineAufgabeLernzielMapping.list(),
  });

  const paketeFuerEinheit = lernpakete.filter(p => p.einheit_id === einheit?.id);
  const zieleFuerEinheit = lernziele.filter(lz => 
    paketeFuerEinheit.some(p => p.id === lz.lernpaket_id)
  );

  const themenfeldMitPaketen = themenfelder
    .filter(tf => paketeFuerEinheit.some(p => p.themenfeld_id === tf.id))
    .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-background overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-6 border-b border-border bg-card space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Lernlandkarte
        </h1>
        <p className="text-sm text-muted-foreground">
          Schülerfreundlicher Überblick über die Lerneinheit „{einheit?.titel_der_einheit}"
        </p>
      </div>

      {/* Scroll-Bereich */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Zielbereich: Projektaufgaben */}
          {projektaufgaben.length > 0 && (
            <div className="p-6 rounded-xl border-3 border-purple-400 bg-purple-50 space-y-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-6 h-6 text-purple-700" />
                <h2 className="text-lg font-bold text-purple-900">Dein Endziel</h2>
              </div>
              <p className="text-sm text-purple-800 mb-4">
                Diese Aufgaben zeigen, was du am Ende dieser Einheit können wirst:
              </p>
              <div className="space-y-2">
                {projektaufgaben.map(aufgabe => (
                  <div key={aufgabe.id} className="p-3 rounded-lg bg-white border border-purple-200">
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-purple-900">
                          {aufgabe.titel || aufgabe.aufgabenstellung}
                        </p>
                        {aufgabe.schwierigkeitsgrad && (
                          <SternBadge value={aufgabe.schwierigkeitsgrad} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lernweg: Themenfelder mit Paketen und Zielen */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Dein Lernweg</h2>
            </div>

            {themenfeldMitPaketen.length > 0 ? (
              <div className="space-y-4">
                {themenfeldMitPaketen.map(themenfeld => (
                  <ThemenfeldBox
                    key={themenfeld.id}
                    themenfeld={themenfeld}
                    lernpakete={paketeFuerEinheit}
                    lernziele={zieleFuerEinheit}
                    allgemeineAufgaben={allgemeineAufgaben}
                    mappings={mappings}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-muted bg-muted/30 text-center">
                <p className="text-muted-foreground">Noch keine Themenfelder vorhanden</p>
              </div>
            )}
          </div>

          {/* Info-Box für Schüler */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
            <p className="font-semibold mb-1">💡 Wie nutzt du diese Landkarte?</p>
            <ul className="space-y-1 text-xs">
              <li>✓ Sieh, welche Themenfelder und Lernpakete es gibt</li>
              <li>✓ Überprüfe deine Lernziele – was möchtest du erreichen?</li>
              <li>✓ Bearbeite die Aufgaben, um deine Ziele zu erreichen</li>
              <li>✓ Am Ende: Löse dein Endziel (die große Projektaufgabe)</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}