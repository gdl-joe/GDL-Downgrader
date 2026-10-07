'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { findDecompileConverter } = require('./converters');
const { extractCommands, checkCommands } = require('./command-check');

// Liefert [{ abs, rel }] für alle .gsm unter rootPath (rekursiv).
// rootPath darf eine einzelne .gsm-Datei oder ein Verzeichnis sein.
function findGsmFiles(rootPath) {
  const stat = fs.statSync(rootPath);
  if (stat.isFile()) {
    if (rootPath.toLowerCase().endsWith('.gsm')) {
      return [{ abs: rootPath, rel: path.basename(rootPath) }];
    }
    return [];
  }
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.gsm')) {
        results.push({ abs, rel: path.relative(rootPath, abs) });
      }
    }
  }
  walk(rootPath);
  return results;
}

function buildDestPath(destDir, rel) {
  return path.join(destDir, rel);
}

// true, wenn p gleich base ist oder darunter liegt (Windows: ohne Groß-/Kleinschreibung).
function isInside(p, base) {
  let a = path.resolve(p);
  let b = path.resolve(base);
  if (process.platform === 'win32') { a = a.toLowerCase(); b = b.toLowerCase(); }
  return a === b || a.startsWith(b.endsWith(path.sep) ? b : b + path.sep);
}

// Liefert alles außer .gsm unter rootPath (rekursiv): { dirs:[rel], files:[{abs,rel}] }.
// dirs enthält jeden Unterordner, damit auch leere Ordner im Ziel entstehen.
// excludeDir (z. B. das Zielverzeichnis innerhalb der Quelle) wird übersprungen.
// Bei einer einzelnen Datei als Quelle gibt es nichts mitzunehmen.
function findOtherFiles(rootPath, excludeDir) {
  const dirs = [];
  const files = [];
  if (!fs.statSync(rootPath).isDirectory()) return { dirs, files };
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (excludeDir && isInside(abs, excludeDir)) continue;
      if (entry.isDirectory()) {
        dirs.push(path.relative(rootPath, abs));
        walk(abs);
      } else if (entry.isFile() && !entry.name.toLowerCase().endsWith('.gsm')) {
        files.push({ abs, rel: path.relative(rootPath, abs) });
      }
    }
  }
  walk(rootPath);
  return { dirs, files };
}

// Kopiert alle Nicht-.gsm-Dateien (Grafiken, Texte, …) unverändert in dieselbe
// relative Struktur unter destDir und legt auch leere Ordner an.
// Liefert pro Datei { rel, status: 'copied' } bzw. { rel, status: 'error', reason }.
function copyOtherFiles(sourceRoot, destDir) {
  const { dirs, files } = findOtherFiles(sourceRoot, destDir);
  for (const rel of dirs) {
    try { fs.mkdirSync(buildDestPath(destDir, rel), { recursive: true }); } catch (e) { /* folgt beim Kopieren */ }
  }
  return files.map(f => {
    try {
      const dest = buildDestPath(destDir, f.rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(f.abs, dest);
      return { rel: f.rel, status: 'copied' };
    } catch (err) {
      return { rel: f.rel, status: 'error', reason: `copy failed: ${err.message}` };
    }
  });
}

const PASSWORD_ERROR_MARKER = 'Could not decrypt library part';

// Konvertiert eine einzelne .gsm-Datei in die Zielversion.
// opts: { sourceConverter, targetConverter, sourcePath, destPath,
//         tempRoot, runCommand, password? }
async function downgradeFile(opts) {
  const {
    decompileConverter, targetConverter, sourceVersion, sourcePath,
    destPath, tempRoot, runCommand, password, commandVersions
  } = opts;

  if (!decompileConverter) {
    return { status: 'error', reason: `object too new — no installed converter can read AC${sourceVersion}` };
  }
  if (!targetConverter) {
    return { status: 'error', reason: 'target converter not installed' };
  }

  const work = fs.mkdtempSync(path.join(tempRoot, 'work-'));
  const tempXml = path.join(work, 'temp.xml');
  const tempImg = path.join(work, 'images');
  fs.mkdirSync(tempImg, { recursive: true });

  try {
    // Schritt 1: Decompile. -compatibility nur beim echten Downgrade (Ziel < Quelle);
    // bei unbekannter Quellversion konservativ setzen, bei Ziel >= Quelle weglassen.
    const decArgs = ['libpart2xml'];
    if (sourceVersion == null || targetConverter.version < sourceVersion) {
      decArgs.push('-compatibility', String(targetConverter.version));
    }
    decArgs.push('-img', tempImg);
    if (password) decArgs.push('-password', password);
    decArgs.push(sourcePath, tempXml);
    const dec = await runCommand(decompileConverter.path, decArgs);
    if (dec.code !== 0) {
      if (dec.output && dec.output.includes(PASSWORD_ERROR_MARKER)) {
        return { status: 'password-required', log: dec.output };
      }
      return { status: 'error', reason: 'decompile failed', log: dec.output };
    }

    // Befehls-Prüfung: GDL-Skripte auf Befehle scannen, die es in der Zielversion
    // noch nicht gab (nur wenn ein Mapping übergeben wurde).
    let warnings = [];
    if (commandVersions) {
      try {
        const xml = fs.readFileSync(tempXml, 'utf8');
        warnings = checkCommands(extractCommands(xml), commandVersions, targetConverter.version);
      } catch (e) {
        warnings = [];
      }
    }

    // Schritt 2: Recompile mit Ziel-Converter.
    // Mit -password wird das Ziel-GSM wieder mit demselben Passwort verschlüsselt,
    // damit der Schutz beim Downgrade erhalten bleibt.
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    const compArgs = ['xml2libpart', '-img', tempImg];
    if (password) compArgs.push('-password', password);
    compArgs.push(tempXml, destPath);
    const comp = await runCommand(targetConverter.path, compArgs);
    if (comp.code !== 0) {
      return { status: 'error', reason: 'recompile failed', log: comp.output };
    }
    return { status: 'success', destPath, warnings };
  } finally {
    try { fs.rmSync(work, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
}

// Verarbeitet eine Liste von Dateien sequenziell, isoliert Fehler pro Datei.
// opts: { files:[{abs,rel,sourceVersion}], converters, targetConverter, destDir,
//         tempRoot, runCommand, passwords:{rel->pw}, onProgress? }
async function runBatch(opts) {
  const {
    files, converters, targetConverter, destDir, tempRoot,
    runCommand, passwords = {}, onProgress, commandVersions
  } = opts;

  fs.mkdirSync(tempRoot, { recursive: true });
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (onProgress) onProgress({ index: i, total: files.length, rel: f.rel, phase: 'start' });
    let res;
    try {
      const decompileConverter = findDecompileConverter(converters, f.sourceVersion);
      res = await downgradeFile({
        decompileConverter,
        targetConverter,
        sourceVersion: f.sourceVersion,
        sourcePath: f.abs,
        destPath: buildDestPath(destDir, f.rel),
        tempRoot,
        runCommand,
        password: passwords[f.rel],
        commandVersions
      });
    } catch (err) {
      res = { status: 'error', reason: err.message };
    }
    const entry = { rel: f.rel, ...res };
    results.push(entry);
    if (onProgress) onProgress({ index: i, total: files.length, rel: f.rel, phase: 'done', status: entry.status });
  }
  return results;
}

module.exports = {
  findGsmFiles, findOtherFiles, copyOtherFiles, buildDestPath,
  downgradeFile, runBatch, PASSWORD_ERROR_MARKER
};
