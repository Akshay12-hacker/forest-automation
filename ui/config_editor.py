from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QSpinBox,
    QCheckBox, QPushButton, QMessageBox, QLineEdit
)
import json
import os
from security.license_manager import verify_license
from ui.state_helper import app_path
import os

CONFIG_PATH = "src/config/app.config.json"

class ConfigEditor(QWidget):
    def __init__(self):
        super().__init__()
        self.layout = QVBoxLayout()
        # Title
        self.layout.addWidget(QLabel("License Management"))

        # Input
        self.license_input = QLineEdit()
        self.license_input.setPlaceholderText("Paste License Key")

        # Button
        btn_activate = QPushButton("Activate License")
        btn_activate.clicked.connect(self.activate_license)

        self.layout.addWidget(self.license_input)
        self.layout.addWidget(btn_activate)

        self.delay = QSpinBox()
        self.delay.setRange(100, 5000)
        self.delay.setSuffix(" ms")

        self.retry = QCheckBox("Auto Retry Slots")
        self.headless = QCheckBox("Headless Mode")

        self.btn_save = QPushButton("Save Config")
        self.btn_save.clicked.connect(self.save)

        self.layout.addWidget(QLabel("Action Delay"))
        self.layout.addWidget(self.delay)
        self.layout.addWidget(self.retry)
        self.layout.addWidget(self.headless)
        self.layout.addWidget(self.btn_save)

        self.setLayout(self.layout)
        self.load()

    def load(self):
        if not os.path.exists(CONFIG_PATH):
            return

        with open(CONFIG_PATH) as f:
            cfg = json.load(f)

        self.delay.setValue(cfg.get("delay", 500))
        self.retry.setChecked(cfg.get("autoRetry", True))
        self.headless.setChecked(cfg.get("headless", False))

    def save(self):
        cfg = {
            "delay": self.delay.value(),
            "autoRetry": self.retry.isChecked(),
            "headless": self.headless.isChecked()
        }

        with open(CONFIG_PATH, 'w') as f:
            json.dump(cfg, f, indent=2)

        QMessageBox.information(self, "Saved", "Config saved successfully")

    def activate_license(self):
        key = self.license_input.text().strip()

        if not key:
            QMessageBox.warning(self, "Error", "Enter license key")
            return

        if not verify_license(key):
            QMessageBox.critical(self, "Error", "Invalid license")
            return

        license_path = app_path("config", "license.key")

        with open(license_path, "w") as f:
            f.write(key)

        QMessageBox.information(self, "Success", "License Activated")
