'use strict';

const { spawn } = require('node:child_process');

// Führt einen Befehl aus und liefert { code, output } (stdout+stderr kombiniert).
// onData(chunk) optional für Live-Log-Streaming.
function runCommand(binPath, args, onData) {
  return new Promise((resolve) => {
    let output = '';
    const proc = spawn(binPath, args);
    proc.stdout.on('data', (d) => { const s = d.toString(); output += s; if (onData) onData(s); });
    proc.stderr.on('data', (d) => { const s = d.toString(); output += s; if (onData) onData(s); });
    proc.on('close', (code) => resolve({ code, output }));
    proc.on('error', (err) => resolve({ code: -1, output: `Process error: ${err.message}` }));
  });
}

module.exports = { runCommand };
