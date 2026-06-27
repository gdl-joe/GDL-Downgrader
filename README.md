[Deutsch](README.de.md) · **English**

# GDL Downgrader

Desktop app (macOS + Windows) for **downgrading Archicad GDL objects** (`.gsm`) from a
higher to a lower Archicad version — using Graphisoft's `LP_XMLConverter`.
Single object or entire library (recursive), with automatic source version detection
and password handling. Dark UI in the style of gdlschmiede.de.

---

## Download

Get the latest packages from the **[Releases page](https://github.com/gdl-joe/GDL-Downgrader/releases/latest)**:

- **macOS** (Apple Silicon): `GDL Downgrader-…-arm64.dmg` — unsigned; on first launch open via
  *System Settings → Privacy & Security → "Open Anyway"*.
- **Windows** (x64): `GDL-Downgrader-…-win-x64-portable.zip` — portable, no installation;
  unpack and run `GDL Downgrader starten.cmd`.

See [MANUAL.md](MANUAL.md) for full installation and usage notes.

---

## How It Works

Two steps per object using **two different converters**:

1. **Decompile** with a converter that can read the object (at least as new as the
   source version). For a real downgrade (target < source) with `-compatibility <TARGETVERSION>`:
   `libpart2xml -compatibility <TARGETVERSION> [-password <pw>] -img <temp> source.gsm temp.xml`
2. **Recompile** with the converter of the **target version**:
   `xml2libpart -img <temp> temp.xml target.gsm`

The `-compatibility <TARGETVERSION>` flag is the key switch for the downgrade. If the target
version equals the source version, the object is only recompiled without `-compatibility`.

---

## Requirement: Installed Converters

- At least **one converter as new as your newest object** — newer converters can read
  older objects (an AC21 object does not require an AC21 converter).
- The converter for the **target version** (for writing back).

The app automatically scans all installed Archicad versions:

- **macOS:** `/Applications/GRAPHISOFT/*/…/LP_XMLConverter`
- **Windows:** `C:\Program Files\GRAPHISOFT\*\LP_XMLConverter.exe`

Multiple installations of the same version (e.g. `AC27` and `AC27AUT`) are offered
**individually** — you select the desired installation yourself.

> The target version is freely selectable. An object is only flagged if it is **too new**
> — that is, newer than the highest installed converter and therefore not readable.

---

## Usage

1. **Select source** — "Choose object…" (single `.gsm`) or "Choose folder…" (recursive).
2. **Objects found** — table with detected source version and status
   (✓ ready / ⚠ too new – no converter / 🔒 protected).
3. **Target version** — freely selectable from all installed converters.
4. **Target directory** — the folder structure of the source is reproduced 1:1 there.
5. **Passwords** — appears only when protected objects are encountered during conversion;
   enter a password per object or a single shared password for all, then restart.
6. **Start downgrade** — progress and live log are displayed.
7. **Result** — summary: succeeded / protected / failed, plus notes on GDL commands that
   are too new.

Password protection is detected during conversion (converter message
`Could not decrypt library part`). Protected objects then appear in the password section.

---

## Development

```bash
npm install      # Dependencies (Electron, electron-builder)
npm start        # Start the app
npm test         # Unit tests for the engine (node:test)
npm run dist     # Build installer (macOS: DMG, Windows: NSIS)
```

The conversion logic is platform- and Electron-independent and lives in `lib/`
(`converters.js`, `downgrade.js`, `run-command.js`). It can be tested via `npm test`
without Archicad (the command runner is injected in the tests).

### Build Notes

- **macOS:** `npm run dist` produces a `.dmg` in `dist/`.
- **Windows:** portable ZIP via `.\scripts\build-portable-win.ps1` on a Windows machine
  (no NSIS installer — the renamed EXE triggers a Windows Defender false positive; see
  [WINDOWS_BUILD.md](WINDOWS_BUILD.md)).

---

## Further Documents

- [MANUAL.md](MANUAL.md) — full user manual
- [CHANGELOG.md](CHANGELOG.md) — versions & release notes
- [LICENSE](LICENSE) — MIT license
- [data/gdl-command-versions.json](data/gdl-command-versions.json) — editable knowledge base
  for command version checking (please extend as a GDL expert)

## Project Structure

```
main.js            Electron main process + IPC
preload.js         contextBridge API for the renderer
renderer.js        UI logic / workflow
index.html         UI structure
styles.css         Dark theme (gdlschmiede.de)
lib/
  converters.js    Converter scan + GSM version detection
  downgrade.js     File discovery + downgrade engine + batch
  run-command.js   spawn-based command runner
test/              Unit tests (37)
docs/superpowers/  Spec and implementation plan
```
