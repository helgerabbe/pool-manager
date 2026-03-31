import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Puzzle, AlertCircle } from 'lucide-react';

const EBENEN = [
  { key: 'Ebene 1 - Basis',    label: 'Ebene 1',    sub: 'Basis',    color: 'bg-green-50 border-green-200', headerColor: 'bg-green-100 text-green-700', badgeColor: 'bg-green-100 text-green-700' },
  { key: 'Ebene 2 - Transfer', label: 'Ebene 2',    sub: 'Transfer', color: 'bg-blue-50 border-blue-200',   headerColor: 'bg-blue-100 text-blue-700',   badgeColor: 'bg-blue-100 text-blue-700' },
  { key: 'Ebene 3 - Projekt',  label: 'Ebene 3',    sub: 'Projekt',  color: 'bg-purple-50 border-purple-200', headerColor: 'bg-purple-100 text-purple-700', badgeColor: 'bg-purple-100 text-purple-700' },
];

const BAUSTEIN_ZU_EBENE = {
  'Pre-Test':        null,
  'Input':           null,
  'Ebene-1-Übung':   'Ebene 1 - Basis',
  'Ebene-2-Aufgabe': 'Ebene 2 - Transfer',
  'Ebene-3-Projekt': 'Ebene 3 - Projekt',
  'Exit-Check':      null,
  'Prüfung Typ A':   'Ebene 1 - Basis',
  'Prüfung Typ B':   'Ebene 2 - Transfer',
  'Prüfung Typ C':   'Ebene 3 - Projekt',
};

const bausteinColors = {
  'Pre-Test':        'bg-yellow-100 text-yellow-700',
  'Input':           'bg-blue-100 text-blue-700',
  'Ebene-1-Übung':   'bg-green-100 text-green-700',
  'Ebene-2-Aufgabe': 'bg-cyan-100 text-cyan-700',
  'Ebene-3-Projekt': 'bg-purple-100 text-purple-700',
  'Exit-Check':      'bg-orange-100 text-orange-700',
  'Prüfung Typ A':   'bg-red-100 text-red-700',
  'Prüfung Typ B':   'bg-red-100 text-red-700',
  'Prüfung Typ C':   'bg-red-100 text-red-700',
};

function AufgabeKarte({ aufgabe }) {
  return (
    <div className={`p-2.5 rounded-lg border text-xs space-y-1 ${aufgabe.lock_status ? 'border-amber-200 bg-amber-50' : 'border-border bg-background'}`}>
      <div className="flex items-center gap-1.5">
        {aufgabe.lock_status
          ? <Lock className="w-3 h-3 text-amber-500 shrink-0" />
          : <Puzzle className="w-3 h-3 text-muted-foreground shrink-0" />
        }
        <Badge className={`text-[10px] ${bausteinColors[aufgabe.baustein_typ] || ''}`}>
          {aufgabe.baustein_typ}
        </Badge>
      </div>
      {aufgabe.aufgabentext_inhalt && (
        <p className="text-muted-foreground line-clamp-2">{aufgabe.aufgabentext_inhalt}</p>
      )}
      {aufgabe.lock_status && (
        <p className="text-amber-600 text-[10px] truncate">🔒 {aufgabe.locked_by_user}</p>
      )}
    </div>
  );
}

function LernzielChip({ ziel }) {
  const ebeneColors = {
    'Ebene 1 - Basis':    'bg-green-100 text-green-700',
    'Ebene 2 - Transfer': 'bg-blue-100 text-blue-700',
    'Ebene 3 - Projekt':  'bg-purple-100 text-purple-700',
  };
  return (
    <div className="text-xs p-2 rounded border border-dashed border-muted-foreground/30 bg-muted/30">
      <p className="text-muted-foreground line-clamp-2">{ziel.schueler_uebersetzung || ziel.formulierung_fachsprache}</p>
      <Badge className={`mt-1 text-[10px] ${ebeneColors[ziel.anforderungsebene] || ''}`}>
        {ziel.anforderungsebene}
      </Badge>
    </div>
  );
}

/**
 * AlignmentBoard — Constructive-Alignment-Matrix
 * Zeigt Lernziele und zugehörige Aufgabenbausteine aufgeteilt nach Anforderungsebene.
 * Leere Spalten werden mit einem Hinweis markiert.
 */
export default function AlignmentBoard({ lernpakete, lernziele, aufgaben }) {
  // Für jede Ebene: welche Lernziele und Aufgaben gibt es?
  const getZieleForEbene = (ebeneKey) =>
    lernziele.filter(lz => lz.anforderungsebene === ebeneKey);

  const getAufgabenForEbene = (ebeneKey) =>
    aufgaben.filter(a => BAUSTEIN_ZU_EBENE[a.baustein_typ] === ebeneKey);

  const sonstigeAufgaben = aufgaben.filter(a => BAUSTEIN_ZU_EBENE[a.baustein_typ] === null);

  if (lernziele.length === 0 && aufgaben.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Puzzle className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">
          Noch keine Lernziele oder Aufgabenbausteine vorhanden.<br />
          Legen Sie diese in der Lernpakete-Ansicht an.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-muted/50 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        <strong>Constructive Alignment Check:</strong> Diese Matrix zeigt, ob für jede Anforderungsebene sowohl Lernziele als auch passende Aufgabenbausteine vorhanden sind. Leere Felder weisen auf Lücken im Alignment hin.
      </div>

      {/* Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {EBENEN.map(ebene => {
          const zieleInEbene    = getZieleForEbene(ebene.key);
          const aufgabenInEbene = getAufgabenForEbene(ebene.key);
          const hatLuecke       = zieleInEbene.length > 0 && aufgabenInEbene.length === 0
                                 || zieleInEbene.length === 0 && aufgabenInEbene.length > 0;

          return (
            <Card key={ebene.key} className={`border ${ebene.color}`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ebene.headerColor}`}>
                      {ebene.label}
                    </span>
                    <span className="ml-2 text-muted-foreground font-normal">{ebene.sub}</span>
                  </div>
                  {hatLuecke && (
                    <AlertCircle className="w-4 h-4 text-amber-500" title="Alignment-Lücke" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {/* Lernziele */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Lernziele ({zieleInEbene.length})
                  </p>
                  {zieleInEbene.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic p-2 border border-dashed rounded">Kein Lernziel für diese Ebene</p>
                  ) : (
                    <div className="space-y-1.5">
                      {zieleInEbene.map(z => <LernzielChip key={z.id} ziel={z} />)}
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-current/10" />

                {/* Aufgaben */}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                    Aufgabenbausteine ({aufgabenInEbene.length})
                  </p>
                  {aufgabenInEbene.length === 0 ? (
                    <div className="text-[11px] text-amber-600 italic p-2 bg-amber-50 border border-amber-200 rounded flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Kein Baustein für diese Ebene
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {aufgabenInEbene.map(a => <AufgabeKarte key={a.id} aufgabe={a} />)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sonstige Bausteine (Pre-Test, Input, Exit-Check) */}
      {sonstigeAufgaben.length > 0 && (
        <Card className="border-0 bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Rahmende Bausteine (Pre-Test, Input, Exit-Check)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {sonstigeAufgaben.map(a => (
                <div key={a.id} className="flex items-center gap-1.5 text-xs p-2 rounded-lg border bg-background">
                  {a.lock_status && <Lock className="w-3 h-3 text-amber-500" />}
                  <Badge className={`text-[10px] ${bausteinColors[a.baustein_typ] || ''}`}>{a.baustein_typ}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}