/**
 * SchulStammdatenCard.jsx
 *
 * Admin-UI für die drei globalen Schul-Stammdaten:
 *   - Land (z.B. "Deutschland")
 *   - Bundesland (z.B. "Niedersachsen")
 *   - Schulform (z.B. "Integrierte Gesamtschule")
 *
 * Werte werden onBlur direkt in die Systemeinstellungen-Entity gespeichert
 * (Upsert über useSchulStammdaten). Keine separate "Speichern"-Schaltfläche
 * nötig, das ist konsistent mit dem Wartungsmodus-Toggle daneben.
 */
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2 } from 'lucide-react';
import { useSchulStammdaten } from '@/hooks/useSchulStammdaten';

export default function SchulStammdatenCard() {
  const {
    schulname, land, bundesland, schulform,
    setSchulname, setLand, setBundesland, setSchulform,
    isSaving, isLoading,
  } = useSchulStammdaten();

  // Lokale Form-States, damit Tippen flüssig bleibt; Persistenz onBlur.
  const [localSchulname, setLocalSchulname] = useState(schulname);
  const [localLand, setLocalLand] = useState(land);
  const [localBundesland, setLocalBundesland] = useState(bundesland);
  const [localSchulform, setLocalSchulform] = useState(schulform);

  useEffect(() => { setLocalSchulname(schulname); }, [schulname]);
  useEffect(() => { setLocalLand(land); }, [land]);
  useEffect(() => { setLocalBundesland(bundesland); }, [bundesland]);
  useEffect(() => { setLocalSchulform(schulform); }, [schulform]);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          Schul-Stammdaten
          {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          Werden im Nukleus-Prompt für die Moodle-Builder-KI (Tab „Moodle-Export") verwendet,
          um den Lehrplan-Kontext (Bundesland-Curriculum, Schulform) für die KI eindeutig zu machen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="system_schulname" className="text-xs">Name der Schule</Label>
          <Input
            id="system_schulname"
            value={localSchulname}
            onChange={(e) => setLocalSchulname(e.target.value)}
            onBlur={() => { if (localSchulname !== schulname) setSchulname(localSchulname); }}
            placeholder="z.B. IGS Musterstadt"
            disabled={isLoading}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="system_land" className="text-xs">Land</Label>
            <Input
              id="system_land"
              value={localLand}
              onChange={(e) => setLocalLand(e.target.value)}
              onBlur={() => { if (localLand !== land) setLand(localLand); }}
              placeholder="z.B. Deutschland"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="system_bundesland" className="text-xs">Bundesland</Label>
            <Input
              id="system_bundesland"
              value={localBundesland}
              onChange={(e) => setLocalBundesland(e.target.value)}
              onBlur={() => { if (localBundesland !== bundesland) setBundesland(localBundesland); }}
              placeholder="z.B. Niedersachsen"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="system_schulform" className="text-xs">Schulform</Label>
            <Input
              id="system_schulform"
              value={localSchulform}
              onChange={(e) => setLocalSchulform(e.target.value)}
              onBlur={() => { if (localSchulform !== schulform) setSchulform(localSchulform); }}
              placeholder="z.B. Integrierte Gesamtschule"
              disabled={isLoading}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Änderungen werden automatisch gespeichert, sobald Sie das Feld verlassen.
        </p>
      </CardContent>
    </Card>
  );
}