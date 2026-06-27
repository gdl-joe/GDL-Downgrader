'use strict';

const state = {
  sourcePath: null,
  destDir: null,
  files: [],          // [{abs, rel, sourceVersion}]
  converters: [],     // [{version, path, name}]
  passwords: {},      // rel -> pw
  lockedRels: []      // rel der passwortgeschützten Objekte
};

const $ = (id) => document.getElementById(id);

function log(text) {
  const el = $('log');
  el.textContent += text;
  el.scrollTop = el.scrollHeight;
}

async function init() {
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
  if (f.sourceVersion == null) return '<span class="status-warn">Version unbekannt</span>';
  const hasConv = state.converters.some(c => c.version === f.sourceVersion);
  if (!hasConv) return `<span class="status-warn">⚠ Converter AC${f.sourceVersion} fehlt</span>`;
  if (state.lockedRels.includes(f.rel)) return '<span class="status-locked">🔒 geschützt</span>';
  return '<span class="status-ok">✓ bereit</span>';
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
    input.placeholder = 'Passwort…';
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
    log(`\n[Fehler] ${err.message}\n`);
  } finally {
    $('btn-start').disabled = false;
  }
});

function handleResults(results) {
  // Passwortgeschützte Objekte einsammeln
  state.lockedRels = results.filter(r => r.status === 'password-required').map(r => r.rel);
  renderAnalysis();
  renderPasswordList();

  const summary = $('summary');
  summary.innerHTML = '';
  const ok = results.filter(r => r.status === 'success').length;
  const locked = state.lockedRels.length;
  const failed = results.filter(r => r.status === 'error').length;
  summary.innerHTML = `<div class="summary-line status-ok">✓ ${ok} erfolgreich</div>
    <div class="summary-line status-locked">🔒 ${locked} passwortgeschützt (Passwort eingeben und erneut starten)</div>
    <div class="summary-line status-warn">⚠ ${failed} fehlgeschlagen</div>`;
  results.filter(r => r.status === 'error').forEach(r => {
    const d = document.createElement('div');
    d.className = 'summary-line status-warn';
    d.textContent = `${r.rel}: ${r.reason || 'Fehler'}`;
    summary.appendChild(d);
  });
  $('summary-card').hidden = false;
  $('btn-start').disabled = false;
}

init();
