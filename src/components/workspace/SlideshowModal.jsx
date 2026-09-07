/**
 * SlideshowModal.jsx
 *
 * Editor der Aktivität „Slideshow" — WYSIWYG: Links die Folien, in der Mitte
 * die aktuelle Folie in Originalproportion (direkt beschreibbar), rechts
 * Vorlage, Hintergrund und Einblende-Reihenfolge.
 *
 * Vertrag wie die übrigen Format-Editoren: `initialFieldValues`/`initialData`
 * hinein, `onSave(fieldValues)` heraus — damit derselbe Editor im Lernpaket,
 * im Regieblatt und in der Aufgaben-Werkstatt läuft.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Presentation } from 'lucide-react';
import ActivityResetButton from '@/components/workspace/ActivityResetButton';
import FolienListe from '@/components/slideshow/FolienListe';
import FolieEinstellungen from '@/components/slideshow/FolieEinstellungen';
import SlideTextToolbar from '@/components/slideshow/SlideTextToolbar';
import SlideScaler from '@/components/slideshow/SlideScaler';
import SlideCanvas from '@/components/slideshow/SlideCanvas';
import VorlageWahl from '@/components/slideshow/VorlageWahl';
import { neueFolie } from '@/lib/slideshowVorlagen';

export default function SlideshowModal({
  open,
  onOpenChange,
  initialFieldValues,
  initialData,
  onSave,
  onCancel,
  onReset,
  isSaving = false,
  parentLernpaketName = '',
}) {
  const [fieldValues, setFieldValues] = useState({});
  const [folien, setFolien] = useState([]);
  const [aktuell, setAktuell] = useState(0);
  const [aktiverSlot, setAktiverSlot] = useState(null); // { key, el }
  const [vorlageWahlOffen, setVorlageWahlOffen] = useState(false);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const fv = JSON.parse(JSON.stringify(initialFieldValues || initialData || {}));
      setFieldValues(fv);
      const slides = Array.isArray(fv.slides) && fv.slides.length > 0 ? fv.slides : [neueFolie('titel')];
      setFolien(slides);
      setAktuell(0);
      setAktiverSlot(null);
      setVorlageWahlOffen(false);
    }
    prevOpenRef.current = open;
  }, [open]);

  const folie = folien[aktuell] || null;

  const patchFolie = (patch) =>
    setFolien((prev) => prev.map((f, i) => (i === aktuell ? { ...f, ...patch } : f)));

  const onElementChange = (slotKey, wert) =>
    setFolien((prev) => prev.map((f, i) => (i === aktuell
      ? { ...f, elemente: { ...(f.elemente || {}), [slotKey]: { ...(f.elemente?.[slotKey] || {}), ...wert } } }
      : f)));

  const addFolie = (vorlageKey) => {
    const neu = neueFolie(vorlageKey);
    setFolien((prev) => [...prev.slice(0, aktuell + 1), neu, ...prev.slice(aktuell + 1)]);
    setAktuell(aktuell + 1);
    setAktiverSlot(null);
    setVorlageWahlOffen(false);
  };

  const deleteFolie = (i) => {
    const rest = folien.filter((_, idx) => idx !== i);
    setFolien(rest.length ? rest : [neueFolie('text')]);
    setAktuell(Math.max(0, Math.min(i, rest.length - 1)));
    setAktiverSlot(null);
  };

  const moveFolie = (von, nach) => {
    if (nach < 0 || nach >= folien.length) return;
    const kopie = [...folien];
    const [m] = kopie.splice(von, 1);
    kopie.splice(nach, 0, m);
    setFolien(kopie);
    setAktuell(nach);
  };

  // Formatierung der markierten Textstelle im aktiven Feld.
  const format = (cmd, wert) => {
    const el = aktiverSlot?.el;
    if (!el) return;
    el.focus();
    if (cmd === 'fontSize') {
      document.execCommand('fontSize', false, '7');
      el.querySelectorAll('font[size="7"]').forEach((f) => {
        const span = document.createElement('span');
        span.style.fontSize = `${wert}px`;
        span.innerHTML = f.innerHTML;
        f.replaceWith(span);
      });
    } else {
      document.execCommand(cmd, false, null);
    }
    onElementChange(aktiverSlot.key, { html: el.innerHTML });
  };

  const handleSave = () => {
    const payload = { ...fieldValues, slides: folien };
    if ((initialFieldValues || initialData)?.moodle_sync_status === 'synced') {
      payload.moodle_sync_status = 'modified';
      payload.is_dirty_since_export = true;
    }
    onSave?.(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel?.(); }}>
      <DialogContent className="sm:max-w-6xl w-[96vw] h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-sky-600" />
            Slideshow bearbeiten
          </DialogTitle>
          {parentLernpaketName && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Lernpaket: <span className="font-medium text-foreground/80">{parentLernpaketName}</span>
            </p>
          )}
        </DialogHeader>

        <div className="shrink-0 px-6 py-2.5 border-b bg-muted/20 flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Aufgabenstellung (optional)</span>
          <Input
            value={fieldValues.aufgabentext || ''}
            onChange={(e) => setFieldValues((prev) => ({ ...prev, aufgabentext: e.target.value }))}
            placeholder="z. B. „Schau dir die Folien in Ruhe an und notiere die wichtigsten Begriffe.“"
            className="h-8 text-sm"
          />
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="w-52 shrink-0 border-r border-border bg-muted/20 min-h-0">
            <FolienListe
              folien={folien}
              aktuell={aktuell}
              onSelect={(i) => { setAktuell(i); setAktiverSlot(null); }}
              onAdd={() => setVorlageWahlOffen(true)}
              onDelete={deleteFolie}
              onMove={moveFolie}
            />
          </div>

          <div className="flex-1 min-w-0 flex flex-col p-4 gap-3 overflow-y-auto bg-slate-100">
            {vorlageWahlOffen ? (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-semibold">Vorlage für die neue Folie wählen</p>
                <VorlageWahl onSelect={addFolie} />
                <Button variant="ghost" size="sm" onClick={() => setVorlageWahlOffen(false)}>Abbrechen</Button>
              </div>
            ) : (
              <>
                <SlideTextToolbar aktiv={!!aktiverSlot} onFormat={format} />
                {folie && (
                  <SlideScaler className="rounded-lg shadow-md ring-1 ring-slate-300 bg-white">
                    <SlideCanvas
                      key={folie.id}
                      folie={folie}
                      modus="edit"
                      aktiverSlotKey={aktiverSlot?.key || null}
                      onSlotFokus={(key, el) => setAktiverSlot({ key, el })}
                      onElementChange={onElementChange}
                    />
                  </SlideScaler>
                )}
                <p className="text-[11px] text-muted-foreground text-center">
                  Folie {aktuell + 1} von {folien.length} · Die Folie wird genau so angezeigt, wie du sie hier siehst.
                </p>
              </>
            )}
          </div>

          <div className="w-64 shrink-0 border-l border-border bg-muted/20 min-h-0">
            <FolieEinstellungen folie={folie} onChange={patchFolie} />
          </div>
        </div>

        <DialogFooter className="gap-2 px-6 py-3 border-t shrink-0">
          <div className="flex items-center gap-2 mr-auto">
            {onReset && <ActivityResetButton onReset={onReset} disabled={isSaving} />}
          </div>
          <Button variant="outline" onClick={() => onCancel?.()} disabled={isSaving}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</> : <><Save className="w-4 h-4" /> Speichern</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}