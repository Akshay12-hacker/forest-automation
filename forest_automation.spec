# -*- mode: python ; coding: utf-8 -*-

from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules


project_root = Path.cwd()
datas = [
    (str(project_root / "ui"), "ui"),
    (str(project_root / "security"), "security"),
    (str(project_root / "src"), "src"),
    (str(project_root / "config"), "config"),
    (str(project_root / "node"), "node"),
    (str(project_root / "node_modules"), "node_modules"),
    (str(project_root / "forest-browser-profile"), "forest-browser-profile"),
    (str(project_root / "playwright-browsers"), "playwright-browsers"),
    (str(project_root / "package.json"), "."),
    (str(project_root / "package-lock.json"), "."),
]

hiddenimports = collect_submodules("PySide6")


a = Analysis(
    ["main.py"],
    pathex=[str(project_root)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="ForestAutomation",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    icon=str(project_root / "assets" / "icons" / "forest.ico"),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="ForestAutomation",
)
