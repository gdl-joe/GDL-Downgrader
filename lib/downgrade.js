'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

module.exports = { findGsmFiles, buildDestPath };
