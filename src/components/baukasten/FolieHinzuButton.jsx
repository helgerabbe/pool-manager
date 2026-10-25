import React from 'react';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StandardfolieWahl from './wahl/StandardfolieWahl';

/** Eine Standardfolie in diese Kiste hineinlegen. */
export default function FolieHinzuButton({ onFolie }) {
  const [offen, setOffen] = React.useState(false);
  return (
    <>
      <button onClick={() => setOffen(true)} className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:border-primary hover:text-primary"><Plus className="h-3 w-3" /> Folie</button>
      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Folie in diese Kiste legen</DialogTitle></DialogHeader>
          <StandardfolieWahl onWahl={(d) => { onFolie(d.folien[0]); setOffen(false); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}