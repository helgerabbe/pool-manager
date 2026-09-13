import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Inbox, Loader2 } from 'lucide-react';
import AuftragDetailKarte from '@/components/importcenter/AuftragDetailKarte';
import { useAuftragsSchemata, useImportAuftraege } from '@/hooks/useImportCenter';

const FILTER = [
  { key: 'offen', label: 'Offen' },
  { key: 'ausgefuehrt', label: 'Durchgeführt' },
  { key: 'abgelehnt', label: 'Abgelehnt' },
  { key: 'alle', label: 'Alle' },
];

/** Der Posteingang: alle Aufträge, filterbar nach Stand, Art und Ziel. */
export default function AuftragPosteingang() {
  const { data: auftraege = [], isLoading } = useImportAuftraege();
  const { data: schemata } = useAuftragsSchemata();
  const [filter, setFilter] = useState('offen');
  const [art, setArt] = useState('alle');
  const [ziel, setZiel] = useState('');

  const sichtbar = useMemo(() => {
    return auftraege.filter((a) => {
      if (filter === 'offen' && a.status !== 'eingegangen' && a.status !== 'geprueft') return false;
      if (filter === 'ausgefuehrt' && a.status !== 'ausgefuehrt') return false;
      if (filter === 'abgelehnt' && a.status !== 'abgelehnt') return false;
      if (art !== 'alle' && a.auftrags_art !== art) return false;
      if (ziel.trim()) {
        const suche = ziel.trim().toLowerCase();
        const treffer =
          String(a.ziel_id || '').toLowerCase().includes(suche) ||
          String(a.einheit_id || '').toLowerCase().includes(suche) ||
          String(a.titel || '').toLowerCase().includes(suche);
        if (!treffer) return false;
      }
      return true;
    });
  }, [auftraege, filter, art, ziel]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Posteingang wird geladen …
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border p-0.5">
          {FILTER.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? 'default' : 'ghost'}
              className="h-7"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <Select value={art} onValueChange={setArt}>
          <SelectTrigger className="h-8 w-56">
            <SelectValue placeholder="Auftragsart" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Auftragsarten</SelectItem>
            {(schemata?.auftragsarten || []).map((a) => (
              <SelectItem key={a.art} value={a.art}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          className="h-8 max-w-xs"
          placeholder="Ziel oder Bezeichnung suchen …"
          value={ziel}
          onChange={(e) => setZiel(e.target.value)}
        />
      </div>

      {sichtbar.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Hier liegt gerade kein Auftrag. Neue Aufträge entstehen über den Reiter
            „Auftrag stellen“.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sichtbar.map((a) => (
            <AuftragDetailKarte key={a.id} auftrag={a} aufgabenarten={schemata?.aufgabenarten || []} />
          ))}
        </div>
      )}
    </div>
  );
}