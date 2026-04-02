import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Plus, Trash2, ChevronDown, ChevronRight, CheckCircle2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';

const KATEGORIEN = ['Fachwissen', 'Fähigkeit/Fertigkeit'];

export default function KILernpaketAssistent({ einheitId, einheit, existingPaketeCount, onCreated, initialBraindump = '' }) {
  const [braindump, setBraindump] = useState(initialBraindump);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [vorschau, setVorschau] = useState(null); // Array of { titel, dauer, lernziele: [] }
  const [expandedPakete, setExpandedPakete] = useState({});
  const [erfolg, setErfolg] = useState(null); // { pakete: number, ziele: number }

  const handleGenerieren = async () => {
    if (!braindump.trim()) return;
    setIsGenerating(true);
    setVorschau(null);

    const naechsteNr = existingPaketeCount + 1;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Rolle: Experte für kompetenzorientierte Unterrichtsplanung mit hierarchischer Themenfeld-Struktur.

Aufgabe: Analysiere den Braindump und strukturiere daraus:
1. Themenfelder (logische Blöcke)
2. Lernpakete (je Themenfeld, Ebene 1 — Basiswissen)
3. Lernziele (je Lernpaket, mit Kategorisierung)

═══════════════════════════════════════
SCHRITT 1 — VALIDIERUNG
═══════════════════════════════════════
Prüfe die Verwertbarkeit des Braindumps (min. 20 Zeichen, Fachbezug vorhanden).
Wenn NICHT verwertbar: { "valid": false, "fehler": "Begründung auf Deutsch", "lernpakete": [] }

═══════════════════════════════════════
SCHRITT 2 — STRUKTURIERUNG (Regeln)
═══════════════════════════════════════

A. THEMENFELDER (Logische Blöcke)
- Teile den Inhalt in 2–4 Themenfelder auf.
- Jedes Themenfeld erhält einen prägnanten Titel.
- Themenfelder gruppieren inhaltlich zusammengehörige Lernpakete.

B. LERNPAKETE (Ebene 1 — je Themenfeld)
1. Fokus: Nur Basis-Inhalte und grundlegende Methoden.
2. Kategorisierung: Jedes Lernziel in exakt einer Kategorie:
   • "Fachwissen" (Fakten, Begriffe, Regeln)
   • "Fähigkeit/Fertigkeit" (Methoden, konkretes Tun)
3. Formulierung: IMMER "Ich kann..." + handlungsorientiertes Verb.
4. Granularität: Ein Lernpaket = Ein inhaltlicher Aspekt (z.B. "Zitieren", "Begriffe der Zelle").
5. Schülerübersetzung: Alltagsnahe, einfache Umformulierung desselben Ziels.
6. Dauer: Integer in Minuten (45, 90, 135).
7. Reihenfolge: Fortlaufend ab ${naechsteNr}.



Kontext:
- Fach: ${einheit?.fach || 'unbekannt'}
- Einheit: ${einheit?.titel_der_einheit || 'unbekannt'}
- Jahrgangsstufe: ${einheit?.jahrgangsstufe || 'unbekannt'}

Braindump der Lehrkraft:
"""
${braindump}
"""

Selbstprüfung vor der Ausgabe:
- Sind 2–4 Themenfelder definiert?
- Beginnt jedes Lernziel mit „Ich kann"?
- Hat jedes Lernziel exakt eine Kategorie ("Fachwissen" oder "Fähigkeit/Fertigkeit")?
- Ist die Reihenfolge der Lernpakete lückenlos ab ${naechsteNr}?

═══════════════════════════════════════
SCHRITT 3 — STRIKTES JSON-OUTPUT
═══════════════════════════════════════
Antworte NUR mit dem JSON-Objekt. Kein Text, keine Markdown-Blöcke.

{
  "valid": true,
  "fehler": null,
  "themenfelder": [
    {
      "titel": "Themenfeld 1 — [Name]",
      "lernpakete": [
        {
          "reihenfolge_nummer": ${naechsteNr},
          "titel_des_pakets": "Lernpaket-Titel",
          "geschaetzte_dauer_minuten": 45,
          "lernziele": [
            {
              "formulierung_fachsprache": "Ich kann...",
              "kategorie": "Fachwissen",
              "schueler_uebersetzung": "Einfache Sprache"
            }
          ]
          }
          ]
    }
  ],
  "projektaufgaben": [
    {
      "titel": "Projektaufgabe 1",
      "beschreibung": "Übergreifende Synthese (optional)"
    }
  ]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          valid: { type: 'boolean' },
          themenfelder: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                titel: { type: 'string' },
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
          },
        },
      },
    });

    if (!result?.valid) {
      toast.error(result?.fehler || 'Die Eingabe konnte nicht verarbeitet werden.');
      setIsGenerating(false);
      return;
    }

    // Flatten alle Lernpakete aus allen Themenfeldern für die Vorschau
    const themenfelder = result?.themenfelder || [];
    
    const allePakete = themenfelder.flatMap((tf, tfIdx) =>
      (tf.lernpakete || []).map(paket => ({
        ...paket,
        themenfeldTitel: tf.titel,
        themenfeldIndex: tfIdx,
      }))
    );
    
    const dataWithProjectTasks = { 
      pakete: allePakete,
      themenfelder
    };
    
    setVorschau(dataWithProjectTasks);
    
    // Alle Pakete standardmäßig aufklappen
    const expanded = {};
    allePakete.forEach((_, i) => { expanded[i] = true; });
    setExpandedPakete(expanded);
    setIsGenerating(false);
  };

  const handleTitelChange = (idx, value) => {
    setVorschau(prev => ({
      ...prev,
      pakete: prev.pakete.map((p, i) => i === idx ? { ...p, titel_des_pakets: value } : p),
    }));
  };

  const handleDauerChange = (idx, value) => {
    setVorschau(prev => ({
      ...prev,
      pakete: prev.pakete.map((p, i) => i === idx ? { ...p, geschaetzte_dauer_minuten: Number(value) } : p),
    }));
  };

  const handleLernzielChange = (pIdx, zIdx, field, value) => {
    setVorschau(prev => ({
      ...prev,
      pakete: prev.pakete.map((p, i) => {
        if (i !== pIdx) return p;
        return {
          ...p,
          lernziele: p.lernziele.map((z, j) => j === zIdx ? { ...z, [field]: value } : z),
        };
      }),
    }));
  };

  const handleLernzielEntfernen = (pIdx, zIdx) => {
    setVorschau(prev => ({
      ...prev,
      pakete: prev.pakete.map((p, i) => {
        if (i !== pIdx) return p;
        return { ...p, lernziele: p.lernziele.filter((_, j) => j !== zIdx) };
      }),
    }));
  };

  const handlePaketEntfernen = (idx) => {
    setVorschau(prev => ({
      ...prev,
      pakete: prev.pakete.filter((_, i) => i !== idx),
    }));
  };

  const handleLernzielHinzufuegen = (pIdx) => {
    setVorschau(prev => ({
      ...prev,
      pakete: prev.pakete.map((p, i) => {
        if (i !== pIdx) return p;
        return {
          ...p,
          lernziele: [...p.lernziele, {
            formulierung_fachsprache: '',
            kategorie: 'Fachwissen',
            schueler_uebersetzung: '',
          }],
        };
      }),
    }));
  };

  const handleAnlegen = async () => {
    if (!vorschau || !vorschau.themenfelder || vorschau.themenfelder.length === 0) return;
    setIsSaving(true);

    let erstelltePakete = 0;
    let erstellteZiele = 0;
    let erstellteThemenfelder = 0;

    // ══════════════════════════════════════════════════════════════════════════════
    // Schritt 1 & 2: Themenfelder KASKADIEREND mit ihren Inhalten anlegen
    // ══════════════════════════════════════════════════════════════════════════════
    for (const tf of vorschau.themenfelder) {
      // 1a. Themenfeld anlegen
      const neuesTF = await base44.entities.Themenfeld.create({
        einheit_id: einheitId,
        titel: tf.titel,
        reihenfolge: erstellteThemenfelder + 1,
        beschreibung: tf.beschreibung || '',
      });
      erstellteThemenfelder++;

      // 1b. Lernpakete INNERHALB dieses Themenfelds anlegen
      for (const paket of tf.lernpakete || []) {
        const neuesPaket = await base44.entities.Lernpakete.create({
          einheit_id: einheitId,
          themenfeld_id: neuesTF.id, // Direkt das gerade erstellte Themenfeld
          titel_des_pakets: paket.titel_des_pakets,
          reihenfolge_nummer: (tf.lernpakete || []).indexOf(paket) + 1,
          geschaetzte_dauer_minuten: paket.geschaetzte_dauer_minuten || 45,
        });
        erstelltePakete++;

        // 1c. Lernziele INNERHALB dieses Pakets anlegen
        for (const ziel of paket.lernziele || []) {
          if (!ziel.formulierung_fachsprache?.trim()) continue;
          await base44.entities.Lernziele.create({
            lernpaket_id: neuesPaket.id,
            formulierung_fachsprache: ziel.formulierung_fachsprache,
            kategorie: ziel.kategorie || 'Fachwissen',
            schueler_uebersetzung: ziel.schueler_uebersetzung || '',
          });
          erstellteZiele++;
        }
      }

      // 1d. Transferaufgaben (Ebene 2) INNERHALB dieses Themenfelds anlegen
      // (Optional: Falls Aufgaben-Entity existiert und konfiguriert)
      for (const aufgabe of tf.aufgaben || []) {
        // Placeholder für Transferaufgabe-Logik
        // await base44.entities.Aufgabenbausteine.create({
        //   einheit_id: einheitId,
        //   themenfeld_id: neuesTF.id,
        //   titel: aufgabe.titel,
        //   anforderungsebene: '2 - Transfer',
        //   ...
        // });
      }
    }



    setIsSaving(false);
    setErfolg({ pakete: erstelltePakete, ziele: erstellteZiele, themenfelder: erstellteThemenfelder });
    setVorschau(null);
    setBraindump('');
    toast.success(`${erstellteThemenfelder} Themenfelder, ${erstelltePakete} Lernpakete und ${erstellteZiele} Lernziele erfolgreich angelegt.`);
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

      {/* Erfolgsmeldung */}
      {erfolg && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-lg">
            ✓
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-green-900">Erfolgreich angelegt!</h4>
            <p className="text-sm text-green-700 mt-0.5">
              <strong>{erfolg.themenfelder || 0}</strong> Themenfelder, <strong>{erfolg.pakete}</strong> Lernpakete und <strong>{erfolg.ziele}</strong> Lernziele wurden hinzugefügt.
            </p>
            <button
              onClick={() => setErfolg(null)}
              className="text-xs text-green-600 hover:text-green-700 hover:underline mt-2"
            >
              Weitere Lernpakete hinzufügen →
            </button>
          </div>
        </div>
      )}

      {/* Eingabe */}
      {!vorschau && !erfolg && (
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
      {vorschau && vorschau.pakete && (
       <div className="space-y-4">
         <div className="flex items-center justify-between">
           <div>
             <h4 className="font-semibold text-foreground">Vorschau & Bearbeitung</h4>
             <p className="text-xs text-muted-foreground mt-0.5">
               {vorschau.themenfelder?.length || 0} Themenfelder · {vorschau.pakete.length} Lernpakete · {vorschau.pakete.reduce((s, p) => s + p.lernziele.length, 0)} Lernziele
             </p>
           </div>
           <Button variant="outline" size="sm" onClick={() => setVorschau(null)}>
             Neu eingeben
           </Button>
         </div>

         {/* Themenfeld-Gruppierung */}
         {(vorschau.themenfelder || []).map((themenfeldData, tfIdx) => (
           <div key={tfIdx} className="space-y-3 border-l-4 border-primary/30 pl-4 py-2">
             <h5 className="font-semibold text-sm text-foreground">{themenfeldData.titel}</h5>

             {/* Lernpakete in diesem Themenfeld */}
             {vorschau.pakete
               .filter((p) => p.themenfeldIndex === tfIdx)
               .map((paket) => {
                 const globalPIdx = vorschau.pakete.findIndex((p) => p === paket);
                 return (
                   <div key={globalPIdx}>
                     <Card className="border shadow-sm overflow-hidden">
                       <CardHeader className="pb-2 pt-4">
                         <div className="flex items-start gap-3">
                           <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0 mt-0.5">
                             {paket.reihenfolge_nummer}
                           </div>
                           <div className="flex-1 space-y-2">
                             <Input
                               value={paket.titel_des_pakets}
                               onChange={(e) => handleTitelChange(globalPIdx, e.target.value)}
                               className="font-semibold h-8"
                             />
                             <div className="flex items-center gap-2">
                               <span className="text-xs text-muted-foreground">Dauer (Min.):</span>
                               <Input
                                 type="number"
                                 value={paket.geschaetzte_dauer_minuten}
                                 onChange={(e) => handleDauerChange(globalPIdx, e.target.value)}
                                 className="h-7 w-20 text-xs"
                               />
                             </div>
                           </div>
                           <div className="flex items-center gap-1 shrink-0">
                             <button
                               onClick={() => setExpandedPakete((prev) => ({ ...prev, [globalPIdx]: !prev[globalPIdx] }))}
                               className="p-1 rounded hover:bg-muted text-muted-foreground"
                             >
                               {expandedPakete[globalPIdx] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                             </button>
                             <button
                               onClick={() => handlePaketEntfernen(globalPIdx)}
                               className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                         </div>
                       </CardHeader>

                       {expandedPakete[globalPIdx] && (
                         <CardContent className="pt-0 pb-4">
                           <div className="ml-10 space-y-2">
                             <div className="flex items-center justify-between mb-2">
                               <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                 Lernziele ({paket.lernziele.length})
                               </span>
                               <button
                                 onClick={() => handleLernzielHinzufuegen(globalPIdx)}
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
                                     onChange={(e) => handleLernzielChange(globalPIdx, zIdx, 'formulierung_fachsprache', e.target.value)}
                                     className="text-sm min-h-[60px] flex-1 resize-none"
                                     placeholder="Ich kann…"
                                   />
                                   <button
                                     onClick={() => handleLernzielEntfernen(globalPIdx, zIdx)}
                                     className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive shrink-0 mt-1"
                                   >
                                     <Trash2 className="w-3.5 h-3.5" />
                                   </button>
                                 </div>
                                 <div className="flex items-center gap-2 flex-wrap">
                                   <select
                                     value={ziel.kategorie || 'Fachwissen'}
                                     onChange={(e) => handleLernzielChange(globalPIdx, zIdx, 'kategorie', e.target.value)}
                                     className="text-xs border border-input rounded-md px-2 py-1 bg-background"
                                   >
                                     {KATEGORIEN.map((k) => (
                                       <option key={k} value={k}>
                                         {k}
                                       </option>
                                     ))}
                                   </select>
                                   <Badge className="text-[10px] bg-green-100 text-green-700">Ebene 1 - Basis</Badge>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </CardContent>
                       )}
                     </Card>
                   </div>
                 );
               })}
           </div>
         ))}

         {/* Anlegen-Button */}
         <div className="flex justify-end pt-2">
           <Button
             onClick={handleAnlegen}
             disabled={isSaving || !vorschau?.pakete || vorschau.pakete.length === 0}
             size="lg"
             className="gap-2"
           >
             {isSaving ? (
               <>
                 <Loader2 className="w-4 h-4 animate-spin" />
                 Wird angelegt…
               </>
             ) : (
               <>
                 <CheckCircle2 className="w-4 h-4" />
                 {vorschau?.pakete?.length || 0} Lernpakete anlegen
               </>
             )}
           </Button>
         </div>
         </div>
         )}
    </div>
  );
}