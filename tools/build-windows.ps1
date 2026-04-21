param(
    [switch]$Clean,
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

if ($Clean) {
    if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    if (Test-Path "dist-installer") { Remove-Item -Recurse -Force "dist-installer" }
}

if (-not $SkipInstall) {
    python -m pip install --upgrade pip
    pip install -r runtime-requirements.txt pyinstaller
}

pyinstaller --noconfirm forest_automation.spec

Write-Host ""
Write-Host "PyInstaller build completed."
Write-Host "App output: $ProjectRoot\dist\ForestAutomation"
Write-Host "To create Setup.exe, compile installer\forest-automation.iss with Inno Setup."
