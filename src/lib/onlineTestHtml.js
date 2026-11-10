// Online-Test (2026-11-10): Baut aus dem Aufgabenpool die eigenständige test.html für die App „NeunZehn“.
// Regeln: alles inline, keine Lösungen/Punkte, kein Storage, kein alert/confirm, kein Timer,
// je Aufgabe zufällig GENAU eine Variante, Abgabe per postMessage („neunzehn-testabgabe“).

const sicher = (wert) => JSON.stringify(wert).replace(/</g, '\\u003c');
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
*{box-sizing:border-box}
body{margin:0;background:#f7f7f5;color:#1a1a1a;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:18px;line-height:1.5}
main{max-width:780px;margin:0 auto;padding:16px 16px 40px}
h1{font-size:22px;margin:4px 0 2px}
.fortschritt{color:#555;margin:0 0 12px}
.uebersicht{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:18px}
.nr{min-width:44px;min-height:44px;border:2px solid #c9c9c4;background:#fff;border-radius:8px;font-size:17px;cursor:pointer;color:#1a1a1a}
.nr.fertig{background:#e3eedd;border-color:#6d9a5b}
.nr.aktiv{border-color:#1f3b73;outline:2px solid #1f3b73}
.karte{background:#fff;border:1px solid #deded8;border-radius:12px;padding:18px}
.frage{font-size:19px;margin:0 0 16px;white-space:pre-wrap}
.option{display:flex;align-items:center;gap:12px;min-height:52px;padding:10px 14px;border:2px solid #deded8;border-radius:10px;margin-bottom:10px;cursor:pointer;background:#fff}
.option input{width:24px;height:24px;flex-shrink:0}
input[type=text],textarea,select{width:100%;font:inherit;font-size:18px;padding:10px 12px;min-height:48px;border:2px solid #c9c9c4;border-radius:10px;background:#fff;color:#1a1a1a}
.zahlreihe{display:flex;align-items:center;gap:10px}
.zahlreihe input{max-width:260px}
.paar{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:center;margin-bottom:10px}
.sortzeile{display:flex;align-items:center;gap:8px;padding:8px 10px;border:2px solid #deded8;border-radius:10px;margin-bottom:8px;background:#fff}
.sortzeile span{flex:1}
.klein{min-width:44px;min-height:44px;border:2px solid #c9c9c4;border-radius:8px;background:#fff;font-size:18px;cursor:pointer}
.reihe{display:flex;justify-content:space-between;gap:12px;margin-top:18px}
.knopf{min-height:52px;padding:0 22px;border-radius:10px;border:2px solid #1f3b73;background:#1f3b73;color:#fff;font:inherit;font-size:18px;cursor:pointer}
.knopf.zweit{background:#fff;color:#1f3b73}
.knopf:disabled{opacity:.35;cursor:default}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}
.overlay[hidden]{display:none}
.box{background:#fff;border-radius:14px;padding:22px;max-width:480px;width:100%}
.danke{text-align:center;padding:60px 16px;font-size:22px}
@media (max-width:520px){.paar{grid-template-columns:1fr}.reihe{flex-direction:column-reverse}.knopf{width:100%}}
`;

const SCRIPT = `
(function () {
  function mischen(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var gezeigt = AUFGABEN.map(function (a) {
    var v = a.varianten[Math.floor(Math.random() * a.varianten.length)];
    return { aufgabe: a, v: v, optionen: mischen(v.optionen || []), rechts: mischen(v.rechts || []), elemente: mischen(v.elemente || []) };
  });
  var antworten = gezeigt.map(function (g) { return g.v.typ === 'mehrfach' ? [] : g.v.typ === 'zuordnung' ? {} : g.v.typ === 'reihenfolge' ? null : ''; });
  var pos = 0, abgegeben = false, knoepfe = [];
  var app = document.getElementById('app');
  var overlay = document.getElementById('overlay');

  function el(tag, opt, kinder) {
    var e = document.createElement(tag); opt = opt || {};
    for (var k in opt) { if (k === 'text') e.textContent = opt[k]; else if (k === 'className') e.className = opt[k]; else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), opt[k]); else e.setAttribute(k, opt[k]); }
    (kinder || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function beantwortet(i) {
    var a = antworten[i], t = gezeigt[i].v.typ;
    if (t === 'mehrfach') return a.length > 0;
    if (t === 'zuordnung') return Object.keys(a).some(function (k) { return a[k]; });
    if (t === 'reihenfolge') return a !== null;
    return String(a).trim() !== '';
  }
  function antwortText(i) {
    var a = antworten[i], g = gezeigt[i], t = g.v.typ;
    if (t === 'mehrfach') return a.join('; ');
    if (t === 'zuordnung') return (g.v.links || []).filter(function (l) { return a[l]; }).map(function (l) { return l + ' \\u2192 ' + a[l]; }).join('; ');
    if (t === 'reihenfolge') return a ? a.join(' | ') : '';
    return String(a).trim();
  }
  function marken() {
    knoepfe.forEach(function (b, i) { b.className = 'nr' + (beantwortet(i) ? ' fertig' : '') + (i === pos ? ' aktiv' : ''); });
  }
  function gehe(i) { pos = i; render(); window.scrollTo(0, 0); }

  function eingabe(g) {
    var a = antworten[pos], t = g.v.typ, name = 'a' + pos;
    if (t === 'auswahl' || t === 'mehrfach') {
      return el('div', {}, g.optionen.map(function (o) {
        var inp = el('input', { type: t === 'auswahl' ? 'radio' : 'checkbox', name: name });
        inp.checked = t === 'auswahl' ? a === o : a.indexOf(o) >= 0;
        inp.addEventListener('change', function () {
          if (t === 'auswahl') antworten[pos] = o;
          else { var l = antworten[pos].filter(function (x) { return x !== o; }); if (inp.checked) l.push(o); antworten[pos] = l; }
          marken();
        });
        return el('label', { className: 'option' }, [inp, el('span', { text: o })]);
      }));
    }
    if (t === 'zahl' || t === 'kurz') {
      var f = el('input', { type: 'text', inputmode: t === 'zahl' ? 'decimal' : 'text', autocomplete: 'off', 'aria-label': 'Deine Antwort', placeholder: t === 'zahl' ? 'Zahl eingeben' : 'Deine Antwort' });
      f.value = a; f.addEventListener('input', function () { antworten[pos] = f.value; marken(); });
      return el('div', { className: 'zahlreihe' }, [f, g.v.einheit ? el('span', { text: g.v.einheit }) : null]);
    }
    if (t === 'text') {
      var ta = el('textarea', { rows: '7', 'aria-label': 'Deine Antwort', placeholder: 'Schreibe 2 bis 5 S\\u00e4tze.' });
      ta.value = a; ta.addEventListener('input', function () { antworten[pos] = ta.value; marken(); });
      return ta;
    }
    if (t === 'zuordnung') {
      return el('div', {}, (g.v.links || []).map(function (l) {
        var s = el('select', { 'aria-label': l }, [el('option', { value: '', text: '\\u2013 bitte w\\u00e4hlen \\u2013' })].concat(g.rechts.map(function (r) { return el('option', { value: r, text: r }); })));
        s.value = a[l] || ''; s.addEventListener('change', function () { antworten[pos][l] = s.value; marken(); });
        return el('div', { className: 'paar' }, [el('span', { text: l }), s]);
      }));
    }
    if (t === 'reihenfolge') {
      var liste = a || g.elemente.slice();
      function tausch(i, j) { var l = liste.slice(); var x = l[i]; l[i] = l[j]; l[j] = x; antworten[pos] = l; render(); }
      return el('div', {}, liste.map(function (x, i) {
        var hoch = el('button', { className: 'klein', 'aria-label': 'nach oben', text: '\\u25B2', onclick: function () { tausch(i, i - 1); } });
        var runter = el('button', { className: 'klein', 'aria-label': 'nach unten', text: '\\u25BC', onclick: function () { tausch(i, i + 1); } });
        if (i === 0) hoch.disabled = true; if (i === liste.length - 1) runter.disabled = true;
        return el('div', { className: 'sortzeile' }, [el('strong', { text: (i + 1) + '.' }), el('span', { text: x }), hoch, runter]);
      }));
    }
    return el('p', { text: '' });
  }

  function render() {
    app.innerHTML = '';
    if (abgegeben) { app.appendChild(el('div', { className: 'danke', text: 'Danke, dein Test wurde abgegeben.' })); return; }
    var g = gezeigt[pos], n = gezeigt.length;
    knoepfe = gezeigt.map(function (_, i) { return el('button', { text: String(i + 1), 'aria-label': 'Aufgabe ' + (i + 1), onclick: function () { gehe(i); } }); });
    var zurueck = el('button', { className: 'knopf zweit', text: 'Zur\\u00fcck', onclick: function () { gehe(pos - 1); } });
    if (pos === 0) zurueck.disabled = true;
    var weiter = pos < n - 1
      ? el('button', { className: 'knopf', text: 'Weiter', onclick: function () { gehe(pos + 1); } })
      : el('button', { className: 'knopf', text: 'Test abgeben', onclick: function () { abgeben(true); } });
    app.appendChild(el('h1', { text: TITEL }));
    app.appendChild(el('p', { className: 'fortschritt', text: 'Aufgabe ' + (pos + 1) + ' von ' + n }));
    app.appendChild(el('nav', { className: 'uebersicht', 'aria-label': '\\u00dcbersicht' }, knoepfe));
    app.appendChild(el('section', { className: 'karte' }, [el('p', { className: 'frage', text: g.v.frage }), eingabe(g)]));
    app.appendChild(el('div', { className: 'reihe' }, [zurueck, weiter]));
    marken();
  }

  function abgeben(mitBestaetigung) {
    if (abgegeben) return;
    if (mitBestaetigung) {
      var leer = gezeigt.filter(function (_, i) { return !beantwortet(i); }).length;
      document.getElementById('ov-text').textContent = (leer ? 'Du hast noch ' + leer + (leer === 1 ? ' Aufgabe' : ' Aufgaben') + ' nicht bearbeitet. ' : '') + 'Wirklich abgeben? Danach kannst du nichts mehr \\u00e4ndern.';
      overlay.hidden = false;
      return;
    }
    abgegeben = true; overlay.hidden = true;
    window.parent.postMessage({
      typ: 'neunzehn-testabgabe',
      antworten: gezeigt.map(function (g, i) { return { aufgabe_id: g.aufgabe.id, variante_id: g.v.id, frage: g.v.frage, antwort: antwortText(i) }; })
    }, '*');
    render();
  }
  document.getElementById('ov-nein').addEventListener('click', function () { overlay.hidden = true; });
  document.getElementById('ov-ja').addEventListener('click', function () { abgeben(false); });
  window.addEventListener('message', function (e) { if (e.data && e.data.typ === 'neunzehn-abgabe-anfordern') abgeben(false); });
  render();
})();
`;

/** Erzeugt die vollständige test.html aus { titel, aufgaben }. */
export function onlineTestHtml(test) {
  const titel = test?.titel || 'Online-Test';
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)}</title>
<style>${CSS}</style>
</head>
<body>
<main id="app"></main>
<div id="overlay" class="overlay" hidden><div class="box" role="dialog" aria-modal="true"><p id="ov-text"></p><div class="reihe"><button id="ov-nein" class="knopf zweit">Zur\u00fcck zum Test</button><button id="ov-ja" class="knopf">Ja, abgeben</button></div></div></div>
<script>
var TITEL = ${sicher(titel)};
var AUFGABEN = ${sicher(test?.aufgaben || [])};
${SCRIPT}
</script>
</body>
</html>`;
}