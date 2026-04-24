# 🌲 FOREST AUTOMATION

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║    ███████╗ ██████╗ ██████╗ ███████╗███████╗████████╗                       ║
║    ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝╚══██╔══╝                       ║
║    █████╗  ██║   ██║██████╔╝█████╗  ███████╗   ██║                          ║
║    ██╔══╝  ██║   ██║██╔══██╗██╔══╝  ╚════██║   ██║                          ║
║    ██║     ╚██████╔╝██║  ██║███████╗███████║   ██║                          ║
║    ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝                          ║
║                                                                              ║
║          A U T O M A T I O N  ·  E N G I N E                                ║
║          MP Online Forest Permit Booking · Windows Desktop                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

> **Prepare. Authenticate. Automate. Book.**  
> A desktop operator tool that transforms the forest permit booking grind into a streamlined, semi-automated workflow — powered by Python, Playwright, and a node automation engine running under the hood.

---

## ⚡ What Is This?

**Forest Automation** is a Windows desktop application built for operators who manage MP Online forest portal permit bookings. Instead of manually filling in visitor data and navigating the portal over and over, this tool does the heavy lifting — you handle only the parts that _must_ be human: login, CAPTCHA, OTP, and payment.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   OPERATOR                      MP ONLINE PORTAL           │
│                                                             │
│   [Prepare CSV Data]  ──────►  [Automated Playwright]       │
│   [Activate License]           [Zone/Slot Selection]        │
│   [Sign In Locally]            [Form Fill — Full/Single]    │
│                                                             │
│   ← You handle CAPTCHA, OTP, Login, Payment →               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| 🖥️ Desktop UI | Python · PySide6 |
| 🤖 Browser Automation | Node.js · Playwright |
| 🔒 Auth & Security | SQLite · HMAC signing · Machine-bound licensing |
| 📦 Packaging | PyInstaller · Inno Setup |
| 🪟 Platform | Windows |

---

## 🚀 Quick Start

### 1 · Python Environment

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

### 2 · Node Dependencies

```powershell
npm install
```

### 3 · Launch

```powershell
python main.py
```

> 💡 First launch auto-creates all required runtime folders and starter files. Nothing to configure manually upfront.

---

## 👤 First-Time Setup

### Register a User

From the login screen → click **Register User** → enter credentials → sign in.

Or bootstrap an admin via environment variables:

```powershell
$env:FOREST_ADMIN_USERNAME="admin"
$env:FOREST_ADMIN_PASSWORD="StrongPassword123"
python security/create_admin.py
```

### Activate Your License

1. Open **Settings** inside the dashboard  
2. Click **Show Machine ID** → send it to the license issuer  
3. Paste the received key → click **Activate License**

> ⚠️ Automation is fully blocked until a valid, machine-bound license is activated.

---

## 🗂️ Repository Structure

```
forest-automation/
│
├── main.py                     ← App entry point
│
├── ui/                         ← PySide6 windows & dashboard
│   ├── bootstrap.py
│   ├── dashboard_window.py
│   ├── login_window.py
│   └── automation_controller.py
│
├── security/                   ← Auth, licensing, machine binding
│   ├── auth.py
│   ├── license_manager.py
│   └── create_admin.py
│
├── src/                        ← Node.js automation engine
│   ├── index.js                ← Entry point
│   ├── flows/
│   │   ├── form.flow.fullVehicle.js
│   │   └── form.flow.singleSeat.js
│   ├── config/app.config.js
│   └── data/
│       ├── tourists.csv
│       └── singleTourist.csv
│
├── config/                     ← Runtime state & license
│   ├── state.json              ← HMAC-signed pause/resume/stop state
│   └── license.key
│
├── logs/
│   ├── app.log                 ← Node automation logs
│   └── security_audit.log      ← Security & state-file audit events
│
├── tools/                      ← Build helpers & license generators
├── installer/                  ← Inno Setup script
└── docs/                       ← Packaging notes & phase docs
```

---

## 🔄 Automation Flow

```
  START
    │
    ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│ Open Browser│────►│  Load Home Page  │────►│ Check Portal Login? │
└─────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                         │
                                          YES ◄──────────┘──────────► NO
                                           │                           │
                                    ┌──────▼──────┐             ┌─────▼──────┐
                                    │ Wait: Manual│             │  Enter     │
                                    │ Portal Login│             │  Booking   │
                                    └──────┬──────┘             │  Loop      │
                                           │                    └─────┬──────┘
                                           └──────────────────────────┘
                                                         │
                                                         ▼
                                              ┌──────────────────┐
                                              │  Permit Select   │
                                              │  Zone / Slot     │
                                              └────────┬─────────┘
                                                       │
                                         ┌─────────────┴─────────────┐
                                         ▼                           ▼
                               ┌──────────────────┐       ┌──────────────────┐
                               │  Full Vehicle    │       │  Single Seat     │
                               │  Flow            │       │  Flow            │
                               └────────┬─────────┘       └────────┬─────────┘
                                        └──────────┬───────────────┘
                                                   ▼
                                        ┌──────────────────────┐
                                        │  🛑 MANUAL REQUIRED  │
                                        │  CAPTCHA / OTP /     │
                                        │  Payment Confirm     │
                                        └──────────────────────┘
```

**Documented Phases** (see `docs/PHASES.md`):
`LOGIN` → `DASHBOARD` → `PERMIT_SELECT` → `ZONE_SELECT` → `PHASE_8_FULL` / `PHASE_8_SINGLE` → `OTP` → `PAYMENT`

---

## 📋 CSV Data Format

Both single-seat and full-vehicle flows read from CSV files with these columns:

| Column | Description |
|---|---|
| `name` | Visitor full name |
| `age` | Visitor age |
| `gender` | Gender |
| `guardian` | Guardian name |
| `nationality` | Nationality |
| `idType` | ID document type |
| `idNumber` | ID document number |

> Use the **Single Seat** and **Full Vehicle** tabs in the dashboard to manage rows visually — no manual CSV editing required.

---

## ⚙️ Configuration

Runtime configuration lives in `src/config/app.config.js`. The dashboard **Settings** tab rewrites this file for you.

| Setting | Description |
|---|---|
| `browser.headless` | Run browser visibly or in background |
| `browser.slowMo` | Delay (ms) between Playwright actions |
| `timeouts.pageLoad` | Page-load timeout |
| `features.autoRetry` | Enable automatic retry on failure |
| `utils.base` | Base portal URL |

---

## 🔐 Security Model

```
┌──────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                       │
│                                                          │
│  ① Local Auth    → SQLite users.db + hashed passwords    │
│                    Lockout after repeated failures        │
│                                                          │
│  ② License       → Machine ID bound · HMAC validated     │
│                    Expires · Blocks automation if invalid │
│                                                          │
│  ③ State File    → config/state.json is HMAC-signed      │
│                    Tamper detection for pause/stop/resume │
│                                                          │
│  ④ Audit Log     → logs/security_audit.log               │
│                    All security events written here       │
└──────────────────────────────────────────────────────────┘
```

> 🔑 The machine ID is derived from host-specific hardware values and hashed — licenses cannot be transferred between machines.

---

## 📦 Build for Windows

### Quick Build

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-windows.ps1
```

### Manual Build

```powershell
python -m venv .venv-build
.venv-build\Scripts\Activate.ps1
pip install -r runtime-requirements.txt pyinstaller
pyinstaller --noconfirm forest_automation.spec
```

**Outputs:**

| File | Description |
|---|---|
| `dist/ForestAutomation/ForestAutomation.exe` | Standalone executable |
| `dist-installer/ForestAutomationSetup.exe` | Full installer via Inno Setup |

> See `docs/WINDOWS_PACKAGING.md` for detailed packaging notes.

---

## 📁 Key Runtime Files

| File | Purpose |
|---|---|
| `users.db` | Local operator accounts |
| `config/license.key` | Activated license key |
| `config/state.json` | Pause / Resume / Stop state (HMAC-signed) |
| `src/config/app.config.js` | Browser & automation settings |
| `src/data/tourists.csv` | Full-vehicle visitor data |
| `src/data/singleTourist.csv` | Single-seat visitor data |
| `logs/app.log` | Node automation output |
| `logs/security_audit.log` | Security event audit trail |

---

## ⚠️ Known Limitations

- **Manual steps required:** Portal login, CAPTCHA, OTP, and payment are intentionally left to the operator.
- **CSV reader mismatch:** `src/utils/readSingleTouristsCsv.js` currently reads `tourists.csv` — maintainers should verify if it should read `singleTourist.csv` instead.
- **Hardcoded signing secret:** `security/license_manager.py` contains a hardcoded secret — acceptable for local dev, but **externalize it before production distribution**.
- **Windows only:** The bundled `node.exe` and packaging setup target Windows exclusively.

---

## 🗺️ Where To Start Reading

New to the codebase? Start here, in order:

1. `main.py` — app entry point
2. `ui/main.py` — UI bootstrap
3. `ui/login_window.py` — local auth flow
4. `ui/dashboard_window.py` — main operator dashboard
5. `ui/automation_controller.py` — Python ↔ Node bridge
6. `src/index.js` — Node automation entry
7. `src/flows/form.flow.fullVehicle.js` — full vehicle booking
8. `src/flows/form.flow.singleSeat.js` — single seat booking
9. `security/auth.py` — authentication logic
10. `security/license_manager.py` — machine-bound licensing

---

## 📄 License

This project is intended for authorized operator use only. License keys are machine-bound and non-transferable.

---

<div align="center">

```
Built for the forests. Run by operators. Powered by automation.
```

**🌲 Forest Automation — MP Online Permit Booking Engine**

</div>