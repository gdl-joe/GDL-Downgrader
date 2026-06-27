<#
.SYNOPSIS
  Baut ein portables Windows-Paket (x64) der GDL-Downgrader-App.

.BESCHREIBUNG
  Statt die Electron-Binary umzubenennen (wie electron-builder es tut), verwendet
  dieses Skript die *unveraenderte* offizielle electron.exe. Diese hat in der
  Windows-Defender-Cloud Reputation und wird daher nicht als unbekannte, unsignierte
  Datei geloescht. Das Ergebnis ist ein ZIP, das der Nutzer entpackt und per
  Verknuepfung startet - ohne Installation, ohne Node.js, ohne Code-Signing.

  Ablauf:
    1. Electron-Version aus node_modules ermitteln.
    2. Offizielle electron-vX-win32-x64.zip laden (in build-cache, einmalig).
    3. Runtime in ein sauberes Staging-Verzeichnis entpacken.
    4. App-Dateien nach resources/app kopieren (Electron laedt diese statt der
       Default-App).
    5. Start-Verknuepfung "GDL Downgrader.lnk" -> electron.exe anlegen.
    6. Alles zu dist-portable\GDL-Downgrader-Win-x64-<version>.zip packen.

  Aufruf (Windows PowerShell):  .\scripts\build-portable-win.ps1
#>
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# Projektwurzel = uebergeordneter Ordner dieses Skripts
$root  = Split-Path -Parent $PSScriptRoot
$arch  = 'x64'

# 1) Electron-Version bestimmen
$verFile = Join-Path $root 'node_modules\electron\dist\version'
if (Test-Path $verFile) {
  $version = (Get-Content $verFile -Raw).Trim()
} else {
  $version = (& node -p "require('electron/package.json').version").Trim()
}
Write-Host "Electron-Version: $version"

# 2) Offizielle Runtime laden (Cache)
$cacheDir = Join-Path $root 'build-cache'
New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null
$zipName  = "electron-v$version-win32-$arch.zip"
$zipPath  = Join-Path $cacheDir $zipName
if (-not (Test-Path $zipPath)) {
  $url = "https://github.com/electron/electron/releases/download/v$version/$zipName"
  Write-Host "Lade $url ..."
  Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
}

# 3) Staging-Verzeichnis frisch aufbauen
$stageName = "GDL-Downgrader-Win-$arch"
$outDir    = Join-Path $root 'dist-portable'
$stageDir  = Join-Path $outDir $stageName
if (Test-Path $stageDir) { Remove-Item $stageDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stageDir | Out-Null
Write-Host "Entpacke Runtime nach $stageDir ..."
Expand-Archive -Path $zipPath -DestinationPath $stageDir -Force

# 4) App-Dateien nach resources\app kopieren
$appDir = Join-Path $stageDir 'resources\app'
New-Item -ItemType Directory -Force -Path $appDir | Out-Null
$items = @('main.js','preload.js','renderer.js','i18n.js','index.html','styles.css','package.json','lib','data')
foreach ($it in $items) {
  $src = Join-Path $root $it
  if (Test-Path $src) {
    Copy-Item $src -Destination $appDir -Recurse -Force
  } else {
    Write-Warning "Fehlt, wird uebersprungen: $it"
  }
}
# Default-App entfernen, damit ausschliesslich unsere App startet
$defaultAsar = Join-Path $stageDir 'resources\default_app.asar'
if (Test-Path $defaultAsar) { Remove-Item $defaultAsar -Force }

# 5) Portablen Starter anlegen. Eine .lnk-Verknuepfung speichert einen ABSOLUTEN
#    Pfad und waere nach dem Entpacken auf einem anderen Rechner kaputt - daher ein
#    .cmd, das ueber %~dp0 (sein eigenes Verzeichnis) relativ startet.
$cmdPath = Join-Path $stageDir 'GDL Downgrader starten.cmd'
$cmdBody = @"
@echo off
rem Startet die App ueber die unveraenderte electron.exe (Defender-sicher).
set "ELECTRON_RUN_AS_NODE="
start "" "%~dp0electron.exe"
"@
Set-Content -Path $cmdPath -Value $cmdBody -Encoding ascii

# Kurze Lies-mich-Datei
$readme = @"
GDL Downgrader - portable Windows-Version (x64)

Start:  Doppelklick auf "GDL Downgrader" (oder electron.exe).
        Beim ersten Start zeigt Windows evtl. eine SmartScreen-Warnung
        ("unbekannter Herausgeber") -> "Weitere Informationen" ->
        "Trotzdem ausfuehren". Es wird nichts installiert.

Voraussetzung am Rechner: mindestens eine Archicad-Installation mit
LP_XMLConverter.exe (wird automatisch unter C:\Program Files\Graphisoft\...
gefunden).

Keine Installation, kein Node.js noetig - der Ordner ist eigenstaendig.
Zum Entfernen einfach den Ordner loeschen.
"@
Set-Content -Path (Join-Path $stageDir 'LIESMICH.txt') -Value $readme -Encoding utf8

# 6) ZIP packen
$zipOut = Join-Path $outDir "$stageName-$version.zip"
if (Test-Path $zipOut) { Remove-Item $zipOut -Force }
Write-Host "Packe $zipOut ..."
Compress-Archive -Path (Join-Path $stageDir '*') -DestinationPath $zipOut -Force

$mb = [math]::Round((Get-Item $zipOut).Length / 1MB, 1)
Write-Host ""
Write-Host "FERTIG: $zipOut ($mb MB)"
Write-Host "Entpackter Ordner zum Testen: $stageDir"
