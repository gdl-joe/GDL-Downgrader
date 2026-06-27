# macOS – Signierung & Notarisierung

Diese Anleitung beschreibt, wie die macOS-DMG **signiert und notarisiert** gebaut wird, damit
sie bei Nutzern **ohne Gatekeeper-Warnung** startet. Voraussetzung: aktive Mitgliedschaft im
Apple Developer Program (erledigt).

Die electron-builder-Konfiguration ist bereits vorbereitet (`build/entitlements.mac.plist`,
`build/entitlements.mac.inherit.plist`, `mac.notarize` in `package.json`). Es fehlen nur noch
**dein Zertifikat** und **dein API-Key** plus drei Umgebungsvariablen.

---

## Schritt 1 – Developer-ID-Zertifikat erstellen (einmalig)

Dieses Zertifikat **signiert** die App. Es muss im macOS-Schlüsselbund liegen.

**Einfachster Weg (mit Xcode installiert):**
1. Xcode → *Settings…* → *Accounts* → mit deiner Apple-ID anmelden.
2. Account auswählen → *Manage Certificates…* → *+* → **Developer ID Application**.
3. Fertig – das Zertifikat liegt jetzt im Schlüsselbund.

**Ohne Xcode (über das Portal):**
1. *Schlüsselbundverwaltung* → Menü *Zertifikatsassistent* → *Zertifikat einer Zertifizierungsstelle anfordern* → als Datei speichern (CSR).
2. <https://developer.apple.com/account/resources/certificates> → *+* → **Developer ID Application** → CSR hochladen → Zertifikat laden → doppelklicken (in den Schlüsselbund).

Prüfen, dass es da ist:
```bash
security find-identity -v -p codesigning
```
Es sollte eine Zeile **"Developer ID Application: <dein Name> (TEAMID)"** erscheinen.

---

## Schritt 2 – App-Store-Connect-API-Key erstellen (einmalig)

Dieser Key wird für die **Notarisierung** gebraucht (Upload zu Apple). Empfohlen statt
App-spezifischem Passwort: läuft nicht ab, kein 2FA.

1. <https://appstoreconnect.apple.com> → *Users and Access* → Tab **Integrations** →
   **App Store Connect API**.
2. Unter **Team Keys** auf **+** (Generate API Key).
3. Name z. B. `Notarization`, Zugriff **Developer** (reicht zum Notarisieren) → *Generate*.
4. **`AuthKey_XXXXXXXXXX.p8` herunterladen** – das geht **nur ein einziges Mal**! An einem
   sicheren Ort speichern (NICHT ins Repo).
5. Dir notieren:
   - **Key ID** (steht in der Zeile, z. B. `XXXXXXXXXX`),
   - **Issuer ID** (oben auf der Seite, eine lange UUID).

---

## Schritt 3 – Umgebungsvariablen setzen und bauen

In dem Terminal, in dem du baust (Werte einsetzen):
```bash
export APPLE_API_KEY="$HOME/secure/AuthKey_XXXXXXXXXX.p8"   # Pfad zur .p8-Datei
export APPLE_API_KEY_ID="XXXXXXXXXX"                        # Key ID
export APPLE_API_ISSUER="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # Issuer ID

npm run dist
```

electron-builder signiert dann mit dem Developer-ID-Zertifikat, lädt die App zur
Notarisierung hoch, wartet auf Apples Freigabe (einige Minuten) und heftet das Ticket an die
DMG („stapling").

> Sicherheit: Die `.p8`-Datei und diese Variablen sind geheim – **nicht committen**. Lege die
> `.p8` außerhalb des Projektordners ab. `*.p8` ist vorsorglich in `.gitignore`.

---

## Schritt 4 – Verifizieren

```bash
# DMG bzw. App prüfen – erwartet: "accepted" / "source=Notarized Developer ID"
spctl -a -vvv -t install "dist/GDL Downgrader-1.0.0-arm64.dmg"
xcrun stapler validate "dist/GDL Downgrader-1.0.0-arm64.dmg"
```
Erscheint „accepted" und „Notarized Developer ID", startet die App bei Nutzern ohne Warnung.

---

## Hinweise

- **Apple-ID-Variante statt API-Key** (falls du keinen Key anlegen willst): stattdessen
  `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` (aus appleid.apple.com) und `APPLE_TEAM_ID`
  setzen. Der API-Key ist aber der robustere Weg.
- **Intel-Macs:** Der aktuelle Build ist `arm64` (Apple Silicon). Für zusätzlich Intel müsste
  `mac.target` um `x64` (oder `universal`) erweitert werden – separat besprechen.
- Nach erfolgreichem Build laden wir die signierte DMG ins GitHub-Release v1.0.0 (ersetzt die
  bisherige unsignierte).
