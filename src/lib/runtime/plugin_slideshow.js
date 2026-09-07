/**
 * plugin_slideshow.js
 *
 * Moodle-Runtime für die Aktivität „Slideshow" (2026-09-07).
 *
 *   - "slideshow"   Folien Seite für Seite, feste 960×540-Fläche skaliert
 *       { "instruction": "…", "slides": [ … ] }
 *
 * `slides` ist 1:1 `field_values.slides` des Pool-Managers (siehe
 * lib/slideshowVorlagen.js). Die Vorlagen-Geometrie wird hier eingebettet,
 * damit Schüler im Kurs exakt die Folie sehen, die die Lehrkraft gebaut hat.
 * Elemente können auf Wunsch nacheinander eingeblendet werden (Opacity, keine
 * weitere Animation). Am Ende meldet „Fertig" die SCORM-Completion.
 */
import { VORLAGEN, SCHRIFTGROESSEN } from '@/lib/slideshowVorlagen';

const GROESSEN_PX = Object.fromEntries(SCHRIFTGROESSEN.map((g) => [g.key, g.px]));

export const PLUGIN_SLIDESHOW_CSS = `/* ── Slideshow ─────────────────────────────────────────────── */
.mbk-ss__stage {
  position: relative;
  width: 100%;
  aspect-ratio: 960 / 540;
  overflow: hidden;
  border: 1px solid var(--mbk-border);
  border-radius: 0.6rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  background: #fff;
}
.mbk-ss__inner {
  position: absolute; left: 0; top: 0;
  width: 960px; height: 540px;
  transform-origin: top left;
}
.mbk-ss__el { position: absolute; transition: opacity 0.6s ease; }
.mbk-ss__el.is-hidden { opacity: 0; }
.mbk-ss__el img { width: 100%; height: 100%; object-fit: contain; display: block; }
.mbk-ss__text { width: 100%; height: 100%; overflow: hidden; line-height: 1.35; word-break: break-word; white-space: pre-wrap; }
.mbk-ss__nav {
  margin-top: 0.75rem;
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
}
.mbk-ss__counter { color: var(--mbk-muted); font-size: 0.875rem; }
.mbk-ss__dots { display: flex; gap: 0.3rem; align-items: center; }
.mbk-ss__dot { width: 0.4rem; height: 0.4rem; border-radius: 999px; background: #cbd5e1; }
.mbk-ss__dot.is-active { width: 1.2rem; background: var(--mbk-accent); }
`;

export const PLUGIN_SLIDESHOW_JS = `
  // ── Plugin: Slideshow ────────────────────────────────────
  var MBK_SS_VORLAGEN = ${JSON.stringify(VORLAGEN)};
  var MBK_SS_GROESSEN = ${JSON.stringify(GROESSEN_PX)};

  registerPlugin('slideshow', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');
    mbkRenderInstruction(host, config.instruction);

    function vorlage(key) {
      for (var i = 0; i < MBK_SS_VORLAGEN.length; i++) if (MBK_SS_VORLAGEN[i].key === key) return MBK_SS_VORLAGEN[i];
      return MBK_SS_VORLAGEN[1];
    }
    function textOf(html) { return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim(); }
    function hatInhalt(slide, slot) {
      var e = slide.elemente && slide.elemente[slot.key];
      if (!e) return false;
      return slot.art === 'bild' ? !!e.url : textOf(e.html) !== '';
    }
    function slots(slide) {
      var v = vorlage(slide.vorlage), order = Array.isArray(slide.reihenfolge) ? slide.reihenfolge : [], out = [];
      order.forEach(function (k) { v.slots.forEach(function (s) { if (s.key === k) out.push(s); }); });
      v.slots.forEach(function (s) { if (out.indexOf(s) < 0) out.push(s); });
      return out.filter(function (s) { return hatInhalt(slide, s); });
    }
    function dunkel(hex) {
      var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
      if (!m) return false;
      var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
    }
    function clean(html) {
      return String(html || '').replace(/<script[\\s\\S]*?<\\/script>/gi, '').replace(/\\son\\w+\\s*=\\s*"[^"]*"/gi, '').replace(/javascript:/gi, '');
    }

    var slides = (Array.isArray(config.slides) ? config.slides : []).filter(function (s) { return slots(s).length > 0; });
    if (slides.length === 0) {
      host.appendChild(el('div', { className: 'mbk-activity__error', text: 'Diese Slideshow hat keine Folien.' }));
      return;
    }

    var stage = el('div', { className: 'mbk-ss__stage' });
    var inner = el('div', { className: 'mbk-ss__inner' });
    stage.appendChild(inner);
    host.appendChild(stage);

    var nav = el('div', { className: 'mbk-ss__nav' });
    var prev = el('button', { className: 'mbk-btn', type: 'button', text: '\\u2039 Zur\\u00fcck' });
    var mitte = el('div', { className: 'mbk-ss__dots' });
    var counter = el('span', { className: 'mbk-ss__counter' });
    var next = el('button', { className: 'mbk-btn mbk-btn--primary', type: 'button', text: 'Weiter \\u203a' });
    nav.appendChild(prev); nav.appendChild(mitte); nav.appendChild(next);
    host.appendChild(nav);

    var idx = 0, shown = 1, fertig = false;
    function fit() { inner.style.transform = 'scale(' + (stage.clientWidth / 960) + ')'; }
    window.addEventListener('resize', fit);

    function render() {
      var slide = slides[idx], sl = slots(slide), nacheinander = slide.einblenden === 'nacheinander';
      inner.innerHTML = '';
      inner.style.background = slide.hintergrund || '#ffffff';
      var farbe = dunkel(slide.hintergrund) ? '#f8fafc' : '#1e293b';
      sl.forEach(function (slot, i) {
        var e = slide.elemente[slot.key];
        var box = el('div', { className: 'mbk-ss__el' + ((nacheinander && i >= shown) ? ' is-hidden' : '') });
        box.style.left = slot.box.left + 'px'; box.style.top = slot.box.top + 'px';
        box.style.width = slot.box.width + 'px'; box.style.height = slot.box.height + 'px';
        if (slot.art === 'bild') {
          box.appendChild(el('img', { src: e.url, alt: '' }));
        } else {
          var t = el('div', { className: 'mbk-ss__text', html: clean(e.html) });
          t.style.fontSize = (MBK_SS_GROESSEN[slot.groesse] || 22) + 'px';
          t.style.fontWeight = slot.fett ? '700' : '400';
          t.style.textAlign = slot.align || 'left';
          t.style.color = farbe;
          box.appendChild(t);
        }
        inner.appendChild(box);
      });
      mitte.innerHTML = '';
      for (var d = 0; d < slides.length; d++) mitte.appendChild(el('span', { className: 'mbk-ss__dot' + (d === idx ? ' is-active' : '') }));
      counter.textContent = ' ' + (idx + 1) + ' / ' + slides.length;
      mitte.appendChild(counter);
      prev.disabled = idx === 0;
      var ende = idx === slides.length - 1 && (!nacheinander || shown >= sl.length);
      next.textContent = ende ? '\\u2713 Fertig' : 'Weiter \\u203a';
      next.disabled = fertig;
      fit();
    }

    next.addEventListener('click', function () {
      var slide = slides[idx], sl = slots(slide);
      if (slide.einblenden === 'nacheinander' && shown < sl.length) { shown += 1; render(); return; }
      if (idx < slides.length - 1) { idx += 1; shown = 1; render(); return; }
      fertig = true;
      render();
      host.appendChild(el('div', { className: 'mbk-sm__done-banner', text: '\\u2705 Slideshow angesehen.' }));
      scorm.setScore(1);
      scorm.setCompleted();
    });
    prev.addEventListener('click', function () {
      if (idx === 0) return;
      idx -= 1; shown = 99; render();
    });

    render();
  });
`;