# Forest Automation

Forest Automation is a Windows-focused desktop application for managing and running permit-booking automation for the MP Online forest portal. It combines:

- a Python `PySide6` desktop UI
- a Node.js + Playwright browser automation engine
- local user authentication with SQLite
- machine-bound license validation

The app is designed for an operator workflow: prepare visitor data, activate a license, sign in, launch automation, and complete any required manual steps such as portal login, CAPTCHA, OTP, and payment.

## What This Repository Contains

This repository includes both the desktop app and the browser automation logic.

- `ui/`: PySide6 windows, editors, dashboard, styling, runtime bootstrap
- `security/`: authentication, password hashing, database, licensing, machine locking
- `src/`: Node.js automation entry point, Playwright flows, config, CSV readers
- `config/`: runtime state and license files
- `tools/`: build helpers and license-generation utilities
- `installer/`: Inno Setup installer script
- `assets/`: application icon and static assets
- `docs/`: packaging and internal phase notes

## How It Works

At a high level, the system works like this:

1. The Python app starts from `main.py`.
2. `ui/bootstrap.py` creates required runtime files if they do not exist yet.
3. The user signs in through the local login screen.
4. The dashboard lets the user:
   - manage CSV booking data
   - activate a license
   - change browser settings
   - start, pause, resume, or stop automation
5. When automation starts, Python launches the bundled `node/node.exe` process and runs `src/index.js`.
6. The Node/Playwright side opens the forest booking portal, checks session state, and continues through the booking phases.
7. The operator still handles manual portal login, CAPTCHA, OTP, and payment when needed.

## Main Features

- Local officer login with hashed passwords
- User registration from the login window
- SQLite-backed local user database (`users.db`)
- Machine-bound license verification
- Single-seat and full-vehicle CSV editors
- Settings editor for browser delay, headless mode, timeout, and auto-retry
- Live log panel in the desktop dashboard
- Pause/resume/stop control through a signed shared state file
- Windows packaging support with PyInstaller and Inno Setup

## Authentication And Security

### Local users

- Users are stored in `users.db`
- Passwords are hashed before storage
- Login is local to the machine/app, not tied to the forest portal account
- The login UI applies a temporary lockout after repeated failed attempts

### License system

- Licenses are stored in `config/license.key`
- A license is validated against the current machine ID
- The machine ID is derived from host-specific values and hashed
- The dashboard blocks automation if the license is missing, invalid, or expired

### Runtime control state

- The Python UI and Node automation communicate through `config/state.json`
- That state file is HMAC-signed to detect tampering
- Audit-style security events are written to `logs/security_audit.log`

## Data Files

The app creates or uses these important runtime files:

- `users.db`: local application users
- `config/license.key`: activated license key
- `config/state.json`: pause/stop/resume state shared with Node
- `src/config/app.config.js`: automation/browser settings
- `src/data/tourists.csv`: visitor data for the full-vehicle flow
- `src/data/singleTourist.csv`: visitor data for the single-seat UI editor
- `logs/app.log`: Node automation log file
- `logs/security_audit.log`: state-file and security audit events

Default CSV columns:

- `name`
- `age`
- `gender`
- `guardian`
- `nationality`
- `idType`
- `idNumber`

## User Workflow

### 1. Start the app

Run:

```powershell
python main.py
```

The first launch will create missing runtime folders and starter files automatically.

### 2. Create the first user

From the login screen:

- click `Register User`
- enter a username and password
- sign in with that local account

You can also create a user from environment variables:

```powershell
$env:FOREST_ADMIN_USERNAME="admin"
$env:FOREST_ADMIN_PASSWORD="StrongPassword123"
python security/create_admin.py
```

### 3. Activate the license

Inside the dashboard:

- open `Settings`
- paste a valid license key
- click `Activate License`

If a license is not available yet, use `Show Machine ID` and send that machine ID to the license issuer.

### 4. Prepare booking data

In the dashboard tabs:

- `Single Seat`: manage single-seat booking rows
- `Full Vehicle`: manage shared vehicle booking rows
- `Settings`: edit runtime configuration

Use `Validate` before starting automation.

### 5. Start automation

Click `Start Booking`.

The app will:

- validate that a license exists
- start the Node automation process
- stream Node logs into the dashboard
- open the portal in Playwright using a persistent browser profile

### 6. Complete manual portal steps

Some actions are intentionally manual and not fully automated:

- portal login
- CAPTCHA
- OTP
- final payment-related actions

## Automation Flow

The Node entry point is `src/index.js`. The current phase flow is roughly:

1. Open browser
2. Open home page
3. Check whether portal login is needed
4. Wait for manual login if required
5. Enter booking loop
6. Open permit selection flow
7. Select zone/slot
8. Continue into either:
   - full vehicle flow
   - single seat flow
9. Stop for CAPTCHA / OTP / payment/manual confirmation as required

Documented internal phases in `docs/PHASES.md`:

- `LOGIN`
- `DASHBOARD`
- `PERMIT_SELECT`
- `ZONE_SELECT`
- `PHASE_8_FULL`
- `PHASE_8_SINGLE`
- `OTP`
- `PAYMENT`

## Run From Source

### Python requirements

The UI needs Python plus the packages in `requirements.txt`.

Example setup:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Node requirements

The repo already contains a local `node/` runtime and Playwright/browser assets for packaged execution, but when developing from source you should also have the JS dependencies installed:

```powershell
npm install
```

Run the Node side directly with:

```powershell
npm run dev
```

## Configuration

The runtime config file is `src/config/app.config.js`.

Important settings:

- `browser.headless`: run with or without visible browser window
- `browser.slowMo`: delay between Playwright actions
- `timeouts.pageLoad`: page-load timeout
- `features.autoRetry`: whether automatic retry behavior is enabled from the UI config writer
- `utils.base`: base portal URL

The desktop `Settings` tab rewrites this config file for normal usage.

## Logging

- Dashboard log panel shows live output from the Node process
- `logs/app.log` stores automation logs
- `logs/security_audit.log` stores state-file/security events

## Packaging For Windows

This project supports building a standalone Windows desktop app.

Basic build flow:

```powershell
python -m venv .venv-build
.venv-build\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r runtime-requirements.txt pyinstaller
pyinstaller --noconfirm forest_automation.spec
```

Or use:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-windows.ps1
```

Build output:

- `dist/ForestAutomation/ForestAutomation.exe`

Installer script:

- `installer/forest-automation.iss`

Installer output target:

- `dist-installer/ForestAutomationSetup.exe`

See `docs/WINDOWS_PACKAGING.md` for the existing packaging notes.

## Important Implementation Notes

- The app is built for Windows packaging and uses bundled `node.exe`
- The Playwright browser launches with a persistent profile in `forest-browser-profile`
- If the main profile is locked, the automation falls back to a temporary runtime profile
- Pause/resume/stop are controlled through the signed `config/state.json` file
- Runtime files are auto-created on first launch if missing

## Current Limitations / Notes

- Manual intervention is still required for login, CAPTCHA, OTP, and payment
- The repository currently includes both development and packaging-oriented assets, so it is larger than a typical Python desktop app
- The single-seat Node CSV reader in `src/utils/readSingleTouristsCsv.js` currently reads `src/data/tourists.csv`; maintainers should verify whether that is intentional or should be changed to `src/data/singleTourist.csv`
- `security/license_manager.py` contains a hardcoded signing secret; that is acceptable for local development, but production distribution should protect or externalize licensing secrets more carefully

## Recommended First Files To Read

If you want to understand the repository quickly, start here:

1. `main.py`
2. `ui/main.py`
3. `ui/login_window.py`
4. `ui/dashboard_window.py`
5. `ui/automation_controller.py`
6. `src/index.js`
7. `src/flows/form.flow.fullVehicle.js`
8. `src/flows/form.flow.singleSeat.js`
9. `security/auth.py`
10. `security/license_manager.py`

## Repository Purpose In One Sentence

This repository is a desktop operator tool that prepares visitor data, enforces local access and licensing, and launches a Playwright-based browser workflow to assist with forest permit booking on the MP Online portal.
