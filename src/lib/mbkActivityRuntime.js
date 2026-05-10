/**
 * mbkActivityRuntime.js
 *
 * Die Activity-Runtime ist eine STATISCHE, EINMAL GESCHRIEBENE JS+CSS-
 * Bibliothek, die in jedes SCORM-ZIP gepackt wird. Sie verwandelt
 * deklarative `data-mbk-activity="…"`-Container in interaktive
 * Schüler-Aktivitäten (Lückentext-Drag&Drop, Quiz-Feedback, …).
 *
 * Designprinzip:
 *   - Die KI (Generator 2) erfindet KEINE Interaktivität. Sie produziert
 *     nur leere Container mit `data-mbk-activity` + `data-mbk-config='{…}'`.
 *   - Die Runtime macht den Rest: Drag&Drop, Live-Check, Score-Anzeige,
 *     Flow-Steuerung, Persistenz im localStorage.
 *
 * Diese Datei exportiert die beiden Quelltexte als String-Konstanten,
 * damit:
 *   - die Versionierung der Runtime im Source-Tree liegt,
 *   - der ZIP-Builder sie als statische Dateien in jedes Paket legt,
 *   - die Air-Gap-Welt sie über ein Meta-Tag versioniert kennt.
 *
 * Aktivitäts-Typen (Version 0.1.0):
 *   - lueckentext   → Drag&Drop, alle Lücken müssen richtig sein
 *
 * Weitere Typen werden in folgenden Iterationen ergänzt (Miniquiz,
 * MultipleChoice, Sortieren, Begriffe zuordnen, Bildbeschriftung,
 * Link/URL, Video, Audio, Text lesen, Lehrwerk, Bestätigen, KI-Tutor,
 * KI-Check). Jeder neue Typ ist ein Plugin in derselben Runtime.
 */

export const MBK_ACTIVITY_RUNTIME_VERSION = '0.1.0';

// ─────────────────────────────────────────────────────────────────────────
//  CSS — Visuelle Sprache der Runtime. Reine Klassen-Selektoren, keine
//  IDs, keine !important. Alles ist scoped unter .mbk-activity, damit die
//  Runtime weder das umgebende SCORM-Theme noch andere Aufgaben zerstört.
// ─────────────────────────────────────────────────────────────────────────
export const MBK_ACTIVITY_RUNTIME_CSS = `/* mbk-activity-runtime ${MBK_ACTIVITY_RUNTIME_VERSION} */
.mbk-activity {
  --mbk-accent: #2563eb;
  --mbk-accent-soft: #dbeafe;
  --mbk-success: #16a34a;
  --mbk-success-soft: #dcfce7;
  --mbk-danger: #dc2626;
  --mbk-danger-soft: #fee2e2;
  --mbk-muted: #64748b;
  --mbk-border: #e2e8f0;
  --mbk-bg: #f8fafc;
  font-family: inherit;
  color: inherit;
  margin: 1rem 0;
}
.mbk-activity__loading {
  padding: 1rem;
  text-align: center;
  color: var(--mbk-muted);
  font-style: italic;
}
.mbk-activity__error {
  padding: 1rem;
  border: 1px dashed var(--mbk-danger);
  background: var(--mbk-danger-soft);
  border-radius: 0.5rem;
  color: var(--mbk-danger);
  font-size: 0.875rem;
}

/* ── Lückentext ──────────────────────────────────────────── */
.mbk-lt__instruction {
  margin: 0 0 0.75rem 0;
  font-weight: 500;
}
.mbk-lt__text {
  background: var(--mbk-bg);
  border: 1px solid var(--mbk-border);
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
  line-height: 2;
  font-size: 1rem;
}
.mbk-lt__gap {
  display: inline-block;
  min-width: 6.5rem;
  min-height: 1.75rem;
  padding: 0.15rem 0.6rem;
  margin: 0 0.15rem;
  background: #fff;
  border: 2px dashed var(--mbk-accent);
  border-radius: 0.4rem;
  vertical-align: middle;
  font-weight: 600;
  text-align: center;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.mbk-lt__gap.is-over {
  background: var(--mbk-accent-soft);
  border-style: solid;
}
.mbk-lt__gap.is-filled {
  border-style: solid;
  border-color: var(--mbk-muted);
  background: #fff;
}
.mbk-lt__gap.is-correct {
  border-color: var(--mbk-success);
  background: var(--mbk-success-soft);
  color: var(--mbk-success);
  cursor: default;
}
.mbk-lt__gap.is-wrong {
  border-color: var(--mbk-danger);
  background: var(--mbk-danger-soft);
  color: var(--mbk-danger);
}
.mbk-lt__gap.is-hint-wrong {
  animation: mbk-shake 0.3s ease-in-out;
}
@keyframes mbk-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
.mbk-lt__pool {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.mbk-lt__pool-label {
  width: 100%;
  font-size: 0.85rem;
  color: var(--mbk-muted);
  margin-bottom: 0.25rem;
}
.mbk-lt__chip {
  display: inline-block;
  padding: 0.4rem 0.85rem;
  background: #fff;
  border: 1px solid var(--mbk-border);
  border-radius: 999px;
  font-weight: 500;
  cursor: grab;
  user-select: none;
  transition: transform 0.1s, box-shadow 0.1s;
}
.mbk-lt__chip:hover {
  box-shadow: 0 2px 4px rgba(0,0,0,0.08);
}
.mbk-lt__chip.is-dragging {
  opacity: 0.5;
  cursor: grabbing;
}
.mbk-lt__chip.is-used {
  opacity: 0.3;
  pointer-events: none;
  text-decoration: line-through;
}
.mbk-lt__status {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.875rem;
}
.mbk-lt__status-text {
  color: var(--mbk-muted);
}
.mbk-lt__status-text.is-done {
  color: var(--mbk-success);
  font-weight: 600;
}
.mbk-lt__actions {
  display: flex;
  gap: 0.5rem;
}
.mbk-btn {
  display: inline-block;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--mbk-border);
  background: #fff;
  border-radius: 0.4rem;
  font-size: 0.875rem;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  transition: background 0.15s;
}
.mbk-btn:hover:not(:disabled) {
  background: var(--mbk-bg);
}
.mbk-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.mbk-btn--primary {
  background: var(--mbk-accent);
  color: #fff;
  border-color: var(--mbk-accent);
}
.mbk-btn--primary:hover:not(:disabled) {
  background: #1d4ed8;
}
.mbk-lt__done-banner {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: var(--mbk-success-soft);
  border: 1px solid var(--mbk-success);
  color: var(--mbk-success);
  border-radius: 0.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
`;

// ─────────────────────────────────────────────────────────────────────────
//  JS — Plugin-Architektur. Pro Aktivitäts-Typ ein Initialisierer.
//  Beim DOMContentLoaded sucht die Runtime alle `[data-mbk-activity]` und
//  ruft den passenden Initialisierer auf.
// ─────────────────────────────────────────────────────────────────────────
export const MBK_ACTIVITY_RUNTIME_JS = `/* mbk-activity-runtime ${MBK_ACTIVITY_RUNTIME_VERSION} */
(function () {
  'use strict';

  // ── Hilfsfunktionen ───────────────────────────────────────
  function normalizeAnswer(s) {
    return String(s == null ? '' : s)
      .trim()
      .toLocaleLowerCase('de-DE')
      .replace(/\\s+/g, ' ');
  }
  function el(tag, props, children) {
    var e = document.createElement(tag);
    if (props) {
      for (var k in props) {
        if (k === 'className') e.className = props[k];
        else if (k === 'dataset') {
          for (var dk in props.dataset) e.dataset[dk] = props.dataset[dk];
        } else if (k === 'text') e.textContent = props[k];
        else if (k === 'html') e.innerHTML = props[k];
        else e.setAttribute(k, props[k]);
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c == null) continue;
        e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return e;
  }

  // ── SCORM-Bridge (best effort, optional) ─────────────────
  // Sucht eine SCORM-1.2- oder 2004-API im Window-Baum. Wenn nichts da
  // ist, wird der Score lokal nur angezeigt — kein Hard-Fail.
  var scorm = (function () {
    function findApi(win) {
      var depth = 0;
      while (win && depth < 7) {
        if (win.API) return { v: '1.2', api: win.API };
        if (win.API_1484_11) return { v: '2004', api: win.API_1484_11 };
        if (win.parent === win) break;
        win = win.parent;
        depth += 1;
      }
      return null;
    }
    var found = null;
    try {
      found = findApi(window) || (window.opener ? findApi(window.opener) : null);
    } catch (e) { found = null; }
    var initialized = false;
    function init() {
      if (!found || initialized) return;
      try {
        if (found.v === '1.2') found.api.LMSInitialize('');
        else found.api.Initialize('');
        initialized = true;
      } catch (e) {}
    }
    function setScore(scaled) {
      if (!found) return;
      init();
      try {
        if (found.v === '1.2') {
          var pct = Math.round(Math.max(0, Math.min(1, scaled)) * 100);
          found.api.LMSSetValue('cmi.core.score.raw', String(pct));
          found.api.LMSSetValue('cmi.core.score.min', '0');
          found.api.LMSSetValue('cmi.core.score.max', '100');
          found.api.LMSSetValue('cmi.core.lesson_status', scaled >= 0.5 ? 'passed' : 'failed');
          found.api.LMSCommit('');
        } else {
          found.api.SetValue('cmi.score.scaled', String(scaled));
          found.api.SetValue('cmi.completion_status', 'completed');
          found.api.SetValue('cmi.success_status', scaled >= 0.5 ? 'passed' : 'failed');
          found.api.Commit('');
        }
      } catch (e) {}
    }
    function setCompleted() {
      if (!found) return;
      init();
      try {
        if (found.v === '1.2') {
          found.api.LMSSetValue('cmi.core.lesson_status', 'completed');
          found.api.LMSCommit('');
        } else {
          found.api.SetValue('cmi.completion_status', 'completed');
          found.api.Commit('');
        }
      } catch (e) {}
    }
    return { setScore: setScore, setCompleted: setCompleted, available: !!found };
  })();

  // ── Plugin-Registry ──────────────────────────────────────
  var plugins = {};
  function registerPlugin(name, init) { plugins[name] = init; }

  function parseConfig(host) {
    var raw = host.getAttribute('data-mbk-config') || '';
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch (e) {
      try {
        var decoded = host.dataset.mbkConfig || raw;
        return JSON.parse(decoded);
      } catch (e2) { return null; }
    }
  }

  function boot() {
    var hosts = document.querySelectorAll('[data-mbk-activity]');
    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i];
      var type = host.getAttribute('data-mbk-activity');
      var plugin = plugins[type];
      if (!plugin) {
        host.innerHTML = '<div class="mbk-activity__error">Unbekannter Aktivit\\u00e4ts-Typ: ' + type + '</div>';
        continue;
      }
      var config = parseConfig(host);
      if (config == null) {
        host.innerHTML = '<div class="mbk-activity__error">Aktivit\\u00e4t hat keine g\\u00fcltige Konfiguration.</div>';
        continue;
      }
      try { plugin(host, config); }
      catch (e) {
        host.innerHTML = '<div class="mbk-activity__error">Fehler beim Laden: ' + (e && e.message ? e.message : e) + '</div>';
      }
    }
  }

  // ── Plugin: Lückentext ───────────────────────────────────
  //
  // Erwartetes Config-Schema:
  //   {
  //     "instruction": "Fülle die Lücken …",          // optional
  //     "segments": [
  //       { "type": "text", "value": "Bei der relativen " },
  //       { "type": "gap",  "answer": "Häufigkeit" },
  //       { "type": "text", "value": " vergleicht man …" }
  //     ],
  //     "distractors": ["Studio"]                       // optional
  //   }
  //
  // - Schüler zieht Chips aus dem Pool in die Lücken (Drag&Drop ODER Klick).
  // - Pro Lücke wird sofort geprüft; falsche Antworten färben sich rot,
  //   richtige grün und werden gelockt.
  // - Live-Counter "X von Y noch falsch/leer".
  // - Button "Falsche markieren" hebt falsche kurz hervor (Hilfsfunktion).
  // - Wenn alle Lücken richtig → Done-Banner + SCORM-Completion.
  registerPlugin('lueckentext', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');

    var segments = Array.isArray(config.segments) ? config.segments : [];
    var distractors = Array.isArray(config.distractors) ? config.distractors : [];
    var gaps = [];
    for (var i = 0; i < segments.length; i++) {
      if (segments[i] && segments[i].type === 'gap') gaps.push({ idx: i, answer: segments[i].answer });
    }
    if (gaps.length === 0) {
      host.innerHTML = '<div class="mbk-activity__error">L\\u00fcckentext ohne L\\u00fccken — bitte Daten pr\\u00fcfen.</div>';
      return;
    }

    // Instruction
    if (config.instruction) {
      host.appendChild(el('p', { className: 'mbk-lt__instruction', text: config.instruction }));
    }

    // Text-Bereich
    var textBox = el('div', { className: 'mbk-lt__text' });
    var gapNodes = [];
    for (var s = 0; s < segments.length; s++) {
      var seg = segments[s];
      if (seg.type === 'text') {
        textBox.appendChild(document.createTextNode(seg.value || ''));
      } else if (seg.type === 'gap') {
        var gIdx = gapNodes.length;
        var gNode = el('span', {
          className: 'mbk-lt__gap',
          dataset: { gapIndex: String(gIdx), answer: seg.answer || '' },
          text: '\\u00a0',
        });
        gapNodes.push(gNode);
        textBox.appendChild(gNode);
      }
    }
    host.appendChild(textBox);

    // Pool
    var poolWrap = el('div', { className: 'mbk-lt__pool' });
    poolWrap.appendChild(el('div', { className: 'mbk-lt__pool-label', text: 'Wortliste' }));
    var poolWords = [];
    for (var g = 0; g < gaps.length; g++) poolWords.push(gaps[g].answer);
    for (var d = 0; d < distractors.length; d++) poolWords.push(distractors[d]);
    // Deterministische Shuffle: gleicher Seed → gleicher Output.
    // Wir nutzen die Position im Original-Array als Tiebreaker, damit die
    // Schüler-Erfahrung stabil ist (kein neues Mischen bei Reload).
    var seed = 0;
    for (var x = 0; x < poolWords.length; x++) {
      var w = poolWords[x];
      for (var c = 0; c < w.length; c++) seed = (seed * 31 + w.charCodeAt(c)) & 0xffffffff;
    }
    function rng() { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return ((seed >>> 0) % 1000) / 1000; }
    poolWords = poolWords.map(function (w, i) { return { w: w, k: rng() + i * 0.0001 }; })
      .sort(function (a, b) { return a.k - b.k; })
      .map(function (o) { return o.w; });

    var chipNodes = [];
    for (var p = 0; p < poolWords.length; p++) {
      var chip = el('span', {
        className: 'mbk-lt__chip',
        dataset: { word: poolWords[p] },
        text: poolWords[p],
        draggable: 'true',
      });
      chipNodes.push(chip);
      poolWrap.appendChild(chip);
    }
    host.appendChild(poolWrap);

    // Status + Aktionen
    var statusRow = el('div', { className: 'mbk-lt__status' });
    var statusText = el('span', { className: 'mbk-lt__status-text', text: '' });
    var actions = el('div', { className: 'mbk-lt__actions' });
    var hintBtn = el('button', { className: 'mbk-btn', text: 'Falsche markieren', type: 'button' });
    var resetBtn = el('button', { className: 'mbk-btn', text: 'Zur\\u00fccksetzen', type: 'button' });
    actions.appendChild(hintBtn);
    actions.appendChild(resetBtn);
    statusRow.appendChild(statusText);
    statusRow.appendChild(actions);
    host.appendChild(statusRow);

    var doneBanner = null;

    // ── State: pro Gap-Index der eingefüllte String (oder null). ──
    var filled = gaps.map(function () { return null; });

    function refreshChips() {
      for (var i = 0; i < chipNodes.length; i++) {
        var w = chipNodes[i].dataset.word;
        // Ein Chip ist "verbraucht", wenn ein passender Gap ihn als
        // korrekt akzeptiert hat. Wir zählen die noch benötigten
        // Verwendungen, weil Antworten doppelt vorkommen können.
        var neededCount = 0, usedCount = 0;
        for (var g = 0; g < gaps.length; g++) {
          if (normalizeAnswer(gaps[g].answer) === normalizeAnswer(w)) {
            neededCount += 1;
            if (gapNodes[g].classList.contains('is-correct')) usedCount += 1;
          }
        }
        chipNodes[i].classList.toggle('is-used', neededCount > 0 && usedCount >= neededCount);
      }
    }

    function updateStatus() {
      var correct = 0, wrong = 0, empty = 0;
      for (var g = 0; g < gaps.length; g++) {
        if (gapNodes[g].classList.contains('is-correct')) correct += 1;
        else if (gapNodes[g].classList.contains('is-wrong')) wrong += 1;
        else empty += 1;
      }
      if (correct === gaps.length) {
        statusText.textContent = 'Super, alle ' + gaps.length + ' L\\u00fccken sind richtig!';
        statusText.classList.add('is-done');
        if (!doneBanner) {
          doneBanner = el('div', { className: 'mbk-lt__done-banner', text: '\\u2705 Aufgabe abgeschlossen.' });
          host.appendChild(doneBanner);
          scorm.setScore(1);
          scorm.setCompleted();
        }
        hintBtn.disabled = true;
      } else {
        statusText.classList.remove('is-done');
        var parts = [];
        if (wrong > 0) parts.push(wrong + ' falsch');
        if (empty > 0) parts.push(empty + ' noch leer');
        statusText.textContent = parts.length > 0
          ? 'Noch ' + parts.join(', ') + '.'
          : 'Bearbeite alle L\\u00fccken.';
        if (doneBanner) { doneBanner.remove(); doneBanner = null; }
        hintBtn.disabled = wrong === 0;
      }
      refreshChips();
    }

    function placeIntoGap(gapIndex, word) {
      var gNode = gapNodes[gapIndex];
      if (gNode.classList.contains('is-correct')) return; // gesperrt
      var expected = gNode.dataset.answer;
      var isRight = normalizeAnswer(expected) === normalizeAnswer(word);
      gNode.textContent = word;
      gNode.classList.remove('is-over');
      gNode.classList.add('is-filled');
      gNode.classList.toggle('is-correct', isRight);
      gNode.classList.toggle('is-wrong', !isRight);
      filled[gapIndex] = word;
      updateStatus();
    }

    function clearGap(gapIndex) {
      var gNode = gapNodes[gapIndex];
      if (gNode.classList.contains('is-correct')) return;
      gNode.textContent = '\\u00a0';
      gNode.classList.remove('is-filled', 'is-wrong');
      filled[gapIndex] = null;
      updateStatus();
    }

    // ── Drag&Drop (Desktop) ───────────────────────────────
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
      // Klick-Alternative: tap Chip → tap Gap.
      chip.addEventListener('click', function () {
        if (chip.classList.contains('is-used')) return;
        // Erste leere oder falsche Lücke füllen.
        for (var g = 0; g < gapNodes.length; g++) {
          if (!gapNodes[g].classList.contains('is-correct')) {
            placeIntoGap(g, chip.dataset.word);
            return;
          }
        }
      });
    });
    gapNodes.forEach(function (gNode, idx) {
      gNode.addEventListener('dragover', function (ev) {
        if (gNode.classList.contains('is-correct')) return;
        ev.preventDefault();
        gNode.classList.add('is-over');
      });
      gNode.addEventListener('dragleave', function () {
        gNode.classList.remove('is-over');
      });
      gNode.addEventListener('drop', function (ev) {
        ev.preventDefault();
        if (gNode.classList.contains('is-correct')) return;
        var w = draggedWord;
        if (!w) { try { w = ev.dataTransfer.getData('text/plain'); } catch (e) {} }
        if (!w) return;
        placeIntoGap(idx, w);
      });
      gNode.addEventListener('click', function () {
        if (gNode.classList.contains('is-correct')) return;
        // Klick auf gefüllte (falsche) Lücke leert sie.
        if (gNode.classList.contains('is-filled')) clearGap(idx);
      });
    });

    // ── Aktionen ─────────────────────────────────────────
    hintBtn.addEventListener('click', function () {
      gapNodes.forEach(function (gNode) {
        if (gNode.classList.contains('is-wrong')) {
          gNode.classList.add('is-hint-wrong');
          setTimeout(function () { gNode.classList.remove('is-hint-wrong'); }, 600);
        }
      });
    });
    resetBtn.addEventListener('click', function () {
      gapNodes.forEach(function (gNode, i) {
        gNode.textContent = '\\u00a0';
        gNode.classList.remove('is-filled', 'is-correct', 'is-wrong');
        filled[i] = null;
      });
      if (doneBanner) { doneBanner.remove(); doneBanner = null; }
      updateStatus();
    });

    updateStatus();
  });

  // ── Boot ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
`;

/**
 * Liefert die beiden Runtime-Dateien als Array `{filename, content}`,
 * damit der ZIP-Builder sie 1:1 ins SCORM-Paket legen kann.
 */
export function getActivityRuntimeFiles() {
  return [
    { filename: 'mbk-activity-runtime.js', content: MBK_ACTIVITY_RUNTIME_JS },
    { filename: 'mbk-activity-runtime.css', content: MBK_ACTIVITY_RUNTIME_CSS },
  ];
}