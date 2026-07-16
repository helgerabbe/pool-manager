import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Save } from 'lucide-react';
import { toast } from 'sonner';
import LtiCopyRow from '@/components/admin/LtiCopyRow';

// Veröffentlichte App-Adresse — Basis für alle LTI-URLs, unabhängig davon,
// ob die Karte gerade in der Editor-Vorschau oder in der Live-App angezeigt wird.
const APP_BASE_URL = 'https://righteous-edu-flow-hub.base44.app';

/**
 * Admin-Karte: Moodle-Anbindung (LTI 1.3).
 * Zeigt die Tool-URLs für die einmalige Registrierung in Moodle und nimmt die
 * Werte entgegen, die Moodle danach zurückgibt (Plattform-ID, Client-ID, Deployment-ID).
 */
export default function LtiMoodleCard() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ issuer: '', client_id: '', deployment_id: '', app_basis_url: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['ltiConfig'],
    queryFn: async () => (await base44.functions.invoke('ltiConfig', { action: 'get' })).data,
  });

  useEffect(() => {
    if (data?.config) {
      setForm({
        issuer: data.config.issuer || '',
        client_id: data.config.client_id || '',
        deployment_id: data.config.deployment_id || '',
        app_basis_url: data.config.app_basis_url || APP_BASE_URL,
      });
    } else if (data) {
      setForm((f) => ({ ...f, app_basis_url: f.app_basis_url || APP_BASE_URL }));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => (await base44.functions.invoke('ltiConfig', { action: 'save', ...form })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ltiConfig'] });
      toast.success('Moodle-Anbindung gespeichert.');
    },
    onError: (err) => toast.error('Speichern fehlgeschlagen: ' + (err.response?.data?.error || err.message)),
  });

  // Die öffentlichen Funktions-URLs aus der veröffentlichten App-Adresse ableiten
  // (Format lt. Plattform: https://<app-domain>/functions/<name>).
  const fnBase = `${APP_BASE_URL}/functions/`;
  const urls = {
    login_url: fnBase + 'ltiLogin',
    launch_url: fnBase + 'ltiLaunch',
    jwks_url: fnBase + 'ltiJwks',
  };
  const istEingerichtet = Boolean(data?.config?.issuer && data?.config?.client_id);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          Moodle-Anbindung (LTI 1.3)
          {istEingerichtet && <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Eingerichtet</Badge>}
        </CardTitle>
        <CardDescription>
          Einmalige Verbindung zu eurem Moodle. Danach können Schüler ohne zweite Anmeldung
          per „Externes Tool"-Aktivität direkt in freigegebene Einheiten einsteigen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Schritt 1: URLs für Moodle */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Schritt 1: Tool in Moodle eintragen</p>
              <p className="text-xs text-muted-foreground">
                Moodle: <span className="font-medium">Website-Administration → Plugins → Aktivitäten → Externes Tool → Tools verwalten → „Tool manuell konfigurieren"</span>.
                Dort diese Werte einfügen und als LTI-Version <span className="font-medium">„LTI 1.3"</span> wählen
                (Typ des öffentlichen Schlüssels: <span className="font-medium">Keyset-URL</span>):
              </p>
              <div className="space-y-1.5 rounded-lg border p-3 bg-muted/30">
                <LtiCopyRow label="Tool-URL" value={urls?.launch_url} />
                <LtiCopyRow label="Login-URL (Initiate login)" value={urls?.login_url} />
                <LtiCopyRow label="Weiterleitungs-URI(s)" value={urls?.launch_url} />
                <LtiCopyRow label="Public-Keyset-URL" value={urls?.jwks_url} />
              </div>
            </div>

            {/* Schritt 2: Werte aus Moodle zurück */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Schritt 2: Werte aus Moodle hier eintragen</p>
              <p className="text-xs text-muted-foreground">
                Nach dem Speichern in Moodle: beim neuen Tool auf das <span className="font-medium">Lupen-/Detail-Symbol</span> klicken.
                Moodle zeigt dann Plattform-ID, Client-ID und Deployment-ID an.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Plattform-ID (Moodle-Adresse)</Label>
                  <Input
                    value={form.issuer}
                    onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                    placeholder="https://moodle.meine-schule.de"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Client-ID</Label>
                  <Input
                    value={form.client_id}
                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                    placeholder="z. B. 6BRlNz3XKp4Qwm2"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Deployment-ID</Label>
                  <Input
                    value={form.deployment_id}
                    onChange={(e) => setForm({ ...form, deployment_id: e.target.value })}
                    placeholder="z. B. 2"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">App-Adresse (für die Weiterleitung der Schüler)</Label>
                  <Input
                    value={form.app_basis_url}
                    onChange={(e) => setForm({ ...form, app_basis_url: e.target.value })}
                    placeholder={APP_BASE_URL}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !form.issuer || !form.client_id || !form.deployment_id}
                  className="gap-2"
                >
                  {saveMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Speichern
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}