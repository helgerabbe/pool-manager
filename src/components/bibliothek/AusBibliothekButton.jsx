import React, { useState } from 'react';
import { Library, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useBibliothekEintraege, useUebernehmen } from '@/hooks/useBibliothek';
import BibliothekKatalog from './BibliothekKatalog';

/** Stunden/Übungen aus der Öffentlichen Bibliothek in eine Unterrichtseinheit übernehmen. */
export default function AusBibliothekButton({ unterrichtseinheit, besitzerEmail }) {
  const [offen, setOffen] = useState(false);
  const [auswahl, setAuswahl] = useState(new Set());
  const { data: eintraege = [] } = useBibliothekEintraege();
  const uebernehmen = useUebernehmen(unterrichtseinheit, besitzerEmail);

  const toggle = (id) => setAuswahl((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const los = () => uebernehmen.mutate(eintraege.filter((e) => auswahl.has(e.id)), {
    onSuccess: () => { setAuswahl(new Set()); setOffen(false); },
  });

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOffen(true)}>
        <Library className="h-4 w-4" /> Aus der Bibliothek
      </Button>
      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-h-[90vh] w-[95%] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Aus der Öffentlichen Bibliothek in „{unterrichtseinheit.titel}“ übernehmen</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">Deine markierten Einträge (Stern) stehen oben. Wir legen von jedem gewählten Eintrag eine eigene, bearbeitbare Kopie an.</p>
          <BibliothekKatalog auswahl={auswahl} onAuswahl={toggle} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOffen(false)}>Abbrechen</Button>
            <Button disabled={!auswahl.size || uebernehmen.isPending} onClick={los} className="gap-2">
              {uebernehmen.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {auswahl.size} übernehmen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}