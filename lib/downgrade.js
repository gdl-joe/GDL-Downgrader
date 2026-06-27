'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { findConverter } = require('./converters');
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

const PASSWORD_ERROR_MARKER = 'Could not decrypt library part';

// Konvertiert eine einzelne .gsm-Datei in die Zielversion.
// opts: { sourceConverter, targetConverter, sourcePath, destPath,
//         tempRoot, runCommand, password? }
async function downgradeFile(opts) {
  const {
    sourceConverter, targetConverter, sourcePath,
    destPath, tempRoot, runCommand, password, commandVersions
  } = opts;

  if (!sourceConverter) {
    return { status: 'error', reason: 'source converter not installed' };
  }
  if (!targetConverter) {
    return { status: 'error', reason: 'target converter not installed' };
  }

  const work = fs.mkdtempSync(path.join(tempRoot, 'work-'));
  const tempXml = path.join(work, 'temp.xml');
  const tempImg = path.join(work, 'images');
  fs.mkdirSync(tempImg, { recursive: true });

  try {
    // Schritt 1: Decompile mit Quell-Converter + -compatibility <ziel>
    const decArgs = ['libpart2xml', '-compatibility', String(targetConverter.version), '-img', tempImg];
    if (password) decArgs.push('-password', password);
    decArgs.push(sourcePath, tempXml);
    const dec = await runCommand(sourceConverter.path, decArgs);
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
      const sourceConverter = findConverter(converters, f.sourceVersion);
      res = await downgradeFile({
        sourceConverter,
        targetConverter,
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

module.exports = { findGsmFiles, buildDestPath, downgradeFile, runBatch, PASSWORD_ERROR_MARKER };
