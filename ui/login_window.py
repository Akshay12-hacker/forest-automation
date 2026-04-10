from PySide6.QtWidgets import (
    QWidget, QLabel, QLineEdit,
    QPushButton, QVBoxLayout, QMessageBox
)
import time
from security.auth import authenticate
from ui.dashboard_window import Dashboard

class LoginWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Forest Automation - Login")
        self.setFixedSize(350, 220)

        self.username = QLineEdit()
        self.username.setPlaceholderText("Username")

        self.password = QLineEdit()
        self.password.setPlaceholderText("Password")
        self.password.setEchoMode(QLineEdit.Password)

        self.login_btn = QPushButton("Login")
        self.login_btn.clicked.connect(self.handle_login)
        self.failed_attempts = 0
        self.lockout_until = 0.0

        layout = QVBoxLayout()
        layout.addWidget(QLabel("Officer Login"))
        layout.addWidget(self.username)
        layout.addWidget(self.password)
        layout.addWidget(self.login_btn)

        self.setLayout(layout)

    def handle_login(self):
        now = time.monotonic()
        if now < self.lockout_until:
            remaining = int(self.lockout_until - now)
            QMessageBox.warning(
                self,
                "Temporarily Locked",
                f"Too many failed attempts. Try again in {remaining} seconds.",
            )
            return

        user = self.username.text().strip()
        pwd = self.password.text().strip()
        
        if not user or not pwd:
            QMessageBox.warning(self, "Error", "Empty fields")
            return

        if authenticate(user, pwd):
            self.failed_attempts = 0
            self.lockout_until = 0.0
            self.hide()
            self.dashboard = Dashboard()
            self.dashboard.show()
        else:
            self.failed_attempts += 1
            if self.failed_attempts >= 5:
                self.lockout_until = time.monotonic() + 30
                self.failed_attempts = 0
            QMessageBox.critical(self, "Denied", "Invalid credentials")
        
