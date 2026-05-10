/**
 * plugin_sortable.js
 *
 * Plugin "sortable" (Reihenfolge / Sortierung) für die Activity-Runtime.
 *
 * Exportiert die CSS- und JS-Snippets als String — sie werden in
 * `lib/mbkActivityRuntime.js` zur Gesamt-Runtime zusammengefügt und in
 * jedes SCORM-ZIP gelegt.
 *
 * Erwartetes Config-Schema:
 *   {
 *     "instruction": "Sortiere die Schritte in die richtige Reihenfolge.",
 *     "items": ["Erster Schritt", "Zweiter Schritt", "Dritter Schritt"]
 *     // Reihenfolge im Array = KORREKTE Reihenfolge
 *   }
 *
 * UI: Vertikale Liste mit Drag-Handles. Schüler ordnet die Karten neu an.
 * Live-Check pro Position; richtige Positionen werden grün eingerastet,
 * falsche rot markiert. Wenn alle Positionen stimmen → Done-Banner + SCORM.
 */

export const PLUGIN_SORTABLE_CSS = `/* ── Reihenfolge / Sortierung ──────────────────────────────── */
.mbk-srt__instruction {
  margin: 0 0 0.75rem 0;
  font-weight: 500;
}
.mbk-srt__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: var(--mbk-bg);
  border: 1px solid var(--mbk-border);
  border-radius: 0.5rem;
  padding: 0.75rem;
}
.mbk-srt__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  background: #fff;
  border: 2px solid var(--mbk-border);
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: grab;
  user-select: none;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}
.mbk-srt__item:hover {
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.mbk-srt__item.is-dragging {
  opacity: 0.6;
  cursor: grabbing;
  transform: scale(1.01);
}
.mbk-srt__item.is-over-before {
  border-top-color: var(--mbk-accent);
  border-top-width: 4px;
}
.mbk-srt__item.is-over-after {
  border-bottom-color: var(--mbk-accent);
  border-bottom-width: 4px;
}
.mbk-srt__item.is-correct {
  border-color: var(--mbk-success);
  background: var(--mbk-success-soft);
  color: var(--mbk-success);
  cursor: default;
}
.mbk-srt__item.is-wrong {
  border-color: var(--mbk-danger);
  background: var(--mbk-danger-soft);
  color: var(--mbk-danger);
}
.mbk-srt__handle {
  color: var(--mbk-muted);
  font-size: 1.1rem;
  flex-shrink: 0;
}
.mbk-srt__num {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  background: var(--mbk-bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--mbk-muted);
  flex-shrink: 0;
}
.mbk-srt__item.is-correct .mbk-srt__num {
  background: #fff;
  color: var(--mbk-success);
}
.mbk-srt__label {
  flex: 1;
  font-weight: 500;
}
.mbk-srt__actions {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.875rem;
}
.mbk-srt__status {
  color: var(--mbk-muted);
}
.mbk-srt__status.is-done {
  color: var(--mbk-success);
  font-weight: 600;
}
.mbk-srt__btns {
  display: flex;
  gap: 0.5rem;
}
.mbk-srt__done-banner {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: var(--mbk-success-soft);
  border: 1px solid var(--mbk-success);
  color: var(--mbk-success);
  border-radius: 0.5rem;
  font-weight: 600;
}
`;

export const PLUGIN_SORTABLE_JS = `
  // ── Plugin: Reihenfolge / Sortierung ─────────────────────
  registerPlugin('sortable', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');

    var items = Array.isArray(config.items) ? config.items.filter(Boolean) : [];
    if (items.length < 2) {
      host.innerHTML = '<div class="mbk-activity__error">Sortierung braucht mindestens 2 Elemente.</div>';
      return;
    }

    if (config.instruction) {
      host.appendChild(el('p', { className: 'mbk-srt__instruction', text: config.instruction }));
    }

    // Deterministische Start-Reihenfolge (gemischt, aber stabil über Reloads).
    var indices = items.map(function (_, i) { return i; });
    var seed = 0;
    for (var i = 0; i < items.length; i++) {
      var w = items[i];
      for (var c = 0; c < w.length; c++) seed = (seed * 31 + w.charCodeAt(c)) & 0xffffffff;
    }
    function rng() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return ((seed >>> 0) % 1000) / 1000; }
    indices = indices.map(function (idx, i) { return { idx: idx, k: rng() + i * 0.0001 }; })
      .sort(function (a, b) { return a.k - b.k; })
      .map(function (o) { return o.idx; });
    // Falls Zufall = Original-Order: drehe das erste mit dem letzten Element.
    if (indices.every(function (v, i) { return v === i; })) {
      var tmp = indices[0]; indices[0] = indices[indices.length - 1]; indices[indices.length - 1] = tmp;
    }

    var list = el('div', { className: 'mbk-srt__list' });
    host.appendChild(list);

    function buildNodes() {
      list.innerHTML = '';
      indices.forEach(function (origIdx, pos) {
        var node = el('div', {
          className: 'mbk-srt__item',
          dataset: { origIndex: String(origIdx), pos: String(pos) },
          draggable: 'true',
        });
        node.appendChild(el('span', { className: 'mbk-srt__handle', text: '\\u2630' }));
        node.appendChild(el('span', { className: 'mbk-srt__num', text: String(pos + 1) }));
        node.appendChild(el('span', { className: 'mbk-srt__label', text: items[origIdx] }));
        list.appendChild(node);
      });
      wireDnd();
      updateCheck();
    }

    var statusRow = el('div', { className: 'mbk-srt__actions' });
    var statusText = el('span', { className: 'mbk-srt__status', text: '' });
    var btns = el('div', { className: 'mbk-srt__btns' });
    var resetBtn = el('button', { className: 'mbk-btn', text: 'Zur\\u00fccksetzen', type: 'button' });
    btns.appendChild(resetBtn);
    statusRow.appendChild(statusText);
    statusRow.appendChild(btns);
    host.appendChild(statusRow);

    var doneBanner = null;

    function updateCheck() {
      var nodes = list.querySelectorAll('.mbk-srt__item');
      var correct = 0;
      nodes.forEach(function (node, pos) {
        var origIdx = parseInt(node.dataset.origIndex, 10);
        var isRight = origIdx === pos;
        node.classList.toggle('is-correct', isRight);
        node.classList.toggle('is-wrong', !isRight);
        node.setAttribute('draggable', isRight ? 'false' : 'true');
        if (isRight) correct += 1;
      });
      if (correct === indices.length) {
        statusText.textContent = 'Super, alle ' + indices.length + ' Schritte sind richtig sortiert!';
        statusText.classList.add('is-done');
        if (!doneBanner) {
          doneBanner = el('div', { className: 'mbk-srt__done-banner', text: '\\u2705 Aufgabe abgeschlossen.' });
          host.appendChild(doneBanner);
          scorm.setScore(1);
          scorm.setCompleted();
        }
      } else {
        statusText.classList.remove('is-done');
        statusText.textContent = 'Ziehe die Karten in die richtige Reihenfolge.';
        if (doneBanner) { doneBanner.remove(); doneBanner = null; }
      }
    }

    function wireDnd() {
      var nodes = Array.prototype.slice.call(list.querySelectorAll('.mbk-srt__item'));
      var draggedNode = null;

      nodes.forEach(function (node) {
        node.addEventListener('dragstart', function () {
          if (node.classList.contains('is-correct')) return;
          draggedNode = node;
          node.classList.add('is-dragging');
        });
        node.addEventListener('dragend', function () {
          if (draggedNode) draggedNode.classList.remove('is-dragging');
          draggedNode = null;
          nodes.forEach(function (n) { n.classList.remove('is-over-before', 'is-over-after'); });
        });
        node.addEventListener('dragover', function (ev) {
          if (!draggedNode || draggedNode === node) return;
          ev.preventDefault();
          var rect = node.getBoundingClientRect();
          var before = (ev.clientY - rect.top) < rect.height / 2;
          nodes.forEach(function (n) { n.classList.remove('is-over-before', 'is-over-after'); });
          node.classList.add(before ? 'is-over-before' : 'is-over-after');
        });
        node.addEventListener('drop', function (ev) {
          ev.preventDefault();
          if (!draggedNode || draggedNode === node) return;
          var rect = node.getBoundingClientRect();
          var before = (ev.clientY - rect.top) < rect.height / 2;

          var fromPos = parseInt(draggedNode.dataset.pos, 10);
          var toPos = parseInt(node.dataset.pos, 10);
          var moved = indices.splice(fromPos, 1)[0];
          var insertAt = toPos;
          if (fromPos < toPos) insertAt = toPos - 1;
          if (!before) insertAt += 1;
          indices.splice(insertAt, 0, moved);
          buildNodes();
        });
      });
    }

    resetBtn.addEventListener('click', function () {
      indices = items.map(function (_, i) { return i; });
      // Reset = gleiche deterministische Mischung wie Initial.
      var s = seed;
      indices = indices.map(function (idx, i) {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return { idx: idx, k: ((s >>> 0) % 1000) / 1000 + i * 0.0001 };
      }).sort(function (a, b) { return a.k - b.k; }).map(function (o) { return o.idx; });
      if (indices.every(function (v, i) { return v === i; })) {
        var tmp = indices[0]; indices[0] = indices[indices.length - 1]; indices[indices.length - 1] = tmp;
      }
      if (doneBanner) { doneBanner.remove(); doneBanner = null; }
      buildNodes();
    });

    buildNodes();
  });
`;