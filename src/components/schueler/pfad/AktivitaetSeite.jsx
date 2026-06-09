import { CheckCircle2, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ITEM_GATE } from '@/lib/schuelerPfadGating';
import { getItemMeta } from '@/lib/schuelerItemMeta';
import { getSystemBausteinIcon } from '@/lib/systemBausteinIcons';

/**
 * Paginierte Einzelansicht EINER Aktivität – iPad-tauglich, ohne Scrollen.
 * Zeigt einen Platzhalter (statt der echten Aufgabe) und unten einen
 * „Habe ich erledigt“-Button, der die Aktivität abschließt und weiter führt.
 */
export default function AktivitaetSeite({
  item,
  meta,
  busy,
  onErledigt,
  onWeiter,
}) {
  if (!item) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Wähle links im Menü eine Aktivität aus.
      </div>
    );
  }

  const Icon = item.type === 'system'
    ? getSystemBausteinIcon(meta.iconKey)
    : getSystemBausteinIcon('file-text');
  const erledigt = item.gate === ITEM_GATE.ERLEDIGT;
  const gesperrt = item.gate === ITEM_GATE.GESPERRT;

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      {/* Kopf */}
      <div className="flex items-center gap-3 mb-5">
        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          {meta.untertitel && (
            <p className="text-xs font-medium text-muted-foreground">{meta.untertitel}</p>
          )}
          <h1 className="text-lg font-bold text-foreground tracking-tight truncate">{meta.titel}</h1>
        </div>
      </div>

      {/* Platzhalter-Inhalt (echte Aktivität folgt später) */}
      <div className="flex-1 min-h-0 rounded-2xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center text-center p-6">
        {gesperrt ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Lock className="w-8 h-8" />
            <p className="text-sm max-w-xs">
              Diese Aktivität ist noch gesperrt. Bearbeite zuerst die vorherigen Schritte.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground max-w-md">{meta.platzhalter}</p>
        )}
      </div>

      {/* Aktion */}
      <div className="pt-5 shrink-0">
        {erledigt ? (
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="w-5 h-5" /> Bereits erledigt
            </span>
            <Button variant="outline" onClick={onWeiter}>Weiter</Button>
          </div>
        ) : (
          <Button
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={gesperrt || busy}
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