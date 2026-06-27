# Windows-Build

Status: Auf echter Windows-Hardware verifiziert (Converter-Erkennung, echter Downgrade,
Paket startet). Die empfohlene Auslieferung für Windows ist ein **portables ZIP** – kein
Installer.

---

## Warum portabel statt Installer (NSIS)

Der von `electron-builder` erzeugte NSIS-Installer benennt die Electron-Binary in eine
eigene, unsignierte `GDL Downgrader.exe` um. Eine solche einzigartige, unsignierte EXE hat
keine Reputation in der Windows-Defender-Cloud und wurde beim Test **von Defender gelöscht**.

Das portable Paket vermeidet das: Es verwendet die **unveränderte offizielle
`electron.exe`** (die Defender-Reputation hat) und legt die App daneben in `resources\app`.
Gestartet wird über eine kleine `.cmd`-Datei. Ergebnis: kein Defender-Eingriff, keine
Installation, kein Node.js, kein Adminrecht, kein Code-Signing nötig.

---

## Portables Paket bauen

Auf einem **Windows-Rechner** (PowerShell), im Projektordner:

```powershell
git clone https://github.com/gdl-joe/GDL-Downgrader.git   # oder: git pull
cd GDL-Downgrader
npm install
.\scripts\build-portable-win.ps1
```

Das Skript [`scripts/build-portable-win.ps1`](scripts/build-portable-win.ps1):
1. ermittelt die Electron-Version aus `node_modules`,
2. lädt einmalig die offizielle `electron-v<version>-win32-x64.zip` (gecacht in
   `build-cache/`),
3. entpackt die Runtime nach `dist-portable/GDL-Downgrader-Win-x64`,
4. kopiert die App (`main.js`, `preload.js`, `renderer.js`, `i18n.js`, `index.html`,
   `styles.css`, `package.json`, `lib/`, `data/`) nach `resources\app`,
5. legt den Starter `GDL Downgrader starten.cmd` und eine `LIESMICH.txt` an,
6. packt alles zu `dist-portable\GDL-Downgrader-Win-x64-<version>.zip`.

Funktioniert auf ARM- und x64-Windows (die x64-Runtime wird geladen, nicht vom Build-Host
kopiert). `dist-portable/` und `build-cache/` sind gitignored.

---

## Nutzung (für Endanwender)

1. ZIP herunterladen und **entpacken** (Ort egal – Desktop, Downloads, …).
2. Doppelklick auf **`GDL Downgrader starten.cmd`**.
3. Beim ersten Start evtl. SmartScreen-Hinweis „unbekannter Herausgeber" →
   *Weitere Informationen* → *Trotzdem ausführen*. Es wird nichts installiert und nichts
   gelöscht.
4. Zum Entfernen einfach den Ordner löschen.

Voraussetzung am Rechner: mindestens eine Archicad-Installation mit `LP_XMLConverter.exe`
(wird automatisch unter `C:\Program Files\Graphisoft\…` gefunden).

---

## Hinweis zur Converter-Erkennung (verifiziert)

Auf echter Windows-Hardware bestätigt: `LP_XMLConverter.exe` liegt direkt im Versionsordner
(`C:\Program Files\Graphisoft\Archicad NN\LP_XMLConverter.exe`); die Version wird aus dem
Ordnernamen gelesen. Ein dabei gefundener Bug (doppelte Auflistung durch die
case-insensitiven Basisverzeichnisse `GRAPHISOFT`/`Graphisoft`) ist behoben – der Scan
dedupliziert Converter über den kanonischen Pfad.
