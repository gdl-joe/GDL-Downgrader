'use strict';

const state = {
  sourcePath: null,
  destDir: null,
  files: [],          // [{abs, rel, sourceVersion}]
  converters: [],     // [{version, path, name}]
  passwords: {},      // rel -> pw
  lockedRels: [],     // rel der passwortgeschützten Objekte
  lang: localStorage.getItem('lang') || 'de',
  lastResults: null   // für Re-Render der Zusammenfassung bei Sprachwechsel
};

const $ = (id) => document.getElementById(id);

// Übersetzt mit der aktuellen Sprache.
const tr = (key, params) => t(state.lang, key, params);

// Wendet die gewählte Sprache auf alle statischen und dynamischen Texte an.
function applyLanguage(lang) {
  state.lang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = tr(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = tr(el.getAttribute('data-i18n-placeholder'));
  });
  $('lang-de').classList.toggle('active', lang === 'de');
  $('lang-en').classList.toggle('active', lang === 'en');
  // Handbuch-Link je Sprache
  $('manual-link').href = lang === 'en'
    ? 'https://github.com/gdl-joe/GDL-Downgrader/blob/main/MANUAL.md'
    : 'https://github.com/gdl-joe/GDL-Downgrader/blob/main/HANDBUCH.md';
  // Dynamische Bereiche neu zeichnen
  if (state.files.length) renderAnalysis();
  renderPasswordList();
  if (state.lastResults) renderSummary(state.lastResults);
}

function log(text) {
  const el = $('log');
  el.textContent += text;
  el.scrollTop = el.scrollHeight;
}

async function init() {
  window.api.getVersion().then(v => { $('app-version').textContent = 'v' + v; });
  state.converters = await window.api.scanConverters();
  const sel = $('target-version');
  sel.innerHTML = '';
  // Jede installierte Converter-Installation einzeln anbieten (absteigend nach Version).
  // Wert = konkreter Converter-Pfad, Label zeigt Version + Ordnername (AC27 vs AC27AUT).
  [...state.converters].sort((a, b) => b.version - a.version).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.path;
    opt.textContent = `Archicad ${c.version} (${c.name})`;
    sel.appendChild(opt);
  });
  window.api.onLog((chunk) => log(chunk));
  window.api.onProgress((p) => {
    if (p.phase === 'done') {
      $('progress-bar').style.width = `${Math.round(((p.index + 1) / p.total) * 100)}%`;
    }
  });
}

function statusCell(f) {
  if (state.lockedRels.includes(f.rel)) return `<span class="status-locked">${tr('status_locked')}</span>`;
  // Nur ein Problem, wenn das Objekt zu NEU ist: kein installierter Converter kann es
  // lesen (Quellversion höher als der höchste Converter). Ältere Objekte sind kein Problem.
  const maxV = state.converters.reduce((m, c) => (c.version > m ? c.version : m), 0);
  if (f.sourceVersion != null && f.sourceVersion > maxV) {
    return `<span class="status-warn">${tr('status_toonew', { v: f.sourceVersion })}</span>`;
  }
  return `<span class="status-ok">${tr('status_ready')}</span>`;
}

function renderAnalysis() {
  const tbody = $('analysis-table').querySelector('tbody');
  tbody.innerHTML = '';
  state.files.forEach(f => {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = f.rel;
    const tdVer = document.createElement('td');
    tdVer.textContent = f.sourceVersion != null ? 'AC' + f.sourceVersion : '—';
    const tdStatus = document.createElement('td');
    // statusCell() only interpolates integers (sourceVersion) and static strings — safe
    tdStatus.innerHTML = statusCell(f);
    tr.appendChild(tdName);
    tr.appendChild(tdVer);
    tr.appendChild(tdStatus);
    tbody.appendChild(tr);
  });
  $('analysis-card').hidden = state.files.length === 0;
  updateStartButton();
}

function renderPasswordList() {
  const card = $('password-card');
  const list = $('password-list');
  list.innerHTML = '';
  if (state.lockedRels.length === 0) { card.hidden = true; return; }
  card.hidden = false;
  state.lockedRels.forEach(rel => {
    const row = document.createElement('div');
    row.className = 'pw-row';
    const label = document.createElement('span');
    label.textContent = rel;
    const input = document.createElement('input');
    input.type = 'password';
    input.dataset.rel = rel;
    input.placeholder = tr('pw_placeholder');
    input.addEventListener('input', (e) => {
      state.passwords[rel] = e.target.value;
    });
    row.appendChild(label);
    row.appendChild(input);
    list.appendChild(row);
  });
}

function updateStartButton() {
  $('btn-start').disabled = !(state.files.length && state.destDir);
}

async function chooseSource(mode) {
  const p = await window.api.selectSource(mode);
  if (!p) return;
  state.sourcePath = p;
  $('source-path').textContent = p;
  state.files = await window.api.analyzeSource(p);
  state.lockedRels = [];
  renderAnalysis();
}

$('btn-source-file').addEventListener('click', () => chooseSource('file'));
$('btn-source-folder').addEventListener('click', () => chooseSource('folder'));

$('btn-dest').addEventListener('click', async () => {
  const p = await window.api.selectDest();
  if (!p) return;
  state.destDir = p;
  $('dest-path').textContent = p;
  updateStartButton();
});

$('btn-apply-all').addEventListener('click', () => {
  const pw = $('pw-all').value;
  state.lockedRels.forEach(rel => { state.passwords[rel] = pw; });
  document.querySelectorAll('#password-list input').forEach(i => { i.value = pw; });
});

$('btn-start').addEventListener('click', async () => {
  $('btn-start').disabled = true;
  $('log').textContent = '';
  $('progress-bar').style.width = '0';
  const targetConverterPath = $('target-version').value;
  try {
    const results = await window.api.runDowngrade({
      files: state.files,
      targetConverterPath,
      destDir: state.destDir,
      passwords: state.passwords
    });
    handleResults(results);
  } catch (err) {
    log('\n' + tr('error_log', { msg: err.message }) + '\n');
  } finally {
    $('btn-start').disabled = false;
  }
});

function handleResults(results) {
  state.lastResults = results;
  // Passwortgeschützte Objekte einsammeln
  state.lockedRels = results.filter(r => r.status === 'password-required').map(r => r.rel);
  renderAnalysis();
  renderPasswordList();
  renderSummary(results);
  $('btn-start').disabled = false;
}

function renderSummary(results) {
  const summary = $('summary');
  summary.innerHTML = '';
  const ok = results.filter(r => r.status === 'success').length;
  const locked = results.filter(r => r.status === 'password-required').length;
  const failed = results.filter(r => r.status === 'error').length;
  const flagged = results.filter(r => r.warnings && r.warnings.length > 0);
  summary.innerHTML = `<div class="summary-line status-ok">${tr('summary_ok', { n: ok })}</div>
    <div class="summary-line status-locked">${tr('summary_locked', { n: locked })}</div>
    <div class="summary-line status-warn">${tr('summary_failed', { n: failed })}</div>`;
  results.filter(r => r.status === 'error').forEach(r => {
    const d = document.createElement('div');
    d.className = 'summary-line status-warn';
    d.textContent = `${r.rel}: ${r.reason || tr('error_label')}`;
    summary.appendChild(d);
  });

  // Befehls-Warnungen: Objekte mit Befehlen, die es in der Zielversion noch nicht gab
  if (flagged.length > 0) {
    const head = document.createElement('div');
    head.className = 'summary-line status-locked';
    head.textContent = tr('cmd_warn_head', { n: flagged.length });
    summary.appendChild(head);
    flagged.forEach(r => {
      const d = document.createElement('div');
      d.className = 'summary-line cmd-warn';
      const list = r.warnings.map(w => `${w.command} (${tr('since', { v: w.since })})`).join(', ');
      d.textContent = `• ${r.rel}: ${list}`;
      summary.appendChild(d);
    });
  }
  $('summary-card').hidden = false;
}

$('lang-de').addEventListener('click', () => applyLanguage('de'));
$('lang-en').addEventListener('click', () => applyLanguage('en'));

applyLanguage(state.lang);
init();
