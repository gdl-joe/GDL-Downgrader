# Projektstand — GDL Downgrader
Zuletzt aktualisiert: 2026-06-27

## Was wurde gemacht
- Vollständige Electron-App „GDL Downgrader" (macOS + Windows) von Grund auf gebaut.
- Ablauf: Brainstorming → Spec (`docs/superpowers/specs/`) → Plan (`docs/superpowers/plans/`)
  → Subagent-getriebene Umsetzung, je per TDD und Einzel-Commit (12 Commits auf `master`).
- Engine (`lib/`): Converter-Scan (Mac+Win), GSM-Versionserkennung aus Header, rekursive
  .gsm-Discovery mit Struktur-Erhalt, Zwei-Converter-Downgrade
  (`libpart2xml -compatibility` → `xml2libpart`), Batch mit Fehler-Isolation, Passwort-
  Erkennung (`Could not decrypt library part`). 19 Unit-Tests, alle grün.
- Electron-Verdrahtung (`main.js` IPC, `preload.js` contextBridge) + UI im gdlschmiede-
  Dark-Style (`index.html`, `styles.css`, `renderer.js`).
- Finaler unabhängiger Code-Review → 5 Defekte gefunden und behoben (`37a502c`):
  IPC-Listener-Leak, hängender Start-Button (try/finally), Guard gegen nicht gefundenen
  Ziel-Converter, getrennte Datei-/Ordner-Buttons (Windows-Dialog-Limit), Temp-Cleanup.
- README mit Bedienung, Voraussetzungen und Build-Hinweisen (`4efb19a`).

## Aktueller Stand
- Code vollständig, syntaxgeprüft, **19/19 Tests grün**, 12 Commits.
- Converter-Scan auf echtem Rechner verifiziert: findet AC25–AC29, inkl. Mehrfach-
  Installationen (AC27 + AC27AUT, AC29 + „Archicad 29"). Diese werden bewusst einzeln
  angeboten — Nutzer wählt konkrete Zielinstallation.
- App startbereit (`npm start`); GUI-Lauf und echte Konvertierung noch ausstehend.

## Nächste Schritte (Task 11 — manueller Test durch Jochen)
1. `npm start` — App im echten Betrieb prüfen.
2. Echter Downgrade eines **ungeschützten** Objekts (z.B. AC28 → AC25).
3. Echter Downgrade des **passwortgeschützten** `Schematic3DModel.gsm` (erst ohne, dann mit Passwort).
4. Verzeichnis-Batch mit Unterordnern (Struktur-Erhalt prüfen).
5. `npm run dist` — DMG bauen (Windows-NSIS separat auf Windows-Rechner).

## Offene Probleme / Blockaden
- Windows-Converter-Pfad (`C:\Program Files\GRAPHISOFT\*\LP_XMLConverter.exe`) ist eine
  begründete Annahme aus der GDLnucleus-Config — auf echtem Windows noch zu verifizieren.
- Cross-Build des Windows-Installers von macOS aus nur eingeschränkt möglich.
