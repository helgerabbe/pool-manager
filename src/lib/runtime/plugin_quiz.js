/**
 * plugin_quiz.js
 *
 * Plugin "quiz" für Miniquiz UND Multiple Choice (intern gleich, nur
 * unterschiedliche Defaults für `mode` und Trefferlogik):
 *
 *   {
 *     "instruction": "Beantworte folgende Fragen.",
 *     "displayCount": 5,                     // optional, max. Fragen pro Lauf
 *     "questions": [
 *       {
 *         "question": "Wo liegt Rom?",
 *         "answers": [
 *           { "text": "Italien", "isCorrect": true },
 *           { "text": "Spanien", "isCorrect": false }
 *         ]
 *       }
 *     ]
 *   }
 *
 * Verhalten:
 *   - Pro Frage erkennt das Plugin automatisch, ob es Single-Choice (genau
 *     eine richtige Antwort) oder Multi-Choice (mehrere richtige) ist und
 *     rendert Radio- bzw. Checkbox-Optik.
 *   - "Antwort prüfen"-Button pro Frage färbt die Antwort grün/rot;
 *     gleichzeitig schaltet die Frage in Read-Only.
 *   - Wenn alle Fragen korrekt → Done-Banner + SCORM. Score skaliert
 *     anteilig (richtig / gesamt).
 */

export const PLUGIN_QUIZ_CSS = `/* ── Quiz (Miniquiz / Multiple Choice) ─────────────────────── */
.mbk-quiz__instruction {
  margin: 0 0 0.75rem 0;
  font-weight: 500;
}
.mbk-quiz__list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.mbk-quiz__q {
  background: var(--mbk-bg);
  border: 1px solid var(--mbk-border);
  border-radius: 0.5rem;
  padding: 0.85rem 1rem;
}
.mbk-quiz__q-head {
  display: flex;
  gap: 0.5rem;
  align-items: baseline;
  margin-bottom: 0.5rem;
  font-weight: 600;
}
.mbk-quiz__q-num {
  color: var(--mbk-muted);
  font-weight: 600;
  font-size: 0.8rem;
}
.mbk-quiz__q-text {
  flex: 1;
}
.mbk-quiz__opts {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0.5rem 0 0.75rem 0;
}
.mbk-quiz__opt {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.45rem 0.65rem;
  background: #fff;
  border: 1px solid var(--mbk-border);
  border-radius: 0.4rem;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.15s, background 0.15s;
}
.mbk-quiz__opt:hover {
  border-color: var(--mbk-accent);
}
.mbk-quiz__opt.is-checked {
  border-color: var(--mbk-accent);
  background: var(--mbk-accent-soft);
}
.mbk-quiz__opt.is-correct {
  border-color: var(--mbk-success);
  background: var(--mbk-success-soft);
  color: var(--mbk-success);
}
.mbk-quiz__opt.is-wrong {
  border-color: var(--mbk-danger);
  background: var(--mbk-danger-soft);
  color: var(--mbk-danger);
}
.mbk-quiz__opt.is-missed {
  border-color: var(--mbk-success);
  background: #fff;
  color: var(--mbk-success);
  font-style: italic;
}
.mbk-quiz__opt input {
  margin-top: 0.15rem;
  accent-color: var(--mbk-accent);
}
.mbk-quiz__opt-label { flex: 1; }
.mbk-quiz__q-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
}
.mbk-quiz__q-result {
  font-weight: 600;
}
.mbk-quiz__q-result.is-correct { color: var(--mbk-success); }
.mbk-quiz__q-result.is-wrong { color: var(--mbk-danger); }
.mbk-quiz__summary {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.mbk-quiz__summary.is-done {
  background: var(--mbk-success-soft);
  border: 1px solid var(--mbk-success);
  color: var(--mbk-success);
}
.mbk-quiz__summary.is-partial {
  background: #fff;
  border: 1px solid var(--mbk-border);
  color: var(--mbk-muted);
}
`;

export const PLUGIN_QUIZ_JS = `
  // ── Plugin: Quiz (Miniquiz / Multiple Choice) ────────────
  registerPlugin('quiz', function (host, config) {
    host.innerHTML = '';
    host.classList.add('mbk-activity');

    var allQs = Array.isArray(config.questions) ? config.questions : [];
    allQs = allQs.filter(function (q) {
      return q && q.question && Array.isArray(q.answers) && q.answers.length >= 2;
    });
    if (allQs.length === 0) {
      host.innerHTML = '<div class="mbk-activity__error">Keine Fragen definiert.</div>';
      return;
    }

    // displayCount (optional): zeige nur die ersten N Fragen.
    var displayCount = Number(config.displayCount);
    if (!isFinite(displayCount) || displayCount <= 0 || displayCount > allQs.length) {
      displayCount = allQs.length;
    }
    var questions = allQs.slice(0, displayCount);

    if (config.instruction) {
      host.appendChild(el('p', { className: 'mbk-quiz__instruction', text: config.instruction }));
    }

    var list = el('div', { className: 'mbk-quiz__list' });
    host.appendChild(list);

    var summary = el('div', { className: 'mbk-quiz__summary is-partial', text: '' });
    host.appendChild(summary);

    var qStates = questions.map(function () { return { locked: false, selected: {}, isRight: false }; });

    function updateSummary() {
      var solved = qStates.filter(function (s) { return s.locked && s.isRight; }).length;
      var total = qStates.length;
      if (solved === total) {
        summary.className = 'mbk-quiz__summary is-done';
        summary.textContent = '\\u2705 Alle ' + total + ' Fragen richtig beantwortet.';
        scorm.setScore(1);
        scorm.setCompleted();
      } else if (qStates.every(function (s) { return s.locked; })) {
        summary.className = 'mbk-quiz__summary is-partial';
        summary.textContent = solved + ' von ' + total + ' Fragen richtig.';
        scorm.setScore(solved / total);
      } else {
        summary.className = 'mbk-quiz__summary is-partial';
        summary.textContent = solved + ' von ' + total + ' Fragen gel\\u00f6st.';
      }
    }

    questions.forEach(function (q, qIdx) {
      var multi = q.answers.filter(function (a) { return a && a.isCorrect; }).length > 1;
      var state = qStates[qIdx];

      var card = el('div', { className: 'mbk-quiz__q' });
      var head = el('div', { className: 'mbk-quiz__q-head' });
      head.appendChild(el('span', { className: 'mbk-quiz__q-num', text: 'Frage ' + (qIdx + 1) + '.' }));
      head.appendChild(el('span', { className: 'mbk-quiz__q-text', text: q.question }));
      card.appendChild(head);

      var opts = el('div', { className: 'mbk-quiz__opts' });
      var optNodes = [];
      q.answers.forEach(function (ans, aIdx) {
        var opt = el('label', { className: 'mbk-quiz__opt' });
        var input = el('input', {
          type: multi ? 'checkbox' : 'radio',
          name: 'mbk-quiz-' + qIdx,
        });
        var lbl = el('span', { className: 'mbk-quiz__opt-label', text: ans.text });
        opt.appendChild(input);
        opt.appendChild(lbl);
        optNodes.push({ opt: opt, input: input, ans: ans });

        input.addEventListener('change', function () {
          if (state.locked) return;
          if (multi) {
            if (input.checked) state.selected[aIdx] = true;
            else delete state.selected[aIdx];
          } else {
            state.selected = {};
            state.selected[aIdx] = true;
          }
          optNodes.forEach(function (o, i) {
            o.opt.classList.toggle('is-checked', !!state.selected[i]);
          });
        });

        opts.appendChild(opt);
      });
      card.appendChild(opts);

      var actions = el('div', { className: 'mbk-quiz__q-actions' });
      var result = el('span', { className: 'mbk-quiz__q-result', text: '' });
      var checkBtn = el('button', { className: 'mbk-btn mbk-btn--primary', text: 'Antwort pr\\u00fcfen', type: 'button' });
      actions.appendChild(result);
      actions.appendChild(checkBtn);
      card.appendChild(actions);

      checkBtn.addEventListener('click', function () {
        if (state.locked) return;
        if (Object.keys(state.selected).length === 0) {
          result.textContent = 'Bitte eine Antwort w\\u00e4hlen.';
          result.className = 'mbk-quiz__q-result is-wrong';
          return;
        }
        state.locked = true;
        var allRight = true;
        optNodes.forEach(function (o, i) {
          var picked = !!state.selected[i];
          var correct = !!o.ans.isCorrect;
          o.opt.classList.remove('is-checked');
          if (picked && correct) o.opt.classList.add('is-correct');
          else if (picked && !correct) { o.opt.classList.add('is-wrong'); allRight = false; }
          else if (!picked && correct) { o.opt.classList.add('is-missed'); allRight = false; }
          o.input.disabled = true;
        });
        state.isRight = allRight;
        result.textContent = allRight ? '\\u2713 Richtig.' : '\\u2717 Nicht ganz richtig.';
        result.className = 'mbk-quiz__q-result ' + (allRight ? 'is-correct' : 'is-wrong');
        checkBtn.disabled = true;
        updateSummary();
      });

      list.appendChild(card);
    });

    updateSummary();
  });
`;