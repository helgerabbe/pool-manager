import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Plus, Trash2, ChevronDown, ChevronRight, CheckCircle2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

const EBENEN = ['Ebene 1 - Basis', 'Ebene 2 - Transfer', 'Ebene 3 - Projekt'];
const KATEGORIEN = ['Fachwissen', 'Fähigkeit/Fertigkeit'];

const ebeneColors = {
  'Ebene 1 - Basis':    'bg-green-100 text-green-700',
  'Ebene 2 - Transfer': 'bg-blue-100 text-blue-700',
  'Ebene 3 - Projekt':  'bg-purple-100 text-purple-700',
};

export default function KILernpaketAssistent({ einheitId, einheit, existingPaketeCount, onCreated }) {
  const [braindump, setBraindump] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [vorschau, setVorschau] = useState(null); // Array of { titel, dauer, lernziele: [] }
  const [expandedPakete, setExpandedPakete] = useState({});

  const handleGenerieren = async () => {
    if (!braindump.trim()) return;
    setIsGenerating(true);
    setVorschau(null);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein Experte für kompetenzorientierte Unterrichtsplanung.
      
Analysiere den folgenden Braindump eines Lehrers und extrahiere daraus Lernpakete mit zugehörigen Lernzielen.

Kontext:
- Fach: ${einheit?.fach || 'unbekannt'}
- Einheit: ${einheit?.titel_der_einheit || 'unbekannt'}
- Jahrgangsstufe: ${einheit?.jahrgangsstufe || 'unbekannt'}

Braindump des Lehrers:
"""
${braindump}
"""

Regeln für die Extraktion:
1. Extrahiere alle erkennbaren Lernpakete (thematische Einheiten/Module)
2. Jedem Lernpaket ordne Lernziele zu
3. Formuliere Lernziele als "Ich kann..."-Sätze in Fachsprache
4. Ordne jedem Lernziel eine Anforderungsebene zu:
   - "Ebene 1 - Basis": Grundwissen und Grundfertigkeiten
   - "Ebene 2 - Transfer": Anwendung und Übertragung
   - "Ebene 3 - Projekt": Kreative und komplexe Aufgaben
5. Für Ebene 1 ordne auch eine Kategorie zu: "Fachwissen" oder "Fähigkeit/Fertigkeit"
6. Schätze eine sinnvolle Bearbeitungsdauer in Minuten pro Paket (z.B. 45, 90, 135)
7. Vergib Reihenfolge-Nummern beginnend ab ${existingPaketeCount + 1}

Antworte NUR mit validem JSON, kein Text davor oder danach.`,
      response_json_schema: {
        type: 'object',
        properties: {
          lernpakete: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                reihenfolge_nummer: { type: 'number' },
                titel_des_pakets: { type: 'string' },
                geschaetzte_dauer_minuten: { type: 'number' },
                lernziele: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      formulierung_fachsprache: { type: 'string' },
                      anforderungsebene: { type: 'string' },
                      kategorie: { type: 'string' },
                      schueler_uebersetzung: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const pakete = result?.lernpakete || [];
    setVorschau(pakete);
    // Alle Pakete standardmäßig aufklappen
    const expanded = {};
    pakete.forEach((_, i) => { expanded[i] = true; });
    setExpandedPakete(expanded);
    setIsGenerating(false);
  };

  const handleTitelChange = (idx, value) => {
    setVorschau(prev => prev.map((p, i) => i === idx ? { ...p, titel_des_pakets: value } : p));
  };

  const handleDauerChange = (idx, value) => {
    setVorschau(prev => prev.map((p, i) => i === idx ? { ...p, geschaetzte_dauer_minuten: Number(value) } : p));
  };

  const handleLernzielChange = (pIdx, zIdx, field, value) => {
    setVorschau(prev => prev.map((p, i) => {
      if (i !== pIdx) return p;
      return {
        ...p,
        lernziele: p.lernziele.map((z, j) => j === zIdx ? { ...z, [field]: value } : z),
      };
    }));
  };

  const handleLernzielEntfernen = (pIdx, zIdx) => {
    setVorschau(prev => prev.map((p, i) => {
      if (i !== pIdx) return p;
      return { ...p, lernziele: p.lernziele.filter((_, j) => j !== zIdx) };
    }));
  };

  const handlePaketEntfernen = (idx) => {
    setVorschau(prev => prev.filter((_, i) => i !== idx));
  };

  const handleLernzielHinzufuegen = (pIdx) => {
    setVorschau(prev => prev.map((p, i) => {
      if (i !== pIdx) return p;
      return {
        ...p,
        lernziele: [...p.lernziele, {
          formulierung_fachsprache: '',
          anforderungsebene: 'Ebene 1 - Basis',
          kategorie: 'Fachwissen',
          schueler_uebersetzung: '',
        }],
      };
    }));
  };

  const handleAnlegen = async () => {
    if (!vorschau || vorschau.length === 0) return;
    setIsSaving(true);

    let erstelltePakete = 0;
    let erstellteZiele = 0;

    for (const paket of vorschau) {
      const neuesPaket = await base44.entities.Lernpakete.create({
        einheit_id: einheitId,
        titel_des_pakets: paket.titel_des_pakets,
        reihenfolge_nummer: paket.reihenfolge_nummer,
        geschaetzte_dauer_minuten: paket.geschaetzte_dauer_minuten,
      });
      erstelltePakete++;

      for (const ziel of paket.lernziele) {
        if (!ziel.formulierung_fachsprache?.trim()) continue;
        const zielData = {
          lernpaket_id: neuesPaket.id,
          formulierung_fachsprache: ziel.formulierung_fachsprache,
          anforderungsebene: ziel.anforderungsebene,
          schueler_uebersetzung: ziel.schueler_uebersetzung || '',
        };
        if (ziel.anforderungsebene === 'Ebene 1 - Basis' && ziel.kategorie) {
          zielData.kategorie = ziel.kategorie;
        }
        await base44.entities.Lernziele.create(zielData);
        erstellteZiele++;
      }
    }

    setIsSaving(false);
    setVorschau(null);
    setBraindump('');
    toast.success(`${erstelltePakete} Lernpakete und ${erstellteZiele} Lernziele erfolgreich angelegt.`);
    onCreated?.();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-purple-50 border border-primary/10">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">KI-Lernpaket-Assistent</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Beschreiben Sie frei, welche Lernpakete und Lernziele Sie planen. Die KI strukturiert Ihren Text und legt alles auf Knopfdruck an.
          </p>
        </div>
      </div>

      {/* Eingabe */}
      {!vorschau && (
        <div className="space-y-3">
          <Textarea
            value={braindump}
            onChange={e => setBraindump(e.target.value)}
            placeholder={`Beispiel: „Wir brauchen ein Lernpaket zur Einführung in die Kurzgeschichte – die Schüler sollen den Aufbau kennen und Merkmale benennen können. Dann ein Paket zur Analyse mit Stilmitteln und Perspektive. Zuletzt ein Paket zur eigenen Interpretation, wo sie argumentieren und Stellung nehmen."`}
            className="min-h-[150px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleGenerieren}
              disabled={!braindump.trim() || isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" />KI analysiert…</>
              ) : (
                <><Sparkles className="w-4 h-4" />Lernpakete generieren</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Vorschau */}
      {vorschau && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground">Vorschau & Bearbeitung</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {vorschau.length} Lernpakete · {vorschau.reduce((s, p) => s + p.lernziele.length, 0)} Lernziele — Passen Sie die Inhalte an und legen Sie dann alles an.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setVorschau(null)}>
              Neu eingeben
            </Button>
          </div>

          {vorschau.map((paket, pIdx) => (
            <Card key={pIdx} className="border shadow-sm overflow-hidden">
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0 mt-0.5">
                    {paket.reihenfolge_nummer}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input
                      value={paket.titel_des_pakets}
                      onChange={e => handleTitelChange(pIdx, e.target.value)}
                      className="font-semibold h-8"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Dauer (Min.):</span>
                      <Input
                        type="number"
                        value={paket.geschaetzte_dauer_minuten}
                        onChange={e => handleDauerChange(pIdx, e.target.value)}
                        className="h-7 w-20 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpandedPakete(prev => ({ ...prev, [pIdx]: !prev[pIdx] }))}
                      className="p-1 rounded hover:bg-muted text-muted-foreground"
                    >
                      {expandedPakete[pIdx]
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />
                      }
                    </button>
                    <button
                      onClick={() => handlePaketEntfernen(pIdx)}
                      className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>

              {expandedPakete[pIdx] && (
                <CardContent className="pt-0 pb-4">
                  <div className="ml-10 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Lernziele ({paket.lernziele.length})
                      </span>
                      <button
                        onClick={() => handleLernzielHinzufuegen(pIdx)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />Hinzufügen
                      </button>
                    </div>

                    {paket.lernziele.map((ziel, zIdx) => (
                      <div key={zIdx} className="p-3 rounded-lg bg-muted/40 space-y-2">
                        <div className="flex items-start gap-2">
                          <Textarea
                            value={ziel.formulierung_fachsprache}
                            onChange={e => handleLernzielChange(pIdx, zIdx, 'formulierung_fachsprache', e.target.value)}
                            className="text-sm min-h-[60px] flex-1 resize-none"
                            placeholder="Ich kann…"
                          />
                          <button
                            onClick={() => handleLernzielEntfernen(pIdx, zIdx)}
                            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive shrink-0 mt-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            value={ziel.anforderungsebene}
                            onChange={e => handleLernzielChange(pIdx, zIdx, 'anforderungsebene', e.target.value)}
                            className="text-xs border border-input rounded-md px-2 py-1 bg-background"
                          >
                            {EBENEN.map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                          {ziel.anforderungsebene === 'Ebene 1 - Basis' && (
                            <select
                              value={ziel.kategorie || 'Fachwissen'}
                              onChange={e => handleLernzielChange(pIdx, zIdx, 'kategorie', e.target.value)}
                              className="text-xs border border-input rounded-md px-2 py-1 bg-background"
                            >
                              {KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                          )}
                          <Badge className={`text-[10px] ${ebeneColors[ziel.anforderungsebene] || ''}`}>
                            {ziel.anforderungsebene}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}

          {/* Anlegen-Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleAnlegen}
              disabled={isSaving || vorschau.length === 0}
              size="lg"
              className="gap-2"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Wird angelegt…</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" />{vorschau.length} Lernpakete anlegen</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}