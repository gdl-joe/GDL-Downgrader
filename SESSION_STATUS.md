# Projektstand — GDL Downgrader
Zuletzt aktualisiert: 2026-06-27

## Was wurde gemacht
- Vollständige Electron-App „GDL Downgrader" (macOS + Windows) gebaut, getestet, von Jochen
  verifiziert, auf GitHub veröffentlicht und in mehreren Runden erweitert.
- Engine (`lib/`): Converter-Scan (Mac+Win), GSM-Versionserkennung, rekursiver Downgrade-
  Batch, Passwort-Erhalt, Befehls-Versions-Prüfung. **39 Unit-Tests, alle grün.**
- UI im gdlschmiede-Dark-Style, 7-Schritt-Flow, **zweisprachig DE/EN** (umschaltbar).
- Veröffentlicht: https://github.com/gdl-joe/GDL-Downgrader (public, MIT).

### Funktionsumfang (final)
- Downgrade einzeln oder rekursiv; Quellversion je Objekt automatisch erkannt.
- Intelligente Converter-Wahl: Decompile mit dem niedrigsten Converter ≥ Quellversion;
  exakter Quell-Converter nicht nötig. Fehler nur, wenn Objekt zu neu für höchsten Converter.
- Zielversion frei wählbar; `-compatibility` nur beim echten Downgrade (Ziel < Quelle).
- Passwortschutz wird erkannt und bleibt nach dem Downgrade erhalten.
- Prüfung auf zu neue GDL-Befehle (inkl. Befehlen in String-Argumenten wie
  `APPLICATION_QUERY("MEPSYSTEM", …)`); Warnung im Ergebnis-Bereich. Wissensbasis
  `data/gdl-command-versions.json` von Jochen experten-reduziert (222 Einträge).
- Bestätigungsdialog vor dem Überschreiben vorhandener Ziel-Dateien.
- Erfolg/„bereit" grün; Haftungsausschluss + Backup-Pflicht im UI; Handbuch-Link.

### Distribution
- **macOS:** `dist/GDL Downgrader-1.0.0-arm64.dmg` (91 MB, Apple Silicon, unsigniert) — fertig.
- **Windows:** noch zu bauen — Anleitung in `WINDOWS_BUILD.md` (für Claude Code auf Windows;
  inkl. Verifikation des Windows-Converter-Pfads + NSIS-Build).
- Doku zweisprachig: README ↔ README.de, HANDBUCH ↔ MANUAL (mit Sprachumschalt-Links).

## Aktueller Stand
- Alles committet und gepusht (letzter Commit: `dae3ec6`).
- 39/39 Tests grün. DMG gebaut.
- Start in dieser Sandbox: `env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron .`
  (auf Jochens normalem System reicht `npm start`).

## Nächste Schritte (optional)
- Windows-Installer auf einem Windows-Rechner bauen (siehe `WINDOWS_BUILD.md`), dabei den
  Converter-Pfad real verifizieren.
- Optional: GitHub Release mit DMG (und später EXE) als Download-Assets.
- Optional: eigenes App-Icon (derzeit Standard-Electron-Icon).
- Optional: Intel-(x64)-DMG zusätzlich.

## Offene Probleme / Blockaden
- Windows-Converter-Pfad auf echtem Windows noch zu verifizieren (in `WINDOWS_BUILD.md`
  als erster Prüfschritt vermerkt).
- App/DMG nicht code-signiert (Gatekeeper-/SmartScreen-Hinweis beim ersten Start).
