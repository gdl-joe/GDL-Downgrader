# Änderungsprotokoll

Alle nennenswerten Änderungen am GDL Downgrader. Format nach
[Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
Versionierung nach [SemVer](https://semver.org/lang/de/).

## [1.0.0] – 2026-06-27

Erste Veröffentlichung.

### Funktionen
- Downgrade von Archicad-GDL-Objekten (`.gsm`) in eine tiefere Archicad-Version
  über Graphisofts `LP_XMLConverter` (Decompile mit `-compatibility`, Recompile
  mit dem Ziel-Converter).
- Automatische Erkennung aller installierten Converter (macOS + Windows);
  mehrere Installationen derselben Version (z.B. AC27 / AC27AUT) werden einzeln
  zur Auswahl angeboten.
- Intelligente Converter-Wahl: zum Decompilieren genügt ein Converter, der das Objekt
  lesen kann (≥ Quellversion) – der exakte Quell-Converter ist nicht nötig. Ein Objekt
  wird nur bemängelt, wenn es zu neu für den höchsten installierten Converter ist.
  Zielversion frei wählbar; bei Ziel = Quelle ohne `-compatibility`.
- Zweisprachige Oberfläche (Deutsch/Englisch), umschaltbar und gespeichert.
- Automatische Erkennung der Quellversion jedes Objekts aus dem GSM-Header.
- Einzelobjekt **oder** rekursiver Verzeichnis-Batch mit Erhalt der Ordnerstruktur.
- Erkennung passwortgeschützter Objekte; Passworteingabe pro Objekt oder
  gemeinsam für alle. **Der Passwortschutz bleibt nach dem Downgrade erhalten.**
- Prüfung der GDL-Skripte auf Befehle, die es in der Zielversion noch nicht gab,
  mit Warnhinweis vor der Konvertierung.
- Live-Log und Fortschrittsanzeige; pro Objekt isolierte Fehlerbehandlung.
- Dunkles UI im Stil von gdlschmiede.de.

### Hinweise
- Haftungsausschluss und Backup-Pflicht dauerhaft im UI sichtbar.
- Open Source unter MIT-Lizenz.
- Auslieferung: macOS als DMG, Windows als **portables ZIP** (kein Installer –
  vermeidet einen Windows-Defender-Fehlalarm; nutzt die unveränderte offizielle
  Electron-Runtime). Build-Skript: `scripts/build-portable-win.ps1`.
