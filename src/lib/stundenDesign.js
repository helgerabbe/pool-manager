// Grund-Design für Unterrichtsstunden (2026-10-05): EIN Stylesheet für alle Aktivitäten.
// Ruhige, warme Grundfläche, gedämpftes Blau als Leitfarbe, Sand und Salbei als Akzente.
// Der Grafikassistent darf NUR die hier dokumentierten Klassen verwenden.
export const STUNDEN_CSS = `
:root{--grund:#f6f4ef;--flaeche:#ffffff;--tinte:#2e3a46;--leise:#6b7682;--leit:#3f6e8c;--leit-hell:#e3edf3;--sand:#e8c58f;--sand-hell:#faf1e2;--salbei:#7fa88d;--salbei-hell:#e6f0e9;--linie:#e2ddd3;--radius:18px}
*{box-sizing:border-box}
body{margin:0;background:var(--grund);color:var(--tinte);font-family:"Segoe UI",system-ui,sans-serif;font-size:20px;line-height:1.55}
.stunde{min-height:100vh;padding:36px 44px;display:flex;flex-direction:column;gap:22px}
.kopf{display:flex;align-items:center;justify-content:space-between;gap:16px}
.kopf h1{margin:0;font-size:34px;font-weight:700;letter-spacing:-.01em}
.phase-badge{background:var(--leit-hell);color:var(--leit);border-radius:999px;padding:6px 16px;font-size:15px;font-weight:600}
.zeit{color:var(--leise);font-size:16px}
.raster{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}
.karte{background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius);padding:24px 28px;box-shadow:0 2px 10px rgba(46,58,70,.05)}
.karte h2{margin:0 0 10px;font-size:22px}
.fokus{background:var(--sand-hell);border-left:6px solid var(--sand);border-radius:var(--radius);padding:18px 24px;font-weight:600}
.impuls{background:var(--leit-hell);border-radius:var(--radius);padding:28px;font-size:26px;text-align:center}
.auftrag{background:var(--salbei-hell);border-radius:var(--radius);padding:20px 24px}
.auftrag strong{color:#4d7a5e}
.hinweis{color:var(--leise);font-size:16px}
.ablauf{list-style:none;margin:0;padding:0;display:flex;gap:12px;flex-wrap:wrap}
.ablauf li{flex:1;min-width:140px;background:var(--flaeche);border:1px solid var(--linie);border-radius:14px;padding:14px 16px;font-size:17px}
.ablauf li.erledigt{opacity:.55}
.ablauf li.aktiv{border:2px solid var(--leit);background:var(--leit-hell);font-weight:600}
.knopfreihe{display:flex;gap:12px;flex-wrap:wrap}
.knopf{border:0;border-radius:14px;padding:14px 22px;font-size:18px;font-weight:600;background:var(--leit);color:#fff;cursor:pointer}
.knopf.leise{background:var(--flaeche);color:var(--leit);border:2px solid var(--leit-hell)}
.eingabe{width:100%;border:2px solid var(--linie);border-radius:14px;padding:14px;font-size:18px;font-family:inherit;background:var(--flaeche)}
.bildplatz{background:repeating-linear-gradient(45deg,var(--leit-hell),var(--leit-hell) 12px,#edf3f7 12px,#edf3f7 24px);border-radius:var(--radius);min-height:180px;display:flex;align-items:center;justify-content:center;color:var(--leit);font-weight:600}
`;

export const STUNDEN_KLASSEN = `.stunde (Wurzel) · .kopf mit h1 + .phase-badge + .zeit · .raster (Kartenraster) · .karte mit h2 · .fokus (Hervorhebung, sandfarben) · .impuls (großer Impuls) · .auftrag (Arbeitsauftrag, salbeigrün) · .hinweis (leiser Text) · ol.ablauf mit li / li.aktiv / li.erledigt · .knopfreihe mit button.knopf / button.knopf.leise · textarea.eingabe / input.eingabe · .bildplatz (Platzhalter statt Bild, mit kurzem Bildtitel)`;

export const FAECHER = ['Fächerübergreifend', 'Mathematik', 'Deutsch', 'Englisch', 'Naturwissenschaften', 'GEP'];