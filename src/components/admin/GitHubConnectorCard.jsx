import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Github, Save, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const SCHLUESSEL = 'github_connector';

/**
 * Liest/schreibt die GitHub-Connector-Einstellungen als einzelnen JSON-Blob
 * in Systemeinstellungen.wert_text (schluessel = 'github_connector').
 *
 * Felder:
 *  - owner          : GitHub-Account / Org (z.B. "meinschulename")
 *  - repo           : Repository-Name (z.B. "aktivitaeten-galerie")
 *  - branch         : Branch (default: "main")
 *  - file_path      : Pfad zur JSON-Datei im Repo (z.B. "galerie/aktivitaeten.json")
 *  - access_token   : Personal Access Token (wird verschleiert angezeigt)
 */
export default function GitHubConnectorCard() {
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
  });
  const [showToken, setShowToken] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync mit gespeicherten Werten
  useEffect(() => {
    if (saved && Object.keys(saved).length > 0) {
      setForm(f => ({ ...f, ...saved }));
    }
  }, [record?.id]);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { schluessel: SCHLUESSEL, wert_text: JSON.stringify(form) };
      if (record) {
        return base44.entities.Systemeinstellungen.update(record.id, payload);
      }
      return base44.entities.Systemeinstellungen.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemeinstellungen'] });
      setDirty(false);
      toast.success('GitHub-Connector gespeichert.');
    },
    onError: () => toast.error('Fehler beim Speichern.'),
  });

  const isConfigured = !!(saved.owner && saved.repo && saved.access_token);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Github className="w-4 h-4" />
          GitHub-Connector – Aktivitäten-Galerie
        </CardTitle>
        <CardDescription>
          Verbindungsdaten zu einem (privaten) GitHub-Repository, das als externe Aktivitäten-Bibliothek dient.
          Die hier hinterlegte JSON-Datei wird vom Pool-Manager ausgelesen, um Aktivitätsvorlagen anzubieten.
          Das Access Token wird nur serverseitig verwendet und nie im Frontend angezeigt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Status-Pill */}
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

        {/* Repository-Angaben */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">GitHub-Account / Organisation</Label>
            <Input
              placeholder="z.B. meinschulename"
              value={form.owner}
              onChange={e => set('owner', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Repository-Name</Label>
            <Input
              placeholder="z.B. aktivitaeten-galerie"
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
            <Label className="text-xs">Dateipfad zur Aktivitäten-Galerie</Label>
            <Input
              placeholder="z.B. galerie/aktivitaeten.json"
              value={form.file_path}
              onChange={e => set('file_path', e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Pfad relativ zum Repository-Wurzelverzeichnis
            </p>
          </div>
        </div>

        {/* Access Token */}
        <div className="space-y-1.5">
          <Label className="text-xs">Personal Access Token (PAT)</Label>
          <div className="relative">
            <Input
              type={showToken ? 'text' : 'password'}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
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

        <div className="flex justify-end pt-1">
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