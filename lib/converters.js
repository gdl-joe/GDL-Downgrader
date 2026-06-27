'use strict';

const fs = require('node:fs');
const pathMod = require('node:path');

function mapVersionCode(code) {
  if (code >= 43) return code - 18; // 43->25 ... 47->29 ...
  if (code === 41) return 24;
  if (code === 40) return 23;
  if (code === 39) return 22;
  if (code === 38) return 21;
  if (code === 37) return 20;
  if (code === 36) return 19;
  if (code === 35) return 18;
  if (code === 34) return 17;
  if (code === 32) return 16;
  return null;
}

function detectGsmVersion(gsmPath) {
  try {
    const fd = fs.openSync(gsmPath, 'r');
    const buffer = Buffer.alloc(8);
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);
    // Magic: 'mm' (0x6d6d) oder 'WW' (0x5757)
    if ((buffer[0] === 0x6d && buffer[1] === 0x6d) ||
        (buffer[0] === 0x57 && buffer[1] === 0x57)) {
      return mapVersionCode(buffer[2]);
    }
  } catch (err) {
    return null;
  }
  return null;
}

// Default-Basisverzeichnisse je Plattform
function defaultBaseDirs(platform) {
  if (platform === 'win32') {
    return ['C:\\Program Files\\GRAPHISOFT', 'C:\\Program Files\\Graphisoft'];
  }
  return ['/Applications/GRAPHISOFT'];
}

// Baut den erwarteten Converter-Pfad innerhalb eines Archicad-App-Ordners
function macConverterPath(appDir) {
  return pathMod.join(appDir, 'Contents', 'MacOS',
    'LP_XMLConverter.app', 'Contents', 'MacOS', 'LP_XMLConverter');
}

function scanConverters(platform = process.platform, baseDirs = null) {
  const bases = baseDirs || defaultBaseDirs(platform);
  const found = [];

  for (const base of bases) {
    if (!fs.existsSync(base)) continue;
    let subdirs;
    try { subdirs = fs.readdirSync(base); } catch (e) { continue; }

    for (const subdir of subdirs) {
      const subPath = pathMod.join(base, subdir);
      let stat;
      try { stat = fs.statSync(subPath); } catch (e) { continue; }
      if (!stat.isDirectory()) continue;

      const verMatch = subdir.match(/\d+/);
      const version = verMatch ? parseInt(verMatch[0], 10) : null;

      if (platform === 'win32') {
        // Windows: LP_XMLConverter.exe direkt im Versionsordner (zu verifizieren)
        const exe = pathMod.join(subPath, 'LP_XMLConverter.exe');
        if (fs.existsSync(exe) && version) {
          found.push({ name: subdir, version, path: exe });
        }
      } else {
        // macOS: ein oder mehrere .app im Versionsordner durchsuchen
        let inner;
        try { inner = fs.readdirSync(subPath); } catch (e) { continue; }
        for (const file of inner) {
          if (file.toLowerCase().endsWith('.app') &&
              file.toLowerCase().includes('archicad')) {
            const convPath = macConverterPath(pathMod.join(subPath, file));
            if (fs.existsSync(convPath)) {
              const v = version || (file.match(/\d+/) ? parseInt(file.match(/\d+/)[0], 10) : null);
              found.push({ name: subdir, version: v, path: convPath });
            }
          }
        }
      }
    }
  }
  return found.sort((a, b) => (b.version || 0) - (a.version || 0));
}

function findConverter(list, version) {
  return list.find(c => c.version === version) || null;
}

// Höchste installierte Converter-Version (oder null).
function maxConverterVersion(list) {
  if (!list || list.length === 0) return null;
  return list.reduce((m, c) => (c.version > m ? c.version : m), list[0].version);
}

// Wählt den Converter zum Decompilen eines Objekts: den niedrigsten installierten
// Converter, dessen Version >= der Objekt-Quellversion ist (neuere Converter lesen
// ältere Objekte). Bei unbekannter Quellversion den höchsten Converter. Null, wenn
// kein Converter das (zu neue) Objekt lesen kann.
function findDecompileConverter(list, sourceVersion) {
  if (!list || list.length === 0) return null;
  const sorted = [...list].sort((a, b) => a.version - b.version);
  if (sourceVersion == null) return sorted[sorted.length - 1];
  for (const c of sorted) {
    if (c.version >= sourceVersion) return c;
  }
  return null;
}

module.exports = {
  mapVersionCode, detectGsmVersion, scanConverters, findConverter,
  maxConverterVersion, findDecompileConverter, defaultBaseDirs
};
