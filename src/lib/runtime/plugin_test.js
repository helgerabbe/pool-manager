/**
 * plugin_test.js
 *
 * Plugin "test" — Abschluss-Test mit globalem Scoring.
 *
 *   {
 *     "instruction": "Bearbeite alle Fragen…",
 *     "passingThreshold": 5,         // Punkte ab denen "bestanden"
 *     "passFeedback": "Bestanden!",
 *     "failFeedback": "Bitte erneut versuchen.",
 *     "questions": [
 *       {
 *         "type": "mc",                   // "mc" | "true_false" | "solution_word"
 *         "question": "…",
 *         "points": 2,
 *         "options": [                    // nur für type="mc"
 *           { "text": "…", "isCorrect": true },
 *           { "text": "…", "isCorrect": false }
 *         ],
 *         "correctAnswer": true,           // nur für type="true_false"
 *         "expectedAnswer": "…"           // nur für type="solution_word"
 *       }
 *     ]
 *   }
 *
 * Verhalten:
 *   - Alle Fragen werden gleichzeitig angezeigt; der Schüler beantwortet
 *     sie und klickt am Ende "Test abgeben". Erst dann erfolgt die
 *     Auswertung — kein Feedback pro Frage vorher.
 *   - MC-Fragen: jede Antwort kann genau eine oder mehrere richtige
 *     Optionen haben (analog zum quiz-Plugin).
 *   - Richtig/Falsch-Fragen werden automatisch gegen correctAnswer geprüft.
 *   - Lösungswort-Fragen werden gegen erlaubte Antworten geprüft; mehrere Varianten können mit Semikolon getrennt werden.
 *   - Pass/Fail wird gegen passingThreshold geprüft und in SCORM gemeldet.
 */

export const PLUGIN_TEST_CSS = `/* ── Test (Abschluss-Test mit globalem Score) ──────────────── */
.mbk-test__instruction {
  margin: 0 0 0.75rem 0;
  font-weight: 500;
}
.mbk-test__list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.mbk-test__q {
  background: var(--mbk-bg);
  border: 1px solid var(--mbk-border);
  border-radius: 0.5rem;
  padding: 0.85rem 1rem;
}
.mbk-test__q-head {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.mbk-test__q-num { color: var(--mbk-muted); font-weight: 600; font-size: 0.8rem; }
.mbk-test__q-text { flex: 1; }
.mbk-test__q-points {
  font-size: 0.75rem;
  color: var(--mbk-muted);
  background: #fff;
  padding: 0.05rem 0.45rem;
  border: 1px solid var(--mbk-border);
  border-radius: 0.3rem;
}
.mbk-test__opts {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0.5rem 0;
}
.mbk-test__opt {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  background: #fff;
  border: 1px solid var(--mbk-border);
  border-radius: 0.4rem;
  cursor: pointer;
  user-select: none;
}
.mbk-test__opt.is-checked { border-color: var(--mbk-accent); background: var(--mbk-accent-soft); }
.mbk-test__opt.is-correct { border-color: var(--mbk-success); background: var(--mbk-success-soft); color: var(--mbk-success); }
.mbk-test__opt.is-wrong { border-color: var(--mbk-danger); background: var(--mbk-danger-soft); color: var(--mbk-danger); }
.mbk-test__opt.is-missed { border-color: var(--mbk-success); color: var(--mbk-success); font-style: italic; }
.mbk-test__opt input { margin-top: 0.15rem; accent-color: var(--mbk-accent); }
.mbk-test__textarea {
  width: 100%;
  min-height: 5rem;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--mbk-border);
  border-radius: 0.4rem;
  background: #fff;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
}
.mbk-test__textarea:focus { outline: 2px solid var(--mbk-accent); outline-offset: -1px; }
.mbk-test__expect {
  font-size: 0.8rem;
  color: var(--mbk-muted);
  margin-top: 0.4rem;
  padding: 0.4rem 0.6rem;
  background: #fff;
  border: 1px dashed var(--mbk-border);
  border-radius: 0.35rem;
}
.mbk-test__submit-row {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}
.mbk-test__summary {
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.mbk-test__summary.is-pass {
  background: var(--mbk-success-soft);
  border: 1px solid var(--mbk-success);
  color: var(--mbk-success);
}
.mbk-test__summary.is-fail {
  background: var(--mbk-danger-soft);
  border: 1px solid var(--mbk-danger);
  color: var(--mbk-danger);
}
.mbk-test__summary-score { font-size: 0.95rem; }
.mbk-test__summary-feedback { font-weight: 500; font-size: 0.9rem; }
`;

export const PLUGIN_TEST_JS = `
  // ── Plugin: Test (Abschluss-Test) ────────────────────────
  registerPlugin('test', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');

    var questions = Array.isArray(config.questions) ? config.questions : [];
    questions = questions.filter(function (q) { return q && q.question; });
    if (questions.length === 0) {
      host.innerHTML = '<div class="mbk-activity__error">Keine Test-Fragen definiert.</div>';
      return;
    }

    if (config.instruction) {
      host.appendChild(el('p', { className: 'mbk-test__instruction', text: config.instruction }));
    }

    var list = el('div', { className: 'mbk-test__list' });
    host.appendChild(list);

    var qStates = questions.map(function (q) {
      var type = q.type === 'true_false' || q.type === 'solution_word' || q.type === 'text' ? q.type : 'mc';
      return {
        type: type,
        points: Number(q.points) || 1,
        selected: {},
        textValue: '',
        locked: false,
      };
    });

    var totalPoints = qStates.reduce(function (acc, s) { return acc + s.points; }, 0);
    var threshold = Number(config.passingThreshold) || 0;

    var optRefs = [];

    questions.forEach(function (q, qIdx) {
      var state = qStates[qIdx];
      var card = el('div', { className: 'mbk-test__q' });

      var head = el('div', { className: 'mbk-test__q-head' });
      head.appendChild(el('span', { className: 'mbk-test__q-num', text: 'Frage ' + (qIdx + 1) + '.' }));
      head.appendChild(el('span', { className: 'mbk-test__q-text', text: q.question }));
      head.appendChild(el('span', { className: 'mbk-test__q-points', text: state.points + ' P.' }));
      card.appendChild(head);

      if (state.type === 'mc') {
        var multi = (q.options || []).filter(function (o) { return o && o.isCorrect; }).length > 1;
        var opts = el('div', { className: 'mbk-test__opts' });
        var nodes = [];
        (q.options || []).forEach(function (opt, oIdx) {
          var node = el('label', { className: 'mbk-test__opt' });
          var input = el('input', { type: multi ? 'checkbox' : 'radio', name: 'mbk-test-' + qIdx });
          var lbl = el('span', {}, [opt.text]);
          node.appendChild(input);
          node.appendChild(lbl);
          nodes.push({ node: node, input: input, opt: opt });
          input.addEventListener('change', function () {
            if (state.locked) return;
            if (multi) {
              if (input.checked) state.selected[oIdx] = true;
              else delete state.selected[oIdx];
            } else {
              state.selected = {};
              state.selected[oIdx] = true;
            }
            nodes.forEach(function (n, i) { n.node.classList.toggle('is-checked', !!state.selected[i]); });
          });
          opts.appendChild(node);
        });
        card.appendChild(opts);
        optRefs.push({ type: 'mc', nodes: nodes });
      } else if (state.type === 'true_false') {
        var tfOpts = el('div', { className: 'mbk-test__opts' });
        var tfNodes = [];
        ['Richtig', 'Falsch'].forEach(function (label, oIdx) {
          var value = oIdx === 0;
          var node = el('label', { className: 'mbk-test__opt' });
          var input = el('input', { type: 'radio', name: 'mbk-test-' + qIdx });
          node.appendChild(input);
          node.appendChild(el('span', {}, [label]));
          tfNodes.push({ node: node, input: input, value: value });
          input.addEventListener('change', function () {
            if (state.locked) return;
            state.selected = { value: value };
            tfNodes.forEach(function (n) { n.node.classList.toggle('is-checked', n.value === value); });
          });
          tfOpts.appendChild(node);
        });
        card.appendChild(tfOpts);
        optRefs.push({ type: 'true_false', nodes: tfNodes, correctAnswer: q.correctAnswer === true });
      } else {
        var inputText = el('input', { className: 'mbk-test__textarea', placeholder: 'Lösungswort eingeben…' });
        inputText.addEventListener('input', function () {
          if (state.locked) { inputText.value = state.textValue; return; }
          state.textValue = inputText.value;
        });
        card.appendChild(inputText);
        optRefs.push({ type: 'solution_word', textarea: inputText, expectedAnswer: q.expectedAnswer || '' });
      }

      list.appendChild(card);
    });

    var submitRow = el('div', { className: 'mbk-test__submit-row' });
    var submitBtn = el('button', {
      className: 'mbk-btn mbk-btn--primary',
      text: 'Test abgeben',
      type: 'button',
    });
    submitRow.appendChild(submitBtn);
    host.appendChild(submitRow);

    function scoreSolutionWord(userText, expected) {
      var answer = (userText || '').trim().toLowerCase();
      var solutions = String(expected || '')
        .split(';')
        .map(function (value) { return value.trim().toLowerCase(); })
        .filter(function (value) { return value !== ''; });
      return solutions.length > 0 && solutions.indexOf(answer) !== -1;
    }

    submitBtn.addEventListener('click', function () {
      var score = 0;
      var openCount = 0;
      qStates.forEach(function (state, qIdx) {
        state.locked = true;
        var ref = optRefs[qIdx];
        if (ref.type === 'mc') {
          var allRight = true;
          ref.nodes.forEach(function (n, i) {
            var picked = !!state.selected[i];
            var correct = !!n.opt.isCorrect;
            n.input.disabled = true;
            n.node.classList.remove('is-checked');
            if (picked && correct) n.node.classList.add('is-correct');
            else if (picked && !correct) { n.node.classList.add('is-wrong'); allRight = false; }
            else if (!picked && correct) { n.node.classList.add('is-missed'); allRight = false; }
          });
          if (allRight) score += state.points;
        } else if (ref.type === 'true_false') {
          var tfCorrect = state.selected && state.selected.value === ref.correctAnswer;
          ref.nodes.forEach(function (n) {
            n.input.disabled = true;
            n.node.classList.remove('is-checked');
            if (n.value === ref.correctAnswer) n.node.classList.add(tfCorrect ? 'is-correct' : 'is-missed');
            else if (state.selected && n.value === state.selected.value) n.node.classList.add('is-wrong');
          });
          if (tfCorrect) score += state.points;
        } else {
          ref.textarea.disabled = true;
          var verdict = scoreSolutionWord(state.textValue, ref.expectedAnswer);
          if (verdict) score += state.points;
          var hint2 = el('div', {
            className: 'mbk-test__expect',
            text: verdict ? '\\u2713 Lösungswort korrekt.' : 'Erwartet: ' + String(ref.expectedAnswer || '').split(';').map(function (value) { return value.trim(); }).filter(function (value) { return value !== ''; }).join(' / '),
          });
          ref.textarea.parentElement.appendChild(hint2);
        }
      });

      submitBtn.disabled = true;

      var passed = score >= threshold;
      var summary = el('div', { className: 'mbk-test__summary ' + (passed ? 'is-pass' : 'is-fail') });
      summary.appendChild(el('div', {
        className: 'mbk-test__summary-score',
        text: 'Ergebnis: ' + score + ' / ' + totalPoints + ' Punkte'
          + (threshold > 0 ? ' (Bestehensgrenze: ' + threshold + ')' : '')
          + (openCount > 0 ? ' \\u2022 ' + openCount + ' Frage' + (openCount === 1 ? '' : 'n') + ' offen' : ''),
      }));
      var feedback = passed ? (config.passFeedback || 'Bestanden!') : (config.failFeedback || 'Nicht bestanden.');
      summary.appendChild(el('div', { className: 'mbk-test__summary-feedback', text: feedback }));
      host.appendChild(summary);

      var scaled = totalPoints > 0 ? score / totalPoints : 0;
      scorm.setScore(scaled);
      scorm.setCompleted();
    });
  });
`;