# Windows Packaging

This project can be shipped as a real Windows desktop application by building a bundled `.exe` with PyInstaller and then wrapping that output with Inno Setup.

## 1. Prepare a clean build environment

Use a fresh virtual environment and install only runtime/build tools:

```powershell
python -m venv .venv-build
.venv-build\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r runtime-requirements.txt pyinstaller
```

## 2. Build the desktop application

The app entry point is `main.py`. The PyInstaller spec already includes the Python UI, security code, Node runtime, source files, config, and bundled Playwright browsers.

```powershell
pyinstaller --noconfirm forest_automation.spec
```

Or use the helper script:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-windows.ps1
```

If the build machine already has the required Python packages installed or has restricted internet access:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-windows.ps1 -SkipInstall
```

Output folder:

```text
dist\ForestAutomation\
```

Main executable:

```text
dist\ForestAutomation\ForestAutomation.exe
```

## 3. Test on a clean Windows machine

Before creating the installer, copy `dist\ForestAutomation\` to another PC and verify:

- the app opens
- login/registration works
- `users.db` is created or reused correctly
- CSV/config files are auto-created on first run
- Node automation starts
- Playwright browser launches

Note:
This packaged app includes `node.exe`, `node_modules`, and bundled Playwright browser assets, so the installer size will be larger than a normal simple desktop app. That tradeoff makes installation much easier for end users.

## 4. Create the Windows installer

Install Inno Setup, then open:

```text
installer\forest-automation.iss
```

Compile it from the Inno Setup Compiler.

Installer output:

```text
dist-installer\ForestAutomationSetup.exe
```

## 5. What the packaged app already does

At startup the app now auto-creates:

- `config\state.json`
- `src\data\singleTourist.csv`
- `src\data\tourists.csv`
- `src\config\app.config.js`
- `users.db`

This makes first-run installation much smoother on another PC.

## 6. Recommended next improvements

- add an `.ico` app icon and reference it in `forest_automation.spec`
- add version metadata for the `.exe`
- code-sign the installer and executable
- add a dashboard page for user management
- separate dev requirements from production requirements permanently
