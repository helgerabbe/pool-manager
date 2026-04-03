import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function WizardStepLernziele({
  structure = { lernpakete: [] },
  lernziele = {},
  onLernzieleChange,
  onNext,
}) {
  const [newLZ, setNewLZ] = useState({});

  const handleAddLernziel = (paketId) => {
    const key = `pkg-${paketId}`;
    if (!newLZ[key]?.text?.trim()) return;

    const updated = {
      ...lernziele,
      [paketId]: [
        ...(lernziele[paketId] || []),
        {
          id: `lz-${Date.now()}`,
          formulierung_fachsprache: newLZ[key].text,
          kategorie: newLZ[key].kategorie || 'Fachwissen',
          schueler_uebersetzung: '',
        },
      ],
    };
    onLernzieleChange(updated);
    setNewLZ({ ...newLZ, [key]: { text: '', kategorie: 'Fachwissen' } });
  };

  const handleRemoveLernziel = (paketId, lzId) => {
    const updated = {
      ...lernziele,
      [paketId]: (lernziele[paketId] || []).filter(lz => lz.id !== lzId),
    };
    onLernzieleChange(updated);
  };

  const handleEditLernziel = (paketId, lzId, field, value) => {
    const updated = {
      ...lernziele,
      [paketId]: (lernziele[paketId] || []).map(lz =>
        lz.id === lzId ? { ...lz, [field]: value } : lz
      ),
    };
    onLernzieleChange(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Lernziele zu Lernpaketen</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fügen Sie Lernziele zu jedem Lernpaket hinzu oder überspringen Sie diesen Schritt.
        </p>
      </div>

      {/* Lernpakete mit Lernziel-Forms */}
      <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-4">
        {structure.lernpakete.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Keine Lernpakete vorhanden.
          </p>
        ) : (
          structure.lernpakete.map(paket => {
            const key = `pkg-${paket.id}`;
            const paketLZ = lernziele[paket.id] || [];

            return (
              <div key={paket.id} className="bg-card border rounded-lg p-4 space-y-3">
                {/* Paket Header */}
                <div>
                  <h4 className="font-semibold text-sm text-foreground">{paket.titel_des_pakets}</h4>
                  <p className="text-xs text-muted-foreground">
                    {paketLZ.length} Lernziel{paketLZ.length !== 1 ? 'e' : ''}
                  </p>
                </div>

                {/* Bestehende Lernziele */}
                {paketLZ.length > 0 && (
                  <div className="space-y-2">
                    {paketLZ.map(lz => (
                      <div key={lz.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <Input
                            value={lz.formulierung_fachsprache}
                            onChange={e => handleEditLernziel(paket.id, lz.id, 'formulierung_fachsprache', e.target.value)}
                            placeholder="Ich kann..."
                            className="text-sm h-8"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleRemoveLernziel(paket.id, lz.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={lz.kategorie}
                            onValueChange={v => handleEditLernziel(paket.id, lz.id, 'kategorie', v)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Fachwissen">Fachwissen</SelectItem>
                              <SelectItem value="Fähigkeit/Fertigkeit">Fähigkeit/Fertigkeit</SelectItem>
                            </SelectContent>
                          </Select>

                          <Input
                            value={lz.schueler_uebersetzung}
                            onChange={e => handleEditLernziel(paket.id, lz.id, 'schueler_uebersetzung', e.target.value)}
                            placeholder="Schüler-Übersetzung"
                            className="text-sm h-8"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Lernziel Form */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <Label className="text-xs font-medium">Neues Lernziel hinzufügen</Label>
                  <Input
                    placeholder="Formulierung (Ich kann...)"
                    value={newLZ[key]?.text || ''}
                    onChange={e => setNewLZ({ ...newLZ, [key]: { ...newLZ[key], text: e.target.value } })}
                    className="text-sm h-8"
                  />
                  <div className="flex gap-2">
                    <Select
                      value={newLZ[key]?.kategorie || 'Fachwissen'}
                      onValueChange={v => setNewLZ({ ...newLZ, [key]: { ...newLZ[key], kategorie: v } })}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fachwissen">Fachwissen</SelectItem>
                        <SelectItem value="Fähigkeit/Fertigkeit">Fähigkeit/Fertigkeit</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleAddLernziel(paket.id)}
                      disabled={!newLZ[key]?.text?.trim()}
                      className="gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Hinzufügen
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline">Zurück</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onNext}>
            Überspringen
          </Button>
          <Button onClick={onNext} className="gap-2">
            <ChevronRight className="w-4 h-4" />
            Weiter: Phasen
          </Button>
        </div>
      </div>
    </div>
  );
}