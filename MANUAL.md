[Deutsch](HANDBUCH.md) · **English**

# GDL Downgrader – Manual

As of: Version 1.0.0

GDL Downgrader converts Archicad GDL objects (`.gsm`) from a higher to a lower Archicad
version. It is based on Graphisoft's `LP_XMLConverter`, which is included with every
Archicad installation.

---

## 1. Requirements

- **macOS** or **Windows**.
- Installed Archicad converters:
  - at least **one converter as new as your newest object** (newer converters can read older
    objects — an AC21 object does not require an AC21 converter), and
  - the converter for the **target version** (for writing back).
- The app finds all installed converters automatically:
  - macOS: `/Applications/GRAPHISOFT/*/…/LP_XMLConverter`
  - Windows: `C:\Program Files\GRAPHISOFT\*\LP_XMLConverter.exe`

> Multiple installations of the same version (e.g. `AC27` and `AC27AUT`) are listed
> individually — you select the one you need.

---

## 2. Installation

- **macOS:** Open `GDL Downgrader-<version>.dmg`, drag the app to the Applications folder.
  On first launch, confirm the Gatekeeper prompt via *Right-click → Open* if necessary
  (the app is not signed).
- **Windows:** Run the installer (`.exe`, NSIS). Note: The Windows build is created on a
  Windows machine (see section 9).

Alternatively, run from source:
```bash
npm install
npm start
```

---

## 3. The Workflow in 7 Steps

1. **Select source** – "Choose object…" for a single `.gsm` or "Choose folder…"
   for an entire directory (recursive, including subdirectories).
2. **Objects found** – table with detected source version and status:
   - ✓ ready
   - ⚠ AC… too new – no converter (object is newer than the highest installed converter,
     therefore not readable)
   - 🔒 protected (after a first attempt, see section 5)
3. **Target version** – freely selectable; all installed converters are offered. If the
   target version equals the source version, the object is only recompiled without `-compatibility`.
4. **Target directory** – the folder structure of the source is reproduced 1:1 there.
5. **Passwords** – appears only when protected objects are encountered (section 5).
6. **Start downgrade** – progress bar and live log. Two steps per object:
   Decompile with the source converter (`libpart2xml -compatibility <target>`), then
   recompile with the target converter (`xml2libpart`).
7. **Result** – summary: succeeded / password-protected / failed,
   plus notes on commands that are too new (section 6).

---

## 4. Multiple Objects / Entire Libraries

- When a folder is selected, **all** `.gsm` files in all subdirectories are found.
- The **source version is detected per object** automatically from the GSM header — mixed
  versions within a folder are therefore not a problem.
- An error on one object does not stop the run; each object is processed individually.

---

## 5. Password-Protected Objects

- Password protection is detected **during conversion** (converter message
  `Could not decrypt library part`).
- Affected objects then appear in the **5 · Password-Protected Objects** section.
- Enter a password per object **or** a single shared password for all, then click
  "Start downgrade" again.
- **Password protection is preserved:** The downgraded object is re-encrypted with the
  same password.

---

## 6. Check for Commands That Are Too New

During the downgrade, the app checks the GDL scripts of each object for commands that did
not yet exist in the **target version**. Such objects are listed in the result along with
the affected commands (e.g. "`MEPSYSTEM` (from AC27)").

This is a **notice for review**, not an abort: the `.gsm` is still produced. Whether a
command that is too new actually causes a problem depends on the object — check the result
in the target version.

### Maintaining the Command List

The knowledge base is stored in [`data/gdl-command-versions.json`](data/gdl-command-versions.json)
and is intentionally **editable**. Format:
```json
{
  "commands": {
    "MEPSYSTEM": 27,
    "KEYNOTE_INFO": 28
  }
}
```
The value is the Archicad version **from which** the command is available. Variant notation
such as `PROJECT2{4}` is supported; matching is case-insensitive.

> The list was pre-populated from the official
> [GDL New Features Guide](https://gdl.graphisoft.com/new-features-guide/) and may contain
> errors or gaps. It should be reviewed and extended by GDL experts.
> Multi-word or dot constructs (e.g. `SET BUILDING_MATERIAL`) are not detected.

---

## 7. Disclaimer & Backup Obligation

- **Backup obligation:** Create a backup of your original objects before every downgrade.
- **Disclaimer:** The software is provided without any warranty. Use is at your own risk;
  no liability is accepted for data loss or faulty/incomplete conversions.
- Archicad and GDL are trademarks of GRAPHISOFT SE. This tool uses the bundled
  `LP_XMLConverter` but has no affiliation with GRAPHISOFT.

---

## 8. Frequently Asked Questions / Troubleshooting

- **"⚠ AC… too new – no converter"** – The object is newer than the highest installed
  converter and cannot be read. Install a converter that is at least as new as the object.
- **Target version missing from menu** – Only installed converters are offered. If the
  desired target version is absent, the corresponding Archicad must be installed.
- **Object remains 🔒 after entering password** – The password was incorrect. Enter it again.
- **Log shows a converter error** – The message comes directly from `LP_XMLConverter`;
  it aids diagnosis (e.g. corrupted object, missing library references).

---

## 9. Creating Builds

- **macOS (DMG):**
  ```bash
  npm run dist
  ```
  produces `dist/GDL Downgrader-<version>.dmg`.
- **Windows (NSIS installer):** Must be built on a **Windows machine** (or via CI with a
  Windows runner):
  ```bash
  npm install
  npm run dist
  ```
  Cross-building from macOS is not reliable and is not recommended.

---

## 10. Open Source

GDL Downgrader is open source under the **MIT License** (see [LICENSE](LICENSE)).
Source code: <https://github.com/gdl-joe/GDL-Downgrader>
