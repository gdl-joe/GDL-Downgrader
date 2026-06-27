# Projektstand — GDL Downgrader
Zuletzt aktualisiert: 2026-06-27

## Was wurde gemacht
- Vollständige Electron-App „GDL Downgrader" (macOS + Windows) gebaut, getestet,
  veröffentlicht und um eine Wunschliste erweitert.
- Engine (`lib/`): Converter-Scan (Mac+Win), GSM-Versionserkennung, rekursiver
  Downgrade-Batch (`libpart2xml -compatibility` → `xml2libpart`), Passwort-Erhalt,
  Befehls-Versions-Prüfung. **32 Unit-Tests, alle grün.**
- UI im gdlschmiede-Dark-Style, 7-Schritt-Flow.
- Echte Tests durch Jochen bestanden: ungeschützter Downgrade, Ordnerauswahl, Passwort.
- Auf GitHub veröffentlicht: https://github.com/gdl-joe/GDL-Downgrader (public, MIT).

### Umgesetzte Wünsche (Runde 2)
1. Prüfung der Skripte auf zu neue GDL-Befehle (Warnung im Ergebnis). Wissensbasis
   `data/gdl-command-versions.json` aus der offiziellen GDL New Features Guide vorbefüllt
   (225 Einträge, AC16–29) — **muss von Jochen als Experte geprüft/erweitert werden**.
2. Haftungsausschluss (Footer) — dauerhaft im UI.
3. Backup-Pflicht-Hinweis (prominente Box) — dauerhaft im UI.
4. Open-Source-Hinweis + `LICENSE` (MIT).
5. Versionsnummer im UI (Footer, via `app.getVersion()`) + `CHANGELOG.md`.
6. Handbuch `HANDBUCH.md`.
7. macOS-DMG gebaut: `dist/GDL Downgrader-1.0.0-arm64.dmg` (Apple Silicon, unsigniert).

## Aktueller Stand
- Code vollständig, 32/32 Tests grün, alles committet.
- DMG erzeugt (arm64). App läuft (`npm start`).
- Hinweis Ausführungsumgebung: In dieser Sandbox ist `ELECTRON_RUN_AS_NODE=1` gesetzt;
  zum Starten daher `env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron .`. Auf
  Jochens normalem System tritt das nicht auf (`npm start` reicht).

## Nächste Schritte
- Jochen: neue Features im echten Betrieb testen (v. a. Befehls-Warnung an einem Objekt
  mit neuen Befehlen; Passwortschutz-Erhalt).
- Jochen: `data/gdl-command-versions.json` als GDL-Experte prüfen/erweitern.
- Optional: eigenes App-Icon (derzeit Standard-Electron-Icon).
- Optional: Intel-(x64)-DMG zusätzlich; Windows-NSIS-Build auf Windows-Rechner.

## Offene Probleme / Blockaden
- Befehlsliste ist vorbefüllt, aber nicht expertengeprüft — mögliche Fehlwarnungen, bis
  Jochen sie durchsieht (offensichtlicher Fehler `TUBE` wurde bereits entfernt).
- Windows-Converter-Pfad auf echtem Windows noch zu verifizieren.
- App und DMG sind nicht code-signiert (Gatekeeper-Hinweis beim ersten Start).
