/**
 * plugin_image_labeling.js
 *
 * Plugin "image_labeling" (Bildbeschriftung).
 *
 *   {
 *     "instruction": "Beschrifte das Bild.",
 *     "imageUrl": "https://…",
 *     "imageAlt": "Tierzelle im Querschnitt",        // optional
 *     "zones": [
 *       {
 *         "label": "Mitochondrium",
 *         "x_percent": 42, "y_percent": 31,
 *         "width": 150, "height": 50              // in px (Editor-Maß)
 *       }
 *     ],
 *     "distractors": ["Vakuole"]
 *   }
 *
 * Schüler zieht Begriffe aus dem Pool unten in die Drop-Zonen über dem
 * Bild (oder klickt: Begriff antippen → erste freie Zone). Pro Zone
 * sofortige Prüfung. Wenn alle Zonen korrekt → Done-Banner + SCORM.
 */

export const PLUGIN_IMAGE_LABELING_CSS = `/* ── Bildbeschriftung ─────────────────────────────────────── */
.mbk-il__instruction {
  margin: 0 0 0.75rem 0;
  font-weight: 500;
}
.mbk-il__stage {
  position: relative;
  display: inline-block;
  max-width: 100%;
  background: var(--mbk-bg);
  border: 1px solid var(--mbk-border);
  border-radius: 0.5rem;
  padding: 0.5rem;
}
.mbk-il__img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 0.4rem;
  user-select: none;
  -webkit-user-drag: none;
}
.mbk-il__zone {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.4rem;
  border: 2px dashed var(--mbk-accent);
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(2px);
  font-weight: 600;
  font-size: 0.85rem;
  text-align: center;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.mbk-il__zone.is-over {
  background: var(--mbk-accent-soft);
  border-style: solid;
}
.mbk-il__zone.is-filled {
  border-style: solid;
  border-color: var(--mbk-muted);
}
.mbk-il__zone.is-correct {
  border-color: var(--mbk-success);
  background: var(--mbk-success-soft);
  color: var(--mbk-success);
  cursor: default;
}
.mbk-il__zone.is-wrong {
  border-color: var(--mbk-danger);
  background: var(--mbk-danger-soft);
  color: var(--mbk-danger);
}
.mbk-il__pool {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.mbk-il__chip {
  display: inline-block;
  padding: 0.4rem 0.85rem;
  background: #fff;
  border: 1px solid var(--mbk-border);
  border-radius: 0.4rem;
  font-weight: 500;
  cursor: grab;
  user-select: none;
}
.mbk-il__chip.is-dragging { opacity: 0.5; cursor: grabbing; }
.mbk-il__chip.is-used { opacity: 0.3; pointer-events: none; text-decoration: line-through; }
.mbk-il__actions {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.875rem;
}
.mbk-il__status { color: var(--mbk-muted); }
.mbk-il__status.is-done { color: var(--mbk-success); font-weight: 600; }
.mbk-il__btns { display: flex; gap: 0.5rem; }
.mbk-il__done-banner {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: var(--mbk-success-soft);
  border: 1px solid var(--mbk-success);
  color: var(--mbk-success);
  border-radius: 0.5rem;
  font-weight: 600;
}
`;

export const PLUGIN_IMAGE_LABELING_JS = `
  // ── Plugin: Bildbeschriftung ─────────────────────────────
  registerPlugin('image_labeling', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');

    var imageUrl = config.imageUrl || '';
    var zones = Array.isArray(config.zones) ? config.zones.filter(function (z) { return z && z.label; }) : [];
    var distractors = Array.isArray(config.distractors) ? config.distractors.filter(Boolean) : [];

    if (!imageUrl) {
      host.innerHTML = '<div class="mbk-activity__error">Kein Bild definiert.</div>';
      return;
    }
    if (zones.length === 0) {
      host.innerHTML = '<div class="mbk-activity__error">Keine Drop-Zonen definiert.</div>';
      return;
    }

    if (config.instruction) {
      host.appendChild(el('p', { className: 'mbk-il__instruction', text: config.instruction }));
    }

    var stage = el('div', { className: 'mbk-il__stage' });
    var img = el('img', {
      className: 'mbk-il__img',
      src: imageUrl,
      alt: config.imageAlt || 'Bildbeschriftung',
      draggable: 'false',
    });
    stage.appendChild(img);

    var zoneNodes = zones.map(function (z) {
      var node = el('div', {
        className: 'mbk-il__zone',
        dataset: { answer: z.label },
        text: '',
      });
      node.style.left = (z.x_percent != null ? z.x_percent : 50) + '%';
      node.style.top = (z.y_percent != null ? z.y_percent : 50) + '%';
      node.style.width = (z.width || 150) + 'px';
      node.style.height = (z.height || 50) + 'px';
      stage.appendChild(node);
      return node;
    });
    host.appendChild(stage);

    var pool = el('div', { className: 'mbk-il__pool' });
    var poolWords = zones.map(function (z) { return z.label; }).concat(distractors);
    var seed = 0;
    for (var i = 0; i < poolWords.length; i++) {
      var w = poolWords[i];
      for (var c = 0; c < w.length; c++) seed = (seed * 31 + w.charCodeAt(c)) & 0xffffffff;
    }
    function rng() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return ((seed >>> 0) % 1000) / 1000; }
    poolWords = poolWords.map(function (w, i) { return { w: w, k: rng() + i * 0.0001 }; })
      .sort(function (a, b) { return a.k - b.k; })
      .map(function (o) { return o.w; });

    var chipNodes = poolWords.map(function (w) {
      var chip = el('span', {
        className: 'mbk-il__chip',
        dataset: { word: w },
        text: w,
        draggable: 'true',
      });
      pool.appendChild(chip);
      return chip;
    });
    host.appendChild(pool);

    var statusRow = el('div', { className: 'mbk-il__actions' });
    var statusText = el('span', { className: 'mbk-il__status', text: '' });
    var btns = el('div', { className: 'mbk-il__btns' });
    var resetBtn = el('button', { className: 'mbk-btn', text: 'Zur\\u00fccksetzen', type: 'button' });
    btns.appendChild(resetBtn);
    statusRow.appendChild(statusText);
    statusRow.appendChild(btns);
    host.appendChild(statusRow);

    var doneBanner = null;

    function refreshChips() {
      chipNodes.forEach(function (chip) {
        var w = chip.dataset.word;
        var usedSomewhere = zoneNodes.some(function (zn) {
          return zn.classList.contains('is-correct')
            && normalizeAnswer(zn.dataset.answer) === normalizeAnswer(w);
        });
        chip.classList.toggle('is-used', usedSomewhere);
      });
    }

    function updateStatus() {
      var correct = 0, wrong = 0, empty = 0;
      zoneNodes.forEach(function (zn) {
        if (zn.classList.contains('is-correct')) correct += 1;
        else if (zn.classList.contains('is-wrong')) wrong += 1;
        else empty += 1;
      });
      if (correct === zoneNodes.length) {
        statusText.textContent = 'Super, alle ' + zoneNodes.length + ' Begriffe sitzen richtig!';
        statusText.classList.add('is-done');
        if (!doneBanner) {
          doneBanner = el('div', { className: 'mbk-il__done-banner', text: '\\u2705 Aufgabe abgeschlossen.' });
          host.appendChild(doneBanner);
          scorm.setScore(1);
          scorm.setCompleted();
        }
      } else {
        statusText.classList.remove('is-done');
        var parts = [];
        if (wrong > 0) parts.push(wrong + ' falsch');
        if (empty > 0) parts.push(empty + ' noch leer');
        statusText.textContent = parts.length > 0
          ? 'Noch ' + parts.join(', ') + '.'
          : 'Ziehe die Begriffe auf das Bild.';
        if (doneBanner) { doneBanner.remove(); doneBanner = null; }
      }
      refreshChips();
    }

    function placeIntoZone(zoneIdx, word) {
      var zn = zoneNodes[zoneIdx];
      if (zn.classList.contains('is-correct')) return;
      var expected = zn.dataset.answer;
      var isRight = normalizeAnswer(expected) === normalizeAnswer(word);
      zn.textContent = word;
      zn.classList.remove('is-over');
      zn.classList.add('is-filled');
      zn.classList.toggle('is-correct', isRight);
      zn.classList.toggle('is-wrong', !isRight);
      updateStatus();
    }

    function clearZone(zoneIdx) {
      var zn = zoneNodes[zoneIdx];
      if (zn.classList.contains('is-correct')) return;
      zn.textContent = '';
      zn.classList.remove('is-filled', 'is-wrong');
      updateStatus();
    }

    var draggedWord = null;
    chipNodes.forEach(function (chip) {
      chip.addEventListener('dragstart', function (ev) {
        if (chip.classList.contains('is-used')) { ev.preventDefault(); return; }
        draggedWord = chip.dataset.word;
        chip.classList.add('is-dragging');
        try { ev.dataTransfer.setData('text/plain', draggedWord); } catch (e) {}
        ev.dataTransfer.effectAllowed = 'move';
      });
      chip.addEventListener('dragend', function () {
        draggedWord = null;
        chip.classList.remove('is-dragging');
      });
      chip.addEventListener('click', function () {
        if (chip.classList.contains('is-used')) return;
        for (var z = 0; z < zoneNodes.length; z++) {
          if (!zoneNodes[z].classList.contains('is-correct')) {
            placeIntoZone(z, chip.dataset.word);
            return;
          }
        }
      });
    });
    zoneNodes.forEach(function (zn, idx) {
      zn.addEventListener('dragover', function (ev) {
        if (zn.classList.contains('is-correct')) return;
        ev.preventDefault();
        zn.classList.add('is-over');
      });
      zn.addEventListener('dragleave', function () { zn.classList.remove('is-over'); });
      zn.addEventListener('drop', function (ev) {
        ev.preventDefault();
        if (zn.classList.contains('is-correct')) return;
        var w = draggedWord;
        if (!w) { try { w = ev.dataTransfer.getData('text/plain'); } catch (e) {} }
        if (!w) return;
        placeIntoZone(idx, w);
      });
      zn.addEventListener('click', function () {
        if (zn.classList.contains('is-correct')) return;
        if (zn.classList.contains('is-filled')) clearZone(idx);
      });
    });

    resetBtn.addEventListener('click', function () {
      zoneNodes.forEach(function (zn) {
        zn.textContent = '';
        zn.classList.remove('is-filled', 'is-correct', 'is-wrong');
      });
      if (doneBanner) { doneBanner.remove(); doneBanner = null; }
      updateStatus();
    });

    updateStatus();
  });
`;