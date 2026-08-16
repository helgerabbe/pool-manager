/**
 * Druck-/PDF-Ausgabe des Stunden-Regieblatts (MUG): tabellarischer
 * Stundenverlaufsplan im Querformat. Öffnet ein separates Druckfenster,
 * damit das App-Layout die Ausgabe nicht beeinflusst — im Druckdialog
 * kann die Lehrkraft „Als PDF speichern“ wählen.
 */
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { phasenTypMeta } from '@/lib/stundenPhasen';

const esc = (t) =>
  String(t ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export default function StundenRegieblattDruckButton({ stunde, phasen = [] }) {
  const { data: katalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalogAktiv'],
    queryFn: () => base44.entities.AktivitaetenKatalog.filter({ is_active: true }, 'phase', 200),
  });

  const drucken = () => {
    const gesamt = phasen.reduce((s, p) => s + (Number(p.dauer_minuten) || 0), 0);

    const zeilen = phasen
      .map((p, i) => {
        const meta = phasenTypMeta(p.typ);
        const aktivitaet = katalog.find((a) => a.id === p.aktivitaet_id);
        const material = (p.material_urls || []).map((m) => m.name || 'Material').join(', ');
        return `
          <tr>
            <td class="nr">${i + 1}</td>
            <td><strong>${esc(p.phasenname || 'Phase')}</strong><div class="art">${esc(meta.label)}</div></td>
            <td class="mitte">${p.dauer_minuten ? esc(p.dauer_minuten) + ' Min.' : '–'}</td>
            <td>${esc(p.lehrer_hinweis) || '–'}</td>
            <td>${esc(aktivitaet?.name) || '–'}</td>
            <td>${esc(material) || '–'}</td>
            <td class="code">${p.code_deaktiviert ? '<span class="aus">kein Code</span>' : esc(p.freischalt_code) || '–'}</td>
          </tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>${esc(stunde.arbeitstitel)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 10.5pt; }
  h1 { font-size: 15pt; margin: 0 0 2mm; }
  .meta { font-size: 9pt; color: #444; margin-bottom: 4mm; }
  .ziel { border: 1px solid #ccc; padding: 2mm 3mm; margin-bottom: 4mm; font-size: 10pt; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #bbb; padding: 2mm; vertical-align: top; text-align: left; }
  th { background: #eee; font-size: 9pt; text-transform: uppercase; letter-spacing: .03em; }
  tr { page-break-inside: avoid; }
  .nr, .mitte, .code { text-align: center; white-space: nowrap; }
  .code { font-family: "Courier New", monospace; font-weight: bold; }
  .art { font-size: 8.5pt; color: #555; }
  .aus { font-family: Arial, sans-serif; font-weight: normal; font-size: 8.5pt; color: #777; }
  tfoot td { font-size: 9pt; background: #f6f6f6; }
</style></head><body>
  <h1>${esc(stunde.arbeitstitel)}</h1>
  <div class="meta">
    ${esc(stunde.fach) || ''}${stunde.jahrgangsstufe ? ' · Jg. ' + esc(stunde.jahrgangsstufe) : ''}
    ${stunde.datum ? ' · ' + esc(stunde.datum) : ''}
    ${stunde.notfall_code ? ' · Notfall-Code: <strong>' + esc(stunde.notfall_code) + '</strong>' : ''}
  </div>
  ${stunde.stundenziel ? `<div class="ziel"><strong>Stundenziel:</strong> ${esc(stunde.stundenziel)}</div>` : ''}
  <table>
    <thead><tr>
      <th>#</th><th>Phase / Art</th><th>Dauer</th><th>Regieanweisung</th><th>Aufgabenart</th><th>Material</th><th>Code</th>
    </tr></thead>
    <tbody>${zeilen}</tbody>
    <tfoot><tr><td colspan="2">Gesamt</td><td class="mitte">${gesamt} Min.</td><td colspan="4"></td></tr></tfoot>
  </table>
</body></html>`;

    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={drucken} disabled={phasen.length === 0}>
      <Printer className="w-4 h-4" />
      Regieblatt drucken / als PDF
    </Button>
  );
}