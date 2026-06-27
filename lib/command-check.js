'use strict';

// Prüft GDL-Skripte (aus dekompiliertem libpart-XML) auf Befehle, die es in einer
// niedrigeren Archicad-Zielversion noch nicht gab.

// GDL-Token: Identifier, optional mit Varianten-Notation NAME{n} (z.B. PROJECT2{3}).
const TOKEN_RE = /[A-Za-z_][A-Za-z0-9_]*(?:\{[0-9]+\})?/g;

// Liefert die Roh-Inhalte aller <Script...>…</Script...>-Abschnitte (CDATA entfernt).
function extractScriptBlocks(xml) {
  const blocks = [];
  const re = /<Script[^>]*>([\s\S]*?)<\/Script[^>]*>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    blocks.push(m[1].replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, ''));
  }
  return blocks;
}

// Entfernt String-Literale ("…") und Zeilenkommentare (! …) zeilenweise,
// damit Tokens darin nicht als Befehle gewertet werden.
function stripCommentsAndStrings(code) {
  return code.split('\n').map(line => {
    let s = line.replace(/"[^"]*"/g, ' ');
    const bang = s.indexOf('!');
    if (bang >= 0) s = s.slice(0, bang);
    return s;
  }).join('\n');
}

// Sammelt alle GDL-Tokens (uppercased) aus allen Skript-Abschnitten eines XML.
function extractCommands(xml) {
  const set = new Set();
  for (const block of extractScriptBlocks(xml)) {
    const clean = stripCommentsAndStrings(block);
    let m;
    while ((m = TOKEN_RE.exec(clean)) !== null) {
      set.add(m[0].toUpperCase());
    }
  }
  return set;
}

// Gibt die Befehle zurück, die laut Mapping erst nach targetVersion eingeführt wurden.
// commandVersions: { TOKEN: einfuehrungsVersion }. Vergleich case-insensitiv.
function checkCommands(commandSet, commandVersions, targetVersion) {
  const upper = {};
  for (const [k, v] of Object.entries(commandVersions)) {
    upper[k.toUpperCase()] = v;
  }
  const result = [];
  for (const token of commandSet) {
    const since = upper[token];
    if (since != null && since > targetVersion) {
      result.push({ command: token, since });
    }
  }
  result.sort((a, b) => b.since - a.since || a.command.localeCompare(b.command));
  return result;
}

module.exports = { extractScriptBlocks, stripCommentsAndStrings, extractCommands, checkCommands };
