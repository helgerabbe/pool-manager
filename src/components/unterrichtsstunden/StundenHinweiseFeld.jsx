import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

/**
 * Didaktisch-methodische Hinweise der Bauanleitung: von der KI gefüllt,
 * von der Lehrkraft jederzeit ergänzbar. Alles, was sonst nirgendwo hineinpasst.
 */
export default function StundenHinweiseFeld({ stunde, plan }) {
  const [text, setText] = useState(plan?.didaktische_hinweise || '');
  const [gespeichert, setGespeichert] = useState(false);

  useEffect(() => {
    setText(plan?.didaktische_hinweise || '');
  }, [plan?.didaktische_hinweise]);

  const speichern = async () => {
    await base44.entities.Unterrichtsstunde.update(stunde.id, {
      coach_plan: { ...(plan || {}), didaktische_hinweise: text },
    });
    setGespeichert(true);
    setTimeout(() => setGespeichert(false), 2000);
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <h3 className="text-sm font-bold text-foreground">Didaktisch-methodische Hinweise</h3>
      <p className="text-xs text-muted-foreground">
        Zusätzliche Informationen, die sonst nirgendwo hineinpassen — werden bei der Umsetzung mitgegeben.
      </p>
      <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={speichern} className="gap-2">
          <Save className="w-4 h-4" />
          Hinweise speichern
        </Button>
        {gespeichert && <span className="text-xs text-emerald-700">gespeichert</span>}
      </div>
    </div>
  );
}