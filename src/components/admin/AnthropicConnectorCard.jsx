import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Save, CheckCircle2, AlertCircle, Eye, EyeOff, PlugZap } from 'lucide-react';
import { toast } from 'sonner';

const SCHLUESSEL = 'anthropic_connector';

const MODELLE = [
  { wert: 'claude-sonnet-5', label: 'Sonnet 5 — Standard für den Aufgabengenerator' },
  { wert: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 — schneller und günstiger, weniger sorgfältig' },
  { wert: 'claude-opus-5', label: 'Opus 5 — stärkste Variante, deutlich teurer' },
];

/**
 * Anthropic-Connector für den Aufgabengenerator.
 *
 * Der API-Schlüssel liegt in `Systemeinstellungen` (schluessel='anthropic_connector')
 * und wird ausschließlich von Backend-Functions gelesen. Die RLS-Regel der Entity
 * beschränkt das Lesen dieses Eintrags auf Administratoren.
 */
export default function AnthropicConnectorCard() {
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['systemeinstellungen'],
    queryFn: () => base44.entities.Systemeinstellungen.list(),
    staleTime: 60 * 1000,
  });

  const record = settings.find((s) => s.schluessel === SCHLUESSEL);
  const saved = record?.wert_text ? JSON.parse(record.wert_text) : {};

  const [form, setForm] = useState({
    api_key: '',
    modell: 'claude-sonnet-5',
    aktiv: false,
  });
  const [showKey, setShowKey] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (saved && Object.keys(saved).length > 0) {
      setForm((f) => ({ ...f, ...saved }));
    }
  }, [record?.id]);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setDirty(true);
    setTestResult(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { schluessel: SCHLUESSEL, wert_text: JSON.stringify(form) };
      if (record) return base44.entities.Systemeinstellungen.update(record.id, payload);
      return base44.entities.Systemeinstellungen.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemeinstellungen'] });
      setDirty(false);
      toast.success('Anthropic-Zugang gespeichert.');
    },
    onError: () => toast.error('Fehler beim Speichern.'),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('anthropicPing', {});
      return res.data;
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.ok) toast.success('Verbindung steht.');
      else if (data.reason === 'kein_schluessel') toast.error('Es ist kein Schlüssel hinterlegt.');
      else if (data.reason === 'deaktiviert') toast.info('Schlüssel vorhanden, Connector ist aber ausgeschaltet.');
      else toast.error(data.error || 'Verbindung fehlgeschlagen.');
    },
    onError: (err) => toast.error('Test fehlgeschlagen: ' + (err?.message || 'unbekannt')),
  });

  const keyVorhanden = !!String(form.api_key || '').trim();

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Anthropic-Zugang (Aufgabengenerator)
        </CardTitle>
        <CardDescription>
          Eigener API-Zugang für die dialogische Erstellung interaktiver Aufgaben — unabhängig von den
          Base44-Token. Der Schlüssel wird nur serverseitig verwendet und nie an den Browser der
          Schüler:innen ausgeliefert. Abgerechnet wird nach Verbrauch über das Anthropic-Konto; ein
          Ausgabelimit setzt du dort.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* API-Schlüssel */}
        <div className="space-y-2">
          <Label htmlFor="anthropic-key">API-Schlüssel</Label>
          <div className="flex gap-2">
            <Input
              id="anthropic-key"
              type={showKey ? 'text' : 'password'}
              value={form.api_key || ''}
              onChange={(e) => set('api_key', e.target.value)}
              placeholder="sk-ant-..."
              autoComplete="off"
              spellCheck={false}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Schlüssel verbergen' : 'Schlüssel anzeigen'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Aus der Anthropic Console unter „API Keys“. Wird dort nur einmal angezeigt — bei Verlust
            einfach löschen und einen neuen anlegen.
          </p>
        </div>

        {/* Modell */}
        <div className="space-y-2">
          <Label htmlFor="anthropic-modell">Modell</Label>
          <select
            id="anthropic-modell"
            value={form.modell || 'claude-sonnet-5'}
            onChange={(e) => set('modell', e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {MODELLE.map((m) => (
              <option key={m.wert} value={m.wert}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Aktiv-Schalter */}
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Connector aktiv</p>
            <p className="text-xs text-muted-foreground">
              Ausgeschaltet bleibt der Zugang gespeichert, wird aber nicht verwendet.
            </p>
          </div>
          <Switch
            checked={!!form.aktiv}
            onCheckedChange={(v) => set('aktiv', v)}
          />
        </div>

        {/* Aktionen */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || saveMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Speichert…' : 'Speichern'}
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={!keyVorhanden || dirty || testMutation.isPending}
            className="gap-2"
          >
            <PlugZap className="w-4 h-4" />
            {testMutation.isPending ? 'Teste…' : 'Verbindung testen'}
          </Button>
        </div>

        {dirty && (
          <p className="text-xs text-muted-foreground">
            Bitte erst speichern — getestet wird immer der gespeicherte Stand.
          </p>
        )}

        {/* Testergebnis */}
        {testResult && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm flex gap-2 items-start ${
              testResult.ok
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            {testResult.ok
              ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <div className="space-y-1">
              {testResult.ok ? (
                <>
                  <p className="font-medium">Verbindung steht ({testResult.modell}).</p>
                  {testResult.antwort && <p className="italic">„{testResult.antwort}“</p>}
                  {testResult.tokens?.input != null && (
                    <p className="text-xs opacity-80">
                      Verbrauch dieses Tests: {testResult.tokens.input} Token hinein,{' '}
                      {testResult.tokens.output} hinaus.
                    </p>
                  )}
                </>
              ) : (
                <p>{testResult.error || 'Verbindung nicht möglich.'}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
