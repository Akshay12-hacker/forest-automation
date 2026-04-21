import json
import os
import re

from PySide6.QtWidgets import (
    QCheckBox,
    QFormLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QSpinBox,
    QVBoxLayout,
    QWidget,
)

from security.license_manager import verify_license
from ui.state_helper import app_path


CONFIG_PATH = app_path("src", "config", "app.config.js")


class ConfigEditor(QWidget):
    def __init__(self):
        super().__init__()

        self.license_label = QLabel("License Management")
        self.license_label.setObjectName("editorTitle")

        self.license_help = QLabel(
            "Use this panel to activate the app license and adjust browser run settings."
        )
        self.license_help.setWordWrap(True)
        self.license_help.setObjectName("mutedLabel")

        self.license_input = QLineEdit()
        self.license_input.setPlaceholderText("Paste license key")

        self.delay = QSpinBox()
        self.delay.setRange(0, 5000)
        self.delay.setSingleStep(10)
        self.delay.setSuffix(" ms")

        self.page_load_timeout = QSpinBox()
        self.page_load_timeout.setRange(5000, 180000)
        self.page_load_timeout.setSingleStep(1000)
        self.page_load_timeout.setSuffix(" ms")

        self.retry = QCheckBox("Auto retry slots")
        self.headless = QCheckBox("Headless mode")

        self.btn_activate = QPushButton("Activate License")
        self.btn_save = QPushButton("Save Settings")

        self.btn_activate.clicked.connect(self.activate_license)
        self.btn_save.clicked.connect(self.save)

        form = QFormLayout()
        form.addRow("Browser delay", self.delay)
        form.addRow("Page timeout", self.page_load_timeout)
        form.addRow("", self.retry)
        form.addRow("", self.headless)

        layout = QVBoxLayout()
        layout.addWidget(self.license_label)
        layout.addWidget(self.license_help)
        layout.addWidget(self.license_input)
        layout.addWidget(self.btn_activate)
        layout.addSpacing(12)
        layout.addLayout(form)
        layout.addWidget(self.btn_save)
        layout.addStretch(1)
        self.setLayout(layout)

        self.load()

    def load(self):
        cfg = self._read_config()
        browser = cfg.get("browser", {})
        timeouts = cfg.get("timeouts", {})

        self.delay.setValue(int(browser.get("slowMo", 100)))
        self.headless.setChecked(bool(browser.get("headless", False)))
        self.page_load_timeout.setValue(int(timeouts.get("pageLoad", 58000)))
        self.retry.setChecked(bool(cfg.get("features", {}).get("autoRetry", True)))

    def save(self):
        cfg = {
            "browser": {
                "headless": self.headless.isChecked(),
                "slowMo": self.delay.value(),
                "args": [
                    "--start-maximized",
                    "--disable-blink-features=AutomationControlled",
                ],
            },
            "utils": {
                "base": "https://forest.mponline.gov.in/",
            },
            "timeouts": {
                "pageLoad": self.page_load_timeout.value(),
            },
            "features": {
                "autoRetry": self.retry.isChecked(),
            },
        }

        content = (
            "module.exports = "
            + json.dumps(cfg, indent=2)
            + ";\n"
        )

        try:
            os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as exc:
            QMessageBox.critical(self, "Save Failed", f"Could not save config:\n{exc}")
            return

        QMessageBox.information(self, "Saved", "Config saved successfully.")

    def activate_license(self):
        key = self.license_input.text().strip()

        if not key:
            QMessageBox.warning(self, "Error", "Enter license key.")
            return

        if not verify_license(key):
            QMessageBox.critical(self, "Error", "Invalid license.")
            return

        license_path = app_path("config", "license.key")

        try:
            os.makedirs(os.path.dirname(license_path), exist_ok=True)
            with open(license_path, "w", encoding="utf-8") as f:
                f.write(key)
        except Exception as exc:
            QMessageBox.critical(self, "Save Failed", f"Could not save license:\n{exc}")
            return

        self.license_input.clear()
        QMessageBox.information(self, "Success", "License activated.")

    def _read_config(self):
        default_config = {
            "browser": {
                "headless": False,
                "slowMo": 100,
            },
            "timeouts": {
                "pageLoad": 58000,
            },
            "features": {
                "autoRetry": True,
            },
        }

        if not os.path.exists(CONFIG_PATH):
            return default_config

        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                raw = f.read()
        except Exception:
            return default_config

        match = re.search(r"module\.exports\s*=\s*(\{.*\})\s*;", raw, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        slow_mo_match = re.search(r"slowMo\s*:\s*(\d+)", raw)
        headless_match = re.search(r"headless\s*:\s*(true|false)", raw)
        timeout_match = re.search(r"pageLoad\s*:\s*(\d+)", raw)

        if slow_mo_match:
            default_config["browser"]["slowMo"] = int(slow_mo_match.group(1))
        if headless_match:
            default_config["browser"]["headless"] = headless_match.group(1) == "true"
        if timeout_match:
            default_config["timeouts"]["pageLoad"] = int(timeout_match.group(1))

        return default_config
