import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Search, Wand2, AlertCircle } from 'lucide-react';
import FormatTrefferKarte from './FormatTrefferKarte';
import FormatVorschauDialog from '@/components/formate/FormatVorschauDialog';

/**
 * FormatWahl
 * ──────────
 * Der erste Halt beim Bauen einer Aufgabe: Beschreiben, was man vorhat — und
 * ZUERST nachsehen, ob es dafür schon ein erprobtes Format gibt.
 *
 * Warum diese Reihenfolge: Ein vorhandenes Format anzupassen dauert Sekunden
 * und funktioniert garantiert; eine Aufgabe neu bauen zu lassen dauert Minuten
 * und kann schiefgehen. Gesucht wird nur über die Formatbeschreibungen, nicht
 * über deren HTML — das bleibt schnell und günstig, auch bei vielen Formaten.
 *
 * Findet sich nichts (oder gefällt nichts), geht es wie bisher weiter: neu bauen.
 */
export default function FormatWahl({ onVorlage, onOhneVorlage, disabled, initialBeschreibung = '' }) {
  const [beschreibung, setBeschreibung] = useState(initialBeschreibung);
  const [treffer, setTreffer] = useState(null);   // null = noch nicht gesucht
  const [vorschau, setVorschau] = useState(null);

  const suche = useMutation({
    mutationFn: async (text) => {
      const res = await base44.functions.invoke('aufgabenFormatVorschlag', { beschreibung: text });
      return res.data;
    },
    // Nur Galerie-Formate taugen hier als Vorlage: Sie bringen ihr HTML mit,
    // aus dem die KI die neue Aufgabe baut. Katalogformate haben kein Fragment.
    onSuccess: (d) => setTreffer((d?.treffer || []).filter((t) => t.art !== 'katalog' && t.fragment)),
  });

  const text = beschreibung.trim();

  return (
    <div className="flex flex-col min-h-0 flex-1 gap-3">
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          Beschreiben Sie kurz, was die Schüler:innen tun sollen. Ich sehe zuerst nach, ob es dafür
          schon ein erprobtes Aufgabenformat gibt.
        </p>
        <Textarea
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          rows={4}
          disabled={disabled || suche.isPending}
          placeholder="z. B. Die Schüler sollen Aussagen zu einem Text danach einordnen, ob sie zutreffen, teilweise zutreffen oder nicht zutreffen."
        />
        <div className="flex items-center gap-2">
          <Button
            className="gap-1.5"
            onClick={() => suche.mutate(text)}
            disabled={disabled || !text || suche.isPending}
          >
            {suche.isPending
              ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              : <Search className="w-3.5 h-3.5" />}
            {suche.isPending ? 'Ich sehe nach…' : 'Passendes Format suchen'}
          </Button>
          <Button
            variant="ghost"
            className="gap-1.5 text-muted-foreground"
            onClick={() => onOhneVorlage(text)}
            disabled={disabled || !text || suche.isPending}
          >
            <Wand2 className="w-3.5 h-3.5" /> Direkt neu bauen
          </Button>
        </div>
      </div>

      {suche.isError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Die Suche hat nicht geklappt: {suche.error?.message}. Sie können die Aufgabe auch direkt neu bauen lassen.</span>
        </div>
      )}

      {treffer !== null && !suche.isPending && (
        <div className="space-y-2 overflow-auto min-h-0 flex-1">
          {treffer.length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-sm text-foreground">Dafür gibt es noch kein Format.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Dann baue ich die Aufgabe neu — und sie steht danach als Vorschlag für die Galerie zur Verfügung.
              </p>
              <Button className="gap-1.5 mt-3" onClick={() => onOhneVorlage(text)} disabled={disabled}>
                <Wand2 className="w-3.5 h-3.5" /> Neue Aufgabe bauen
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {treffer.length === 1
                  ? 'Ein Format kommt Ihrem Vorhaben nahe:'
                  : `${treffer.length} Formate kommen Ihrem Vorhaben nahe:`}
                {' '}Sehen Sie sich die Beispiele an und wählen Sie eines aus.
              </p>
              {treffer.map((t) => (
                <FormatTrefferKarte
                  key={t.id}
                  treffer={t}
                  disabled={disabled}
                  onAnsehen={() => setVorschau(t)}
                  onNehmen={() => onVorlage(t, text)}
                />
              ))}
              <Button
                variant="ghost"
                className="gap-1.5 text-muted-foreground"
                onClick={() => onOhneVorlage(text)}
                disabled={disabled}
              >
                <Wand2 className="w-3.5 h-3.5" /> Keins davon — neu bauen
              </Button>
            </>
          )}
        </div>
      )}

      <FormatVorschauDialog
        format={vorschau}
        open={!!vorschau}
        onOpenChange={(o) => !o && setVorschau(null)}
      />
    </div>
  );
}