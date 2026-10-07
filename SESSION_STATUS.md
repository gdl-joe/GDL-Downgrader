# Projektstand — GDL Downgrader
Zuletzt aktualisiert: 2026-10-07

## Fix: Nicht-.gsm-Dateien werden mitkopiert — 2026-10-07
- Problem: Beim Ordner-Downgrade landeten nur `.gsm` im Ziel, Grafiken u. a. fehlten.
- Neu in `lib/downgrade.js`: `findOtherFiles` + `copyOtherFiles` — alle übrigen Dateien
  und leere Ordner werden 1:1 übernommen; Ziel innerhalb der Quelle wird übersprungen.
- `main.js`: Kopie nach dem Batch, Überschreiben-Abfrage prüft auch diese Dateien.
- Ergebnis zeigt „{n} weitere Datei(en) unverändert übernommen". 44 Tests grün.
- Entscheidung: bei Electron bleiben (Tauri/Neutralino geprüft, Gewinn nur Größe,
  Windows-Defender-Risiko kehrt zurück).
- Electron 31.7.7 → 44.7.0 (XProtect löschte die Electron-31.7.7-Binary aus node_modules
  als vermeintliche Malware). Ab jetzt Mindestanforderung macOS 13. Version → 1.0.1.
- Hinweis Electron ≥ 42: Binary kommt nicht mehr per postinstall; in der Sandbox nachladen mit
  `NODE_USE_ENV_PROXY=1 electron_config_cache=~/.cache/electron node node_modules/electron/install.js`.
- Praxistest `npm start` durch Jochen: Grafiken werden mitkopiert ✅
- macOS-DMG 1.0.1 gebaut, signiert, notarisiert, gestapelt ✅
  (`dist/GDL Downgrader-1.0.1-universal.dmg`).
- Notarisierungs-Zugang dauerhaft im Schlüsselbund als Profil `gdl-notary`; neuer Befehl
  `npm run dist:mac` erledigt künftig alles in einem Schritt (siehe MACOS_SIGNING.md).
- Offen: committen + pushen, Win-ZIP auf Windows bauen, GitHub-Release v1.0.1 anlegen
  (Hinweis macOS 13+), Prüfsummen/Links auf der Produktseite aktualisieren.

## Was wurde gemacht
- Vollständige Electron-App „GDL Downgrader" (macOS + Windows) von Grund auf gebaut,
  getestet, veröffentlicht und ausgeliefert.
- Engine (`lib/`): Converter-Scan (Mac+Win, mit Dedup), GSM-Versionserkennung, rekursiver
  Downgrade-Batch (`libpart2xml -compatibility` → `xml2libpart`), Passwort-Erhalt,
  Befehls-Versions-Prüfung. **40 Unit-Tests, alle grün.**
- UI im gdlschmiede-Dark-Style, 7-Schritt-Flow, **zweisprachig DE/EN**.
- Auf echter Hardware (Mac + Windows) end-to-end verifiziert.
- Veröffentlicht: https://github.com/gdl-joe/GDL-Downgrader (public, MIT).

## Auslieferung (fertig, im Release v1.0.0)
- **macOS:** `GDL-Downgrader-1.0.0-universal.dmg` (168 MB) — **signiert + notarisiert**
  (Apple Developer ID, Hardened Runtime), **Universal** (Intel + Apple Silicon), startet
  warnungsfrei. SHA-256: `fc83410f2e535176c2d88685048c71851573592ecf586119cdd78a4cb552c517`
- **Windows:** `GDL-Downgrader-1.0.0-win-x64-portable.zip` (105 MB) — **portabel**,
  Defender-sicher (offizielle electron.exe), mit Converter-Dedup-Fix.
  SHA-256: `d15551a683d0e5c43194fc71a6c2adffcc663f34d3cd7e84f3feb3e538791f17`
- Beide mit prominentem Download-Abschnitt in README (DE/EN), Link auf `/releases/latest`.

## macOS-Signierung (eingerichtet, dokumentiert)
- Apple Developer Program (Individual) aktiv; Developer-ID-Zertifikat + G2-Intermediate
  installiert; App-Store-Connect-API-Key für Notarisierung.
- electron-builder-Config: `mac.notarize`, Hardened Runtime, Entitlements
  (`build/entitlements.mac*.plist`). Ablauf + Stolpersteine in `MACOS_SIGNING.md`.
- Wichtiger Lerneffekt: codesign-Hängen lag NICHT am Schlüssel, sondern war die stille,
  mehrminütige Notarisierungs-Wartezeit (bei 167 MB Universal bis ~Stunde). Signierung
  zuverlässig über `.p12` + `CSC_LINK`/`CSC_KEY_PASSWORD`. DMG zusätzlich separat
  notarisiert + gestapelt (`notarytool submit --wait`, `stapler staple`).

## Dokumentation
- README ↔ README.de, HANDBUCH ↔ MANUAL (zweisprachig, mit Sprachumschalt-Links),
  CHANGELOG, LICENSE (MIT), WINDOWS_BUILD.md, MACOS_SIGNING.md.
- Produktseiten-Texte (EN: Description/Features/Use Case/Informations/Documents/Downloads
  inkl. Prüfsummen) sowie ein DE-News-Beitrag für b-prisma.de wurden geliefert (im Chat).

## Offene / optionale Punkte
- Eigenes App-Icon (derzeit Standard-Electron-Icon).
- `data/gdl-command-versions.json` weiter pflegen (von Jochen bereits reduziert; bei neuen
  AC-Versionen ergänzen).
- Bei neuer Version: DMG (signiert) + Windows-ZIP neu bauen, Release `v1.x` anlegen,
  Download-Links/Prüfsummen auf der Produktseite aktualisieren.
- Hinweis Sandbox-Start (nur in der Claude-Umgebung relevant):
  `env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron .` — auf Jochens System `npm start`.
