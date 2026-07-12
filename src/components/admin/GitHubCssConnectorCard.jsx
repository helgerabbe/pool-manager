import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Github, Save, CheckCircle2, AlertCircle, Eye, EyeOff, PlugZap, Palette } from 'lucide-react';
import { toast } from 'sonner';

const SCHLUESSEL = 'github_css_connector';

/**
 * GitHub-Connector für das zentrale CSS/Theme (UI-Quelle der MBK).
 * Ist der Connector konfiguriert UND aktiviert, verwenden Schüleransicht
 * und Element-Vorschau das CSS aus dem Repository statt des lokalen Layouts.
 */
export default function GitHubCssConnectorCard() {
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['systemeinstellungen'],
    queryFn: () => base44.entities.Systemeinstellungen.list(),
    staleTime: 60 * 1000,
  });

  const record = settings.find(s => s.schluessel === SCHLUESSEL);
  const saved = record?.wert_text ? JSON.parse(record.wert_text) : {};

  const [form, setForm] = useState({
    owner: '',
    repo: '',
    branch: 'main',
    file_path: '',
    access_token: '',
    aktiv: false,
  });
  const [showToken, setShowToken] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (saved && Object.keys(saved).length > 0) {
      setForm(f => ({ ...f, ...saved }));
    }
  }, [record?.id]);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
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
      queryClient.invalidateQueries({ queryKey: ['externes-css'] });
      setDirty(false);
      toast.success('CSS-Connector gespeichert.');
    },
    onError: () => toast.error('Fehler beim Speichern.'),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('getExternesCss', {});
      return res.data;
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.enabled) toast.success('CSS-Datei erfolgreich geladen.');
      else if (data.reason === 'deaktiviert') toast.info('Verbindung funktioniert, aber der Connector ist deaktiviert.');
      else toast.error(data.error || 'CSS-Datei konnte nicht geladen werden.');
    },
    onError: (err) => toast.error('Test fehlgeschlagen: ' + (err.response?.data?.error || err.message)),
  });

  const isConfigured = !!(saved.owner && saved.repo && saved.file_path && saved.access_token);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Github className="w-4 h-4" />
          <Palette className="w-4 h-4" />
          GitHub-Connector – Zentrales CSS / Theme
        </CardTitle>
        <CardDescription>
          Verbindung zu einem Repository mit der zentralen CSS-Datei (Farben, Layout, UI).
          Ist der Connector <strong>aktiviert</strong>, verwenden Schüleransicht und Element-Vorschau
          dieses CSS statt des lokalen Pool-Manager-Layouts — die Kollegen sehen dann genau das,
          was die Schüler später sehen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Status + Aktiv-Schalter */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
            isConfigured
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isConfigured
              ? <><CheckCircle2 className="w-3.5 h-3.5" /> Verbindung konfiguriert</>
              : <><AlertCircle className="w-3.5 h-3.5" /> Noch nicht eingerichtet</>
            }
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Switch
              checked={form.aktiv === true}
              onCheckedChange={v => set('aktiv', v)}
            />
            <span className={form.aktiv ? 'font-medium text-foreground' : 'text-muted-foreground'}>
              {form.aktiv ? 'Externes CSS aktiv' : 'Externes CSS deaktiviert (lokales Layout wird verwendet)'}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">GitHub-Account / Organisation</Label>
            <Input
              placeholder="z.B. IGS-Seevetal"
              value={form.owner}
              onChange={e => set('owner', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Repository-Name</Label>
            <Input
              placeholder="z.B. Poolzeit"
              value={form.repo}
              onChange={e => set('repo', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Branch</Label>
            <Input
              placeholder="main"
              value={form.branch}
              onChange={e => set('branch', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dateipfad zur CSS-Datei</Label>
            <Input
              placeholder="z.B. theme/poolzeit.css"
              value={form.file_path}
              onChange={e => set('file_path', e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Pfad relativ zum Repository-Wurzelverzeichnis
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Personal Access Token (PAT)</Label>
          <div className="relative">
            <Input
              type={showToken ? 'text' : 'password'}
              placeholder="github_pat_xxxxxxxxxxxx"
              value={form.access_token}
              onChange={e => set('access_token', e.target.value)}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowToken(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            GitHub → Settings → Developer settings → Personal access tokens → Fine-grained token.
            Benötigte Berechtigung: <code className="bg-muted px-1 rounded">Contents: Read-only</code> für das Repository.
          </p>
        </div>

        {/* Vorschau der resultierenden API-URL */}
        {form.owner && form.repo && form.file_path && (
          <div className="rounded-md bg-muted/50 border border-border px-3 py-2 text-[11px] font-mono text-muted-foreground break-all">
            https://api.github.com/repos/<strong>{form.owner}</strong>/<strong>{form.repo}</strong>/contents/<strong>{form.file_path}</strong>?ref=<strong>{form.branch || 'main'}</strong>
          </div>
        )}

        {testResult && (
          <div className={`rounded-md border px-3 py-2 text-xs ${
            testResult.enabled
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            {testResult.enabled
              ? <>CSS-Datei geladen ✓ ({(testResult.css || '').length.toLocaleString('de-DE')} Zeichen)</>
              : testResult.reason === 'deaktiviert'
              ? <>Verbindung OK, aber der Connector ist deaktiviert — es wird das lokale Layout verwendet.</>
              : <>{testResult.error || 'CSS-Datei konnte nicht geladen werden.'}</>
            }
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || dirty || !isConfigured}
            title={dirty ? 'Bitte erst speichern' : undefined}
          >
            {testMutation.isPending
              ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              : <PlugZap className="w-3.5 h-3.5" />
            }
            Verbindung testen
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !dirty}
            size="sm"
            className="gap-2"
          >
            {saveMutation.isPending
              ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              : <Save className="w-3.5 h-3.5" />
            }
            Speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}