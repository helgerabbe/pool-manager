import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Upload, FileText, X, CheckCircle2, AlertCircle,
  RefreshCw, ChevronRight, Info
} from 'lucide-react';

// Bekannte Felder der Benutzer-Entität
const DB_FELDER = [
  { key: 'email',   label: 'E-Mail *',              pflicht: true },
  { key: 'rolle',   label: 'Rolle',                  pflicht: false },
  { key: 'faecher', label: 'Fachbereich (Mehrfach)', pflicht: false },
];

// Trennzeichen für Fächerlisten
const TRENNZEICHEN = [
  { value: ';',  label: 'Semikolon  ;' },
  { value: ',',  label: 'Komma  ,' },
  { value: '|',  label: 'Pipe  |' },
  { value: '/',  label: 'Slash  /' },
];

const GUELTIGE_ROLLEN = ['Administrator', 'Fachschaftsleitung', 'Fachlehrkraft', 'Betrachter', 'Moodle-Designer'];

/** Einfacher CSV-Parser: unterstützt quoted fields und verschiedene Zeilenumbrüche. */
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line) => {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if ((ch === ',' || ch === ';') && !inQuotes) {
        fields.push(current.trim()); current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  // Trennzeichen auto-detektieren
  const firstLine = lines[0];
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';

  const headers = firstLine.split(sep).map(h => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map(l => {
    const vals = l.split(sep).map(v => v.replace(/^"|"$/g, '').trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });

  return { headers, rows };
}

// ── Schritt 1: Dropzone ───────────────────────────────────────────────────────
function Dropzone({ onFile }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleChange = (e) => {
    if (e.target.files[0]) onFile(e.target.files[0]);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
        ${dragOver
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border hover:border-primary/50 hover:bg-muted/30'}
      `}
    >
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleChange} />
      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
      <p className="font-semibold text-foreground mb-1">CSV-Datei hierher ziehen</p>
      <p className="text-sm text-muted-foreground mb-3">oder klicken zum Auswählen</p>
      <Badge variant="secondary" className="text-xs">UTF-8, Semikolon oder Komma getrennt</Badge>
    </div>
  );
}

// ── Schritt 2: Field Mapping ──────────────────────────────────────────────────
function FieldMapping({ headers, mapping, onMapping, trennzeichen, onTrennzeichen }) {
  // Automatisches Mapping anhand häufiger Spaltennamen
  const autoHints = {
    email: ['email', 'e-mail', 'mail', 'emailadresse', 'e_mail'],
    rolle: ['rolle', 'role', 'funktion', 'position'],
    faecher: ['fach', 'fächer', 'faecher', 'lehrbefähigung', 'lehrbefaehigung', 'subject', 'subjects'],
  };

  const getAutoMatch = (dbKey) => {
    const hints = autoHints[dbKey] || [];
    return headers.find(h => hints.some(hint => h.toLowerCase().includes(hint))) || '';
  };

  return (
    <div className="space-y-5">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Ordnen Sie die CSV-Spalten den Datenbankfeldern zu. Felder ohne Zuweisung werden ignoriert.
          Auto-Match: Spalten mit ähnlichen Namen werden automatisch vorbelegt.
        </p>
      </div>

      <div className="space-y-3">
        {DB_FELDER.map(feld => {
          const autoMatch = getAutoMatch(feld.key);
          const currentVal = mapping[feld.key] || autoMatch;

          return (
            <div key={feld.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="p-2.5 bg-muted rounded-lg text-sm font-medium text-center">
                {feld.label}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <Select
                value={mapping[feld.key] !== undefined ? mapping[feld.key] : autoMatch}
                onValueChange={v => onMapping({ ...mapping, [feld.key]: v === '__keine__' ? '' : v })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="CSV-Spalte wählen…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__keine__">— Nicht zuordnen —</SelectItem>
                  {headers.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {/* Trennzeichen für Fächerliste */}
      <div className="pt-2 border-t">
        <Label className="text-xs text-muted-foreground mb-2 block">
          Trennzeichen für Fächerliste (z.B. "Deutsch; Mathe; Physik")
        </Label>
        <div className="flex gap-2 flex-wrap">
          {TRENNZEICHEN.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => onTrennzeichen(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                trennzeichen === t.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:border-primary/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Schritt 3: Vorschau ───────────────────────────────────────────────────────
function Vorschau({ rows, mapping, trennzeichen }) {
  const preview = rows.slice(0, 5);

  const getMappedValue = (row, dbKey) => {
    const col = mapping[dbKey];
    if (!col) return null;
    const val = row[col] || '';
    if (dbKey === 'faecher') {
      return val.split(trennzeichen).map(s => s.trim()).filter(Boolean);
    }
    return val;
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Vorschau ({Math.min(5, rows.length)} von {rows.length} Zeilen):
      </p>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">E-Mail</th>
              <th className="text-left px-3 py-2 font-semibold">Rolle</th>
              <th className="text-left px-3 py-2 font-semibold">Fächer</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {preview.map((row, i) => {
              const email   = getMappedValue(row, 'email');
              const rolle   = getMappedValue(row, 'rolle') || 'Fachlehrkraft';
              const faecher = getMappedValue(row, 'faecher') || [];
              const emailOk = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
              return (
                <tr key={i} className={emailOk ? '' : 'bg-red-50'}>
                  <td className="px-3 py-2">
                    <span className={emailOk ? '' : 'text-red-600 font-medium'}>{email || '—'}</span>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {GUELTIGE_ROLLEN.includes(rolle) ? rolle : `${rolle} → Fachlehrkraft`}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {faecher.length > 0
                        ? faecher.map(f => <span key={f} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{f}</span>)
                        : <span className="text-muted-foreground">—</span>
                      }
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Ergebnis-Zusammenfassung ──────────────────────────────────────────────────
function Ergebnis({ result, onReset }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Neu angelegt',   value: result.angelegt,     icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          { label: 'Aktualisiert',   value: result.aktualisiert, icon: RefreshCw,    color: 'text-blue-600',  bg: 'bg-blue-50 border-blue-200' },
          { label: 'Fehler',         value: result.fehler.length, icon: AlertCircle, color: 'text-red-600',   bg: 'bg-red-50 border-red-200' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-xl border p-4 text-center ${s.bg}`}>
              <Icon className={`w-6 h-6 mx-auto mb-1 ${s.color}`} />
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {result.fehler.length > 0 && (
        <div className="border border-red-200 rounded-lg overflow-hidden">
          <div className="bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Fehler-Details
          </div>
          <div className="divide-y max-h-48 overflow-y-auto">
            {result.fehler.map((f, i) => (
              <div key={i} className="px-4 py-2.5 text-xs flex items-start gap-3">
                <span className="text-muted-foreground shrink-0">Zeile {f.zeile}</span>
                <span className="font-mono text-foreground shrink-0">{f.email}</span>
                <span className="text-red-600">{f.grund}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button onClick={onReset} variant="outline" className="w-full gap-2">
        <Upload className="w-4 h-4" />Weitere CSV importieren
      </Button>
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function UserImport() {
  const [schritt, setSchritt] = useState(1); // 1=Upload, 2=Mapping, 3=Vorschau, 4=Ergebnis
  const [csvData, setCsvData]       = useState(null);   // { headers, rows }
  const [dateiName, setDateiName]   = useState('');
  const [mapping, setMapping]       = useState({});
  const [trennzeichen, setTrennzeichen] = useState(';');
  const [importing, setImporting]   = useState(false);
  const [result, setResult]         = useState(null);

  const handleFile = (file) => {
    setDateiName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result);
      if (parsed.headers.length === 0) return;
      setCsvData(parsed);
      setMapping({});
      setSchritt(2);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    setImporting(true);
    const { rows } = csvData;

    // Zeilen transformieren
    const transformed = rows.map(row => {
      const emailCol   = mapping.email   || '';
      const rolleCol   = mapping.rolle   || '';
      const faecherCol = mapping.faecher || '';

      const faecherRaw = faecherCol ? (row[faecherCol] || '') : '';
      const faecher = faecherRaw
        .split(trennzeichen)
        .map(f => f.trim())
        .filter(Boolean);

      return {
        email:   row[emailCol] || '',
        rolle:   rolleCol ? row[rolleCol] : '',
        faecher,
      };
    });

    const response = await base44.functions.invoke('importBenutzer', { rows: transformed });
    setResult(response.data);
    setSchritt(4);
    setImporting(false);
  };

  const reset = () => {
    setSchritt(1); setCsvData(null); setDateiName('');
    setMapping({}); setResult(null);
  };

  const SCHRITTE = ['Datei', 'Zuordnung', 'Vorschau', 'Ergebnis'];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              CSV-Massenimport
            </CardTitle>
            <CardDescription className="mt-1">
              Lehrkräfte aus IServ oder anderen Schulverwaltungssystemen importieren
            </CardDescription>
          </div>
          {schritt > 1 && schritt < 4 && (
            <button onClick={reset} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Schritt-Indikator */}
        <div className="flex items-center gap-1 mt-3">
          {SCHRITTE.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                schritt === i + 1
                  ? 'bg-primary text-primary-foreground'
                  : schritt > i + 1
                    ? 'bg-green-100 text-green-700'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {schritt > i + 1 && <CheckCircle2 className="w-3 h-3" />}
                {s}
              </div>
              {i < SCHRITTE.length - 1 && <div className="flex-1 h-px bg-border" />}
            </React.Fragment>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Schritt 1: Upload */}
        {schritt === 1 && <Dropzone onFile={handleFile} />}

        {/* Schritt 2: Mapping */}
        {schritt === 2 && csvData && (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span className="font-medium text-foreground">{dateiName}</span>
              <span>· {csvData.rows.length} Zeilen · {csvData.headers.length} Spalten</span>
            </div>
            <FieldMapping
              headers={csvData.headers}
              mapping={mapping}
              onMapping={setMapping}
              trennzeichen={trennzeichen}
              onTrennzeichen={setTrennzeichen}
            />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={reset} className="flex-1">Abbrechen</Button>
              <Button
                onClick={() => setSchritt(3)}
                disabled={!mapping.email && !csvData.headers.some(h =>
                  ['email','e-mail','mail'].some(hint => h.toLowerCase().includes(hint))
                )}
                className="flex-1 gap-2"
              >
                Vorschau <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {/* Schritt 3: Vorschau */}
        {schritt === 3 && csvData && (
          <>
            <Vorschau rows={csvData.rows} mapping={mapping} trennzeichen={trennzeichen} />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setSchritt(2)} className="flex-1">Zurück</Button>
              <Button onClick={handleImport} disabled={importing} className="flex-1 gap-2">
                {importing
                  ? <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Importiere…</>
                  : <><Upload className="w-4 h-4" />{csvData.rows.length} Zeilen importieren</>
                }
              </Button>
            </div>
          </>
        )}

        {/* Schritt 4: Ergebnis */}
        {schritt === 4 && result && <Ergebnis result={result} onReset={reset} />}
      </CardContent>
    </Card>
  );
}