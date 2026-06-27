'use strict';

// Einfache Zweisprachigkeit (DE/EN). Statische Texte über data-i18n-Attribute,
// dynamische Texte über t(key, params). Markennamen (GDL, Archicad) bleiben gleich.
const I18N = {
  de: {
    backup_strong: 'Wichtig – Backup-Pflicht:',
    backup_text: 'Lege vor dem Downgrade eine Sicherung deiner Original-Objekte an. Arbeite niemals ohne Backup. Geschützte Objekte und ältere Versionen lassen sich nicht verlustfrei wiederherstellen.',
    step1: '1 · Quelle',
    btn_source_file: 'Objekt wählen…',
    btn_source_folder: 'Ordner wählen…',
    step2: '2 · Gefundene Objekte',
    th_object: 'Objekt',
    th_version: 'Quellversion',
    th_status: 'Status',
    step3: '3 · Zielversion',
    step4: '4 · Zielverzeichnis',
    btn_dest: 'Ordner wählen…',
    step5: '5 · Passwortgeschützte Objekte 🔒',
    pw_all_placeholder: 'Passwort für alle…',
    btn_apply_all: 'Auf alle anwenden',
    btn_start: 'Downgrade starten',
    step7: '7 · Ergebnis',
    footer_manual: '📖 Handbuch',
    disclaimer_strong: 'Haftungsausschluss:',
    disclaimer_text: 'Diese Software wird ohne jede Gewähr bereitgestellt. Die Nutzung erfolgt auf eigene Verantwortung. Für Datenverlust, fehlerhafte oder unvollständige Konvertierungen wird keine Haftung übernommen. Archicad und GDL sind Marken der GRAPHISOFT SE; dieses Werkzeug nutzt den mitgelieferten',
    disclaimer_text2: ', steht aber in keiner Verbindung zu GRAPHISOFT.',
    status_ready: '✓ bereit',
    status_locked: '🔒 geschützt',
    status_toonew: '⚠ AC{v} zu neu – kein Converter',
    pw_placeholder: 'Passwort…',
    summary_ok: '✓ {n} erfolgreich',
    summary_locked: '🔒 {n} passwortgeschützt (Passwort eingeben und erneut starten)',
    summary_failed: '⚠ {n} fehlgeschlagen',
    cmd_warn_head: '⚠ {n} Objekt(e) nutzen evtl. zu neue GDL-Befehle – bitte prüfen:',
    since: 'ab AC{v}',
    error_label: 'Fehler',
    error_log: '[Fehler] {msg}',
    overwrite_title: 'Dateien überschreiben?',
    overwrite_message: 'Im Zielverzeichnis werden {n} vorhandene Datei(en) überschrieben. Fortfahren?',
    overwrite_btn: 'Überschreiben',
    cancel_btn: 'Abbrechen'
  },
  en: {
    backup_strong: 'Important – backup required:',
    backup_text: 'Create a backup of your original objects before downgrading. Never work without a backup. Protected objects and older versions cannot be restored without loss.',
    step1: '1 · Source',
    btn_source_file: 'Select object…',
    btn_source_folder: 'Select folder…',
    step2: '2 · Found objects',
    th_object: 'Object',
    th_version: 'Source version',
    th_status: 'Status',
    step3: '3 · Target version',
    step4: '4 · Target folder',
    btn_dest: 'Select folder…',
    step5: '5 · Password-protected objects 🔒',
    pw_all_placeholder: 'Password for all…',
    btn_apply_all: 'Apply to all',
    btn_start: 'Start downgrade',
    step7: '7 · Result',
    footer_manual: '📖 Manual',
    disclaimer_strong: 'Disclaimer:',
    disclaimer_text: 'This software is provided without any warranty. Use it at your own risk. No liability is accepted for data loss or faulty/incomplete conversions. Archicad and GDL are trademarks of GRAPHISOFT SE; this tool uses the bundled',
    disclaimer_text2: ' but is not affiliated with GRAPHISOFT.',
    status_ready: '✓ ready',
    status_locked: '🔒 protected',
    status_toonew: '⚠ AC{v} too new – no converter',
    pw_placeholder: 'Password…',
    summary_ok: '✓ {n} successful',
    summary_locked: '🔒 {n} password-protected (enter password and start again)',
    summary_failed: '⚠ {n} failed',
    cmd_warn_head: '⚠ {n} object(s) may use GDL commands too new – please check:',
    since: 'since AC{v}',
    error_label: 'Error',
    error_log: '[Error] {msg}',
    overwrite_title: 'Overwrite files?',
    overwrite_message: '{n} existing file(s) in the target folder will be overwritten. Continue?',
    overwrite_btn: 'Overwrite',
    cancel_btn: 'Cancel'
  }
};

// Liefert übersetzten String, ersetzt {platzhalter} aus params.
function t(lang, key, params) {
  const table = I18N[lang] || I18N.de;
  let s = table[key] != null ? table[key] : key;
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
    }
  }
  return s;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18N, t };
}
