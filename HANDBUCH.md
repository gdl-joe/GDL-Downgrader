**Deutsch** · [English](MANUAL.md)

# GDL Downgrader – Handbuch

Stand: Version 1.0.0

GDL Downgrader konvertiert Archicad-GDL-Objekte (`.gsm`) von einer höheren in eine
tiefere Archicad-Version. Grundlage ist Graphisofts `LP_XMLConverter`, der mit jeder
Archicad-Installation mitgeliefert wird.

---

## 1. Voraussetzungen

- **macOS** oder **Windows**.
- Installierte Archicad-Converter:
  - mindestens **ein Converter, der so neu ist wie dein neuestes Objekt** (neuere
    Converter lesen ältere Objekte – ein AC21-Objekt braucht keinen AC21-Converter), und
  - der Converter der **Zielversion** (zum Zurückschreiben).
- Die App findet alle installierten Converter automatisch:
  - macOS: `/Applications/GRAPHISOFT/*/…/LP_XMLConverter`
  - Windows: `C:\Program Files\GRAPHISOFT\*\LP_XMLConverter.exe`

> Mehrere Installationen derselben Version (z. B. `AC27` und `AC27AUT`) werden einzeln
> angeboten – du wählst gezielt die gewünschte.

---

## 2. Installation

- **macOS:** `GDL-Downgrader-<version>-universal.dmg` öffnen, App in den Programme-Ordner
  ziehen. Die App ist von Apple **signiert & notarisiert** und startet ohne Warnung
  (läuft auf Intel und Apple Silicon).
- **Windows:** Das **portable ZIP** entpacken (Ort egal) und
  `GDL Downgrader starten.cmd` doppelklicken. Keine Installation, kein Node.js, kein
  Adminrecht nötig. Beim ersten Start evtl. SmartScreen-Hinweis „unbekannter Herausgeber"
  → *Weitere Informationen* → *Trotzdem ausführen*. Zum Entfernen den Ordner löschen.

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
   - ⚠ AC… zu neu – kein Converter (Objekt neuer als der höchste installierte Converter,
     daher nicht lesbar)
   - 🔒 geschützt (nach einem ersten Versuch, siehe Abschnitt 5)
3. **Zielversion** – frei wählbar; es werden alle installierten Converter angeboten. Ist die
   Zielversion gleich der Quellversion, wird ohne `-compatibility` nur neu kompiliert.
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

- **„⚠ AC… zu neu – kein Converter"** – Das Objekt ist neuer als der höchste installierte
  Converter und kann nicht gelesen werden. Installiere einen Converter, der mindestens so
  neu ist wie das Objekt.
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
- **Windows (portables ZIP, empfohlen):** Auf einem **Windows-Rechner** in PowerShell:
  ```powershell
  npm install
  .\scripts\build-portable-win.ps1
  ```
  erzeugt `dist-portable\GDL-Downgrader-Win-x64-<version>.zip`. Bewusst **kein**
  NSIS-Installer – die dabei umbenannte EXE löst einen Windows-Defender-Fehlalarm aus.
  Das portable Paket nutzt die unveränderte offizielle `electron.exe`. Details in
  [WINDOWS_BUILD.md](WINDOWS_BUILD.md).

---

## 10. Open Source

GDL Downgrader ist Open Source unter der **MIT-Lizenz** (siehe [LICENSE](LICENSE)).
Quellcode: <https://github.com/gdl-joe/GDL-Downgrader>
