from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QSpinBox,
    QCheckBox, QPushButton, QMessageBox
)
import json
import os

CONFIG_PATH = "src/config/app.config.json"

class ConfigEditor(QWidget):
    def __init__(self):
        super().__init__()
        self.layout = QVBoxLayout()

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
