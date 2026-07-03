import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Github, Save, CheckCircle2, AlertCircle, Eye, EyeOff, PlugZap } from 'lucide-react';
import { toast } from 'sonner';

const SCHLUESSEL = 'github_ticket_connector';

/**
 * GitHub-Connector für das Ticket-System (Problem melden → GitHub-Issue).
 * Eigenständiger Connector, getrennt vom Galerie-Connector, weil das Token
 * hier eine Schreib-Berechtigung (Issues: Read and write) benötigt.
 * Gespeichert als JSON-Blob in Systemeinstellungen.wert_text.
 */
export default function GitHubTicketConnectorCard() {
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ['systemeinstellungen'],
    queryFn: () => base44.entities.Systemeinstellungen.list(),
    staleTime: 60 * 1000,
  });

  const record = settings.find(s => s.schluessel === SCHLUESSEL);
  const saved = record?.wert_text ? JSON.parse(record.wert_text) : {};

  const [form, setForm] = useState({ owner: '', repo: '', access_token: '' });
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
      setDirty(false);
      toast.success('Ticket-Connector gespeichert.');
    },
    onError: () => toast.error('Fehler beim Speichern.'),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('diagnoseTicketToken', {});
      return res.data;
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.issues_schreiben_ok) toast.success('Verbindung funktioniert — Tickets können angelegt werden.');
      else toast.error('Token hat keine Issue-Berechtigung.');
    },
    onError: (err) => toast.error('Test fehlgeschlagen: ' + (err.response?.data?.error || err.message)),
  });

  const isConfigured = !!(saved.owner && saved.repo && saved.access_token);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Github className="w-4 h-4" />
          GitHub-Connector – Ticket-System
        </CardTitle>
        <CardDescription>
          Verbindungsdaten für das Ticket-System („Problem melden"). Meldungen werden als Issues
          in diesem Repository angelegt. Achtung: Anders als beim Galerie-Connector benötigt das
          Token hier eine <strong>Schreib-Berechtigung</strong> für Issues.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

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
            GitHub → Profilbild → Settings → Developer settings → Personal access tokens → Fine-grained token.
            Benötigte Berechtigung: <code className="bg-muted px-1 rounded">Issues: Read and write</code> für das Repository.
          </p>
        </div>

        {testResult && (
          <div className={`rounded-md border px-3 py-2 text-xs space-y-1 ${
            testResult.issues_schreiben_ok
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p>Token gehört zu: <strong>{testResult.token_gehoert_zu}</strong></p>
            <p>Repository erreichbar: <strong>{testResult.repo_zugriff_status === 200 ? 'ja' : `nein (${testResult.repo_zugriff_status})`}</strong></p>
            <p>Issues anlegen möglich: <strong>{testResult.issues_schreiben_ok ? 'ja ✓' : 'nein — Berechtigung „Issues: Read and write" fehlt'}</strong></p>
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