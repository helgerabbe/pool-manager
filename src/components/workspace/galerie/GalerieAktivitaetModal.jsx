import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Save, X, Images, ClipboardList } from 'lucide-react';
import { useAufgabenFormate } from '@/hooks/useAufgabenFormate';
import EigeneFormatListe from '@/components/workspace/galerie/EigeneFormatListe';
import FormatVorschauDialog from '@/components/formate/FormatVorschauDialog';

/**
 * Editor-Modal für die Aktivität „Aufgabengalerie".
 *
 * Seit 2026-09-06 greift diese Aktivität AUSSCHLIESSLICH auf die EIGENE
 * Aufgabengalerie zu (Entity AufgabenFormat, Status 'freigegeben') — nicht mehr
 * auf das Galerie-Verzeichnis der MBK. Grund: Angeboten werden soll nur, was
 * hier angesehen, von Unterrichtsinhalten befreit und freigegeben wurde. Formate
 * der MBK kommen weiterhin herein, aber über den Abruf in den
 * Systemeinstellungen — und dort erst als Vorschlag.
 *
 * Workflow:
 *  1. Lehrkraft wählt links ein Format (mit Vorschau der Mechanik).
 *  2. Rechts steht die Funktionsbeschreibung des Formats.
 *  3. Lehrkraft füllt den Übergabetext aus — manuell oder KI-gestützt.
 *
 * Gespeichert werden nur: galerie_id, galerie_name, inhalt.
 */
export default function GalerieAktivitaetModal({
  open,
  onOpenChange,
  initialFieldValues = {},
  onSave,
  onCancel,
  isSaving = false,
  kontext = '',
  parentLernpaketName = '',
}) {
  const { galerie, isLoading } = useAufgabenFormate();
  const [selectedId, setSelectedId] = useState(initialFieldValues?.galerie_id || null);
  const [inhalt, setInhalt] = useState(initialFieldValues?.inhalt || '');
  const [vorschau, setVorschau] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Beim Öffnen mit den gespeicherten Werten initialisieren
  useEffect(() => {
    if (open) {
      setSelectedId(initialFieldValues?.galerie_id || null);
      setInhalt(initialFieldValues?.inhalt || '');
    }
  }, [open]);

  const eintraege = galerie || [];
  const selectedEntry = eintraege.find((e) => e.id === selectedId) || null;

  const anforderung = selectedEntry?.beschreibung || '';
  const canSave = !!selectedId && inhalt.trim() !== '' && !isSaving;

  const handleKiAssist = async () => {
    if (!selectedEntry) return;
    setGenerating(true);
    try {
      const prompt = [
        'Du unterstützt eine Lehrkraft dabei, den Übergabetext für eine interaktive Lernaktivität zu erstellen.',
        'Die Aktivität wird später von einem Baukasten-System auf Basis genau dieses Textes zusammengebaut.',
        '',
        `## Gewähltes Aufgabenformat\n${selectedEntry.name}`,
        '',
        anforderung
          ? `## Anforderungen an den Übergabetext (unbedingt vollständig erfüllen)\n${anforderung}`
          : '## Anforderungen\nErstelle einen vollständigen, konkreten Inhaltstext mit allen fachlichen Informationen, die für diese Aktivität nötig sind.',
        '',
        kontext ? `## Unterrichtskontext\n${kontext}` : '',
        '',
        'Erstelle jetzt den Übergabetext: vollständig, fachlich korrekt, altersgerecht für die angegebene Jahrgangsstufe und exakt entlang der Anforderungen strukturiert.',
        'Gib AUSSCHLIESSLICH den fertigen Übergabetext aus — keine Einleitung, keine Erklärung deiner Arbeitsweise.',
      ].filter(Boolean).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setInhalt(typeof result === 'string' ? result : String(result));
      toast.success('KI-Vorschlag eingefügt — bitte prüfen und anpassen.');
    } catch (err) {
      toast.error('KI-Vorschlag fehlgeschlagen: ' + (err?.message || 'Unbekannter Fehler'));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    onSave({
      galerie_id: selectedEntry.id,
      galerie_name: selectedEntry.name || '',
      inhalt: inhalt.trim(),
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl p-0 gap-0 flex flex-col" style={{ height: '85vh' }}>
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Images className="w-5 h-5 text-primary" />
              Aufgabengalerie
            </DialogTitle>
            <DialogDescription>
              {parentLernpaketName ? `Lernpaket: ${parentLernpaketName} · ` : ''}
              Wähle ein Format aus der Aufgabengalerie und beschreibe die Inhalte, die übergeben werden sollen.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
            {/* ── Linke Spalte: Galerie-Browser ── */}
            <div className="border-r border-border overflow-y-auto p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                1. Format wählen
              </p>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Galerie wird geladen…</span>
                </div>
              ) : (
                <EigeneFormatListe
                  formate={eintraege}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onAnsehen={setVorschau}
                />
              )}
            </div>

            {/* ── Rechte Spalte: Anforderungen + Übergabetext ── */}
            <div className="overflow-y-auto p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                2. Inhalte übergeben
              </p>

              {!selectedEntry ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Wähle links zuerst ein Format aus der Aufgabengalerie.
                  </p>
                </div>
              ) : (
                <>
                  {/* Anforderungsbeschreibung aus dem Manifest */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                    <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1.5">
                      <ClipboardList className="w-3.5 h-3.5" />
                      Benötigte Angaben für „{selectedEntry.name}"
                    </p>
                    {anforderung ? (
                      <div className="text-xs text-amber-900 prose prose-xs max-w-none leading-relaxed">
                        <ReactMarkdown>{anforderung}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-900 italic">
                        Für dieses Format ist noch keine Beschreibung hinterlegt.
                        Beschreibe die Inhalte so konkret und vollständig wie möglich.
                      </p>
                    )}
                  </div>

                  {/* Übergabetext */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Übergabetext (Inhalte für diese Aktivität)</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleKiAssist}
                        disabled={generating}
                        className="h-7 text-xs gap-1.5 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
                        title="Erstellt einen Vorschlag auf Basis von Einheit, Lernpaket und Lernzielen"
                      >
                        {generating
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Wird erstellt…</>
                          : <><Sparkles className="w-3.5 h-3.5" /> Mit KI erstellen</>}
                      </Button>
                    </div>
                    <Textarea
                      value={inhalt}
                      onChange={(e) => setInhalt(e.target.value)}
                      rows={12}
                      placeholder="Trage hier die geforderten Inhalte ein — oder lasse dir mit der KI einen Vorschlag erstellen."
                      className="text-sm leading-relaxed"
                      disabled={generating}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Beim Export werden nur das gewählte Format („{selectedEntry.name}") und dieser Text
                      übergeben — die Aufgabe wird daraus auf Basis der Formatvorlage gebaut.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-3 border-t border-border bg-muted/30">
            <Button variant="outline" onClick={onCancel} disabled={isSaving} className="gap-1.5">
              <X className="w-4 h-4" /> Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={!canSave} className="gap-1.5">
              {isSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</>
                : <><Save className="w-4 h-4" /> Speichern</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FormatVorschauDialog
        format={vorschau}
        open={!!vorschau}
        onOpenChange={(o) => { if (!o) setVorschau(null); }}
      />
    </>
  );
}