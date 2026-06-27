# GDL-Downgrader — Design / Spec

Datum: 2026-06-27
Status: Freigegeben (Brainstorming abgeschlossen)

---

## 1. Zweck

Eigenständige Electron-Desktop-App für **macOS und Windows**, die Archicad-GDL-Objekte
(`.gsm`) einer höheren Archicad-Version mithilfe von Graphisofts `LP_XMLConverter` in eine
**tiefere** Version herunterkonvertiert (Downgrade). Verarbeitet ein einzelnes Objekt oder
ein ganzes Verzeichnis (rekursiv), erkennt die Quellversion automatisch und behandelt
passwortgeschützte Objekte.

---

## 2. Kernprinzip des Downgrades (pro Objekt)

Zwei Schritte mit **zwei verschiedenen Convertern** (Logik bewährt aus `GDL-XML-main`):

1. **Decompile** mit dem Converter der **Quellversion**:
   ```
   libpart2xml -compatibility <ZIELVERSION> [-password <pw>] -img <tempImg> quelle.gsm temp.xml
   ```
   Das `-compatibility <ZIELVERSION>` ist der entscheidende Schalter für den Downgrade.

2. **Recompile** mit dem Converter der **Zielversion**:
   ```
   xml2libpart -img <tempImg> temp.xml ziel.gsm
   ```

**Harter Constraint:** Für **jede vorkommende Quellversion** *und* für die **Zielversion**
muss der jeweilige `LP_XMLConverter` auf dem Rechner installiert sein. Fehlt ein Converter,
wird das betroffene Objekt als nicht-konvertierbar markiert (kein blindes Scheitern).

Beispiel (entspricht dem vom Nutzer gelieferten Befehl):
```
cd /Applications/GRAPHISOFT/AC29/.../LP_XMLConverter.app/Contents/MacOS/
./LP_XMLConverter libpart2xml -compatibility 24 -img <temp> quelle.gsm temp.xml   # AC29-Converter
./LP_XMLConverter xml2libpart  -img <temp> temp.xml ziel.gsm                       # AC24-Converter
```

---

## 3. Architektur

```
GDL-Downgrader/
├── package.json        Electron + electron-builder (DMG für Mac, NSIS-Installer für Windows)
├── main.js             Electron-Lifecycle + IPC-Routing (dünn)
├── preload.js          contextBridge — sichere, minimale IPC-API
├── lib/
│   ├── converters.js   Converter-Scan (Mac + Windows) + Versionserkennung aus GSM-Header
│   └── downgrade.js    Batch-Engine: Datei-Discovery, Decompile/Recompile,
│                       Passwort-Retry, Temp-Verwaltung
├── index.html          UI-Struktur
├── renderer.js         UI-Logik + State (kein Framework, Vanilla JS)
└── styles.css          Dark-Theme nach gdlschmiede.de
```

**Tech-Stack:** Reines Electron + HTML/CSS/Vanilla-JS, **kein Build-Schritt**. Begründung:
maximale Anwenderfreundlichkeit bei Installation (fertige Installer, Doppelklick, kein npm),
einfache Wartung, direkte Übernahme der erprobten Routinen aus `GDL-XML-main`.

**Modul-Trennung:** Die Engine-Logik liegt in `lib/`, damit reine Funktionen
(Versions-Mapping, Datei-Discovery, Pfad-Aufbau, Scan-Parsing) **ohne echten Converter**
testbar sind.

---

## 4. Converter-Erkennung (plattformübergreifend)

Beim App-Start werden alle verfügbaren Converter automatisch gescannt und nach Version
sortiert angezeigt.

- **macOS:** rekursiver Scan unter `/Applications/GRAPHISOFT/*/` nach
  `*.app/.../LP_XMLConverter.app/Contents/MacOS/LP_XMLConverter` (Logik aus `GDL-XML-main`).
- **Windows:** Scan unter `C:\Program Files\GRAPHISOFT\*\LP_XMLConverter.exe`
  (Pfadschema aus `GDLnucleus/gdlconfig.json`). **Zu verifizieren:** exakte Lage der `.exe`
  innerhalb der Archicad-Installation. **Fallback:** manuelles Pfad-Override-Feld in der UI.

**Versionserkennung:** aus dem GSM-Header-Byte über `mapVersionCode` (aus `GDL-XML-main`):
- Code ≥ 43 → Version = Code − 18 (z.B. 43=AC25, 46=AC28, 47=AC29)
- 41=AC24, 40=AC23, 39=AC22, 38=AC21, 37=AC20, 36=AC19, 35=AC18, 34=AC17, 32=AC16

**Mehrere Installationen derselben Version** (verifiziert 2026-06-27 auf Jochens Rechner:
`AC27` + `AC27AUT`, `AC29` + `Archicad 29`): Der Scan liefert **jede Installation einzeln**
(unterscheidbar über `name` = Ordnername und `path`). Es wird **nicht** dedupliziert.
Folge für die UI: Die Zielversion-Auswahl referenziert einen **konkreten Converter**
(über seinen `path`), nicht nur eine Versionsnummer — der Nutzer wählt die gewünschte
Installation selbst. Für die **Quellseite** genügt irgendein installierter Converter der
erkannten Quellversion (Decompile ist innerhalb einer Version installationsunabhängig);
`findConverter(list, version)` liefert dafür den ersten Treffer.

---

## 5. UI-Ablauf

Design nach **gdlschmiede.de** (Dark-Mode-Standard):
Akzent Amber `#b8823a`, BG `#1e2430` / Cards `#252d3d` / Hover `#2d3649`, Border `#374357`,
Text `#dde3ec`, Fonts Inter + JetBrains Mono, Radius `10px`.

1. **Quelle wählen** — Datei *oder* Ordner (Ordner wird **rekursiv** durchsucht).
2. **Analyse-Tabelle** — pro gefundenem Objekt:
   Name · erkannte Quellversion · Status
   (✓ bereit / ⚠ Quell-Converter fehlt / 🔒 passwortgeschützt).
3. **Zielversion** — Dropdown, zeigt **nur installierte** Versionen.
4. **Zielverzeichnis** — relative Ordnerstruktur wird **1:1 erhalten**.
5. **Passwort-Bereich** — erscheint nur, wenn geschützte Objekte auftreten;
   Eingabe pro Objekt **oder** ein gemeinsames Passwort für alle.
6. **Downgrade starten** — Fortschrittsbalken + Live-Log (Terminal-Optik wie
   gdlschmiede-Code-Window mit Mac-Dots).
7. **Zusammenfassung** — erfolgreich / fehlgeschlagen pro Objekt.

---

## 6. Verzeichnis-/Batch-Verhalten

- **Rekursiv:** alle `.gsm` in allen Unterordnern werden gefunden.
- **Quellversion pro Datei** automatisch aus dem Header erkannt → der passende
  Quell-Converter wird je Datei gewählt (gemischte Versionen im selben Ordner erlaubt).
  Die manuelle Quellversion-Anzeige dient nur als Information/Fallback.
- **Struktur-Erhalt:** die relative Pfadstruktur unterhalb des Quellordners wird im
  Zielverzeichnis nachgebaut.
- **Isolation:** ein Fehler bei einem Objekt stoppt den Batch nicht; jedes Objekt wird
  einzeln verarbeitet und im Ergebnis vermerkt.

---

## 7. Passwort-Handling

Erkennung **beim Konvertieren** (kein zuverlässiger Vorab-Indikator im GSM bekannt):

1. Schlägt der Decompile-Schritt fehl (Exit-Code ≠ 0), prüft die Engine die Converter-Ausgabe
   auf das verifizierte Passwort-Fehlermuster:
   ```
   Could not decrypt library part (wrong password).
   ```
   Dieses Muster erscheint sowohl bei **fehlendem** als auch bei **falschem** Passwort und ist
   damit der zuverlässige Indikator für Passwortschutz.
2. Bei Treffer wird das Objekt 🔒 markiert und in der UI zur Passworteingabe angeboten.
3. Nach Eingabe Retry mit `-password <pw>`. Schlägt es erneut mit demselben Muster fehl,
   war das Passwort falsch → entsprechende Rückmeldung in der UI.

**Verifiziert** (2026-06-27, an echtem geschütztem Objekt `Schematic3DModel.gsm`, AC28):
Substring-Match auf `Could not decrypt library part` ist ausreichend und robust.

---

## 8. Fehlerbehandlung

- Pro Objekt isoliert (siehe §6).
- Temp-Verzeichnisse unter `~/gdl_downgrade_temp` (TCC-sicher auf macOS), Cleanup garantiert
  (auch im Fehlerfall, `finally`).
- Klartext-Meldungen bei fehlendem Quell- oder Ziel-Converter, vor Start sichtbar in der
  Analyse-Tabelle.

---

## 9. Testing

- **Unit-testbar ohne Archicad:** `mapVersionCode`, rekursives `.gsm`-Discovery,
  Ziel-Pfad-Aufbau (Struktur-Erhalt), Converter-Scan-Parsing.
- **Echte Konvertierung:** manueller Verifikationsdurchlauf durch Jochen mit echten
  Objekten, inkl. mindestens einem passwortgeschützten Testobjekt.

---

## 10. Offene Verifikationspunkte (vor/während Implementierung)

1. Exakte Lage von `LP_XMLConverter.exe` in der Windows-Archicad-Installation.
2. ~~Genaues Fehler-/Exit-Code-Muster bei passwortgeschützten Objekten.~~ **Verifiziert
   2026-06-27:** `Could not decrypt library part (wrong password).`, Exit-Code 1 (siehe §7).
3. Bestätigung der Subkommando-Namen (`libpart2xml` / `xml2libpart`) gegen die vom Nutzer
   genannte Kurzform `l2x` — funktional identisch, Langform aus `GDL-XML-main` bevorzugt.
