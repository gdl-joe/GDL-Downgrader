# GDL Downgrader

Desktop-App (macOS + Windows) zum **Downgraden von Archicad-GDL-Objekten** (`.gsm`) von einer
höheren in eine tiefere Archicad-Version — mithilfe von Graphisofts `LP_XMLConverter`.
Einzelnes Objekt oder ganze Bibliothek (rekursiv), mit automatischer Quellversionserkennung
und Passwort-Handling. Dunkles UI im Stil von gdlschmiede.de.

---

## Wie es funktioniert

Pro Objekt zwei Schritte mit **zwei verschiedenen Convertern**:

1. **Decompile** mit dem Converter der **Quellversion**:
   `libpart2xml -compatibility <ZIELVERSION> [-password <pw>] -img <temp> quelle.gsm temp.xml`
2. **Recompile** mit dem Converter der **Zielversion**:
   `xml2libpart -img <temp> temp.xml ziel.gsm`

Das `-compatibility <ZIELVERSION>` ist der entscheidende Schalter für den Downgrade.

---

## Voraussetzung: installierte Converter

Für einen Downgrade müssen **beide** beteiligten `LP_XMLConverter` auf dem Rechner vorhanden
sein:

- der Converter **jeder vorkommenden Quellversion** (zum Decompilieren) und
- der Converter der **Zielversion** (zum Recompilieren).

Die App scannt automatisch alle installierten Archicad-Versionen:

- **macOS:** `/Applications/GRAPHISOFT/*/…/LP_XMLConverter`
- **Windows:** `C:\Program Files\GRAPHISOFT\*\LP_XMLConverter.exe`

Mehrere Installationen derselben Version (z.B. `AC27` und `AC27AUT`) werden **einzeln**
angeboten — du wählst die gewünschte Installation selbst.

> Im Zielversion-Menü erscheinen nur tatsächlich installierte Converter. Fehlt der Converter
> einer Quellversion, wird das betroffene Objekt in der Analyse-Tabelle als
> „⚠ Converter fehlt" markiert.

---

## Bedienung

1. **Quelle wählen** — „Objekt wählen…" (einzelne `.gsm`) oder „Ordner wählen…" (rekursiv).
2. **Gefundene Objekte** — Tabelle mit erkannter Quellversion und Status
   (✓ bereit / ⚠ Converter fehlt / 🔒 geschützt).
3. **Zielversion** — gewünschte installierte Converter-Installation wählen.
4. **Zielverzeichnis** — die Ordnerstruktur der Quelle wird dort 1:1 nachgebaut.
5. **Passwörter** — erscheint nur, wenn beim Konvertieren geschützte Objekte auftauchen;
   Passwort pro Objekt oder ein gemeinsames Passwort für alle eingeben, dann erneut starten.
6. **Downgrade starten** — Fortschritt und Live-Log werden angezeigt.
7. **Ergebnis** — Zusammenfassung erfolgreich / geschützt / fehlgeschlagen.

Passwortschutz wird beim Konvertieren erkannt (Converter-Meldung
`Could not decrypt library part`). Geschützte Objekte erscheinen danach im Passwort-Bereich.

---

## Entwicklung

```bash
npm install      # Abhängigkeiten (Electron, electron-builder)
npm start        # App starten
npm test         # Unit-Tests der Engine (node:test)
npm run dist     # Installer bauen (macOS: DMG, Windows: NSIS)
```

Die Konvertierungslogik liegt plattform- und Electron-unabhängig in `lib/`
(`converters.js`, `downgrade.js`, `run-command.js`) und ist über `npm test` ohne Archicad
testbar (der Command-Runner wird in den Tests injiziert).

### Build-Hinweis

- **macOS:** `npm run dist` erzeugt eine `.dmg` in `dist/`.
- **Windows:** Der NSIS-Installer muss auf einem Windows-Rechner gebaut werden; ein
  Cross-Build von macOS aus ist nur eingeschränkt möglich.

---

## Projektstruktur

```
main.js            Electron-Hauptprozess + IPC
preload.js         contextBridge-API für den Renderer
renderer.js        UI-Logik / Ablauf
index.html         UI-Struktur
styles.css         Dark-Theme (gdlschmiede.de)
lib/
  converters.js    Converter-Scan + GSM-Versionserkennung
  downgrade.js     Datei-Discovery + Downgrade-Engine + Batch
  run-command.js   spawn-basierter Command-Runner
test/              Unit-Tests (19)
docs/superpowers/  Spec und Implementierungsplan
```
