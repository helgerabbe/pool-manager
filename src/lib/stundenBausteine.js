// Bausteinbibliothek (2026-10-19): fest gestaltete Elemente für den Grafikassistenten.
// Der Assistent setzt Vorlagen aus diesen Bausteinen zusammen, statt jedes Mal neu zu gestalten.
// Verhalten (Einblenden, Aufdecken, Auswählen, Zuordnen, Sortieren, Timer, Funken) liefert BAUSTEIN_JS automatisch.

export const BAUSTEIN_CSS = `
@keyframes bs-rein{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes bs-puls{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}
@keyframes bs-funke{to{transform:translate(var(--dx),var(--dy)) scale(.3);opacity:0}}
[data-einblenden]>*{opacity:0;animation:bs-rein .55s cubic-bezier(.2,.7,.2,1) forwards}
.held{position:relative;overflow:hidden;border-radius:calc(var(--radius) + 6px);padding:40px 44px;color:#fff;background:linear-gradient(135deg,var(--leit),#2c5470);background-size:cover;background-position:center;box-shadow:0 14px 40px rgba(46,58,70,.18)}
.held::before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,rgba(35,62,82,.88),rgba(63,110,140,.55) 60%,rgba(63,110,140,.15))}
.held>*{position:relative}
.held-titel{margin:0;font-size:40px;font-weight:800;letter-spacing:-.02em;line-height:1.1}
.held-unter{margin:10px 0 0;font-size:20px;opacity:.9;max-width:40ch}
.held .phase-badge{background:rgba(255,255,255,.18);color:#fff;backdrop-filter:blur(6px)}
.schritte{list-style:none;margin:0;padding:0;display:flex;gap:10px;counter-reset:s}
.schritte li{flex:1;display:flex;align-items:center;gap:10px;background:var(--flaeche);border:1px solid var(--linie);border-radius:14px;padding:12px 14px;font-size:16px;counter-increment:s}
.schritte li::before{content:counter(s);flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--leit-hell);color:var(--leit);font-weight:700}
.schritte li.aktiv{border-color:var(--leit);box-shadow:0 0 0 3px var(--leit-hell);font-weight:600}
.schritte li.aktiv::before{background:var(--leit);color:#fff}
.schritte li.erledigt::before{content:"✓";background:var(--salbei);color:#fff}
.stationen{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}
.station{position:relative;background:var(--flaeche);border-radius:var(--radius);padding:26px 22px 20px;border-top:6px solid var(--leit);box-shadow:0 6px 20px rgba(46,58,70,.08);transition:transform .25s,box-shadow .25s}
.station:hover{transform:translateY(-4px);box-shadow:0 12px 28px rgba(46,58,70,.14)}
.station:nth-child(4n+2){border-top-color:var(--sand)}.station:nth-child(4n+3){border-top-color:var(--salbei)}.station:nth-child(4n+4){border-top-color:#a58bb8}
.station-nr{position:absolute;top:-18px;right:18px;width:40px;height:40px;border-radius:50%;background:var(--tinte);color:#fff;display:grid;place-items:center;font-weight:800}
.station h3{margin:0 0 6px;font-size:21px}
.zeitleiste{position:relative;padding-left:34px;display:flex;flex-direction:column;gap:16px}
.zeitleiste::before{content:"";position:absolute;left:11px;top:6px;bottom:6px;width:3px;border-radius:3px;background:linear-gradient(var(--leit),var(--salbei))}
.ereignis{position:relative;background:var(--flaeche);border:1px solid var(--linie);border-radius:14px;padding:14px 18px}
.ereignis::before{content:"";position:absolute;left:-30px;top:18px;width:15px;height:15px;border-radius:50%;background:var(--flaeche);border:4px solid var(--leit)}
.ereignis .datum{font-size:14px;font-weight:700;color:var(--leit);text-transform:uppercase;letter-spacing:.06em}
.merksatz{position:relative;background:linear-gradient(135deg,var(--sand-hell),#fff);border:2px solid var(--sand);border-radius:var(--radius);padding:22px 26px 22px 74px;font-size:22px;font-weight:600}
.merksatz::before{content:"!";position:absolute;left:22px;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:var(--sand);color:#fff;display:grid;place-items:center;font-weight:800}
.zitat{margin:0;padding:24px 30px;border-radius:var(--radius);background:var(--flaeche);font-size:24px;font-style:italic;position:relative;box-shadow:0 4px 16px rgba(46,58,70,.06)}
.zitat::before{content:"“";position:absolute;left:12px;top:-14px;font-size:80px;color:var(--leit-hell);font-style:normal;line-height:1}
.zitat cite{display:block;margin-top:10px;font-size:16px;font-style:normal;color:var(--leise)}
.aufdecken{perspective:900px;cursor:pointer;min-height:150px}
.aufdecken-innen{position:relative;height:100%;min-height:inherit;transition:transform .6s cubic-bezier(.2,.7,.2,1);transform-style:preserve-3d}
.aufdecken.offen .aufdecken-innen{transform:rotateY(180deg)}
.vorne,.hinten{position:absolute;inset:0;backface-visibility:hidden;border-radius:var(--radius);padding:22px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:20px}
.vorne{background:linear-gradient(135deg,var(--leit),#2c5470);color:#fff;font-weight:700}
.hinten{background:var(--flaeche);border:2px solid var(--leit-hell);transform:rotateY(180deg)}
.auswahl{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.option{border:2px solid var(--linie);background:var(--flaeche);border-radius:14px;padding:16px 18px;font-size:18px;font-family:inherit;text-align:left;cursor:pointer;transition:transform .15s,border-color .2s,background .2s}
.option:hover{border-color:var(--leit);transform:translateY(-2px)}
.option.richtig{border-color:var(--salbei);background:var(--salbei-hell);animation:bs-puls .4s}
.option.falsch{border-color:#d49a8d;background:#f6e3df}
.sortieren{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.sortieren li{display:flex;align-items:center;gap:12px;background:var(--flaeche);border:2px solid var(--linie);border-radius:14px;padding:12px 16px;cursor:grab;transition:box-shadow .2s}
.sortieren li::before{content:"⋮⋮";color:var(--leise);letter-spacing:-2px}
.sortieren li.zieht{opacity:.5;box-shadow:0 8px 20px rgba(46,58,70,.15)}
.ablage.drueber{border-color:var(--leit);background:var(--leit-hell)}
.ablage.passt{border-style:solid;border-color:var(--salbei);background:var(--salbei-hell)}
.fortschritt{height:12px;border-radius:999px;background:var(--leit-hell);overflow:hidden}
.fortschritt>span{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,var(--leit),var(--salbei));transition:width .6s cubic-bezier(.2,.7,.2,1)}
.timer{display:inline-flex;align-items:center;gap:10px;background:var(--tinte);color:#fff;border-radius:999px;padding:8px 20px;font-size:26px;font-weight:700;font-variant-numeric:tabular-nums}
.timer.knapp{background:#b8664f;animation:bs-puls 1s infinite}
.gruppen{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px}
.gruppe{border-radius:var(--radius);padding:18px;background:var(--flaeche);border-left:8px solid var(--leit)}
.gruppe:nth-child(4n+2){border-left-color:var(--sand)}.gruppe:nth-child(4n+3){border-left-color:var(--salbei)}.gruppe:nth-child(4n+4){border-left-color:#a58bb8}
.gruppe h3{margin:0 0 6px}
.balken{display:flex;flex-direction:column;gap:10px}
.balken-zeile{display:grid;grid-template-columns:140px 1fr 48px;align-items:center;gap:12px}
.balken-zeile .spur{height:22px;border-radius:999px;background:var(--leit-hell);overflow:hidden}
.balken-zeile .spur>span{display:block;height:100%;background:var(--leit);border-radius:inherit;width:0;transition:width .8s cubic-bezier(.2,.7,.2,1)}
.funke{position:fixed;width:10px;height:10px;border-radius:50%;pointer-events:none;animation:bs-funke .7s ease-out forwards;z-index:99}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}[data-einblenden]>*{opacity:1}}
`;

export const BAUSTEIN_JS = `
(function(){
var reduziert=matchMedia('(prefers-reduced-motion: reduce)').matches;
function funken(el){if(reduziert)return;var r=el.getBoundingClientRect(),f=['#7fa88d','#e8c58f','#3f6e8c'];for(var i=0;i<14;i++){var s=document.createElement('span');s.className='funke';s.style.left=(r.left+r.width/2)+'px';s.style.top=(r.top+r.height/2)+'px';s.style.background=f[i%3];var w=Math.random()*Math.PI*2,d=40+Math.random()*60;s.style.setProperty('--dx',Math.cos(w)*d+'px');s.style.setProperty('--dy',Math.sin(w)*d+'px');document.body.appendChild(s);setTimeout(function(x){return function(){x.remove()}}(s),800)}}
window.bsFunken=funken;
function fortschritt(){var alle=document.querySelectorAll('.option[data-richtig],.ablage[data-passt]').length,ok=document.querySelectorAll('.option.richtig,.ablage.passt').length;document.querySelectorAll('.fortschritt>span').forEach(function(b){if(alle)b.style.width=Math.round(ok/alle*100)+'%'})}
document.querySelectorAll('[data-einblenden]').forEach(function(c){Array.prototype.forEach.call(c.children,function(k,i){k.style.animationDelay=(i*0.09)+'s'})});
document.querySelectorAll('.fortschritt[data-wert]>span,.balken-zeile .spur[data-wert]>span').forEach(function(b){setTimeout(function(){b.style.width=b.parentNode.dataset.wert+'%'},300)});
document.querySelectorAll('.aufdecken').forEach(function(k){k.addEventListener('click',function(){k.classList.toggle('offen')})});
document.querySelectorAll('.auswahl').forEach(function(g){g.querySelectorAll('.option').forEach(function(o){o.addEventListener('click',function(){if(o.hasAttribute('data-richtig')){o.classList.add('richtig');funken(o)}else{o.classList.add('falsch');setTimeout(function(){o.classList.remove('falsch')},700)}fortschritt()})})});
var gezogen=null;
document.querySelectorAll('.ziehbar').forEach(function(z){z.draggable=true;z.addEventListener('dragstart',function(){gezogen=z})});
document.querySelectorAll('.ablage').forEach(function(a){a.addEventListener('dragover',function(e){e.preventDefault();a.classList.add('drueber')});a.addEventListener('dragleave',function(){a.classList.remove('drueber')});a.addEventListener('drop',function(e){e.preventDefault();a.classList.remove('drueber');if(!gezogen)return;a.appendChild(gezogen);if(a.dataset.passt&&gezogen.dataset.wert===a.dataset.passt){a.classList.add('passt');funken(a)}fortschritt()})});
document.querySelectorAll('.sortieren').forEach(function(l){var z=null;Array.prototype.forEach.call(l.children,function(li){li.draggable=true;li.addEventListener('dragstart',function(){z=li;li.classList.add('zieht')});li.addEventListener('dragend',function(){li.classList.remove('zieht');var rf=Array.prototype.map.call(l.children,function(x){return x.dataset.pos}).join(',');if(l.dataset.loesung&&rf===l.dataset.loesung)funken(l)});li.addEventListener('dragover',function(e){e.preventDefault();if(z&&z!==li){var r=li.getBoundingClientRect();l.insertBefore(z,e.clientY<r.top+r.height/2?li:li.nextSibling)}})})});
document.querySelectorAll('.timer[data-minuten]').forEach(function(t){var rest=parseFloat(t.dataset.minuten)*60;function zeig(){var m=Math.floor(rest/60),s=Math.floor(rest%60);t.textContent=m+':'+(s<10?'0':'')+s;t.classList.toggle('knapp',rest<=60)}zeig();var iv=setInterval(function(){rest=Math.max(0,rest-1);zeig();if(!rest)clearInterval(iv)},1000)});
})();
`;

export const BAUSTEIN_KATALOG = `BAUSTEINBIBLIOTHEK (fest gestaltet, Verhalten ist bereits eingebaut, KEIN eigenes JavaScript dafür schreiben):
- Kopfbereich: <header class="held" style="background-image:url('{{bild:hintergrund}}')"><span class="phase-badge">Erarbeitung</span><h1 class="held-titel">…</h1><p class="held-unter">…</p></header>
- Einblenden: Elternelement mit data-einblenden → Kinder gleiten gestaffelt herein (z. B. <div class="stationen" data-einblenden>).
- Ablaufschritte: <ol class="schritte"><li class="erledigt">…</li><li class="aktiv">…</li><li>…</li></ol>
- Stationen: <div class="stationen"><div class="station"><span class="station-nr">1</span><h3>…</h3><p>…</p></div>…</div>
- Gruppen: <div class="gruppen"><div class="gruppe"><h3>Gruppe A</h3><p>…</p></div>…</div>
- Zeitleiste: <div class="zeitleiste"><div class="ereignis"><div class="datum">1914</div>…</div>…</div>
- Merksatz: <div class="merksatz">…</div> · Zitat: <blockquote class="zitat">…<cite>…</cite></blockquote>
- Aufdeckkarte (Klick dreht um): <div class="aufdecken"><div class="aufdecken-innen"><div class="vorne">Frage</div><div class="hinten">Antwort</div></div></div>
- Auswahl (Rückmeldung + Funken automatisch): <div class="auswahl"><button class="option" data-richtig>…</button><button class="option">…</button></div>
- Zuordnen: <span class="ziehbar" data-wert="a">…</span> in <div class="ablage" data-passt="a"></div>
- Sortieren: <ol class="sortieren" data-loesung="1,2,3"><li data-pos="2">…</li><li data-pos="1">…</li>…</ol>
- Fortschritt: <div class="fortschritt"><span></span></div> (füllt sich mit Auswahl/Zuordnen automatisch; oder data-wert="60")
- Abstimmung/Balken: <div class="balken"><div class="balken-zeile"><span>Ja</span><div class="spur" data-wert="70"><span></span></div><b>70 %</b></div></div>
- Timer: <span class="timer" data-minuten="10"></span>
- Funken für eigene Erfolge: window.bsFunken(element)
INTERAKTIONSMODUS (Pflicht für jedes interaktive Element, als data-modus):
- Einzelmodus: data-modus="einzel" → Eingaben und berechnete Ergebnisse gehören nur der einzelnen Person (Zuordnung: Schüler-ID); nur sie (und die Lehrkraft) sieht und bearbeitet sie.
- Gruppenmodus: data-modus="gruppe" data-gruppe="{{gruppe}}" → Eingaben und Ergebnisse werden über die Gruppenkennung geteilt; alle Mitglieder dieser Gruppe sehen und bearbeiten sie gemeinsam.
REGEL: Baue jede Ansicht überwiegend aus diesen Bausteinen und den Grundklassen. Eigenes CSS nur für kleine Anpassungen, nie um die Bausteine neu zu gestalten. So sehen alle Methoden aus einem Guss aus.`;