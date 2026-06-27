**Deutsch** · [English](README.md)

# GDL Downgrader

Desktop-App (macOS + Windows) zum **Downgraden von Archicad-GDL-Objekten** (`.gsm`) von einer
höheren in eine tiefere Archicad-Version — mithilfe von Graphisofts `LP_XMLConverter`.
Einzelnes Objekt oder ganze Bibliothek (rekursiv), mit automatischer Quellversionserkennung
und Passwort-Handling. Dunkles UI im Stil von gdlschmiede.de.

---

## Wie es funktioniert

Pro Objekt zwei Schritte mit **zwei verschiedenen Convertern**:

1. **Decompile** mit einem Converter, der das Objekt lesen kann (mindestens so neu wie die
   Quellversion). Beim echten Downgrade (Ziel < Quelle) mit `-compatibility <ZIELVERSION>`:
   `libpart2xml -compatibility <ZIELVERSION> [-password <pw>] -img <temp> quelle.gsm temp.xml`
2. **Recompile** mit dem Converter der **Zielversion**:
   `xml2libpart -img <temp> temp.xml ziel.gsm`

Das `-compatibility <ZIELVERSION>` ist der entscheidende Schalter für den Downgrade. Ist die
Zielversion gleich der Quellversion, wird ohne `-compatibility` nur neu kompiliert.

---

## Voraussetzung: installierte Converter

- Mindestens **ein Converter, der so neu ist wie dein neuestes Objekt** — neuere Converter
  lesen ältere Objekte (ein AC21-Objekt braucht keinen AC21-Converter).
- Der Converter der **Zielversion** (zum Zurückschreiben).

Die App scannt automatisch alle installierten Archicad-Versionen:

- **macOS:** `/Applications/GRAPHISOFT/*/…/LP_XMLConverter`
- **Windows:** `C:\Program Files\GRAPHISOFT\*\LP_XMLConverter.exe`

Mehrere Installationen derselben Version (z.B. `AC27` und `AC27AUT`) werden **einzeln**
angeboten — du wählst die gewünschte Installation selbst.

> Die Zielversion ist frei wählbar. Ein Objekt wird nur dann bemängelt, wenn es **zu neu**
> ist — also neuer als der höchste installierte Converter und daher nicht lesbar.

---

## Bedienung

1. **Quelle wählen** — „Objekt wählen…" (einzelne `.gsm`) oder „Ordner wählen…" (rekursiv).
2. **Gefundene Objekte** — Tabelle mit erkannter Quellversion und Status
   (✓ bereit / ⚠ zu neu – kein Converter / 🔒 geschützt).
3. **Zielversion** — frei aus allen installierten Convertern wählbar.
4. **Zielverzeichnis** — die Ordnerstruktur der Quelle wird dort 1:1 nachgebaut.
5. **Passwörter** — erscheint nur, wenn beim Konvertieren geschützte Objekte auftauchen;
   Passwort pro Objekt oder ein gemeinsames Passwort für alle eingeben, dann erneut starten.
6. **Downgrade starten** — Fortschritt und Live-Log werden angezeigt.
7. **Ergebnis** — Zusammenfassung erfolgreich / geschützt / fehlgeschlagen, plus Hinweise
   auf zu neue GDL-Befehle.

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
- **Windows:** portables ZIP per `.\scripts\build-portable-win.ps1` auf einem
  Windows-Rechner (kein NSIS-Installer wegen Windows-Defender-Fehlalarm; siehe
  [WINDOWS_BUILD.md](WINDOWS_BUILD.md)).

---

## Weitere Dokumente

- [HANDBUCH.md](HANDBUCH.md) — ausführliches Benutzerhandbuch
- [CHANGELOG.md](CHANGELOG.md) — Versionen & Release Notes
- [LICENSE](LICENSE) — MIT-Lizenz
- [data/gdl-command-versions.json](data/gdl-command-versions.json) — pflegbare Wissensbasis
  für die Befehls-Versions-Prüfung (bitte als GDL-Experte erweitern)

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
test/              Unit-Tests (37)
docs/superpowers/  Spec und Implementierungsplan
```
