# GDL Downgrader – Handbuch

Stand: Version 1.0.0

GDL Downgrader konvertiert Archicad-GDL-Objekte (`.gsm`) von einer höheren in eine
tiefere Archicad-Version. Grundlage ist Graphisofts `LP_XMLConverter`, der mit jeder
Archicad-Installation mitgeliefert wird.

---

## 1. Voraussetzungen

- **macOS** oder **Windows**.
- Mindestens **zwei installierte Archicad-Versionen** bzw. deren Converter:
  - der Converter **jeder Quellversion**, die du herabstufen willst, und
  - der Converter der **Zielversion**.
- Die App findet alle installierten Converter automatisch:
  - macOS: `/Applications/GRAPHISOFT/*/…/LP_XMLConverter`
  - Windows: `C:\Program Files\GRAPHISOFT\*\LP_XMLConverter.exe`

> Mehrere Installationen derselben Version (z. B. `AC27` und `AC27AUT`) werden einzeln
> angeboten – du wählst gezielt die gewünschte.

---

## 2. Installation

- **macOS:** `GDL Downgrader-<version>.dmg` öffnen, App in den Programme-Ordner ziehen.
  Beim ersten Start ggf. über *Rechtsklick → Öffnen* die Gatekeeper-Abfrage bestätigen
  (die App ist nicht signiert).
- **Windows:** Den Installer (`.exe`, NSIS) ausführen. Hinweis: Der Windows-Build wird
  auf einem Windows-Rechner erzeugt (siehe Abschnitt 9).

Alternativ aus dem Quellcode:
```bash
npm install
npm start
```

---

## 3. Der Arbeitsablauf in 7 Schritten

1. **Quelle wählen** – „Objekt wählen…" für eine einzelne `.gsm` oder „Ordner wählen…"
   für ein ganzes Verzeichnis (rekursiv, inkl. Unterordner).
2. **Gefundene Objekte** – Tabelle mit erkannter Quellversion und Status:
   - ✓ bereit
   - ⚠ Converter AC… fehlt (Quellversion nicht installiert)
   - 🔒 geschützt (nach einem ersten Versuch, siehe Abschnitt 5)
3. **Zielversion** – die gewünschte installierte Converter-Installation auswählen.
4. **Zielverzeichnis** – die Ordnerstruktur der Quelle wird dort 1:1 nachgebaut.
5. **Passwörter** – erscheint nur, wenn geschützte Objekte auftauchen (Abschnitt 5).
6. **Downgrade starten** – Fortschrittsbalken und Live-Log. Pro Objekt zwei Schritte:
   Decompile mit dem Quell-Converter (`libpart2xml -compatibility <Ziel>`), dann
   Recompile mit dem Ziel-Converter (`xml2libpart`).
7. **Ergebnis** – Zusammenfassung: erfolgreich / passwortgeschützt / fehlgeschlagen,
   plus Hinweise zu zu neuen Befehlen (Abschnitt 6).

---

## 4. Mehrere Objekte / ganze Bibliotheken

- Bei einem Ordner werden **alle** `.gsm` in allen Unterordnern gefunden.
- Die **Quellversion wird je Objekt** automatisch aus dem GSM-Header erkannt – gemischte
  Versionen in einem Ordner sind also kein Problem.
- Ein Fehler bei einem Objekt stoppt den Lauf nicht; jedes Objekt wird einzeln verarbeitet.

---

## 5. Passwortgeschützte Objekte

- Passwortschutz wird **beim Konvertieren** erkannt (Converter-Meldung
  `Could not decrypt library part`).
- Betroffene Objekte erscheinen danach im Bereich **5 · Passwortgeschützte Objekte**.
- Passwort pro Objekt eingeben **oder** ein gemeinsames Passwort für alle, dann erneut
  „Downgrade starten".
- **Der Passwortschutz bleibt erhalten:** Das herabgestufte Objekt wird mit demselben
  Passwort wieder verschlüsselt.

---

## 6. Prüfung auf zu neue Befehle

Beim Downgrade prüft die App die GDL-Skripte jedes Objekts darauf, ob sie Befehle nutzen,
die es in der **Zielversion** noch nicht gab. Solche Objekte werden im Ergebnis mit den
betroffenen Befehlen aufgelistet (z. B. „`MEPSYSTEM` (ab AC27)").

Das ist ein **Hinweis zur Prüfung**, kein Abbruch: Die `.gsm` wird trotzdem erzeugt. Ob ein
zu neuer Befehl tatsächlich ein Problem ist, hängt vom Objekt ab – prüfe das Ergebnis in
der Zielversion.

### Pflege der Befehlsliste

Die Wissensbasis liegt in [`data/gdl-command-versions.json`](data/gdl-command-versions.json)
und ist bewusst **editierbar**. Format:
```json
{
  "commands": {
    "MEPSYSTEM": 27,
    "KEYNOTE_INFO": 28
  }
}
```
Der Wert ist die Archicad-Version, **ab der** der Befehl verfügbar ist. Varianten-Notation
wie `PROJECT2{4}` wird unterstützt; der Abgleich ist case-insensitiv.

> Die Liste wurde aus der offiziellen
> [GDL New Features Guide](https://gdl.graphisoft.com/new-features-guide/) vorbefüllt und
> kann Fehler/Lücken enthalten. Sie sollte von GDL-Kundigen geprüft und ergänzt werden.
> Nicht erkannt werden Mehrwort-/Punkt-Konstrukte (z. B. `SET BUILDING_MATERIAL`).

---

## 7. Haftungsausschluss & Backup-Pflicht

- **Backup-Pflicht:** Lege vor jedem Downgrade eine Sicherung deiner Original-Objekte an.
- **Haftungsausschluss:** Die Software wird ohne jede Gewähr bereitgestellt. Die Nutzung
  erfolgt auf eigene Verantwortung; für Datenverlust oder fehlerhafte/unvollständige
  Konvertierungen wird keine Haftung übernommen.
- Archicad und GDL sind Marken der GRAPHISOFT SE. Dieses Werkzeug nutzt den mitgelieferten
  `LP_XMLConverter`, steht aber in keiner Verbindung zu GRAPHISOFT.

---

## 8. Häufige Fragen / Fehlerbehebung

- **„⚠ Converter AC… fehlt"** – Die Quellversion des Objekts ist nicht installiert. Den
  Decompile-Schritt kann nur der Converter der jeweiligen Quellversion ausführen.
- **Zielversion fehlt im Menü** – Es werden nur installierte Converter angeboten. Fehlt die
  gewünschte Zielversion, muss das zugehörige Archicad installiert sein.
- **Objekt bleibt 🔒 nach Passworteingabe** – Das Passwort war falsch. Erneut eingeben.
- **Log zeigt einen Converter-Fehler** – Die Meldung stammt direkt vom `LP_XMLConverter`;
  sie hilft bei der Diagnose (z. B. beschädigtes Objekt, fehlende Bibliotheksbezüge).

---

## 9. Builds erzeugen

- **macOS (DMG):**
  ```bash
  npm run dist
  ```
  erzeugt `dist/GDL Downgrader-<version>.dmg`.
- **Windows (NSIS-Installer):** Muss auf einem **Windows-Rechner** (oder via CI mit
  Windows-Runner) gebaut werden:
  ```bash
  npm install
  npm run dist
  ```
  Der Cross-Build von macOS aus ist nicht zuverlässig und wird nicht empfohlen.

---

## 10. Open Source

GDL Downgrader ist Open Source unter der **MIT-Lizenz** (siehe [LICENSE](LICENSE)).
Quellcode: <https://github.com/gdl-joe/GDL-Downgrader>
