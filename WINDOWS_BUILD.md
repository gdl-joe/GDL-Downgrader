# Windows-Build – Anweisung für Claude Code (auf einem Windows-Rechner)

Diese Datei ist eine **Arbeitsanweisung für Claude Code**, ausgeführt auf einem
**Windows-Rechner mit installiertem Archicad**. Ziel: den Windows-Installer (`.exe`, NSIS)
erzeugen **und** den Windows-spezifischen Converter-Pfad verifizieren. Der macOS-Build (DMG)
existiert bereits; die Konvertierungslogik ist plattformneutral und getestet.

> Hinweis an Claude: Arbeite die Schritte der Reihe nach ab. Bei Schritt 3 (Converter-Pfad)
> ist echte Verifikation am System nötig – nicht raten. Melde am Ende klar, ob der Pfad
> gestimmt hat und ob der Build erfolgreich war.

---

## Voraussetzungen auf dem Windows-Rechner

- **Node.js 18+** (LTS) – <https://nodejs.org>
- **Git**
- **mindestens eine Archicad-Installation** mit `LP_XMLConverter.exe`
- Internet (electron-builder lädt beim ersten Build Electron + NSIS-Tools herunter)

---

## Schritt 1 – Repository holen und Abhängigkeiten installieren

```powershell
git clone https://github.com/gdl-joe/GDL-Downgrader.git
cd GDL-Downgrader
npm install
```

## Schritt 2 – Tests ausführen (Plausibilitätscheck)

```powershell
npm test
```
Erwartet: **39 Tests, alle grün**. Wenn nicht, stoppen und Ausgabe melden.

## Schritt 3 – Windows-Converter-Pfad VERIFIZIEREN (wichtigster Punkt)

Die App scannt Converter über `lib/converters.js`. Die Windows-Logik erwartet die Datei
**`LP_XMLConverter.exe` direkt** in einem Versionsordner unter:

```
C:\Program Files\GRAPHISOFT\<Versionsordner>\LP_XMLConverter.exe
```
(Basisverzeichnisse: `C:\Program Files\GRAPHISOFT` und `C:\Program Files\Graphisoft`.)

**Diese Annahme ist zu prüfen.** Vorgehen:

1. Finde heraus, wo `LP_XMLConverter.exe` tatsächlich liegt:
   ```powershell
   Get-ChildItem -Path "C:\Program Files" -Recurse -Filter "LP_XMLConverter.exe" -ErrorAction SilentlyContinue | Select-Object FullName
   ```
2. Prüfe, ob der App-Scan die Converter findet:
   ```powershell
   node -e "console.log(require('./lib/converters').scanConverters())"
   ```
   Erwartet: ein Array mit je `{ name, version, path }` pro installierter Archicad-Version.

3. **Wenn der Scan leer ist oder Converter fehlen**, weicht die reale Verzeichnisstruktur von
   der Annahme ab (z. B. `.exe` in einem Unterordner, anderer Installationspfad, oder
   Versionsnummer nicht im Ordnernamen). Passe dann die Windows-Zweige in
   `lib/converters.js` an:
   - `defaultBaseDirs('win32')` – die Basisverzeichnisse,
   - im `scanConverters`-`win32`-Zweig – wie/wo nach `LP_XMLConverter.exe` gesucht wird
     (ggf. rekursiv in Unterordner absteigen, analog zur macOS-`.app`-Suche).
   Halte dich an den bestehenden Stil; ergänze bei Bedarf Tests in
   `test/converters.test.js` (Fake-Verzeichnisbaum mit `platform = 'win32'`).
   Nach der Anpassung erneut `npm test` und den Scan aus 3.2 ausführen.

## Schritt 4 – App testen

```powershell
npm start
```
- Fenster öffnet sich, Sprachumschalter DE/EN oben rechts.
- „Objekt wählen…" / „Ordner wählen…" → eine echte `.gsm` bzw. ein Ordner.
- Die Tabelle zeigt die erkannte Quellversion und Status „✓ bereit".
- Zielversion wählen, Zielordner wählen, „Downgrade starten".
- Prüfen: erzeugte `.gsm` ist in der Zielversion ladbar; bei vorhandenen Zieldateien
  erscheint die Überschreiben-Abfrage; passwortgeschützte Objekte bleiben geschützt.

## Schritt 5 – Windows-Installer bauen

```powershell
npm run dist
```
Erwartet: ein NSIS-Installer unter `dist\GDL Downgrader Setup 1.0.0.exe` (Name/Version laut
`package.json`). Der erste Build lädt Electron + NSIS herunter (dauert).

> Code-Signing: Der Build ist **nicht signiert**. Windows SmartScreen zeigt beim ersten
> Start eine Warnung („Weitere Informationen" → „Trotzdem ausführen"). Für eine signierte
> Auslieferung wäre ein Windows-Code-Signing-Zertifikat nötig (separat).

## Schritt 6 – Ergebnis melden

Bitte zurückmelden:
- War der Converter-Pfad aus Schritt 3 korrekt, oder musste `lib/converters.js` angepasst
  werden? Falls ja: was genau war der reale Pfad / die reale Struktur?
- Ergebnis von `npm test` (Anzahl Tests).
- Hat ein echter Downgrade funktioniert (welche Quell-/Zielversion)?
- Wurde `dist\…Setup 1.0.0.exe` erfolgreich erzeugt?

Falls `lib/converters.js` angepasst wurde, die Änderung committen und pushen (oder als
Patch/Diff an Jochen zurückgeben), damit der macOS- und der Windows-Pfad zusammenbleiben.
